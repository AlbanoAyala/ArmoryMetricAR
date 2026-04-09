import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getStockStatus } from '@/lib/data-science';

// GET /api/inventory
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('item_type', { ascending: true })
    .order('name', { ascending: true });

  if (type) query = query.eq('item_type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer con estado de stock
  const enriched = data.map(item => ({
    ...item,
    stock_status: getStockStatus(item.quantity, item.reorder_point),
  }));

  return NextResponse.json({ data: enriched });
}

// POST /api/inventory — agregar ítem de inventario
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { item_type, name, lot_number, quantity, unit, reorder_point, manufacturer, purchase_date, expiry_date, cost_per_unit, notes } = body;

  if (!item_type || !name || !lot_number || quantity === undefined || !unit) {
    return NextResponse.json({ error: 'Campos obligatorios: item_type, name, lot_number, quantity, unit' }, { status: 422 });
  }

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      organization_id: profile.organization_id,
      item_type, name, lot_number, quantity, unit,
      reorder_point: reorder_point ?? 0,
      manufacturer: manufacturer ?? null,
      purchase_date: purchase_date ?? null,
      expiry_date: expiry_date ?? null,
      cost_per_unit: cost_per_unit ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'N° de lote ya existe en esta organización' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('event_log').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    event_type: 'inventory_updated',
    entity_type: 'inventory_item',
    entity_id: data.id,
    payload: { action: 'insert', item_type, name, lot_number, quantity, unit },
  });

  return NextResponse.json({ data }, { status: 201 });
}
