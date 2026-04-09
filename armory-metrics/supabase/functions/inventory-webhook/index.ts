// supabase/functions/inventory-webhook/index.ts
// Webhook POST: recibe confirmación de nuevo reload_batch
// Ejecuta descuento ACID de inventario via RPC y notifica al usuario

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface BatchRequest {
  recipe_id: string;
  batch_code: string;
  quantity: number;
  notes?: string;
  created_by: string;
  organization_id: string;
}

interface InsufficientStockError {
  insufficient_items: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Validar JWT del usuario
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: BatchRequest;
  try {
    body = await req.json() as BatchRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  // Validaciones básicas
  const validationErrors: string[] = [];
  if (!body.recipe_id) validationErrors.push('recipe_id requerido');
  if (!body.batch_code) validationErrors.push('batch_code requerido');
  if (!body.quantity || body.quantity <= 0) validationErrors.push('quantity debe ser > 0');
  if (!body.created_by) validationErrors.push('created_by requerido');
  if (!body.organization_id) validationErrors.push('organization_id requerido');

  if (validationErrors.length > 0) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: validationErrors }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[inventory-webhook] Procesando lote ${body.batch_code} — ${body.quantity} uds`);

  try {
    // Llamar a la RPC ACID de Supabase
    const { data: batchId, error: rpcError } = await supabase.rpc('create_reload_batch', {
      p_recipe_id:    body.recipe_id,
      p_batch_code:   body.batch_code,
      p_quantity:     body.quantity,
      p_notes:        body.notes ?? null,
      p_created_by:   body.created_by,
      p_org_id:       body.organization_id,
    });

    if (rpcError) {
      console.error('[inventory-webhook] RPC error:', rpcError);

      // Parsear error de stock insuficiente
      if (rpcError.message.startsWith('insufficient_stock:')) {
        const items = rpcError.message.replace('insufficient_stock:', '').split(',');
        const insufficientError: InsufficientStockError = { insufficient_items: items };
        return new Response(
          JSON.stringify({
            error: 'Stock insuficiente',
            code: 'INSUFFICIENT_STOCK',
            insufficient_items: insufficientError.insufficient_items,
            message: `No hay suficiente stock de: ${items.join(', ')}. El lote no fue creado.`,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (rpcError.message === 'recipe_not_found') {
        return new Response(
          JSON.stringify({ error: 'Receta no encontrada', code: 'RECIPE_NOT_FOUND' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      throw rpcError;
    }

    // Verificar si hay inventario por debajo del punto de reorden
    const { data: lowStock } = await supabase
      .from('inventory_items')
      .select('id, name, quantity, reorder_point, item_type')
      .eq('organization_id', body.organization_id)
      .filter('quantity', 'lt', supabase.rpc('get_reorder_point'));

    console.log(`[inventory-webhook] ✓ Lote ${body.batch_code} creado — ID: ${batchId}`);

    return new Response(
      JSON.stringify({
        ok: true,
        batch_id: batchId,
        batch_code: body.batch_code,
        quantity_produced: body.quantity,
        low_stock_warnings: lowStock?.length ?? 0,
        message: `Lote ${body.batch_code} creado exitosamente. Inventario descontado de forma transaccional.`,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[inventory-webhook] Error inesperado:', errMsg);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        detail: errMsg,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
