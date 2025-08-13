-- Migration 0001: Task Lifecycle Event Sourcing Foundations

CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL,
  occurred_at TIMESTAMP DEFAULT NOW(),
  payload JSON,
  correlation_id TEXT,
  actor TEXT DEFAULT 'SYSTEM'
);
CREATE INDEX IF NOT EXISTS task_events_task_id_idx ON task_events(task_id);
CREATE INDEX IF NOT EXISTS task_events_type_idx ON task_events(type);

CREATE TABLE IF NOT EXISTS ai_command_log (
  id SERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL UNIQUE,
  command TEXT NOT NULL,
  envelope JSON NOT NULL,
  response JSON,
  issued_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'PENDING',
  validation_passed BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ai_command_log_status_idx ON ai_command_log(status);

CREATE TABLE IF NOT EXISTS staff_shift_sessions (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  effective_seconds INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS staff_shift_sessions_staff_id_idx ON staff_shift_sessions(staff_id);
