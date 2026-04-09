'use client';
// alerts/page.tsx
import { useState } from 'react';
import { Card, SectionLabel, Badge } from '@/components/ui';

const ALERTS = [
  { id: 'a1', severity: 'critical', firearm: 'Colt Python .357', title: 'Sobrepresión detectada', message: 'Velocidades fuera del umbral estadístico en sesión 15-Mar. Revisar carga de pólvora y vainas.', date: '2026-03-18', status: 'unread' },
  { id: 'a2', severity: 'warning', firearm: 'Glock 17 Gen5', title: 'Componente crítico al límite', message: 'Aguja percutora al 84% de vida útil (4.230/5.000 disparos). Programar reemplazo preventivo.', date: '2026-03-25', status: 'unread' },
  { id: 'a3', severity: 'warning', firearm: 'Glock 17 Gen5', title: 'Uso intensivo detectado', message: 'El arma registró más de 400 disparos en los últimos 7 días. Se recomienda inspección.', date: '2026-02-20', status: 'read' },
  { id: 'a4', severity: 'info', firearm: 'Remington 700', title: 'Mantenimiento programado', message: 'Próximo mantenimiento estimado en ~110 disparos según la configuración de familia bolt_rifle.', date: '2026-03-21', status: 'read' },
  { id: 'a5', severity: 'info', firearm: 'Inventario', title: 'Stock bajo: Hodgdon H4350', message: 'Stock actual: 380g — punto de reorden: 500g. Considerar reabastecimiento.', date: '2026-04-01', status: 'unread' },
];

const SV_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  critical: { color: '#ef4444', dot: '#ef4444', label: 'CRÍTICO' },
  warning:  { color: '#f59e0b', dot: '#f59e0b', label: 'ALERTA' },
  info:     { color: '#3b82f6', dot: '#3b82f6', label: 'INFO' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(ALERTS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? alerts.filter(a => a.status === 'unread') : alerts;
  const unreadCount = alerts.filter(a => a.status === 'unread').length;

  const markRead = (id: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' } : a));

  const dismiss = (id: string) =>
    setAlerts(prev => prev.filter(a => a.id !== id));

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: '#0f172a', borderRadius: 10, padding: 4 }}>
          {([['all', `Todas (${alerts.length})`], ['unread', `Sin leer (${unreadCount})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: filter === k ? '#1e293b' : 'transparent',
              color: filter === k ? '#f97316' : '#64748b',
              cursor: 'pointer', fontSize: 12, letterSpacing: 1, fontFamily: 'monospace',
            }}>{l}</button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => setAlerts(prev => prev.map(a => ({ ...a, status: 'read' })))} style={{
            background: 'transparent', border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 16px', color: '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
          }}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>Sin alertas en esta categoría</div>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(a => {
          const sv = SV_CONFIG[a.severity];
          return (
            <div key={a.id} style={{
              background: '#0f172a',
              border: `1px solid ${a.status === 'unread' ? sv.color + '44' : '#1e293b'}`,
              borderRadius: 12, padding: 20,
              opacity: a.status === 'read' ? 0.6 : 1,
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: sv.dot, marginTop: 6, flexShrink: 0, boxShadow: a.status === 'unread' ? `0 0 8px ${sv.dot}` : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <Badge variant={a.severity as 'critical' | 'warning' | 'info'}>{sv.label}</Badge>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{a.firearm}</span>
                    {a.status === 'unread' && <Badge variant="neutral">NUEVA</Badge>}
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, fontFamily: 'sans-serif' }}>{a.message}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace' }}>{a.date}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {a.status === 'unread' && (
                      <button onClick={() => markRead(a.id)} style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
                        Leída
                      </button>
                    )}
                    <button onClick={() => dismiss(a.id)} style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', color: '#475569', cursor: 'pointer', fontSize: 11 }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
