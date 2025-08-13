-- Migration 0004: representative_debt_snapshots table
CREATE TABLE IF NOT EXISTS representative_debt_snapshots (
  id serial PRIMARY KEY,
  representative_id integer NOT NULL,
  date text NOT NULL,
  total_debt numeric(15,2) NOT NULL,
  total_sales numeric(15,2) NOT NULL,
  captured_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rep_debt_snapshots_rep_date_idx ON representative_debt_snapshots (representative_id, date);
