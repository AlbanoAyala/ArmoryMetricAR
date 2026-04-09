import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calculateBallisticStats, calculateMoaGroupRadius } from '@/lib/data-science';

// GET /api/ballistics?firearm_id=...
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const firearmId = searchParams.get('firearm_id');
  const sessionId = searchParams.get('session_id');

  let query = supabase
    .from('ballistic_records')
    .select('*, shooting_sessions(session_date, range_name, total_shots)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (firearmId) query = query.eq('firearm_id', firearmId);
  if (sessionId) query = query.eq('session_id', sessionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/ballistics — guardar datos de cronógrafo + impactos
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    session_id, firearm_id, velocities, impacts,
    primer_flattened, ejector_mark, sticky_bolt,
    barrel_temp_c, distance_m,
  } = body;

  if (!session_id || !firearm_id) {
    return NextResponse.json({ error: 'session_id y firearm_id son obligatorios' }, { status: 422 });
  }

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

  // Calcular estadísticas
  const stats = velocities?.length > 0 ? calculateBallisticStats(velocities) : null;

  // Calcular grupo MOA
  const moaGroup = impacts?.length > 0
    ? calculateMoaGroupRadius(impacts.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })))
    : null;

  // Detectar sobrepresión combinada: velocidad + signos físicos
  const physicalSigns = [primer_flattened, ejector_mark, sticky_bolt].filter(Boolean).length;
  const anomalyDetected = (stats?.anomaly_detected ?? false) || physicalSigns >= 2;

  const { data, error } = await supabase
    .from('ballistic_records')
    .upsert({
      session_id,
      firearm_id,
      organization_id: profile.organization_id,
      velocities_raw:    velocities ?? [],
      velocity_mean_ms:  stats?.mean ?? null,
      velocity_sd_ms:    stats?.sd ?? null,
      velocity_es_ms:    stats?.es ?? null,
      primer_flattened:  primer_flattened ?? false,
      ejector_mark:      ejector_mark ?? false,
      sticky_bolt:       sticky_bolt ?? false,
      barrel_temp_c:     barrel_temp_c ?? null,
      distance_m:        distance_m ?? null,
      group_radius_moa:  moaGroup?.radius ?? null,
      group_center_x:    moaGroup?.center.x ?? null,
      group_center_y:    moaGroup?.center.y ?? null,
      anomaly_detected:  anomalyDetected,
      anomaly_details:   anomalyDetected
        ? `Velocidades anómalas: ${stats?.anomalies.join(', ')} m/s. Signos físicos: ${physicalSigns}`
        : null,
    }, { onConflict: 'session_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Event log si hay anomalía
  if (anomalyDetected) {
    await supabase.from('event_log').insert({
      organization_id: profile.organization_id,
      actor_id: user.id,
      event_type: 'anomaly_detected',
      entity_type: 'ballistic_record',
      entity_id: data.id,
      payload: { firearm_id, session_id, stats, physical_signs: physicalSigns },
    });
  }

  return NextResponse.json({ data, stats, moa_group: moaGroup }, { status: 201 });
}
