'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SectionLabel, Button } from '@/components/ui';
import type { FirearmFamily } from '@/types';
import weaponConfig from '@/lib/weapon-families.config.json';

interface FormData {
  name: string;
  brand: string;
  model: string;
  family: FirearmFamily;
  caliber: string;
  serial_number: string;
  manufacture_year: string;
  anmac_registration: string;
  notes: string;
}

const INITIAL: FormData = {
  name: '', brand: '', model: '',
  family: 'pistol_striker',
  caliber: '', serial_number: '',
  manufacture_year: '', anmac_registration: '', notes: '',
};

const inputStyle: React.CSSProperties = {
  background: '#0c111d', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 14px', color: '#e2e8f0', fontSize: 13, width: '100%',
  fontFamily: 'monospace', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: '#64748b', fontSize: 11, letterSpacing: 1,
  textTransform: 'uppercase', marginBottom: 6, display: 'block',
};

export default function NewFirearmPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  const selectedFamily = weaponConfig[form.family as keyof typeof weaponConfig];

  const handleSubmit = async () => {
    setError(null);
    if (!form.serial_number.trim()) { setError('N° de serie obligatorio (ANMaC)'); return; }
    if (!form.name.trim() || !form.caliber.trim()) { setError('Nombre y calibre son obligatorios'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/firearms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          manufacture_year: form.manufacture_year ? parseInt(form.manufacture_year) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al registrar');
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <Card>
        <SectionLabel>// Alta de arma de fuego — ANMaC compliant</SectionLabel>

        {error && (
          <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#10b981', fontSize: 13 }}>
            ✓ Arma registrada exitosamente. Redirigiendo...
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Nombre / Apodo *</label>
            <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Ej: Glock 17 Gen5" />
          </div>
          <div>
            <label style={labelStyle}>Familia de arma *</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.family} onChange={set('family')}>
              {Object.entries(weaponConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Marca</label>
            <input style={inputStyle} value={form.brand} onChange={set('brand')} placeholder="Ej: Glock" />
          </div>
          <div>
            <label style={labelStyle}>Modelo</label>
            <input style={inputStyle} value={form.model} onChange={set('model')} placeholder="Ej: 17 Gen5" />
          </div>
          <div>
            <label style={labelStyle}>Calibre *</label>
            <input style={inputStyle} value={form.caliber} onChange={set('caliber')} placeholder="Ej: 9mm Parabellum" />
          </div>
          <div>
            <label style={labelStyle}>N° de Serie * (ANMaC)</label>
            <input style={inputStyle} value={form.serial_number} onChange={set('serial_number')} placeholder="Obligatorio — sin serie no se puede registrar" />
          </div>
          <div>
            <label style={labelStyle}>Año de fabricación</label>
            <input type="number" style={inputStyle} value={form.manufacture_year} onChange={set('manufacture_year')} placeholder="Ej: 2021" min="1850" max={new Date().getFullYear()} />
          </div>
          <div>
            <label style={labelStyle}>Registro ANMaC</label>
            <input style={inputStyle} value={form.anmac_registration} onChange={set('anmac_registration')} placeholder="Ej: REG-2024-00123" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notas adicionales</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Modificaciones, historial previo, etc." />
          </div>
        </div>

        {/* Configuración automática por familia */}
        {selectedFamily && (
          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ color: '#3b82f6', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Configuración automática — {selectedFamily.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              {[
                ['Mantenimiento cada', `${selectedFamily.maintenance_interval_shots} disp.`],
                ['Intervalo máximo', `${selectedFamily.maintenance_interval_days} días`],
                ['Componentes a crear', `${selectedFamily.critical_components.length}`],
              ].map(([l, v]) => (
                <div key={l} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ color: '#475569', fontSize: 10, marginBottom: 4 }}>{l}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ color: '#334155', fontSize: 11 }}>
              Se crearán automáticamente {selectedFamily.critical_components.length} componentes con sus umbrales de vida útil configurados.
            </div>
          </div>
        )}

        <div style={{ background: '#0c111d', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 12, color: '#475569' }}>
          ℹ️ Conforme Resolución ANMaC: toda arma registrada debe poseer número de serie legible. Armas sin serie no pueden ser cargadas al sistema.
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={handleSubmit} disabled={saving || success}>
            {saving ? 'REGISTRANDO...' : '✓ REGISTRAR ARMA'}
          </Button>
          <Button variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
}
