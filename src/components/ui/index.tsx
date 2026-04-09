'use client';

import { ReactNode } from 'react';

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: 'orange' | 'emerald' | 'red' | 'amber' | 'blue' | 'none';
  style?: React.CSSProperties;
}

export function Card({ children, accent = 'none', style }: CardProps) {
  const accentColors: Record<string, string> = {
    orange: '#f9731644',
    emerald: '#10b98144',
    red: '#ef444444',
    amber: '#f59e0b44',
    blue: '#3b82f644',
    none: '#1e293b',
  };

  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${accentColors[accent]}`,
      borderRadius: 12,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: '#475569', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'critical' | 'warning' | 'ok' | 'info' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const BADGE_STYLES: Record<BadgeVariant, { background: string; color: string }> = {
  critical: { background: '#ef444422', color: '#ef4444' },
  warning:  { background: '#f59e0b22', color: '#f59e0b' },
  ok:       { background: '#10b98122', color: '#10b981' },
  info:     { background: '#3b82f622', color: '#3b82f6' },
  neutral:  { background: '#1e293b',   color: '#64748b' },
};

export function Badge({ variant, children }: BadgeProps) {
  const s = BADGE_STYLES[variant];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
      letterSpacing: 0.5, textTransform: 'uppercase',
      ...s,
    }}>
      {children}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  color?: string;
  highlight?: boolean;
}

export function KpiCard({ label, value, color = '#94a3b8', highlight = false }: KpiCardProps) {
  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${highlight ? color + '44' : '#1e293b'}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ color: '#475569', fontSize: 11, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

const BUTTON_STYLES = {
  primary:   { background: '#f97316', color: '#0c111d', border: 'none' },
  secondary: { background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b' },
  danger:    { background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' },
};

export function Button({ children, onClick, variant = 'primary', disabled = false, type = 'button', style }: ButtonProps) {
  const s = BUTTON_STYLES[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s, borderRadius: 8, padding: '10px 24px',
        fontWeight: 700, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: 1, fontFamily: 'monospace', opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, label, sublabel, size = 'md' }: ProgressBarProps) {
  const color = value >= 85 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#10b981';
  const h = size === 'sm' ? 4 : 6;

  return (
    <div style={{ marginBottom: 10 }}>
      {(label || sublabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {label && <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>}
          {sublabel && <span style={{ color, fontSize: 12, fontFamily: 'monospace' }}>{sublabel}</span>}
        </div>
      )}
      <div style={{ background: '#0f172a', borderRadius: 4, height: h, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, value)}%`, height: '100%',
          background: color, borderRadius: 4,
          transition: 'width 0.8s ease',
          boxShadow: `0 0 6px ${color}88`,
        }} />
      </div>
    </div>
  );
}

// ── Health Gauge (SVG) ────────────────────────────────────────────────────────
interface HealthGaugeProps {
  score: number;
  size?: number;
}

export function HealthGauge({ score, size = 120 }: HealthGaugeProps) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcLen = circumference * 0.75;
  const dashOffset = arcLen - (score / 100) * arcLen;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b"
        strokeWidth={size * 0.08} strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
        strokeWidth={size * 0.08}
        strokeDasharray={`${arcLen - dashOffset} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${color}88)` }} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color}
        fontSize={size * 0.22} fontWeight="700"
        style={{ transform: `rotate(-135deg)`, transformOrigin: `${cx}px ${cy}px`, fontFamily: 'monospace' }}>
        {score}
      </text>
    </svg>
  );
}

// ── MOA Scatter ───────────────────────────────────────────────────────────────
interface MoaScatterProps {
  moaX: number[];
  moaY: number[];
  size?: number;
}

export function MoaScatter({ moaX, moaY, size = 200 }: MoaScatterProps) {
  const scale = size / 6;
  const cx = size / 2;
  const cy = size / 2;

  const maxR = Math.max(...moaX.map((x, i) =>
    Math.sqrt(x * x + moaY[i] * moaY[i])
  ));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[3, 2, 1].map(ring => (
        <circle key={ring} cx={cx} cy={cy} r={ring * scale}
          fill="none" stroke="#1e293b" strokeWidth="1" />
      ))}
      <line x1={cx} y1={0} x2={cx} y2={size} stroke="#1e293b" strokeWidth="0.5" />
      <line x1={0} y1={cy} x2={size} y2={cy} stroke="#1e293b" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={maxR * scale} fill="none"
        stroke="#f59e0b44" strokeWidth="1.5" strokeDasharray="3 3" />
      {moaX.map((x, i) => (
        <circle key={i}
          cx={cx + x * scale} cy={cy - moaY[i] * scale}
          r={3.5} fill="#f97316" opacity="0.85"
          style={{ filter: 'drop-shadow(0 0 3px #f9731688)' }} />
      ))}
      <text x={cx + 4} y={12} fill="#475569" fontSize="9" fontFamily="monospace">+1 MOA</text>
      <text x={cx + 4} y={size - 4} fill="#475569" fontSize="9" fontFamily="monospace">-1 MOA</text>
    </svg>
  );
}

// ── Velocity Chart ────────────────────────────────────────────────────────────
interface VelocityChartProps {
  velocities: number[];
  width?: number;
  height?: number;
}

export function VelocityChart({ velocities, width = 300, height = 100 }: VelocityChartProps) {
  if (!velocities.length) return null;
  const min = Math.min(...velocities) - 5;
  const max = Math.max(...velocities) + 5;
  const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  const toX = (i: number) => (i / (velocities.length - 1)) * (width - 20) + 10;
  const toY = (v: number) => height - ((v - min) / (max - min)) * (height - 20) - 10;

  const pts = velocities.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <line x1={10} y1={toY(mean)} x2={width - 10} y2={toY(mean)}
        stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
      {velocities.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill="#10b981"
          style={{ filter: 'drop-shadow(0 0 4px #10b98188)' }} />
      ))}
    </svg>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface TableProps<T extends { id: string }> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
}

export function Table<T extends { id: string }>({ columns, data, emptyMessage = 'Sin datos' }: TableProps<T>) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            {columns.map(col => (
              <th key={String(col.key)} style={{
                padding: '12px 16px', textAlign: col.align ?? 'left',
                color: '#475569', fontSize: 11, letterSpacing: 1,
                textTransform: 'uppercase', fontWeight: 500,
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '24px 16px', textAlign: 'center', color: '#334155' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #0f172a' }}>
                {columns.map(col => (
                  <td key={String(col.key)} style={{
                    padding: '12px 16px',
                    color: '#94a3b8',
                    textAlign: col.align ?? 'left',
                  }}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
