# ADR 017: Product metric availability registry

Status: Accepted for the prototype (2026-09-30).

## Decision

Keep the executable semantic catalog as the source-independent set of 24 governed metric formulas. Publish a separate product-level registry that marks every known metric `available` or `planned` and assigns a business domain. Planned entries explain which source data or approved definition is missing. Validation only accepts executable MetricId values from the semantic catalog in DashboardSpec v2 or AnalyticsQuery; a planned metric cannot be made executable by adding it to a template or prompt.

## Consequences

Users and future planners can discover common concepts across sales, CRM, finance, inventory, purchasing, customers, and maintenance without implying false execution capability. Business approvals and source mapping are required before moving a concept from planned to available.
