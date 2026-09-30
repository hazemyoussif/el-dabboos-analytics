# ADR-005: Source adapters and canonical measures

Status: Accepted (amended September 2026)

Context: Odoo-to-Odoo, PostgreSQL, API, and synchronization details are unresolved. The prototype initially stored derived metrics as independent facts.

Decision: Each adapter normalizes operational data to canonical source measures. SQLite stores tenant ID, measure ID, event date, value, dimensions, and optional stable entity ID. Derived metric IDs cannot be inserted. Repository calls select only required measures for a tenant and use the shared deterministic engine. Snapshot source rows require an entity ID; the latest row per entity as of the requested period is selected.

Alternatives: Bind product code to Odoo columns; store precomputed ratios as source facts; sum snapshots over time.

Consequences: Source mappings and snapshot identity rules need source-specific implementation and review. The small seed is useful for contract tests but does not establish production metric definitions or scale.
