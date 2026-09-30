# ADR-008: Explicit tenant context

Status: Accepted

Context: Analytics data belongs to separate customers.

Decision: No repository execution exists without AnalyticsContext containing a tenant ID. SQLite selects by tenant and metric.

Alternatives: Global repository calls or tenant selection inferred from a prompt.

Consequences: Authentication/authorization mapping remains required before production deployment.
