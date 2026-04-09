'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const supabase = createClient();

  const handlePasswordLogin = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else window.location.href = '/dashboard';
  };

  const handleMagicLink = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) setError(error.message);
    else setMagicSent(true);
  };

  const inputStyle: React.CSSProperties = {
    background: '#0c111d', border: '1px solid #1e293b', borderRadius: 8,
    padding: '12px 16px', color: '#e2e8f0', fontSize: 14,
    width: '100%', fontFamily: 'monospace', outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0c111d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(#1e293b22 1px, transparent 1px), linear-gradient(90deg, #1e293b22 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: '#f97316', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            boxShadow: '0 0 24px #f9731644',
          }}>
            <svg width="28" height="28" fill="none" stroke="#0c111d" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div style={{ color: '#f97316', fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
            ARMORY<span style={{ color: '#475569' }}>METRICS</span>
          </div>
          <div style={{ color: '#334155', fontSize: 11, marginTop: 4, letterSpacing: 2 }}>
            AR — SISTEMA TÁCTICO DE ARMERÍA
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#0f172a', border: '1px solid #1e293b',
          borderRadius: 16, padding: '32px 28px',
        }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0c111d', borderRadius: 10, padding: 4 }}>
            {([['password', 'Contraseña'], ['magic', 'Magic Link']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: mode === k ? '#1e293b' : 'transparent',
                color: mode === k ? '#f97316' : '#475569',
                cursor: 'pointer', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace',
              }}>{l}</button>
            ))}
          </div>

          {magicSent ? (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              color: '#10b981', fontSize: 14, lineHeight: 1.7,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              Magic link enviado a <strong>{email}</strong>.<br/>
              Revisá tu casilla de correo.
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  background: '#ef444422', border: '1px solid #ef444444',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  color: '#ef4444', fontSize: 12,
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#64748b', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                  Email
                </label>
                <input
                  type="email"
                  style={inputStyle}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@armeria.ar"
                  onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? handlePasswordLogin() : handleMagicLink())}
                />
              </div>

              {mode === 'password' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ color: '#64748b', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                  />
                </div>
              )}

              <button
                onClick={mode === 'password' ? handlePasswordLogin : handleMagicLink}
                disabled={loading || !email}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: loading || !email ? '#1e293b' : '#f97316',
                  color: loading || !email ? '#475569' : '#0c111d',
                  fontWeight: 700, fontSize: 13, cursor: loading || !email ? 'not-allowed' : 'pointer',
                  letterSpacing: 1, fontFamily: 'monospace', transition: 'all 0.2s',
                  boxShadow: !loading && email ? '0 0 16px #f9731644' : 'none',
                }}
              >
                {loading ? 'AUTENTICANDO...' : mode === 'password' ? 'INGRESAR' : 'ENVIAR MAGIC LINK'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 20, color: '#334155', fontSize: 11 }}>
                Sistema para uso exclusivo de personal autorizado ANMaC
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#1e293b', fontSize: 10, letterSpacing: 1 }}>
          ARMORYMETRICS AR v1.0 — CONFIDENCIAL
        </div>
      </div>
    </div>
  );
}
