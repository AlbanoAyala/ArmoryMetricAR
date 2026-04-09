-- ============================================================================
-- ArmoryMetrics AR — Migration 002
-- Helper RPCs needed by Edge Functions and API routes
-- ============================================================================

-- RPC: Get firearms with intensive use (used by maintenance-cron edge function)
CREATE OR REPLACE FUNCTION get_intensive_use_firearms(
  since_date  DATE,
  threshold   INTEGER DEFAULT 400
)
RETURNS TABLE (
  firearm_id    UUID,
  firearm_name  TEXT,
  owner_email   TEXT,
  owner_name    TEXT,
  org_id        UUID,
  shots_7d      BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id          AS firearm_id,
    f.name        AS firearm_name,
    p.email       AS owner_email,
    p.full_name   AS owner_name,
    f.organization_id AS org_id,
    SUM(ss.total_shots)::BIGINT AS shots_7d
  FROM shooting_sessions ss
  JOIN firearms f ON f.id = ss.firearm_id
  JOIN profiles p ON p.id = f.owner_id
  WHERE ss.session_date >= since_date
  GROUP BY f.id, f.name, p.email, p.full_name, f.organization_id
  HAVING SUM(ss.total_shots) > threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Replace component (gunsmith only) — updates counter + logs
CREATE OR REPLACE FUNCTION replace_component(
  p_component_id  UUID,
  p_firearm_id    UUID,
  p_replaced_by   UUID,
  p_cost          DECIMAL DEFAULT NULL,
  p_notes         TEXT DEFAULT NULL,
  p_org_id        UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_replacement_id  UUID;
  v_shots_now       INTEGER;
  v_comp_name       TEXT;
BEGIN
  -- Get current shot count and name
  SELECT current_count, name INTO v_shots_now, v_comp_name
  FROM firearm_components
  WHERE id = p_component_id;

  -- Record replacement
  INSERT INTO component_replacements (
    component_id, firearm_id, organization_id,
    replaced_by, shots_at_replacement, cost, notes
  ) VALUES (
    p_component_id, p_firearm_id, p_org_id,
    p_replaced_by, v_shots_now, p_cost, p_notes
  ) RETURNING id INTO v_replacement_id;

  -- Reset component counter
  UPDATE firearm_components
  SET current_count = 0,
      installed_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_component_id;

  -- Event log
  INSERT INTO event_log (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  VALUES (p_org_id, p_replaced_by, 'component_replaced', 'firearm_component', p_component_id,
    jsonb_build_object(
      'firearm_id', p_firearm_id,
      'component_name', v_comp_name,
      'shots_at_replacement', v_shots_now
    ));

  RETURN v_replacement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get firearm health data in one query (avoids N+1 in dashboard)
CREATE OR REPLACE FUNCTION get_firearm_health(p_firearm_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'firearm', row_to_json(f),
    'components', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'current_count', c.current_count,
          'lifespan_threshold', c.lifespan_threshold,
          'weight', c.weight_in_health_score,
          'is_critical', c.is_critical,
          'pct_used', ROUND((c.current_count::DECIMAL / c.lifespan_threshold) * 100, 1),
          'status', CASE
            WHEN (c.current_count::DECIMAL / c.lifespan_threshold) >= 0.85 THEN 'critical'
            WHEN (c.current_count::DECIMAL / c.lifespan_threshold) >= 0.60 THEN 'warning'
            ELSE 'ok'
          END
        )
      )
      FROM firearm_components c
      WHERE c.firearm_id = p_firearm_id
    ),
    'last_session', (
      SELECT session_date
      FROM shooting_sessions
      WHERE firearm_id = p_firearm_id
      ORDER BY session_date DESC
      LIMIT 1
    ),
    'shots_last_7_days', (
      SELECT COALESCE(SUM(total_shots), 0)
      FROM shooting_sessions
      WHERE firearm_id = p_firearm_id
        AND session_date >= CURRENT_DATE - INTERVAL '7 days'
    )
  ) INTO v_result
  FROM firearms f
  WHERE f.id = p_firearm_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Event log enriched with actor name (for display)
CREATE OR REPLACE VIEW event_log_view AS
SELECT
  el.*,
  p.full_name AS actor_name,
  p.role      AS actor_role
FROM event_log el
JOIN profiles p ON p.id = el.actor_id;

-- ── Scheduled cron via pg_cron (requires pg_cron extension) ──────────────────
-- Uncomment and run separately after pg_cron is enabled in Supabase:
--
-- SELECT cron.schedule(
--   'maintenance-check',
--   '0 8 * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/maintenance-cron',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
