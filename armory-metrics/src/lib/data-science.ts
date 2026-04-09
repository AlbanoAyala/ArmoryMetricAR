import type {
  FirearmComponent,
  HealthScoreBreakdown,
  BallisticStats,
} from '@/types';

// ─── Health Score Engine ──────────────────────────────────────────────────────
/**
 * Calcula el Health Score (0–100) de un arma basado en:
 * - % de vida útil consumida por componente (con pesos diferenciados)
 * - Días sin mantenimiento vs. frecuencia recomendada
 * - Penalización por signos de sobrepresión
 */
export function calculateHealthScore(
  components: FirearmComponent[],
  daysSinceLastMaintenance: number,
  maintenanceIntervalDays: number,
  hasPressureSigns: boolean
): HealthScoreBreakdown {
  let score = 100;
  const breakdown: HealthScoreBreakdown['components'] = [];

  // Penalización por desgaste de componentes
  for (const comp of components) {
    const pctUsed = Math.min(comp.current_count / comp.lifespan_threshold, 1);
    const contribution = pctUsed * comp.weight_in_health_score * 100;
    score -= contribution;
    breakdown.push({
      name: comp.name,
      pct_used: Math.round(pctUsed * 100),
      weight: comp.weight_in_health_score,
      contribution: Math.round(contribution * 10) / 10,
      status: pctUsed >= 0.85 ? 'critical' : pctUsed >= 0.60 ? 'warning' : 'ok',
    });
  }

  // Penalización por mantenimiento vencido
  const maintenancePenalty =
    daysSinceLastMaintenance > maintenanceIntervalDays
      ? Math.min(
          ((daysSinceLastMaintenance - maintenanceIntervalDays) / maintenanceIntervalDays) * 15,
          15
        )
      : 0;
  score -= maintenancePenalty;

  // Penalización por signos de sobrepresión
  const pressurePenalty = hasPressureSigns ? 10 : 0;
  score -= pressurePenalty;

  return {
    total: Math.max(0, Math.round(score)),
    components: breakdown,
    days_since_maintenance: daysSinceLastMaintenance,
    pressure_sign_penalty: pressurePenalty,
  };
}

// ─── Ballistic Statistics Engine ──────────────────────────────────────────────
/**
 * Calcula SD (Desviación Estándar) y ES (Extreme Spread) de un conjunto de velocidades.
 * Detecta anomalías usando Z-score (umbral: μ + 2.5σ).
 */
export function calculateBallisticStats(velocities: number[]): BallisticStats {
  if (velocities.length === 0) {
    return { mean: 0, sd: 0, es: 0, anomalies: [], anomaly_detected: false };
  }

  const n = velocities.length;
  const mean = velocities.reduce((a, b) => a + b, 0) / n;
  const variance = velocities.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;
  const sd = Math.sqrt(variance);
  const es = Math.max(...velocities) - Math.min(...velocities);

  // Z-score anomaly detection — umbral: 2.5σ
  const THRESHOLD = 2.5;
  const anomalies = velocities.filter(v => Math.abs((v - mean) / sd) > THRESHOLD);

  return {
    mean: Math.round(mean * 10) / 10,
    sd: Math.round(sd * 10) / 10,
    es: Math.round(es * 10) / 10,
    anomalies,
    anomaly_detected: anomalies.length > 0,
  };
}

// ─── MOA Group Radius ─────────────────────────────────────────────────────────
export function calculateMoaGroupRadius(
  points: Array<{ x: number; y: number }>
): { radius: number; center: { x: number; y: number } } {
  if (points.length === 0) return { radius: 0, center: { x: 0, y: 0 } };

  const centerX = points.reduce((a, p) => a + p.x, 0) / points.length;
  const centerY = points.reduce((a, p) => a + p.y, 0) / points.length;
  const radius = Math.max(
    ...points.map(p =>
      Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
    )
  );

  return {
    radius: Math.round(radius * 100) / 100,
    center: { x: Math.round(centerX * 100) / 100, y: Math.round(centerY * 100) / 100 },
  };
}

// ─── Power Factor ─────────────────────────────────────────────────────────────
export function calculatePowerFactor(velocityFps: number, bulletWeightGr: number): number {
  return Math.round((velocityFps * bulletWeightGr) / 1000);
}

// ─── Inventory Status ─────────────────────────────────────────────────────────
export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export function getStockStatus(quantity: number, reorderPoint: number): StockStatus {
  if (quantity <= 0) return 'out';
  if (quantity < reorderPoint) return 'critical';
  if (quantity < reorderPoint * 1.5) return 'low';
  return 'ok';
}

// ─── Maintenance Predictor ────────────────────────────────────────────────────
export function estimateShotsUntilMaintenance(
  currentShots: number,
  maintenanceIntervalShots: number
): number {
  const nextMilestone =
    Math.ceil(currentShots / maintenanceIntervalShots) * maintenanceIntervalShots;
  return nextMilestone - currentShots;
}

export function estimateCriticalComponentReplacement(
  component: FirearmComponent
): { shotsRemaining: number; pctRemaining: number } {
  const remaining = component.lifespan_threshold - component.current_count;
  const pctRemaining = Math.max(
    0,
    100 - Math.round((component.current_count / component.lifespan_threshold) * 100)
  );
  return { shotsRemaining: Math.max(0, remaining), pctRemaining };
}
