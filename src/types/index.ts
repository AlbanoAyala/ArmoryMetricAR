// ─── Auth & Profiles ──────────────────────────────────────────────────────────
export type UserRole = 'shooter' | 'gunsmith' | 'admin' | 'org_admin';

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  clu_number: string | null;
  clu_expiry_date: string | null;
  anmac_license: string | null;
  renave_code: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Organizations ────────────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  anmac_license: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

// ─── Firearms ─────────────────────────────────────────────────────────────────
export type FirearmFamily =
  | 'pistol_striker'
  | 'pistol_hammer'
  | 'revolver'
  | 'bolt_rifle'
  | 'semi_auto_rifle'
  | 'pump_shotgun';

export interface Firearm {
  id: string;
  organization_id: string;
  owner_id: string;
  name: string;
  brand: string;
  model: string;
  family: FirearmFamily;
  caliber: string;
  serial_number: string;
  manufacture_year: number | null;
  anmac_registration: string | null;
  total_shots: number;
  last_maintenance_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Components ───────────────────────────────────────────────────────────────
export interface FirearmComponent {
  id: string;
  firearm_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  lifespan_threshold: number;
  current_count: number;
  weight_in_health_score: number;
  is_critical: boolean;
  installed_date: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentReplacement {
  id: string;
  component_id: string;
  firearm_id: string;
  organization_id: string;
  replaced_by: string;
  replacement_date: string;
  shots_at_replacement: number;
  cost: number | null;
  notes: string | null;
  created_at: string;
  // joined
  gunsmith?: Profile;
}

// ─── Shooting Sessions ────────────────────────────────────────────────────────
export interface ShootingSession {
  id: string;
  organization_id: string;
  shooter_id: string;
  firearm_id: string;
  batch_id: string | null;
  session_date: string;
  range_name: string;
  total_shots: number;
  temperature_c: number | null;
  humidity_pct: number | null;
  altitude_m: number | null;
  notes: string | null;
  created_at: string;
  // joined
  firearm?: Firearm;
  batch?: ReloadBatch;
}

export interface ShotLog {
  id: string;
  session_id: string;
  firearm_id: string;
  batch_id: string | null;
  organization_id: string;
  velocity_ms: number | null;
  impact_x_moa: number | null;
  impact_y_moa: number | null;
  pressure_sign: boolean;
  shot_number: number;
  created_at: string;
}

// ─── Ballistics ───────────────────────────────────────────────────────────────
export interface BallisticRecord {
  id: string;
  session_id: string;
  firearm_id: string;
  organization_id: string;
  velocity_mean_ms: number | null;
  velocity_sd_ms: number | null;
  velocity_es_ms: number | null;
  velocities_raw: number[];
  primer_flattened: boolean;
  ejector_mark: boolean;
  sticky_bolt: boolean;
  barrel_temp_c: number | null;
  distance_m: number | null;
  group_radius_moa: number | null;
  group_center_x: number | null;
  group_center_y: number | null;
  anomaly_detected: boolean;
  anomaly_details: string | null;
  created_at: string;
}

// ─── Reloading Lab ────────────────────────────────────────────────────────────
export type InventoryItemType = 'powder' | 'primer' | 'bullet' | 'brass';

export interface InventoryItem {
  id: string;
  organization_id: string;
  item_type: InventoryItemType;
  name: string;
  manufacturer: string | null;
  lot_number: string;
  quantity: number;
  unit: string;
  purchase_date: string | null;
  expiry_date: string | null;
  reorder_point: number;
  cost_per_unit: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReloadRecipe {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  caliber: string;
  powder_id: string;
  powder_charge_gr: number;
  bullet_id: string;
  primer_id: string;
  brass_id: string | null;
  oal_mm: number;
  col_mm: number | null;
  power_factor: number | null;
  notes: string | null;
  is_validated: boolean;
  created_at: string;
  // joined
  powder?: InventoryItem;
  bullet?: InventoryItem;
  primer?: InventoryItem;
}

export interface ReloadBatch {
  id: string;
  organization_id: string;
  recipe_id: string;
  created_by: string;
  batch_code: string;
  quantity_produced: number;
  quantity_remaining: number;
  production_date: string;
  notes: string | null;
  created_at: string;
  // joined
  recipe?: ReloadRecipe;
}

// ─── Event Log ────────────────────────────────────────────────────────────────
export type EventType =
  | 'session_created'
  | 'component_replaced'
  | 'clinical_note_added'
  | 'alert_generated'
  | 'firearm_registered'
  | 'batch_created'
  | 'inventory_updated'
  | 'anomaly_detected'
  | 'user_login';

export interface EventLog {
  id: string;
  organization_id: string;
  actor_id: string;
  event_type: EventType;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  // joined
  actor?: Profile;
}

// ─── Clinical Notes ───────────────────────────────────────────────────────────
export interface ClinicalNote {
  id: string;
  firearm_id: string;
  organization_id: string;
  gunsmith_id: string;
  note_date: string;
  content: string;
  components_replaced: string[];
  shots_at_inspection: number;
  created_at: string;
  // joined (immutable — no updates allowed by RLS)
  gunsmith?: Profile;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'unread' | 'read' | 'dismissed';

export interface Alert {
  id: string;
  organization_id: string;
  user_id: string;
  firearm_id: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
}

// ─── Data Science ─────────────────────────────────────────────────────────────
export interface HealthScoreBreakdown {
  total: number;
  components: Array<{
    name: string;
    pct_used: number;
    weight: number;
    contribution: number;
    status: 'ok' | 'warning' | 'critical';
  }>;
  days_since_maintenance: number;
  pressure_sign_penalty: number;
}

export interface BallisticStats {
  mean: number;
  sd: number;
  es: number;
  anomalies: number[];
  anomaly_detected: boolean;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}
