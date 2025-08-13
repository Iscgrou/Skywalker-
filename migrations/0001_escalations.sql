-- Iteration 25: Governance Alert Escalations table
CREATE TABLE IF NOT EXISTS "ai_governance_alert_escalations" (
  "id" serial PRIMARY KEY NOT NULL,
  "alert_id" integer NOT NULL,
  "alert_timestamp" timestamp NOT NULL,
  "severity" text NOT NULL,
  "escalated_at" timestamp DEFAULT now() NOT NULL,
  "reason_code" text DEFAULT 'STALE_UNACK' NOT NULL,
  "threshold_ms" integer,
  "age_ms_at_escalation" integer,
  "cooldown_until" timestamp,
  "ack_after_escalation_ms" integer,
  "meta" json,
  "created_at" timestamp DEFAULT now()
);
-- Unique single escalation per alert for Phase 1
CREATE UNIQUE INDEX IF NOT EXISTS ai_gov_alert_escalations_alert_unique_idx ON "ai_governance_alert_escalations" ("alert_id");
CREATE INDEX IF NOT EXISTS ai_gov_alert_escalations_severity_idx ON "ai_governance_alert_escalations" ("severity");
CREATE INDEX IF NOT EXISTS ai_gov_alert_escalations_time_idx ON "ai_governance_alert_escalations" ("escalated_at");
CREATE INDEX IF NOT EXISTS ai_gov_alert_escalations_alert_time_idx ON "ai_governance_alert_escalations" ("alert_timestamp");
-- (FK) Enforced at application layer for now; can be added with ALTER TABLE if strict referential integrity needed:
-- ALTER TABLE "ai_governance_alert_escalations" ADD CONSTRAINT ai_gov_alert_escalations_alert_fk FOREIGN KEY ("alert_id") REFERENCES ai_governance_alerts(id);
