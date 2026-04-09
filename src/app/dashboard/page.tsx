'use client';

import { useState } from 'react';
import { Card, SectionLabel, KpiCard, HealthGauge, MoaScatter, VelocityChart, ProgressBar, Badge } from '@/components/ui';
import weaponConfig from '@/lib/weapon-families.config.json';
import { calculateHealthScore } from '@/lib/data-science';
import type { FirearmFamily } from '@/types';

// ── Demo data (replaced by real Supabase queries in production) ───────────────
const FIREARMS = [
  { id: 'f1', name: 'Glock 17 Gen5', family: 'pistol_striker' as FirearmFamily, caliber: '9mm Para', serial: 'BKYW123', total_shots: 4230, last_maintenance: '2025-12-15' },
  { id: 'f2', name: 'Remington 700', family: 'bolt_rifle' as FirearmFamily, caliber: '.308 Win', serial: 'REM4521', total_shots: 890, last_maintenance: '2025-11-20' },
  { id: 'f3', name: 'Colt Python .357', family: 'revolver' as FirearmFamily, caliber: '.357 Mag', serial: 'CPY789', total_shots: 2100, last_maintenance: '2026-01-10' },
];

const COMPONENTS: Record<string, Array<{ id: string; name: string; current_count: number; lifespan_threshold: number; weight_in_health_score: number; is_critical: boolean; installed_date: string; updated_at: string }>> = {
  f1: [
    { id: 'c1', name: 'Cañón', current_count: 4230, lifespan_threshold: 20000, weight_in_health_score: 0.30, is_critical: true, installed_date: '2023-01-01', updated_at: '' },
    { id: 'c2', name: 'Aguja percutora', current_count: 4230, lifespan_threshold: 10000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2023-01-01', updated_at: '' },
    { id: 'c3', name: 'Resorte recuperador', current_count: 730, lifespan_threshold: 5000, weight_in_health_score: 0.20, is_critical: true, installed_date: '2025-06-01', updated_at: '' },
    { id: 'c4', name: 'Extractor', current_count: 4230, lifespan_threshold: 15000, weight_in_health_score: 0.15, is_critical: true, installed_date: '2023-01-01', updated_at: '' },
    { id: 'c5', name: 'Muelle de disparo', current_count: 4230, lifespan_threshold: 8000, weight_in_health_score: 0.10, is_critical: false, installed_date: '2023-01-01', updated_at: '' },
  ],
  f2: [
    { id: 'c6', name: 'Cañón', current_count: 890, lifespan_threshold: 3000, weight_in_health_score: 0.35, is_critical: true, installed_date: '2024-01-01', updated_at: '' },
    { id: 'c7', name: 'Cerrojo', current_count: 890, lifespan_threshold: 5000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2024-01-01', updated_at: '' },
    { id: 'c8', name: 'Aguja percutora', current_count: 890, lifespan_threshold: 6000, weight_in_health_score: 0.20, is_critical: true, installed_date: '2024-01-01', updated_at: '' },
    { id: 'c9', name: 'Extractor', current_count: 890, lifespan_threshold: 4000, weight_in_health_score: 0.12, is_critical: true, installed_date: '2024-01-01', updated_at: '' },
    { id: 'c10', name: 'Disparador', current_count: 890, lifespan_threshold: 8000, weight_in_health_score: 0.08, is_critical: false, installed_date: '2024-01-01', updated_at: '' },
  ],
  f3: [
    { id: 'c11', name: 'Cañón', current_count: 2100, lifespan_threshold: 15000, weight_in_health_score: 0.30, is_critical: true, installed_date: '2023-06-01', updated_at: '' },
    { id: 'c12', name: 'Aguja percutora', current_count: 100, lifespan_threshold: 8000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2025-10-01', updated_at: '' },
    { id: 'c13', name: 'Cilindro', current_count: 2100, lifespan_threshold: 20000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2023-06-01', updated_at: '' },
    { id: 'c14', name: 'Resorte principal', current_count: 200, lifespan_threshold: 5000, weight_in_health_score: 0.20, is_critical: true, installed_date: '2025-09-01', updated_at: '' },
  ],
};

const RECENT_SESSIONS = [
  { id: 's1', date: '2026-03-28', firearm: 'Glock 17 Gen5', shots: 150, range: 'Polígono Fed. de Tiro', batch: 'R-2026-001' },
  { id: 's2', date: '2026-03-21', firearm: 'Remington 700', shots: 40, range: 'Club de Tiro Palermo', batch: 'C-FEDE-44' },
  { id: 's3', date: '2026-03-15', firearm: 'Colt Python .357', shots: 60, range: 'Polígono Fed. de Tiro', batch: 'R-2026-002' },
  { id: 's4', date: '2026-03-08', firearm: 'Glock 17 Gen5', shots: 200, range: 'Campo de tiro Luján', batch: 'R-2026-001' },
];

const EVENT_LOG = [
  { id: 'e1', ts: '2026-03-28 16:42', actor: 'Albano R.', type: 'session_created', entity: 'Glock 17 Gen5', detail: '150 disparos — Polígono Fed.' },
  { id: 'e2', ts: '2026-03-25 10:15', actor: 'García H. (Armero)', type: 'component_replaced', entity: 'Glock 17 Gen5', detail: 'Resorte recuperador reemplazado (4.230 disp.)' },
  { id: 'e3', ts: '2026-03-21 14:30', actor: 'Albano R.', type: 'session_created', entity: 'Remington 700', detail: '40 disparos — Club Palermo' },
  { id: 'e4', ts: '2026-03-18 09:00', actor: 'Sistema', type: 'alert_generated', entity: 'Colt Python', detail: '⚠ Sobrepresión detectada — R-2026-002' },
  { id: 'e5', ts: '2026-03-10 08:45', actor: 'García H. (Armero)', type: 'clinical_note_added', entity: 'Colt Python', detail: 'Inspección completa. Aguja y resorte reemplazados.' },
];

const BALLISTIC_DEMO = {
  velocities: [375, 378, 372, 380, 376, 374, 379, 377, 373, 381],
  moaX: [-0.3, 0.5, -0.1, 0.8, -0.6, 0.2, 0.4, -0.4, 0.1, -0.2],
  moaY: [0.2, -0.3, 0.6, -0.5, 0.3, -0.1, 0.4, -0.2, 0.5, -0.4],
};

const EVENT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  alert_generated:    { bg: '#ef444422', color: '#ef4444', label: 'ALERTA' },
  component_replaced: { bg: '#f59e0b22', color: '#f59e0b', label: 'RECAMBIO' },
  clinical_note_added:{ bg: '#3b82f622', color: '#3b82f6', label: 'NOTA CLÍNICA' },
  session_created:    { bg: '#10b98122', color: '#10b981', label: 'SESIÓN' },
};

export default function DashboardPage() {
  const [selectedId, setSelectedId] = useState('f1');
  const selected = FIREARMS.find(f => f.id === selectedId)!;
  const comps = COMPONENTS[selectedId] ?? [];
  const cfg = weaponConfig[selected.family as keyof typeof weaponConfig];

  const daysSince = Math.floor(
    (Date.now() - new Date(selected.last_maintenance).getTime()) / 86400000
  );

  const healthBreakdown = calculateHealthScore(
    comps.map(c => ({
      ...c,
      organization_id: 'demo',
      firearm_id: selectedId,
      description: null,
      created_at: '',
    })),
    daysSince,
    cfg?.maintenance_interval_days ?? 90,
    false
  );

  const weekShots = RECENT_SESSIONS
    .filter(s => s.firearm === selected.name)
    .slice(0, 2)
    .reduce((a, s) => a + s.shots, 0);

  const lastBatch = RECENT_SESSIONS.find(s => s.firearm === selected.name)?.batch ?? '—';

  const nextMaint = Math.max(
    0,
    cfg?.maintenance_interval_shots - (selected.total_shots % cfg?.maintenance_interval_shots)
  );

  const healthColor = healthBreakdown.total >= 75 ? '#10b981'
    : healthBreakdown.total >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="animate-fade-in">
      {/* Firearm selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {FIREARMS.map(f => (
          <button key={f.id} onClick={() => setSelectedId(f.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${selectedId === f.id ? '#f97316' : '#1e293b'}`,
            background: selectedId === f.id ? '#f9731622' : 'transparent',
            color: selectedId === f.id ? '#f97316' : '#64748b',
            fontSize: 12, fontFamily: 'monospace', transition: 'all 0.2s',
          }}>
            {f.name}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Health Score" value={`${healthBreakdown.total}/100`} color={healthColor} highlight />
        <KpiCard label="Disparos esta semana" value={weekShots.toLocaleString('es-AR')} />
        <KpiCard label="Último lote" value={lastBatch} />
        <KpiCard label="Total acumulado" value={selected.total_shots.toLocaleString('es-AR')} />
        <KpiCard label="Próximo mantenimiento" value={`~${nextMaint} disp.`} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Health Gauge */}
        <Card>
          <SectionLabel>Health Score</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <HealthGauge score={healthBreakdown.total} size={140} />
            <div style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>{cfg?.label}</div>
            <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>
              {daysSince} días sin mantenimiento
            </div>
          </div>
        </Card>

        {/* Component wear */}
        <Card>
          <SectionLabel>Desgaste de componentes</SectionLabel>
          {comps.map(c => {
            const pct = Math.round((c.current_count / c.lifespan_threshold) * 100);
            return (
              <ProgressBar
                key={c.id}
                value={pct}
                label={c.name}
                sublabel={`${pct}%`}
                size="sm"
              />
            );
          })}
        </Card>

        {/* MOA Scatter */}
        <Card>
          <SectionLabel>Dispersión MOA — última sesión</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MoaScatter moaX={BALLISTIC_DEMO.moaX} moaY={BALLISTIC_DEMO.moaY} size={180} />
          </div>
        </Card>
      </div>

      {/* Velocity + Event log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, marginBottom: 24 }}>
        {/* Velocity chart */}
        <Card>
          <SectionLabel>Velocidades — cronógrafo</SectionLabel>
          <VelocityChart velocities={BALLISTIC_DEMO.velocities} width={280} height={90} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[
              ['Media', `${Math.round(BALLISTIC_DEMO.velocities.reduce((a, b) => a + b, 0) / BALLISTIC_DEMO.velocities.length)} m/s`],
              ['DS', '3.1 m/s'],
              ['ES', `${Math.max(...BALLISTIC_DEMO.velocities) - Math.min(...BALLISTIC_DEMO.velocities)} m/s`],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ color: '#475569', fontSize: 10 }}>{l}</div>
                <div style={{ color: '#10b981', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity log */}
        <Card>
          <SectionLabel>Activity log</SectionLabel>
          {EVENT_LOG.map(e => {
            const s = EVENT_COLORS[e.type] ?? EVENT_COLORS.session_created;
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
                <span style={{ color: '#1e293b', fontSize: 10, fontFamily: 'monospace', minWidth: 120, paddingTop: 2 }}>{e.ts}</span>
                <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{e.entity}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{e.detail}</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Recent sessions table */}
      <Card>
        <SectionLabel>Sesiones recientes</SectionLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Fecha', 'Arma', 'Disparos', 'Campo', 'Lote'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#334155', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_SESSIONS.map(s => (
              <tr key={s.id} style={{ borderTop: '1px solid #0f172a' }}>
                <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace' }}>{s.date}</td>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{s.firearm}</td>
                <td style={{ padding: '10px 12px', color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>{s.shots}</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{s.range}</td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="neutral">{s.batch}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
