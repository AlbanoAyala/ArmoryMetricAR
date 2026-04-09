'use client';

import { useState } from 'react';
import { Card, SectionLabel, Badge, ProgressBar, HealthGauge, Button } from '@/components/ui';
import { calculateHealthScore } from '@/lib/data-science';

const FIREARMS = [
  { id: 'f1', name: 'Glock 17 Gen5', caliber: '9mm Para', serial: 'BKYW123', family: 'pistol_striker', total_shots: 4230, last_maintenance: '2025-12-15', manufacture_year: 2021 },
  { id: 'f2', name: 'Remington 700', caliber: '.308 Win', serial: 'REM4521', family: 'bolt_rifle', total_shots: 890, last_maintenance: '2025-11-20', manufacture_year: 2019 },
  { id: 'f3', name: 'Colt Python .357', caliber: '.357 Mag', serial: 'CPY789', family: 'revolver', total_shots: 2100, last_maintenance: '2026-01-10', manufacture_year: 1975 },
];

const COMPONENTS: Record<string, Array<{ id: string; name: string; current_count: number; lifespan_threshold: number; weight_in_health_score: number; is_critical: boolean; installed_date: string; replacements: number }>> = {
  f1: [
    { id: 'c1', name: 'Cañón', current_count: 4230, lifespan_threshold: 20000, weight_in_health_score: 0.30, is_critical: true, installed_date: '2021-03-01', replacements: 0 },
    { id: 'c2', name: 'Aguja percutora', current_count: 4230, lifespan_threshold: 10000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2021-03-01', replacements: 0 },
    { id: 'c3', name: 'Resorte recuperador', current_count: 730, lifespan_threshold: 5000, weight_in_health_score: 0.20, is_critical: true, installed_date: '2025-06-01', replacements: 1 },
    { id: 'c4', name: 'Extractor', current_count: 4230, lifespan_threshold: 15000, weight_in_health_score: 0.15, is_critical: true, installed_date: '2021-03-01', replacements: 0 },
    { id: 'c5', name: 'Muelle de disparo', current_count: 4230, lifespan_threshold: 8000, weight_in_health_score: 0.10, is_critical: false, installed_date: '2021-03-01', replacements: 0 },
  ],
  f2: [
    { id: 'c6', name: 'Cañón', current_count: 890, lifespan_threshold: 3000, weight_in_health_score: 0.35, is_critical: true, installed_date: '2024-01-01', replacements: 0 },
    { id: 'c7', name: 'Cerrojo', current_count: 890, lifespan_threshold: 5000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2024-01-01', replacements: 0 },
    { id: 'c8', name: 'Aguja percutora', current_count: 890, lifespan_threshold: 6000, weight_in_health_score: 0.20, is_critical: true, installed_date: '2024-01-01', replacements: 0 },
    { id: 'c9', name: 'Extractor', current_count: 890, lifespan_threshold: 4000, weight_in_health_score: 0.12, is_critical: true, installed_date: '2024-01-01', replacements: 0 },
  ],
  f3: [
    { id: 'c11', name: 'Cañón', current_count: 2100, lifespan_threshold: 15000, weight_in_health_score: 0.30, is_critical: true, installed_date: '2020-01-01', replacements: 0 },
    { id: 'c12', name: 'Aguja percutora', current_count: 100, lifespan_threshold: 8000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2025-10-01', replacements: 1 },
    { id: 'c13', name: 'Cilindro', current_count: 2100, lifespan_threshold: 20000, weight_in_health_score: 0.25, is_critical: true, installed_date: '2020-01-01', replacements: 0 },
    { id: 'c14', name: 'Resorte principal', current_count: 200, lifespan_threshold: 5000, weight_in_health_score: 0.20, is_critical: true, installed_date: '2025-09-01', replacements: 1 },
  ],
};

const CLINICAL_NOTES: Record<string, Array<{ id: string; date: string; gunsmith: string; license: string; content: string; components_replaced: string[]; shots: number }>> = {
  f1: [
    { id: 'n1', date: '2026-03-25 10:15', gunsmith: 'García, Héctor', license: 'ARM-ANMaC-00412', content: 'Resorte recuperador reemplazado por desgaste preventivo a 4.230 disparos. Canal del percutor limpiado. Extractor verificado sin desgaste apreciable. Arma lista para servicio activo.', components_replaced: ['Resorte recuperador'], shots: 4230 },
  ],
  f2: [],
  f3: [
    { id: 'n2', date: '2026-03-10 08:45', gunsmith: 'García, Héctor', license: 'ARM-ANMaC-00412', content: 'Inspección completa preventiva. Se detectó desgaste prematuro en aguja percutora (impactos irregulares en fulminantes). Resorte principal con fatiga visible. Ambos componentes reemplazados. Se recomienda reducir cargas calientes en próximas 200 rondas.', components_replaced: ['Aguja percutora', 'Resorte principal'], shots: 2000 },
    { id: 'n3', date: '2025-06-01 14:00', gunsmith: 'García, Héctor', license: 'ARM-ANMaC-00412', content: 'Primera inspección anual. Arma en buen estado general. Limpieza profunda realizada. Sin componentes que requieran reemplazo. Próxima revisión a las 2.500 rondas.', components_replaced: [], shots: 900 },
  ],
};

const TIMELINE: Record<string, Array<{ id: string; date: string; type: string; actor: string; detail: string }>> = {
  f1: [
    { id: 't1', date: '2026-03-28 16:42', type: 'session_created', actor: 'Albano R.', detail: '150 disparos — Polígono Fed. de Tiro' },
    { id: 't2', date: '2026-03-25 10:15', type: 'component_replaced', actor: 'García H. (Armero)', detail: 'Resorte recuperador reemplazado — 4.230 disp.' },
    { id: 't3', date: '2026-03-08 15:00', type: 'session_created', actor: 'Albano R.', detail: '200 disparos — Campo de tiro Luján' },
    { id: 't4', date: '2026-02-20 12:00', type: 'alert_generated', actor: 'Sistema', detail: '⚠ Uso intensivo: 400 disp. en 7 días' },
  ],
  f2: [
    { id: 't5', date: '2026-03-21 14:30', type: 'session_created', actor: 'Albano R.', detail: '40 disparos — Club de Tiro Palermo' },
    { id: 't6', date: '2025-11-20 09:00', type: 'session_created', actor: 'Albano R.', detail: 'Mantenimiento preventivo realizado' },
  ],
  f3: [
    { id: 't7', date: '2026-03-18 09:00', type: 'alert_generated', actor: 'Sistema', detail: '⚠ Sobrepresión detectada — lote R-2026-002' },
    { id: 't8', date: '2026-03-15 11:20', type: 'session_created', actor: 'Albano R.', detail: '60 disparos — Polígono Fed. de Tiro' },
    { id: 't9', date: '2026-03-10 08:45', type: 'clinical_note_added', actor: 'García H. (Armero)', detail: 'Inspección completa — Aguja y resorte reemplazados' },
  ],
};

const TL_COLORS: Record<string, string> = {
  alert_generated: '#ef4444',
  component_replaced: '#f59e0b',
  clinical_note_added: '#3b82f6',
  session_created: '#10b981',
};

export default function ClinicalPage() {
  const [selectedId, setSelectedId] = useState('f1');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const selected = FIREARMS.find(f => f.id === selectedId)!;
  const comps = COMPONENTS[selectedId] ?? [];
  const notes = CLINICAL_NOTES[selectedId] ?? [];
  const timeline = TIMELINE[selectedId] ?? [];

  const daysSince = Math.floor((Date.now() - new Date(selected.last_maintenance).getTime()) / 86400000);
  const healthBreakdown = calculateHealthScore(
    comps.map(c => ({ ...c, organization_id: '', firearm_id: selectedId, description: null, created_at: '', updated_at: '' })),
    daysSince, 90, false
  );

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    await new Promise(r => setTimeout(r, 800)); // demo delay
    setSavingNote(false);
    setNewNote('');
    alert('Nota clínica registrada y firmada digitalmente. Esta nota es inmutable.');
  };

  return (
    <div className="animate-fade-in">
      {/* Firearm selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {FIREARMS.map(f => (
          <button key={f.id} onClick={() => setSelectedId(f.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${selectedId === f.id ? '#10b981' : '#1e293b'}`,
            background: selectedId === f.id ? '#10b98122' : 'transparent',
            color: selectedId === f.id ? '#10b981' : '#64748b',
            fontSize: 12, fontFamily: 'monospace', transition: 'all 0.2s',
          }}>
            {f.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
        {/* Ficha técnica */}
        <Card>
          <SectionLabel>Ficha técnica</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <HealthGauge score={healthBreakdown.total} size={110} />
            <div style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>Health Score</div>
          </div>
          {[
            ['Modelo', selected.name],
            ['Calibre', selected.caliber],
            ['N° Serie', selected.serial],
            ['Fabricación', String(selected.manufacture_year)],
            ['Disp. totales', selected.total_shots.toLocaleString('es-AR')],
            ['Últ. mantenimiento', selected.last_maintenance],
            ['Días sin mant.', String(daysSince)],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #0f172a' }}>
              <span style={{ color: '#475569', fontSize: 11 }}>{l}</span>
              <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </Card>

        {/* Components */}
        <Card>
          <SectionLabel>Componentes — estado actual</SectionLabel>
          <div style={{ display: 'grid', gap: 12 }}>
            {comps.map(c => {
              const pct = Math.round((c.current_count / c.lifespan_threshold) * 100);
              const status = pct >= 85 ? 'critical' : pct >= 60 ? 'warning' : 'ok';
              return (
                <div key={c.id} style={{ background: '#0c111d', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#e2e8f0', fontSize: 13 }}>{c.name}</span>
                      {c.is_critical && <Badge variant="info">crítico</Badge>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {c.replacements > 0 && <Badge variant="warning">×{c.replacements} reemplazos</Badge>}
                      <Badge variant={status}>{pct}%</Badge>
                    </div>
                  </div>
                  <ProgressBar value={pct} size="sm" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace' }}>
                      {c.current_count.toLocaleString()} / {c.lifespan_threshold.toLocaleString()} disp.
                    </span>
                    <span style={{ color: '#334155', fontSize: 10 }}>
                      Instalado: {c.installed_date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Clinical notes */}
      {notes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Notas técnicas del armero — inmutables</SectionLabel>
          {notes.map(n => (
            <Card key={n.id} accent="blue" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>Armero: {n.gunsmith}</div>
                  <div style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>Lic. ANMaC: {n.license}</div>
                  <div style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>Inspección a {n.shots.toLocaleString()} disparos</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace' }}>{n.date}</div>
                  <div style={{ marginTop: 4 }}><Badge variant="ok">✓ FIRMADO</Badge></div>
                  <div style={{ marginTop: 4 }}><Badge variant="info">INMUTABLE</Badge></div>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: '0 0 12px', fontFamily: 'sans-serif' }}>{n.content}</p>
              {n.components_replaced.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#475569', fontSize: 11 }}>Piezas reemplazadas:</span>
                  {n.components_replaced.map(c => <Badge key={c} variant="warning">{c}</Badge>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add new note (gunsmith only) */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>// Nueva nota técnica del armero</SectionLabel>
        <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#475569' }}>
          🔒 Las notas técnicas son <strong style={{ color: '#3b82f6' }}>inmutables</strong> una vez guardadas. Solo armeros con licencia ANMaC pueden firmarlas.
        </div>
        <textarea
          style={{ background: '#0c111d', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, width: '100%', fontFamily: 'sans-serif', outline: 'none', minHeight: 100, resize: 'vertical', marginBottom: 12 }}
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Descripción de la intervención técnica, estado de componentes, recomendaciones..."
        />
        <Button onClick={handleSaveNote} disabled={savingNote || !newNote.trim()}>
          {savingNote ? 'FIRMANDO...' : '✒ FIRMAR Y GUARDAR NOTA'}
        </Button>
      </Card>

      {/* Timeline */}
      <Card>
        <SectionLabel>Timeline del arma</SectionLabel>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, background: '#1e293b' }} />
          {timeline.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 16, marginBottom: 16, paddingLeft: 44, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 10, top: 4,
                width: 13, height: 13, borderRadius: '50%',
                background: TL_COLORS[e.type] ?? '#64748b',
                border: '2px solid #0c111d',
              }} />
              <div>
                <div style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace' }}>{e.date}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{e.detail}</div>
                <div style={{ color: '#475569', fontSize: 11 }}>{e.actor}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
