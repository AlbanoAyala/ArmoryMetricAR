'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Shield, Target, Stethoscope,
  FlaskConical, Activity, Bell, Settings, Menu, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/firearms/new',label: 'Alta de arma',     icon: Shield },
  { href: '/sessions/new',label: 'Carga de disparos',icon: Target },
  { href: '/clinical',    label: 'Historia clínica',  icon: Stethoscope },
  { href: '/reloading',   label: 'Reloading Lab',    icon: FlaskConical },
  { href: '/ballistics',  label: 'Balística',        icon: Activity },
  { href: '/alerts',      label: 'Alertas',          icon: Bell, badge: 3 },
  { href: '/settings',    label: 'Configuración',    icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: open ? 220 : 56,
          background: '#060a12',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 14px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={14} color="#0c111d" strokeWidth={2.5} />
          </div>
          {open && (
            <span style={{ color: '#f97316', fontSize: 12, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap' }}>
              ARMORY<span style={{ color: '#64748b' }}>METRICS</span>
            </span>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 4, flexShrink: 0 }}
            aria-label="Toggle sidebar"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: active ? '#f9731611' : 'transparent',
                  borderLeft: `3px solid ${active ? '#f97316' : 'transparent'}`,
                  color: active ? '#f97316' : '#475569',
                  transition: 'all 0.15s',
                  position: 'relative',
                  cursor: 'pointer',
                }}>
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {open && (
                    <span style={{ fontSize: 12, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{label}</span>
                  )}
                  {badge && open && (
                    <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                      {badge}
                    </span>
                  )}
                  {badge && !open && (
                    <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, background: '#ef4444', borderRadius: '50%' }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f9731622', border: '1px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              AR
            </div>
            {open && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Albano R.</div>
                <div style={{ color: '#334155', fontSize: 10 }}>gunsmith · shooter</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ padding: '16px 28px', borderBottom: '1px solid #1e293b', background: '#060a12', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: '#334155', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>ArmoryMetrics AR</div>
            <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginTop: 2 }}>
              {NAV_ITEMS.find(n => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label ?? 'Dashboard'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#334155', fontSize: 11 }}>
              {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} title="Sistema online" />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
