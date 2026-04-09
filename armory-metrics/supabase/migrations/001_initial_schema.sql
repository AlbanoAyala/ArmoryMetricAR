-- ============================================================================
-- ArmoryMetrics AR — Database Schema
-- PostgreSQL / Supabase — Strict 3NF, RLS enabled, Event-Driven
-- ============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ─── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('shooter', 'gunsmith', 'admin', 'org_admin');
CREATE TYPE firearm_family AS ENUM (
  'pistol_striker', 'pistol_hammer', 'revolver',
  'bolt_rifle', 'semi_auto_rifle', 'pump_shotgun'
);
CREATE TYPE inventory_item_type AS ENUM ('powder', 'primer', 'bullet', 'brass');
CREATE TYPE event_type AS ENUM (
  'session_created', 'component_replaced', 'clinical_note_added',
  'alert_generated', 'firearm_registered', 'batch_created',
  'inventory_updated', 'anomaly_detected', 'user_login'
);
CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');
CREATE TYPE alert_status AS ENUM ('unread', 'read', 'dismissed');

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  anmac_license   TEXT NOT NULL UNIQUE,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  role            user_role NOT NULL DEFAULT 'shooter',
  clu_number      TEXT,
  clu_expiry_date DATE,
  anmac_license   TEXT,
  renave_code     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Firearms ────────────────────────────────────────────────────────────────
CREATE TABLE firearms (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  owner_id            UUID NOT NULL REFERENCES profiles(id),
  name                TEXT NOT NULL,
  brand               TEXT NOT NULL,
  model               TEXT NOT NULL,
  family              firearm_family NOT NULL,
  caliber             TEXT NOT NULL,
  serial_number       TEXT NOT NULL,
  manufacture_year    SMALLINT,
  anmac_registration  TEXT,
  total_shots         INTEGER NOT NULL DEFAULT 0 CHECK (total_shots >= 0),
  last_maintenance_date DATE,
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, serial_number)  -- serial único por organización
);

-- ─── Firearm Components ───────────────────────────────────────────────────────
CREATE TABLE firearm_components (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firearm_id            UUID NOT NULL REFERENCES firearms(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  name                  TEXT NOT NULL,
  description           TEXT,
  lifespan_threshold    INTEGER NOT NULL CHECK (lifespan_threshold > 0),
  current_count         INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  weight_in_health_score DECIMAL(4,3) NOT NULL CHECK (weight_in_health_score BETWEEN 0 AND 1),
  is_critical           BOOLEAN NOT NULL DEFAULT FALSE,
  installed_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Component Replacements ───────────────────────────────────────────────────
CREATE TABLE component_replacements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id        UUID NOT NULL REFERENCES firearm_components(id),
  firearm_id          UUID NOT NULL REFERENCES firearms(id),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  replaced_by         UUID NOT NULL REFERENCES profiles(id),
  replacement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  shots_at_replacement INTEGER NOT NULL,
  cost                DECIMAL(10,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Inventory Items ──────────────────────────────────────────────────────────
CREATE TABLE inventory_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  item_type       inventory_item_type NOT NULL,
  name            TEXT NOT NULL,
  manufacturer    TEXT,
  lot_number      TEXT NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit            TEXT NOT NULL,
  purchase_date   DATE,
  expiry_date     DATE,
  reorder_point   DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_unit   DECIMAL(10,4),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, lot_number)
);

-- ─── Reload Recipes ───────────────────────────────────────────────────────────
CREATE TABLE reload_recipes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  name            TEXT NOT NULL,
  caliber         TEXT NOT NULL,
  powder_id       UUID NOT NULL REFERENCES inventory_items(id),
  powder_charge_gr DECIMAL(5,2) NOT NULL CHECK (powder_charge_gr > 0),
  bullet_id       UUID NOT NULL REFERENCES inventory_items(id),
  primer_id       UUID NOT NULL REFERENCES inventory_items(id),
  brass_id        UUID REFERENCES inventory_items(id),
  oal_mm          DECIMAL(5,2) NOT NULL,
  col_mm          DECIMAL(5,2),
  power_factor    INTEGER,
  notes           TEXT,
  is_validated    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Reload Batches ───────────────────────────────────────────────────────────
CREATE TABLE reload_batches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  recipe_id           UUID NOT NULL REFERENCES reload_recipes(id),
  created_by          UUID NOT NULL REFERENCES profiles(id),
  batch_code          TEXT NOT NULL,
  quantity_produced   INTEGER NOT NULL CHECK (quantity_produced > 0),
  quantity_remaining  INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  production_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, batch_code)
);

-- ─── Batch Inventory Consumption (qué insumos se usaron por lote) ─────────────
CREATE TABLE batch_inventory_consumption (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES reload_batches(id) ON DELETE CASCADE,
  inventory_id    UUID NOT NULL REFERENCES inventory_items(id),
  quantity_used   DECIMAL(10,4) NOT NULL CHECK (quantity_used > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Shooting Sessions ────────────────────────────────────────────────────────
CREATE TABLE shooting_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  shooter_id      UUID NOT NULL REFERENCES profiles(id),
  firearm_id      UUID NOT NULL REFERENCES firearms(id),
  batch_id        UUID REFERENCES reload_batches(id),
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  range_name      TEXT NOT NULL,
  total_shots     INTEGER NOT NULL DEFAULT 0 CHECK (total_shots >= 0),
  temperature_c   DECIMAL(4,1),
  humidity_pct    SMALLINT CHECK (humidity_pct BETWEEN 0 AND 100),
  altitude_m      INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Shot Logs ────────────────────────────────────────────────────────────────
CREATE TABLE shot_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES shooting_sessions(id) ON DELETE CASCADE,
  firearm_id      UUID NOT NULL REFERENCES firearms(id),
  batch_id        UUID REFERENCES reload_batches(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  velocity_ms     DECIMAL(6,1),
  impact_x_moa    DECIMAL(5,2),
  impact_y_moa    DECIMAL(5,2),
  pressure_sign   BOOLEAN NOT NULL DEFAULT FALSE,
  shot_number     INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Ballistic Records ────────────────────────────────────────────────────────
CREATE TABLE ballistic_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID NOT NULL REFERENCES shooting_sessions(id) ON DELETE CASCADE,
  firearm_id          UUID NOT NULL REFERENCES firearms(id),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  velocity_mean_ms    DECIMAL(6,1),
  velocity_sd_ms      DECIMAL(5,2),
  velocity_es_ms      DECIMAL(5,1),
  velocities_raw      DECIMAL(6,1)[] NOT NULL DEFAULT '{}',
  primer_flattened    BOOLEAN NOT NULL DEFAULT FALSE,
  ejector_mark        BOOLEAN NOT NULL DEFAULT FALSE,
  sticky_bolt         BOOLEAN NOT NULL DEFAULT FALSE,
  barrel_temp_c       DECIMAL(4,1),
  distance_m          INTEGER,
  group_radius_moa    DECIMAL(5,2),
  group_center_x      DECIMAL(5,2),
  group_center_y      DECIMAL(5,2),
  anomaly_detected    BOOLEAN NOT NULL DEFAULT FALSE,
  anomaly_details     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Clinical Notes (Immutable — Armero) ──────────────────────────────────────
CREATE TABLE clinical_notes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firearm_id          UUID NOT NULL REFERENCES firearms(id),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  gunsmith_id         UUID NOT NULL REFERENCES profiles(id),
  note_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  content             TEXT NOT NULL,
  components_replaced TEXT[] NOT NULL DEFAULT '{}',
  shots_at_inspection INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — notas inmutables por diseño
);

-- ─── Alerts ───────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  firearm_id      UUID REFERENCES firearms(id),
  severity        alert_severity NOT NULL,
  status          alert_status NOT NULL DEFAULT 'unread',
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  action_url      TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Event Log (Immutable audit trail) ───────────────────────────────────────
CREATE TABLE event_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_id        UUID NOT NULL REFERENCES profiles(id),
  event_type      event_type NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updates, NO deletes — append-only enforced by RLS
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_firearms_org ON firearms(organization_id);
CREATE INDEX idx_firearms_owner ON firearms(owner_id);
CREATE INDEX idx_firearms_family ON firearms(family);
CREATE INDEX idx_components_firearm ON firearm_components(firearm_id);
CREATE INDEX idx_sessions_firearm ON shooting_sessions(firearm_id);
CREATE INDEX idx_sessions_date ON shooting_sessions(session_date DESC);
CREATE INDEX idx_sessions_shooter ON shooting_sessions(shooter_id);
CREATE INDEX idx_shot_logs_session ON shot_logs(session_id);
CREATE INDEX idx_shot_logs_firearm ON shot_logs(firearm_id);
CREATE INDEX idx_shot_logs_batch ON shot_logs(batch_id);
CREATE INDEX idx_ballistic_session ON ballistic_records(session_id);
CREATE INDEX idx_ballistic_firearm ON ballistic_records(firearm_id);
CREATE INDEX idx_alerts_user ON alerts(user_id, status);
CREATE INDEX idx_alerts_org ON alerts(organization_id, created_at DESC);
CREATE INDEX idx_event_log_org ON event_log(organization_id, created_at DESC);
CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX idx_inventory_org ON inventory_items(organization_id, item_type);
CREATE INDEX idx_batches_recipe ON reload_batches(recipe_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firearms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firearm_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reload_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_inventory_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE shooting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballistic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_org() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user has role
CREATE OR REPLACE FUNCTION has_role(required_role user_role) RETURNS BOOLEAN AS $$
  SELECT role >= required_role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Organizations — users see only their org
CREATE POLICY "org_isolation" ON organizations
  FOR SELECT USING (id = get_user_org());

-- Profiles — same org
CREATE POLICY "profiles_org_select" ON profiles
  FOR SELECT USING (organization_id = get_user_org());
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Firearms — same org
CREATE POLICY "firearms_org" ON firearms
  FOR ALL USING (organization_id = get_user_org());

-- Firearm components — same org
CREATE POLICY "components_org" ON firearm_components
  FOR ALL USING (organization_id = get_user_org());

-- Component replacements — gunsmith or admin only for write
CREATE POLICY "replacements_read" ON component_replacements
  FOR SELECT USING (organization_id = get_user_org());
CREATE POLICY "replacements_write" ON component_replacements
  FOR INSERT WITH CHECK (
    organization_id = get_user_org() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('gunsmith','admin','org_admin'))
  );

-- Inventory — same org
CREATE POLICY "inventory_org" ON inventory_items
  FOR ALL USING (organization_id = get_user_org());

-- Recipes — same org
CREATE POLICY "recipes_org" ON reload_recipes
  FOR ALL USING (organization_id = get_user_org());

-- Batches — same org
CREATE POLICY "batches_org" ON reload_batches
  FOR ALL USING (organization_id = get_user_org());

-- Batch consumption — same org
CREATE POLICY "batch_consumption_org" ON batch_inventory_consumption
  FOR ALL USING (
    EXISTS (SELECT 1 FROM reload_batches rb WHERE rb.id = batch_id AND rb.organization_id = get_user_org())
  );

-- Shooting sessions — same org
CREATE POLICY "sessions_org" ON shooting_sessions
  FOR ALL USING (organization_id = get_user_org());

-- Shot logs — same org
CREATE POLICY "shot_logs_org" ON shot_logs
  FOR ALL USING (organization_id = get_user_org());

-- Ballistic records — same org
CREATE POLICY "ballistic_org" ON ballistic_records
  FOR ALL USING (organization_id = get_user_org());

-- Clinical notes — IMMUTABLE: no UPDATE, no DELETE
CREATE POLICY "clinical_read" ON clinical_notes
  FOR SELECT USING (organization_id = get_user_org());
CREATE POLICY "clinical_insert_gunsmith" ON clinical_notes
  FOR INSERT WITH CHECK (
    organization_id = get_user_org() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('gunsmith','admin','org_admin'))
  );
-- No UPDATE or DELETE policies for clinical_notes (append-only)

-- Alerts — own alerts
CREATE POLICY "alerts_own" ON alerts
  FOR ALL USING (organization_id = get_user_org() AND user_id = auth.uid());

-- Event log — read only for same org; append-only (no UPDATE/DELETE)
CREATE POLICY "event_log_read" ON event_log
  FOR SELECT USING (organization_id = get_user_org());
CREATE POLICY "event_log_insert" ON event_log
  FOR INSERT WITH CHECK (organization_id = get_user_org());
-- No UPDATE or DELETE policies for event_log

-- ============================================================================
-- STORED PROCEDURES (ACID transactions)
-- ============================================================================

-- RPC: Registrar sesión de tiro + actualizar contadores de componentes
CREATE OR REPLACE FUNCTION register_shooting_session(
  p_firearm_id    UUID,
  p_shooter_id    UUID,
  p_batch_id      UUID,
  p_range_name    TEXT,
  p_total_shots   INTEGER,
  p_temperature   DECIMAL,
  p_humidity      SMALLINT,
  p_altitude      INTEGER,
  p_notes         TEXT,
  p_org_id        UUID
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- 1. Insertar sesión
  INSERT INTO shooting_sessions (
    organization_id, shooter_id, firearm_id, batch_id,
    range_name, total_shots, temperature_c, humidity_pct, altitude_m, notes
  ) VALUES (
    p_org_id, p_shooter_id, p_firearm_id, p_batch_id,
    p_range_name, p_total_shots, p_temperature, p_humidity, p_altitude, p_notes
  ) RETURNING id INTO v_session_id;

  -- 2. Actualizar total_shots del arma
  UPDATE firearms
  SET total_shots = total_shots + p_total_shots,
      updated_at = NOW()
  WHERE id = p_firearm_id;

  -- 3. Actualizar current_count de todos los componentes del arma
  UPDATE firearm_components
  SET current_count = current_count + p_total_shots,
      updated_at = NOW()
  WHERE firearm_id = p_firearm_id;

  -- 4. Descontar del lote si corresponde
  IF p_batch_id IS NOT NULL THEN
    UPDATE reload_batches
    SET quantity_remaining = quantity_remaining - p_total_shots
    WHERE id = p_batch_id AND quantity_remaining >= p_total_shots;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient_batch_stock';
    END IF;
  END IF;

  -- 5. Event log
  INSERT INTO event_log (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  VALUES (p_org_id, p_shooter_id, 'session_created', 'shooting_session', v_session_id,
    jsonb_build_object('firearm_id', p_firearm_id, 'shots', p_total_shots, 'range', p_range_name));

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Crear lote de recarga con descuento ACID de inventario
CREATE OR REPLACE FUNCTION create_reload_batch(
  p_recipe_id     UUID,
  p_batch_code    TEXT,
  p_quantity      INTEGER,
  p_notes         TEXT,
  p_created_by    UUID,
  p_org_id        UUID
) RETURNS UUID AS $$
DECLARE
  v_batch_id      UUID;
  v_recipe        reload_recipes%ROWTYPE;
  v_powder_qty    DECIMAL;
  v_insufficient  TEXT[] := '{}';
BEGIN
  -- 1. Obtener receta
  SELECT * INTO v_recipe FROM reload_recipes WHERE id = p_recipe_id AND organization_id = p_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'recipe_not_found'; END IF;

  -- 2. Calcular consumo de pólvora (granos → gramos: ÷ 15.432)
  v_powder_qty := (v_recipe.powder_charge_gr * p_quantity) / 15.432;

  -- 3. Verificar stock de pólvora
  PERFORM 1 FROM inventory_items
  WHERE id = v_recipe.powder_id AND quantity >= v_powder_qty;
  IF NOT FOUND THEN v_insufficient := array_append(v_insufficient, 'powder'); END IF;

  -- 4. Verificar stock de fulminantes
  PERFORM 1 FROM inventory_items
  WHERE id = v_recipe.primer_id AND quantity >= p_quantity;
  IF NOT FOUND THEN v_insufficient := array_append(v_insufficient, 'primer'); END IF;

  -- 5. Verificar stock de puntas
  PERFORM 1 FROM inventory_items
  WHERE id = v_recipe.bullet_id AND quantity >= p_quantity;
  IF NOT FOUND THEN v_insufficient := array_append(v_insufficient, 'bullet'); END IF;

  -- 6. Si hay insuficiencia, abortar con detalle
  IF array_length(v_insufficient, 1) > 0 THEN
    RAISE EXCEPTION 'insufficient_stock:%', array_to_string(v_insufficient, ',');
  END IF;

  -- 7. Crear lote
  INSERT INTO reload_batches (organization_id, recipe_id, created_by, batch_code, quantity_produced, quantity_remaining, notes)
  VALUES (p_org_id, p_recipe_id, p_created_by, p_batch_code, p_quantity, p_quantity, p_notes)
  RETURNING id INTO v_batch_id;

  -- 8. Descontar inventario (ACID)
  UPDATE inventory_items SET quantity = quantity - v_powder_qty, updated_at = NOW() WHERE id = v_recipe.powder_id;
  UPDATE inventory_items SET quantity = quantity - p_quantity, updated_at = NOW() WHERE id = v_recipe.primer_id;
  UPDATE inventory_items SET quantity = quantity - p_quantity, updated_at = NOW() WHERE id = v_recipe.bullet_id;

  -- 9. Registrar consumo detallado
  INSERT INTO batch_inventory_consumption (batch_id, inventory_id, quantity_used)
  VALUES
    (v_batch_id, v_recipe.powder_id, v_powder_qty),
    (v_batch_id, v_recipe.primer_id, p_quantity),
    (v_batch_id, v_recipe.bullet_id, p_quantity);

  -- 10. Event log
  INSERT INTO event_log (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  VALUES (p_org_id, p_created_by, 'batch_created', 'reload_batch', v_batch_id,
    jsonb_build_object('batch_code', p_batch_code, 'quantity', p_quantity, 'recipe_id', p_recipe_id));

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_firearms_updated_at BEFORE UPDATE ON firearms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_components_updated_at BEFORE UPDATE ON firearm_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEED DATA (Development)
-- ============================================================================
INSERT INTO organizations (id, name, anmac_license, address, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ArmoryMetrics Demo',
  'ARM-ANMaC-DEMO-001',
  'Buenos Aires, Argentina',
  'demo@armorymetrics.ar'
);
