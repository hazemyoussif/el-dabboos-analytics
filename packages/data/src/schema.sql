CREATE TABLE IF NOT EXISTS analytics_facts (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  measure_id TEXT NOT NULL,
  event_date TEXT NOT NULL CHECK (event_date GLOB '????-??-??'),
  value REAL NOT NULL,
  entity_id TEXT,
  dimensions_json TEXT NOT NULL CHECK (json_valid(dimensions_json))
);
CREATE INDEX IF NOT EXISTS analytics_facts_scope ON analytics_facts (tenant_id, measure_id, event_date);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_snapshot_identity ON analytics_facts (tenant_id, measure_id, entity_id, event_date) WHERE entity_id IS NOT NULL;
