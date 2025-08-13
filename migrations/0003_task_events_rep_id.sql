-- Migration 0003: Add representative_id to task_events and index
ALTER TABLE task_events ADD COLUMN representative_id integer;
CREATE INDEX IF NOT EXISTS task_events_rep_occ_idx ON task_events (representative_id, occurred_at);
