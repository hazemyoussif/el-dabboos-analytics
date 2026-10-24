# ADR 043 — Independent Products & Warehouses report

Status: implemented; verification and release evidence in QA handoff. 25 October 2026.

## Decision

Add an application-owned Products & Warehouses report at a separate route and
navigation destination from Sales Command Center. Reuse canonical product tables,
the existing repository and consistent execution boundary. Keep DashboardSpec v2
and saved-record lifecycle unchanged; reading this report does not save a record.

Inventory is a current accepted snapshot; sales has an independent selected event
period. Inventory defaults to the latest published cutoff no later than tenant-local
today. Sales prefers month-to-date, otherwise the latest published month or partial
month, explicitly displayed. An explicit sales period is never silently clipped.
Product filters apply to both. Warehouse selection applies to inventory only;
customer, invoice salesperson and invoice governorate apply to invoice sales only.
These scopes are explicit in the request contract and user interface. Enforced
access restrictions remain present on every read and cannot be ignored to recover
an unsupported result.

Initial readings reuse existing on-hand/expiry quantities, signed net invoice base
quantity and untaxed invoice sales. On-hand is not labelled free or forecasted
stock. Mixed UOMs are not added into a headline quantity. Current customer owner,
actual partner tags, available-product coverage and stock valuation require their
own certified inputs; existing invoice attributes or customer segments are not
substituted for them.

No new reader, raw-history fallback, source request, source-specific browser code,
preparation path or scheduler is introduced. Missing prepared capabilities remain
unavailable. Future coverage expansion must use the shared background preparation
and immutable publication mechanism under ADR 040, preserving accepted data.
The initial response shares one pinned execution and bounded request budget;
table continuation retains the generic authorized result-window endpoint.

## Evidence and limits

The reference page/repository and the exported-report handoff were previously
reviewed. Read-only source metadata was available on 23 October; the latest
24 October Sales Command Center chat reports source refusal and paused schedules.
Neither that historic access nor this draft establishes source parity for this
dashboard. The owner initially requested code only, then authorized verification,
push and deployment. Local static/build gates, 1,005 unit tests and 451 PostgreSQL
tests passed before the first deployment; the company browser check identified
the coverage-default regression. See the QA handoff for subsequent checks and
the final deployed revision. Exact source reconciliation of new mappings remains
pending source recovery.

See [implementation scope and recovery work](../../integration/products-warehouses.md).
