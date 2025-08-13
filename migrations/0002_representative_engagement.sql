-- Migration 0002: Representative Engagement (optional future use)
CREATE TABLE IF NOT EXISTS representative_engagement (
  id SERIAL PRIMARY KEY,
  representative_id INTEGER NOT NULL,
  engagement_score NUMERIC(6,2),
  churn_risk_score NUMERIC(6,2),
  last_interaction_at TIMESTAMP,
  decay_applied_at TIMESTAMP,
  components JSON,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS representative_engagement_rep_id_idx ON representative_engagement(representative_id);
