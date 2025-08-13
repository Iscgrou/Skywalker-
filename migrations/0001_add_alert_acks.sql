-- Iteration 23: Governance Alert Acknowledgements Table
-- Up
CREATE TABLE IF NOT EXISTS ai_governance_alert_acks (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER NOT NULL REFERENCES ai_governance_alerts(id) ON DELETE CASCADE,
  alert_timestamp TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL,
  dedup_group TEXT,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by TEXT,
  note TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes & Constraints
CREATE UNIQUE INDEX IF NOT EXISTS ai_gov_alert_acks_alert_unique_idx ON ai_governance_alert_acks(alert_id);
CREATE INDEX IF NOT EXISTS ai_gov_alert_acks_time_idx ON ai_governance_alert_acks(alert_timestamp);
CREATE INDEX IF NOT EXISTS ai_gov_alert_acks_severity_idx ON ai_governance_alert_acks(severity);
CREATE INDEX IF NOT EXISTS ai_gov_alert_acks_dedup_idx ON ai_governance_alert_acks(dedup_group, alert_timestamp);

-- Down (manual rollback example)
-- DROP TABLE IF EXISTS ai_governance_alert_acks;
