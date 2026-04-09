'use client';

import { useState } from 'react';
import { Card, SectionLabel, Badge, VelocityChart, MoaScatter } from '@/components/ui';
import { calculateBallisticStats } from '@/lib/data-science';

const SESSIONS = [
  { id: 's1', date: '2026-03-28', firearm: 'Glock 17 Gen5', range: 'Polígono Fed.', batch: 'R-2026-001', temp: 22, humidity: 55, altitude: 25 },
  { id: 's2', date: '2026-03-21', firearm: 'Remington 700', range: 'Club Palermo', batch: 'C-FEDE-44', temp: 18, humidity: 62, altitude: 25 },
  { id: 's3', date: '2026-03-15', firearm: 'Colt Python .357', range: 'Polígono Fed.', batch: 'R-2026-002', temp: 24, humidity: 50, altitude: 25 },
];

const BALLISTICS = [
  { session_id: 's1', velocities: [375, 378, 372, 380, 376, 374, 379, 377, 373, 381], moaX: [-0.3, 0.5, -0.1, 0.8, -0.6, 0.2, 0.4, -0.4, 0.1, -0.2], moaY: [0.2, -0.3, 0.6, -0.5, 0.3, -0.1, 0.4, -0.2, 0.5, -0.4], primer_flattened: false, ejector_mark: false, sticky_bolt: false },
  { session_id: 's2', velocities: [860, 855, 862, 858, 864, 857, 861, 859, 863, 856], moaX: [-0.1, 0.2, 0.0, -0.3, 0.2, 0.1, -0.2, 0.3, 0.0, -0.1], moaY: [0.1, -0.1, 0.3, -0.2, 0.0, 0.2, -0.3, 0.1, 0.2, -0.1], primer_flattened: false, ejector_mark: false, sticky_bolt: false },
  { session_id: 's3', velocities: [430, 444, 428, 450, 432, 446, 429, 448, 431, 443], moaX: [-0.8, 1.2, -0.5, 1.5, -0.9, 1.0, -0.6, 1.3, -0.7, 0.9], moaY: [0.6, -0.8, 0.9, -1.2, 0.7, -0.9, 0.8, -1.0, 0.5, -0.7], primer_flattened: true, ejector_mark: true, sticky_bolt: false },
];

export default function BallisticsPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const session = SESSIONS[selectedIdx];
  const ballData = BALLISTICS.find(b => b.session_id === session.id);
  const stats = ballData ? calculateBallisticStats(ballData.velocities) : null;
  const physicalSigns = ballData ? [ballData.primer_flattened, ballData.ejector_mark, ballData.sticky_bolt].filter(Boolean).length : 0;
  const hasAnomaly = (stats?.anomaly_detected ?? false) || physicalSigns >= 2;

  return (
    <div className="animate-fade-in">
      {/* Session selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {SESSIONS.map((s, i) => (
          <button key={s.id} onClick={() => setSelectedIdx(i)} style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${selectedIdx === i ? '#10b981' : '#1e293b'}`,
            background: selectedIdx === i ? '#10b98122' : 'transparent',
            color: selectedIdx === i ? '#10b981' : '#64748b',
            fontSize: 12, fontFamily: 'monospace', transition: 'all 0.2s',
          }}>
            {s.date} — {s.firearm}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Condiciones */}
        <Card>
          <SectionLabel>Condiciones — {session.date}</SectionLabel>
          {[
            ['Arma', session.firearm],
            ['Polígono', session.range],
            ['Temperatura', `${session.temp} °C`],
            ['Humedad', `${session.humidity}%`],
            ['Altitud', `${session.altitude} m.s.n.m.`],
            ['Lote', session.batch],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #0f172a' }}>
              <span style={{ color: '#475569', fontSize: 12 }}>{l}</span>
              <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </Card>

        {/* Estadísticas */}
        <Card>
          <SectionLabel>Estadísticas balísticas</SectionLabel>
          {stats ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  ['Velocidad media', `${stats.mean} m/s`],
                  ['Desv. Estándar', `${stats.sd} m/s`],
                  ['Extreme Spread', `${stats.es} m/s`],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: '#0c111d', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ color: '#475569', fontSize: 10, marginBottom: 4 }}>{l}</div>
                    <div style={{ color: '#10b981', fontSize: 15, fontFamily: 'monospace', fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <VelocityChart velocities={ballData!.velocities} width={320} height={90} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {stats.anomaly_detected && <Badge variant="critical">⚠ ANOMALÍA DETECTADA</Badge>}
                <Badge variant={stats.sd < 5 ? 'ok' : stats.sd < 10 ? 'warning' : 'critical'}>
                  DS {stats.sd < 5 ? 'EXCELENTE' : stats.sd < 10 ? 'ACEPTABLE' : 'ALTA'}
                </Badge>
              </div>
            </>
          ) : <div style={{ color: '#475569' }}>Sin datos de cronógrafo</div>}
        </Card>
      </div>

      {ballData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* MOA Scatter */}
          <Card>
            <SectionLabel>Dispersión (MOA) — {ballData.velocities.length} disparos</SectionLabel>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <MoaScatter moaX={ballData.moaX} moaY={ballData.moaY} size={220} />
            </div>
          </Card>

          {/* Pressure signs */}
          <Card accent={hasAnomaly ? 'red' : 'none'}>
            <SectionLabel>Signos de sobrepresión</SectionLabel>
            {hasAnomaly ? (
              <>
                <div style={{ color: '#ef4444', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>⚠ SOBREPRESIÓN DETECTADA</div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16, fontFamily: 'sans-serif' }}>
                  Velocidades fuera del umbral estadístico (μ + 2.5σ) y/o signos físicos presentes.
                  Revisar carga de pólvora y verificar vainas.
                </p>
              </>
            ) : (
              <>
                <div style={{ color: '#10b981', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>✓ Sin anomalías detectadas</div>
                <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                  Todas las velocidades dentro del rango normal (μ ± 2.5σ). No se detectaron signos físicos de sobrepresión.
                </p>
              </>
            )}
            {[
              ['Fulminante aplastado', ballData.primer_flattened],
              ['Marca de extractor', ballData.ejector_mark],
              ['Cerrojo duro', ballData.sticky_bolt],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
                <span style={{ color: val ? '#ef4444' : '#10b981', fontSize: 16 }}>{val ? '●' : '○'}</span>
                <span style={{ color: val ? '#ef4444' : '#475569', fontSize: 13 }}>{String(label)}</span>
                <Badge variant={val ? 'critical' : 'ok'}>{val ? 'PRESENTE' : 'AUSENTE'}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
