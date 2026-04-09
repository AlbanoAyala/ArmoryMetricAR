'use client';

import { useState } from 'react';
import { Card, SectionLabel, Button, Badge } from '@/components/ui';

const DEMO_FIREARMS = [
  { id: 'f1', name: 'Glock 17 Gen5', caliber: '9mm Para' },
  { id: 'f2', name: 'Remington 700', caliber: '.308 Win' },
  { id: 'f3', name: 'Colt Python .357', caliber: '.357 Mag' },
];

const DEMO_BATCHES = [
  { id: 'b1', batch_code: 'R-2026-001', recipe: '9mm IPSC Standard', qty: 342 },
  { id: 'b2', batch_code: 'R-2026-002', recipe: '9mm IPSC Standard', qty: 0 },
  { id: 'b3', batch_code: 'C-FEDE-44', recipe: 'Comercial .308', qty: 80 },
];

const DEMO_SESSIONS = [
  { id: 's1', date: '2026-03-28', firearm: 'Glock 17 Gen5', shots: 150, range: 'Polígono Fed. de Tiro', batch: 'R-2026-001', temp: 22 },
  { id: 's2', date: '2026-03-21', firearm: 'Remington 700', shots: 40, range: 'Club de Tiro Palermo', batch: 'C-FEDE-44', temp: 18 },
  { id: 's3', date: '2026-03-15', firearm: 'Colt Python .357', shots: 60, range: 'Polígono Fed. de Tiro', batch: 'R-2026-002', temp: 24 },
];

const inputStyle: React.CSSProperties = {
  background: '#0c111d', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 14px', color: '#e2e8f0', fontSize: 13, width: '100%', fontFamily: 'monospace', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  color: '#64748b', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block',
};

export default function ShotLoggerPage() {
  const [form, setForm] = useState({
    firearm_id: 'f1', batch_id: 'b1', range_name: '',
    total_shots: '', temperature_c: '', humidity_pct: '', altitude_m: '', notes: '',
  });
  const [velocities, setVelocities] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.firearm_id || !form.range_name || !form.total_shots) {
      setError('Arma, campo de tiro y cantidad de disparos son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const parsedVelocities = velocities.trim()
        ? velocities.split(/[\s,;]+/).map(v => parseFloat(v)).filter(n => !isNaN(n))
        : [];

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          total_shots: parseInt(form.total_shots),
          temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
          humidity_pct: form.humidity_pct ? parseInt(form.humidity_pct) : null,
          altitude_m: form.altitude_m ? parseInt(form.altitude_m) : null,
          velocities: parsedVelocities,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setForm({ firearm_id: 'f1', batch_id: 'b1', range_name: '', total_shots: '', temperature_c: '', humidity_pct: '', altitude_m: '', notes: '' });
      setVelocities('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Form */}
        <Card style={{ gridColumn: '1/-1' }}>
          <SectionLabel>// Nueva sesión de tiro</SectionLabel>

          {error && (
            <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}
          {saved && (
            <div style={{ background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#10b981', fontSize: 13 }}>
              ✓ Sesión registrada. Contadores de componentes actualizados.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Arma *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.firearm_id} onChange={set('firearm_id')}>
                {DEMO_FIREARMS.map(f => <option key={f.id} value={f.id}>{f.name} — {f.caliber}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Lote de munición</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.batch_id} onChange={set('batch_id')}>
                <option value="">Sin lote (munición comercial)</option>
                {DEMO_BATCHES.map(b => (
                  <option key={b.id} value={b.id} disabled={b.qty === 0}>
                    {b.batch_code} — {b.recipe} ({b.qty} restantes){b.qty === 0 ? ' [AGOTADO]' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Campo / Polígono de tiro *</label>
              <input style={inputStyle} value={form.range_name} onChange={set('range_name')} placeholder="Ej: Polígono Federal de Tiro" />
            </div>
            <div>
              <label style={labelStyle}>Cantidad de disparos *</label>
              <input type="number" style={inputStyle} value={form.total_shots} onChange={set('total_shots')} placeholder="Ej: 150" min="1" />
            </div>
            <div>
              <label style={labelStyle}>Temperatura (°C)</label>
              <input type="number" style={inputStyle} value={form.temperature_c} onChange={set('temperature_c')} placeholder="22" />
            </div>
            <div>
              <label style={labelStyle}>Humedad (%)</label>
              <input type="number" style={inputStyle} value={form.humidity_pct} onChange={set('humidity_pct')} placeholder="55" min="0" max="100" />
            </div>
            <div>
              <label style={labelStyle}>Altitud (m.s.n.m.)</label>
              <input type="number" style={inputStyle} value={form.altitude_m} onChange={set('altitude_m')} placeholder="25" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Velocidades cronógrafo (m/s) — opcional</label>
              <input style={inputStyle} value={velocities} onChange={e => setVelocities(e.target.value)} placeholder="375, 378, 372, 380, 376... (separados por coma o espacio)" />
              <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>
                Si ingresás velocidades, se calculará SD, ES y se detectará sobrepresión automáticamente.
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Notas de sesión</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Condiciones especiales, observaciones, etc." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'REGISTRANDO...' : '✓ REGISTRAR SESIÓN'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent sessions */}
      <Card>
        <SectionLabel>Sesiones recientes</SectionLabel>
        {DEMO_SESSIONS.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #0f172a' }}>
            <span style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace', minWidth: 90 }}>{s.date}</span>
            <span style={{ color: '#94a3b8', flex: 1, fontSize: 13 }}>{s.firearm}</span>
            <span style={{ color: '#f97316', fontSize: 14, fontFamily: 'monospace', fontWeight: 700 }}>{s.shots}</span>
            <span style={{ color: '#475569', fontSize: 11 }}>disp.</span>
            <span style={{ color: '#64748b', fontSize: 12, flex: 1 }}>{s.range}</span>
            <span style={{ color: '#475569', fontSize: 11 }}>{s.temp}°C</span>
            <Badge variant="neutral">{s.batch}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
