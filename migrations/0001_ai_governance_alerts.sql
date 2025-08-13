-- Migration: Create ai_governance_alerts (Iteration 21)
CREATE TABLE IF NOT EXISTS ai_governance_alerts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  alert_timestamp TIMESTAMP NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  strategy TEXT NOT NULL,
  alert_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  hash TEXT NOT NULL,
  rationale JSON,
  context JSON,
  dedup_group TEXT,
  processed BOOLEAN DEFAULT FALSE,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ai_gov_alerts_strategy_time_idx ON ai_governance_alerts (strategy, alert_timestamp);
CREATE INDEX IF NOT EXISTS ai_gov_alerts_severity_idx ON ai_governance_alerts (severity);
CREATE INDEX IF NOT EXISTS ai_gov_alerts_dedup_idx ON ai_governance_alerts (dedup_group, alert_timestamp);
CREATE INDEX IF NOT EXISTS ai_gov_alerts_created_idx ON ai_governance_alerts (created_at);
