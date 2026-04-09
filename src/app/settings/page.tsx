'use client';

import { useState } from 'react';
import { Card, SectionLabel, Button, Badge } from '@/components/ui';

const inputStyle: React.CSSProperties = {
  background: '#0c111d', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 14px', color: '#e2e8f0', fontSize: 13, width: '100%', fontFamily: 'monospace', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  color: '#64748b', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block',
};

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    full_name: 'Albano R.',
    email: 'albano@armorymetrics.ar',
    role: 'gunsmith',
    clu_number: '12345678',
    clu_expiry_date: '2027-06-30',
    anmac_license: 'ARM-ANMaC-00412',
    renave_code: 'RNV-AR-2024-00789',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProfile(p => ({ ...p, [k]: e.target.value }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const cluDaysLeft = Math.floor(
    (new Date(profile.clu_expiry_date).getTime() - Date.now()) / 86400000
  );

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Perfil */}
      <Card>
        <SectionLabel>// Perfil de usuario</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: '#0c111d', borderRadius: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f9731622', border: '2px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: 18, fontWeight: 700 }}>
            AR
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{profile.full_name}</div>
            <div style={{ color: '#475569', fontSize: 12 }}>{profile.role}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Badge variant="ok">ACTIVO</Badge>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input style={inputStyle} value={profile.full_name} onChange={set('full_name')} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={profile.email} onChange={set('email')} />
          </div>
          <div>
            <label style={labelStyle}>Rol en el sistema</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={profile.role} onChange={set('role')}>
              <option value="shooter">Tirador (shooter)</option>
              <option value="gunsmith">Armero (gunsmith)</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ANMaC */}
      <Card>
        <SectionLabel>// Credenciales ANMaC / RENAVE</SectionLabel>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>N° CLU (Credencial de Legítimo Usuario)</label>
            <input style={inputStyle} value={profile.clu_number} onChange={set('clu_number')} placeholder="8 dígitos" />
          </div>
          <div>
            <label style={labelStyle}>Vencimiento CLU</label>
            <input type="date" style={inputStyle} value={profile.clu_expiry_date} onChange={set('clu_expiry_date')} />
            <div style={{ marginTop: 6 }}>
              <Badge variant={cluDaysLeft < 90 ? 'warning' : 'ok'}>
                Vence en {cluDaysLeft} días
              </Badge>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Licencia Armero ANMaC</label>
            <input style={inputStyle} value={profile.anmac_license} onChange={set('anmac_license')} placeholder="ARM-ANMaC-XXXXX" />
          </div>
          <div>
            <label style={labelStyle}>Código RENAVE</label>
            <input style={inputStyle} value={profile.renave_code} onChange={set('renave_code')} placeholder="RNV-AR-XXXX-XXXXX" />
          </div>
        </div>
        {saved && (
          <div style={{ background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '10px 14px', margin: '16px 0', color: '#10b981', fontSize: 13 }}>
            ✓ Configuración guardada
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <Button onClick={handleSave}>GUARDAR CAMBIOS</Button>
        </div>
      </Card>

      {/* Organización */}
      <Card style={{ gridColumn: '1/-1' }}>
        <SectionLabel>// Organización</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            ['Nombre', 'ArmoryMetrics Demo'],
            ['Licencia ANMaC', 'ARM-ANMaC-DEMO-001'],
            ['Plan', 'Pro'],
            ['Usuarios', '3 / 10'],
            ['Armas registradas', '3'],
            ['Sesiones este mes', '7'],
          ].map(([l, v]) => (
            <div key={l} style={{ background: '#0c111d', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ color: '#475569', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
              <div style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notificaciones */}
      <Card style={{ gridColumn: '1/-1' }}>
        <SectionLabel>// Preferencias de notificaciones</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Alertas de sobrepresión', true],
            ['Componente al 85% de vida útil', true],
            ['Uso intensivo (>400 disp/7 días)', true],
            ['Stock por debajo del mínimo', false],
            ['Vencimiento de CLU (90 días antes)', true],
            ['Resumen semanal por email', false],
          ].map(([label, enabled]) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0c111d', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{String(label)}</span>
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: enabled ? '#f97316' : '#1e293b',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 2,
                  left: enabled ? 18 : 2, transition: 'left 0.2s',
                }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
