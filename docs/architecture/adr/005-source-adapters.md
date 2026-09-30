# ADR-005: Source adapters

Status: Accepted

Context: Odoo-to-Odoo, PostgreSQL, API, and synchronization details are unresolved.

Decision: Each adapter normalizes source data behind AnalyticsRepository. SQLite uses a tenant-scoped normalized fact table initially.

Alternatives: Bind product code to the current Odoo schema.

Consequences: Operational source mapping is separate work; synthetic facts do not establish production metric definitions.
