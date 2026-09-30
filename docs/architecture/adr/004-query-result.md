# ADR-004: Canonical query/result contracts

Status: Accepted

Context: Widgets require deterministic, source-independent calculations.

Decision: AnalyticsQuery names governed IDs, filters, grouping, aggregation, and operation. AnalyticsResult returns keyed numeric rows.

Alternatives: Pass through database rows or vendor-specific report payloads.

Consequences: Complex future analytics require versioned contract extensions and explicit semantics.
