import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Firearm } from '@/types';

// GET /api/firearms — lista de armas del org
export async function GET(_req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('firearms')
    .select('*, profiles!owner_id(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/firearms — registrar nueva arma
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<Firearm>;

  // Validaciones críticas ANMaC
  if (!body.serial_number) {
    return NextResponse.json({ error: 'N° de serie obligatorio (ANMaC)' }, { status: 422 });
  }
  if (!body.name || !body.caliber || !body.family) {
    return NextResponse.json({ error: 'Campos obligatorios: name, caliber, family' }, { status: 422 });
  }

  // Obtener org del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const { data: firearm, error } = await supabase
    .from('firearms')
    .insert({
      ...body,
      owner_id: user.id,
      organization_id: profile.organization_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'N° de serie ya registrado en esta organización' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Event log
  await supabase.from('event_log').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    event_type: 'firearm_registered',
    entity_type: 'firearm',
    entity_id: firearm.id,
    payload: { name: firearm.name, serial: firearm.serial_number, family: firearm.family },
  });

  // Crear componentes según familia
  const weaponConfig = await import('@/lib/weapon-families.config.json');
  const familyConfig = weaponConfig[body.family as keyof typeof weaponConfig];
  if (familyConfig?.critical_components) {
    const components = familyConfig.critical_components.map((c: { name: string; lifespan_shots: number; weight: number; is_critical: boolean }) => ({
      firearm_id: firearm.id,
      organization_id: profile.organization_id,
      name: c.name,
      lifespan_threshold: c.lifespan_shots,
      weight_in_health_score: c.weight,
      is_critical: c.is_critical,
      current_count: 0,
    }));
    await supabase.from('firearm_components').insert(components);
  }

  return NextResponse.json({ data: firearm }, { status: 201 });
}
