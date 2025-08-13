-- R5: intel_rollups table
CREATE TABLE IF NOT EXISTS intel_rollups (
  id SERIAL PRIMARY KEY,
  bucket_ts TIMESTAMPTZ NOT NULL,
  window_ms INTEGER NOT NULL,
  domain TEXT NOT NULL,
  kind TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intel_rollups_window_bucket ON intel_rollups(window_ms, bucket_ts);
CREATE INDEX IF NOT EXISTS idx_intel_rollups_domain_kind ON intel_rollups(domain, kind, window_ms, bucket_ts);
