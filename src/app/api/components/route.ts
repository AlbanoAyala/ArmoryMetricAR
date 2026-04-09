import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/components?firearm_id=...
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const firearmId = searchParams.get('firearm_id');
  if (!firearmId) return NextResponse.json({ error: 'firearm_id requerido' }, { status: 422 });

  const { data: components, error } = await supabase
    .from('firearm_components')
    .select('*, component_replacements(replacement_date, shots_at_replacement, profiles!replaced_by(full_name))')
    .eq('firearm_id', firearmId)
    .order('is_critical', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calcular % de desgaste por componente
  const enriched = components.map(c => ({
    ...c,
    pct_used: Math.round((c.current_count / c.lifespan_threshold) * 100),
    shots_remaining: Math.max(0, c.lifespan_threshold - c.current_count),
    status: c.current_count / c.lifespan_threshold >= 0.85 ? 'critical'
          : c.current_count / c.lifespan_threshold >= 0.60 ? 'warning'
          : 'ok',
  }));

  return NextResponse.json({ data: enriched });
}

// POST /api/components/replace — registrar reemplazo de componente
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verificar que el usuario es armero
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  if (!['gunsmith', 'admin', 'org_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Solo armeros registrados pueden reemplazar componentes' }, { status: 403 });
  }

  const body = await req.json();
  const { component_id, firearm_id, cost, notes } = body;

  if (!component_id || !firearm_id) {
    return NextResponse.json({ error: 'component_id y firearm_id son obligatorios' }, { status: 422 });
  }

  // Obtener estado actual del componente
  const { data: component } = await supabase
    .from('firearm_components')
    .select('current_count, name')
    .eq('id', component_id)
    .single();

  if (!component) return NextResponse.json({ error: 'Componente no encontrado' }, { status: 404 });

  // Registrar reemplazo
  const { data: replacement, error: replErr } = await supabase
    .from('component_replacements')
    .insert({
      component_id,
      firearm_id,
      organization_id: profile.organization_id,
      replaced_by: user.id,
      shots_at_replacement: component.current_count,
      cost: cost ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (replErr) return NextResponse.json({ error: replErr.message }, { status: 500 });

  // Resetear contador del componente
  await supabase
    .from('firearm_components')
    .update({ current_count: 0, installed_date: new Date().toISOString().split('T')[0] })
    .eq('id', component_id);

  // Event log
  await supabase.from('event_log').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    event_type: 'component_replaced',
    entity_type: 'firearm_component',
    entity_id: component_id,
    payload: {
      firearm_id,
      component_name: component.name,
      shots_at_replacement: component.current_count,
      gunsmith_id: user.id,
    },
  });

  return NextResponse.json({ data: replacement }, { status: 201 });
}
