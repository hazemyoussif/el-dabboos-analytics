CREATE TABLE IF NOT EXISTS analytics_facts (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  event_date TEXT NOT NULL CHECK (event_date GLOB '????-??-??'),
  value REAL NOT NULL,
  dimensions_json TEXT NOT NULL CHECK (json_valid(dimensions_json))
);
CREATE INDEX IF NOT EXISTS analytics_facts_scope ON analytics_facts (tenant_id, metric_id, event_date);
