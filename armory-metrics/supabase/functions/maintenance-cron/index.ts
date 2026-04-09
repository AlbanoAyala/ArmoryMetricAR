// supabase/functions/maintenance-cron/index.ts
// Ejecutar diariamente con pg_cron o Supabase Scheduled Functions
// Identifica armas con uso intensivo y componentes críticos próximos al límite
// Envía alertas por email via Resend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'alertas@armorymetrics.ar';

interface FirearmAlert {
  firearm_id: string;
  firearm_name: string;
  owner_email: string;
  owner_name: string;
  org_id: string;
  alert_type: 'intensive_use' | 'component_critical' | 'maintenance_overdue';
  detail: string;
  shots_7d?: number;
  component_name?: string;
  component_pct?: number;
}

Deno.serve(async (_req: Request) => {
  console.log('[maintenance-cron] Iniciando verificación de mantenimiento...');
  const alerts: FirearmAlert[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // ── 1. Uso intensivo: >400 disparos en 7 días ────────────────────────────
  const { data: intensiveUsage, error: err1 } = await supabase.rpc(
    'get_intensive_use_firearms',
    { since_date: sevenDaysAgo, threshold: 400 }
  );

  if (err1) {
    console.error('[maintenance-cron] Error en uso intensivo:', err1);
  } else if (intensiveUsage) {
    for (const row of intensiveUsage as Array<{
      firearm_id: string;
      firearm_name: string;
      owner_email: string;
      owner_name: string;
      org_id: string;
      shots_7d: number;
    }>) {
      alerts.push({
        ...row,
        alert_type: 'intensive_use',
        detail: `${row.shots_7d} disparos en los últimos 7 días (umbral: 400)`,
        shots_7d: row.shots_7d,
      });
    }
  }

  // ── 2. Componentes críticos al 85%+ de vida útil ─────────────────────────
  const { data: criticalComponents, error: err2 } = await supabase
    .from('firearm_components')
    .select(`
      id, name, current_count, lifespan_threshold, firearm_id,
      firearms!inner(
        id, name, owner_id,
        profiles!owner_id(full_name, email, organization_id)
      )
    `)
    .filter('is_critical', 'eq', true);

  if (err2) {
    console.error('[maintenance-cron] Error en componentes:', err2);
  } else if (criticalComponents) {
    for (const comp of criticalComponents as Array<{
      id: string;
      name: string;
      current_count: number;
      lifespan_threshold: number;
      firearm_id: string;
      firearms: {
        id: string;
        name: string;
        owner_id: string;
        profiles: { full_name: string; email: string; organization_id: string };
      };
    }>) {
      const pct = (comp.current_count / comp.lifespan_threshold) * 100;
      if (pct >= 85) {
        const fw = comp.firearms;
        const owner = fw.profiles;
        alerts.push({
          firearm_id: fw.id,
          firearm_name: fw.name,
          owner_email: owner.email,
          owner_name: owner.full_name,
          org_id: owner.organization_id,
          alert_type: 'component_critical',
          detail: `${comp.name} al ${Math.round(pct)}% de vida útil (${comp.current_count.toLocaleString()}/${comp.lifespan_threshold.toLocaleString()} disp.)`,
          component_name: comp.name,
          component_pct: Math.round(pct),
        });
      }
    }
  }

  // ── 3. Procesar alertas y enviar emails ───────────────────────────────────
  const results: Array<{ alert: FirearmAlert; success: boolean; error?: string }> = [];

  for (const alert of alerts) {
    try {
      // Insertar en tabla de alertas
      const { error: alertErr } = await supabase.from('alerts').insert({
        organization_id: alert.org_id,
        user_id: await getUserIdByEmail(alert.owner_email),
        firearm_id: alert.firearm_id,
        severity: alert.alert_type === 'intensive_use' ? 'warning' : 'critical',
        status: 'unread',
        title: getAlertTitle(alert.alert_type),
        message: `${alert.firearm_name}: ${alert.detail}`,
      });

      if (alertErr) throw alertErr;

      // Registrar en event_log
      const actorId = await getUserIdByEmail(alert.owner_email);
      await supabase.from('event_log').insert({
        organization_id: alert.org_id,
        actor_id: actorId,
        event_type: 'alert_generated',
        entity_type: 'firearm',
        entity_id: alert.firearm_id,
        payload: {
          alert_type: alert.alert_type,
          detail: alert.detail,
          auto_generated: true,
        },
      });

      // Enviar email
      const emailResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: [alert.owner_email],
        subject: `⚠ ArmoryMetrics AR — ${getAlertTitle(alert.alert_type)}: ${alert.firearm_name}`,
        html: buildEmailHtml(alert),
      });

      if (emailResult.error) throw new Error(emailResult.error.message);

      results.push({ alert, success: true });
      console.log(`[maintenance-cron] ✓ Alerta enviada a ${alert.owner_email} — ${alert.firearm_name}`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      results.push({ alert, success: false, error: errMsg });
      console.error(`[maintenance-cron] ✗ Error procesando alerta:`, errMsg);
    }
  }

  const summary = {
    processed: alerts.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    timestamp: new Date().toISOString(),
  };

  console.log('[maintenance-cron] Completado:', summary);

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────
async function getUserIdByEmail(email: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  return data?.id ?? '00000000-0000-0000-0000-000000000000';
}

function getAlertTitle(type: FirearmAlert['alert_type']): string {
  const titles = {
    intensive_use: 'Uso intensivo detectado',
    component_critical: 'Componente crítico al límite',
    maintenance_overdue: 'Mantenimiento vencido',
  };
  return titles[type];
}

function buildEmailHtml(alert: FirearmAlert): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Courier New', monospace; background: #0c111d; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .header { border-bottom: 1px solid #1e293b; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { color: #f97316; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .alert-box { background: #0f172a; border: 1px solid ${alert.alert_type === 'intensive_use' ? '#f59e0b44' : '#ef444444'}; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .severity { color: ${alert.alert_type === 'intensive_use' ? '#f59e0b' : '#ef4444'}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
    .firearm { color: #f97316; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    .detail { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .cta { display: inline-block; background: #f97316; color: #0c111d; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
    .footer { color: #334155; font-size: 11px; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ARMORY<span style="color:#64748b">METRICS</span> AR</div>
      <div style="color:#475569; font-size:12px; margin-top:4px;">Sistema de alerta automática</div>
    </div>
    <p style="color:#94a3b8;">Hola <strong style="color:#e2e8f0;">${alert.owner_name}</strong>,</p>
    <p style="color:#94a3b8;">El sistema detectó la siguiente condición que requiere tu atención:</p>
    <div class="alert-box">
      <div class="severity">⚠ ${getAlertTitle(alert.alert_type)}</div>
      <div class="firearm">${alert.firearm_name}</div>
      <div class="detail">${alert.detail}</div>
    </div>
    ${alert.alert_type === 'intensive_use' ? `
    <p style="color:#94a3b8; font-size:14px;">
      Se recomienda realizar una limpieza completa y verificar el estado de los componentes críticos
      antes de la próxima sesión de tiro.
    </p>
    ` : `
    <p style="color:#94a3b8; font-size:14px;">
      Contactá a tu armero de confianza para programar el reemplazo del componente antes de continuar el uso del arma.
    </p>
    `}
    <a href="${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard" class="cta">Ver en ArmoryMetrics AR →</a>
    <div class="footer">
      <p>Este mensaje fue generado automáticamente por ArmoryMetrics AR.</p>
      <p>Cumplimiento ANMaC/RENAVE — Sistema de trazabilidad de armas de fuego.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
