# ADR-007: Versioned DashboardSpec

Status: Accepted

Context: Saved dashboards must survive product evolution.

Decision: Specs include `schemaVersion: 1`; validation is strict and unknown fields fail. Future changes require migrations or new versions.

Alternatives: Unversioned permissive JSON.

Consequences: Authors must update schema, runtime validation, fixtures, and migration policy together.
