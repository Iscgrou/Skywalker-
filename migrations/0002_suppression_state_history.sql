-- Iteration 30 Migration: Suppression State History + Indexes
BEGIN;
CREATE TABLE IF NOT EXISTS suppression_state_history (
  id SERIAL PRIMARY KEY,
  dedup_group TEXT NOT NULL,
  prev_state TEXT,
  new_state TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,
  noise_score_enter DECIMAL(10,6),
  noise_score_exit DECIMAL(10,6),
  reentered_within_ms INTEGER,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS suppression_state_history_group_changed_idx ON suppression_state_history(dedup_group, changed_at DESC);
CREATE INDEX IF NOT EXISTS suppression_state_history_new_state_idx ON suppression_state_history(new_state, changed_at DESC);
COMMIT;
