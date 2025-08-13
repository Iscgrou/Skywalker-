-- Iteration 29 Migration: Adaptive Governance Persistence Layer
-- NOTE: If using drizzle-kit, prefer generating migrations; this manual file documents the DDL.
-- Safe to run multiple times (IF NOT EXISTS). Adjust types if your dialect differs.

BEGIN;

CREATE TABLE IF NOT EXISTS adaptive_weights_latest (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL DEFAULT 'v1',
  w1 DECIMAL(8,6) NOT NULL,
  w2 DECIMAL(8,6) NOT NULL,
  w3 DECIMAL(8,6) NOT NULL,
  w4 DECIMAL(8,6) NOT NULL,
  w5 DECIMAL(8,6) NOT NULL,
  freeze_active BOOLEAN DEFAULT FALSE,
  freeze_since_cycle INTEGER,
  last_adjustment_cycle INTEGER,
  cycle INTEGER,
  consecutive_zero_error_cycles INTEGER,
  metrics_snapshot JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS adaptive_weights_latest_version_idx ON adaptive_weights_latest(version);

CREATE TABLE IF NOT EXISTS adaptive_weights_history (
  id SERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  version TEXT NOT NULL DEFAULT 'v1',
  w1 DECIMAL(8,6) NOT NULL,
  w2 DECIMAL(8,6) NOT NULL,
  w3 DECIMAL(8,6) NOT NULL,
  w4 DECIMAL(8,6) NOT NULL,
  w5 DECIMAL(8,6) NOT NULL,
  reason TEXT NOT NULL,
  cycle INTEGER,
  last_adjustment_cycle INTEGER,
  freeze_active BOOLEAN DEFAULT FALSE,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS adaptive_weights_history_version_captured_idx ON adaptive_weights_history(version, captured_at);

CREATE TABLE IF NOT EXISTS suppression_state_latest (
  id SERIAL PRIMARY KEY,
  dedup_group TEXT NOT NULL,
  state TEXT NOT NULL,
  noise_score DECIMAL(10,6) NOT NULL,
  noise_score_enter DECIMAL(10,6),
  noise_score_exit DECIMAL(10,6),
  suppressed_count INTEGER DEFAULT 0,
  last_volume INTEGER,
  severity_scope TEXT,
  strategy TEXT,
  last_state_change_at TIMESTAMPTZ,
  last_suppression_start TIMESTAMPTZ,
  consecutive_stable INTEGER,
  dynamic_thresholds JSONB,
  robust_high_streak INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS suppression_state_latest_dedup_idx ON suppression_state_latest(dedup_group);

CREATE TABLE IF NOT EXISTS governance_persistence_audit (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  version TEXT,
  count INTEGER,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS governance_persist_audit_action_idx ON governance_persistence_audit(action, created_at);

COMMIT;

-- Rollback helper (manual):
-- BEGIN; DROP TABLE IF EXISTS governance_persistence_audit; DROP TABLE IF EXISTS suppression_state_latest; DROP TABLE IF EXISTS adaptive_weights_history; DROP TABLE IF EXISTS adaptive_weights_latest; COMMIT;
