# ADR-007: Versioned DashboardSpec

Status: Superseded for active specs by ADR 016; retained as v1 history

Context: Saved dashboards must survive product evolution.

Decision: The first prototype used `schemaVersion: 1` with strict validation. DashboardSpec v2 now adds stable-ID metric series under ADR 016; v1 JSON Schema remains in the repository for historical clarity. No production specs were persisted, so this prototype needs no runtime migration.

Alternatives: Unversioned permissive JSON.

Consequences: Authors must update schema, runtime validation, fixtures, and migration policy together.
