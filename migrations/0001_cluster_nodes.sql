-- R11: Cluster nodes & heartbeat table
CREATE TABLE IF NOT EXISTS cluster_nodes (
  node_id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT,
  role TEXT,
  is_leader BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_cluster_nodes_last_heartbeat ON cluster_nodes(last_heartbeat);
