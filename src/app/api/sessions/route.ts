import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calculateBallisticStats } from '@/lib/data-science';

// GET /api/sessions
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const firearmId = searchParams.get('firearm_id');

  let query = supabase
    .from('shooting_sessions')
    .select('*, firearms(name, caliber, family), reload_batches(batch_code)')
    .order('session_date', { ascending: false })
    .limit(50);

  if (firearmId) query = query.eq('firearm_id', firearmId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/sessions — nueva sesión de tiro (ACID via RPC)
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { firearm_id, batch_id, range_name, total_shots, temperature_c, humidity_pct, altitude_m, notes, velocities } = body;

  if (!firearm_id || !range_name || !total_shots) {
    return NextResponse.json({ error: 'Campos obligatorios: firearm_id, range_name, total_shots' }, { status: 422 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

  // Crear sesión via RPC ACID
  const { data: sessionId, error: rpcError } = await supabase.rpc('register_shooting_session', {
    p_firearm_id:   firearm_id,
    p_shooter_id:   user.id,
    p_batch_id:     batch_id ?? null,
    p_range_name:   range_name,
    p_total_shots:  total_shots,
    p_temperature:  temperature_c ?? null,
    p_humidity:     humidity_pct ?? null,
    p_altitude:     altitude_m ?? null,
    p_notes:        notes ?? null,
    p_org_id:       profile.organization_id,
  });

  if (rpcError) {
    if (rpcError.message === 'insufficient_batch_stock') {
      return NextResponse.json({ error: 'Stock insuficiente en el lote seleccionado' }, { status: 409 });
    }
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  // Si hay velocidades del cronógrafo, calcular estadísticas y guardar
  if (velocities && Array.isArray(velocities) && velocities.length > 0) {
    const stats = calculateBallisticStats(velocities);
    await supabase.from('ballistic_records').insert({
      session_id:        sessionId,
      firearm_id,
      organization_id:   profile.organization_id,
      velocities_raw:    velocities,
      velocity_mean_ms:  stats.mean,
      velocity_sd_ms:    stats.sd,
      velocity_es_ms:    stats.es,
      anomaly_detected:  stats.anomaly_detected,
      anomaly_details:   stats.anomaly_detected ? `Anomalías: ${stats.anomalies.join(', ')} m/s` : null,
    });

    // Alerta si hay anomalía de sobrepresión
    if (stats.anomaly_detected) {
      await supabase.from('alerts').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        firearm_id,
        severity: 'critical',
        status: 'unread',
        title: 'Sobrepresión detectada',
        message: `Velocidades fuera del umbral estadístico (μ + 2.5σ) en sesión del ${new Date().toLocaleDateString('es-AR')}`,
      });
    }
  }

  return NextResponse.json({ data: { session_id: sessionId } }, { status: 201 });
}
