# ADR 041: Sales Command Center report composition

Status: accepted for local implementation; company acceptance and deployment pending.

## Decision

The Sales Command Center is an application-owned built-in management report, not
a portable multi-period DashboardSpec. Ordinary DashboardSpec v2 and its explicit
Save/version lifecycle are unchanged. Named sections reuse canonical dashboards
and renderers, with application-resolved periods and canonical query validation.

One tenant-local clock supplies Today and month-to-date. The selected range
controls the order summary, daily orders and customer ranking; it does not move
Today, month invoice/payment figures or debt. These rules follow the reference
overview source, rather than its occasionally misleading labels. Weekly revenue uses six consecutive Saturday-start weeks through today, including
an explicitly partial current week. Named comparisons query four separate prior
same weekdays or the same elapsed days of the previous month.

One outer consistent execution pins the serving revision, retries a publication
change as a whole, shares request deduplication and one concurrency budget across
all sections, and verifies the revision after every read settles. Every query
passes canonical validation, fresh actor metric authorization, publication checks
including enforced policy dimensions, then executes through the repository port.
Published capability is eligibility, not proof of complete prepared coverage.
Each result retains its own coverage, source cutoff, snapshot date and Finance
review notice. No report-level maximum date is presented as shared freshness.

Customer filtering applies where published. Salesperson selection is visibly
scoped to supported widgets. Unsupported user filters are explicitly disclosed;
enforced policy filters are never removed or ignored. Unsupported metrics are
unavailable, with no substitution of invoice/order, tax, snapshot or cash bases.

The widget manifest distinguishes reference equivalence from canonical query
availability. New tax-inclusive invoice header measures leave the existing untaxed recipes
unchanged. Invoice salesperson attribution uses the reference receivable-line
field, requiring a unique assignment per header; it cannot substitute the header
owner. Payment attribution uses the payment salesperson; debt uses current
customer ownership followed by the line assignment. Reference “same-day collection” is actually
total minus residual at the current cutoff, not verified same-day cash allocation.
Reference “last 30 days” uses the selected range. Neither label is copied as a
false semantic claim. Source states and attribution require immutable reconciled
mapping releases before publication; catalog metadata cannot enable them.

Report refresh repeats authorized reads. It does not ingest data, promise a next
sync, create a saved dashboard, or promote a release. Deployment and merge remain
separate explicitly authorized operations.

## Evidence

Reference repository: `hazemyoussif/sales-analytics-dashboard-local`, local commit
`e3eb17c808474db755cb5624d8f9ce9a4d749ef2`; `index.html` render, invStats,
drawWeekly and drawTopCustomers; `assets/js/common.js` buildInvoicesToday,
buildInvoicesMonth, debtorsFromInvoices and buildCollections. Overview date and
dimension controls were exercised read-only on 19 October 2026 and restored.
No customer rows or credentials are retained in implementation evidence.

## Consequences

Existing certified measures can be used without changing their meaning. Exact
reference parity remains separately measurable. Collections/debt salesperson
attribution and new source measures cannot be fabricated from UI groupings.
Saving a whole multi-period composition would require a separate contract ADR.


## Operational source extension

The opt-in Sales Command Center mapping extends a complete Business partition;
it retains all original Business measures and capabilities. Its immutable mapping
version fingerprints the new semantic catalog and closed SQL recipes. Existing
Business and operational definition hashes remain unchanged, preserving eligibility
of previously prepared data for their existing metrics. The extension adds new
capabilities only after exact source controls and normal immutable preparation.
Forward migration 061 registers the new operands and four state dimensions,
retaining exact grouped controls, forced RLS, immutable membership and lineage.

Same-day cash requires invoice, payment, allocation accounting and tenant-local
reconciliation creation dates to coincide. A later-created backdated allocation
is excluded. Document settlement (total minus residual) remains a separate
noncash-inclusive measure. Unknown source states and maturity remain explicit.

Debtor-owner details use bounded, authorized customer/salesperson queries within
the same pinned execution and shared budget. Multiple assignments are displayed;
no first-row or name-key matching is used. Contribution insights reduce published
full-population percentage analyses; unknown governorates stay in the denominator
but cannot win the leading-known-governorate insight.
