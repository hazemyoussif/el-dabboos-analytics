# Sales Command Center implementation plan — 19 October 2026

Status: proposed implementation plan; no product changes in this deliverable.

## Objective and scope

Recreate the business content and interactions of the overview at
`https://sales.aldabboos.com/index.html` inside El Dabboos Analytics: Today,
Month, Customers to Follow Up, Order Trends, and Top Customers. Keep our current
shell, branding, bilingual rendering, authorization and explicit persistence rules.
The linked regions, weekly-salespeople, collections, debt, alerts and administration
pages were identified in navigation but were not audited; their complete recreation
is outside this overview milestone.

Reference evidence is the authenticated page inspected on 19 October. Its displayed
figures are comparison evidence, not approved metric definitions or a source adapter.
No customer names or financial result rows are retained in this plan.

Assessed implementation: deployed reader commit
`d62262bfe52351a4149778851c53eae7e990470f`, inspected in the
`prepared-acceptance-fixes` worktree. The primary checkout contains unrelated changes
and is not the implementation baseline. Company activation was confirmed for
revision `3a345b4f-e4c2-413d-b893-3dcc51f53780`, with 154 bindings and prepared-cell
JIT disabled. The 27-report company receipt establishes the tested report cases;
it does not establish every possible date/filter/grouping combination.

## Confirmed architecture constraints

- `DashboardSpec` v2 has one dashboard-wide date range/preset and dimension-filter
  set. Widgets do not have independent date contexts. The overview's Today,
  month-to-date, rolling 30 days and six-week sections need explicit orchestration.
- `DimensionId` contains `date`, `month`, `quarter` and `year`, but no week,
  invoice-payment-state, payment-state or order-state dimension.
- Existing invoice/order metrics and the business sales metrics have salesperson
  mappings. Cash collection mappings expose customer, and business cash also
  exposes customer segment; they do not expose salesperson. Current balance/aging
  mappings also do not establish salesperson attribution.
- Daily event support exists in source capability proofs and prepared range/grain
  selection. Actual release capability, daily cell coverage, partial-month ranges,
  policy filters and source cutoff still need case-specific verification.
- Existing cash/sales ratios are not same-day collection rates. Collection duration
  is not days overdue. Historical observed-customer count is not period-active
  customer count. These definitions must remain distinct.
- The registered 2025–2026 reporting window is an eligibility boundary, not evidence
  of data through December. Previous company QA checked event history through
  19 October and the tested debt case at 30 September. Read current provenance for
  each new dashboard section before claiming its freshness.

## Reference-to-product inventory

“Existing” below means implemented metric recipes and related company-tested report
families. Every exact period/group/filter combination remains subject to the
publication manifest in milestone 1.

| Reference element | Existing candidate | Work required for an exact match |
| --- | --- | --- |
| Today/month posted invoice value and count | `invoiced_revenue`, `invoice_count`; business `period_invoice_sales` | Establish whether reference value includes tax; verify date, currency and count grain before selecting a recipe. Existing invoice sales recipes are untaxed. |
| Invoice refunds/net sales | `refund_value`, `net_invoiced_revenue`; business `period_invoice_refunds`, `period_net_sales` | Preserve document/line scope differences; use one matching basis for each comparison. |
| Invoice paid/partial/unpaid/cancelled table | No published state grouping in the current contract | Add separate document-state/payment-state vocabulary, distinct invoice counts, invoice value and residual at an explicit cutoff. Include unknown source states. |
| Invoice totals by salesperson | Invoice and salesperson performance reports | Verify count/value grouping; add residual and collected-against-invoices measures if missing. |
| Cash collected today/month | `customer_cash_collected`, `period_cash_collections` | Verify receipt inclusion/sign/date rules against reference, including customer refunds. |
| Cash receipt count and received/transit/rejected/cancelled breakdown | No equivalent published status/count set established | Inspect actual source fields, map states, define signed cash/count recipes and excluded-state controls. |
| Cash by salesperson | Not in current collection mappings | Establish whether responsibility is payment salesperson, invoice salesperson or customer owner, and whether assignment is current or historical; then map and prove it. |
| Collected on invoices issued today / same-day collection % | Allocation measures exist, but not this cohort metric | Add invoice-issue-date cohort plus eligible cash-allocation date logic; exclude credit-note offsets from cash. Do not substitute all receipts received today. |
| Today's orders: confirmed/quotation/cancelled | `order_count`, `order_revenue`; `cancelled_orders` exists in catalog | Confirm publication of existing candidates; add quotation/all-state counts and values with explicit source-state and date rules. |
| Monthly confirmed order count/value | `order_count`, `order_revenue` | Reconcile source states, tax basis and tenant-local period. |
| Monthly cancelled count/value and cancellation rate | `cancelled_orders` exists in catalog | Verify its publication; add cancelled value and a defined all-orders denominator. |
| Number of customers in the period | `customers_served` exists in catalog | Verify publication and the qualifying invoice/order cohort and commercial/customer identity grain. Do not substitute `observed_customer_count`. |
| Top ten customers' share / leading governorate share | Top-N and percentage-contribution analyses exist | Verify analysis publication and full-population denominator; select confirmed-order or invoice basis to match reference. |
| Largest overdue customers: overdue / future due / total balance | `total_overdue_receivable`, `aged_at_date`, `net_aged_receivable`; alternatively the matching business balance and positive due metrics | Use one compatible signed-balance/aging family. Match the cutoff and credit treatment. Positive due buckets do not necessarily sum to signed ledger balance. |
| Debtor salesperson and exact days overdue | Not established by current balance mappings/metrics | Add governed attribution and an explicit oldest/maximum/other delay definition from open maturity lines; retain unknown maturity. |
| Daily orders table/chart | `date` grouping exists | Add status measures where absent; verify prepared daily grain and complete day coverage. |
| Confirmed revenue for the last six weeks | Order revenue exists; no `week` grouping | Define source-matching week start, timezone and partial weeks; implement governed weekly reduction and capability evidence. |
| Top customers over the last 30 days | Customer order/invoice grouping and Top-N exist | Verify the reference's revenue basis and rolling window; preserve deterministic ties and policy scope. |
| Same elapsed days last month / same weekday over four weeks | Generic comparisons exist, not these exact named baselines | Add explicit calendar comparison recipes and source-matching operands; never approximate with a different comparison. |
| Global salesperson/customer filters | Both dimensions exist, but not on every section | Finish attribution for shared salesperson filtering. Until then, apply it only to explicitly labelled supported sections; do not silently ignore it elsewhere. |
| Last sync / next sync / refresh / PDF | Operational status, report refresh and Excel export exist | Distinguish report refresh from source ingestion. Show verified source cutoff and scheduler state; assess bounded print/PDF delivery separately. |

## Milestone 1 — Freeze a verified implementation manifest

Deliver a machine-readable, reviewable inventory with one entry per reference
widget: title, canonical metric(s), grouping, date rule, tax/sign/currency basis,
filters, source attribution, cutoff, matching publication capability and evidence
status. Use `publishedQueryIssues` and prepared-grain selection for the exact query
cases rather than inferring availability from catalog labels.

Record three outcomes: usable now, implemented but unproven for this release, and
new definition/source mapping needed. Obtain current capability/provenance through
the authenticated application or a single bounded read-only company command if
necessary. This chat has no authenticated company shell; reuse evidence already
provided and request only the remaining evidence.

Exercise the reference's date, salesperson and customer controls to establish which
sections each affects. Record whether Today means wall-clock today or the selected
end date, and how month/rolling sections respond. Restore the original selections
after inspection. Do not assume these filter rules from section labels alone.

Define the reference's metric meanings from source configuration/report rules or
matching source reports. A screenshot number alone cannot settle tax treatment,
receipt states, allocation timing, customer counting or salesperson ownership.
Prefer small synthetic fixtures plus aggregate reconciliation controls to retained
company extracts.

Completion: every overview element has an explicit disposition, its exact query
requirements are known, and existing recipes are reused where meanings agree.

## Milestone 2 — Deliver the initial supported overview

Add an application-owned Sales Command Center report composed of named sections.
Each section uses governed metrics and a deterministic period rule. Keep the
existing portable DashboardSpec v2 intact for ordinary saved dashboards; document
the report composition decision in a short ADR before implementation. The initial
target is a built-in management report; portable saving of the entire multi-period
composition would be a separate contract decision.

Use one trusted tenant-local clock and one pinned serving revision for the whole
response. Keep a single concurrency budget across sections, deduplicate identical
queries and guard against publication changes. Resolve periods in application
code, execute through domain ports, and validate/authorize every query. API owns
the route and response envelope; web renders the section results and provenance.

Initial sections use proven invoice/order KPIs, sales by salesperson/governorate,
customer sales, cash totals and available debt/aging. Preserve the reference's
section order. State the actual period on every section. Missing exact reference
features are explicitly unavailable rather than replaced by different formulas.
Preserve published Finance-review-pending notices; technical certification does
not establish completed Finance review.
Customer filters can be shared where supported. Salesperson filtering must have
visible scope until collections/aging attribution is proved.

Completion: a usable overview with the existing certified measures, working
filters, honest section dates, partial/error/loading states and current prepared
reader evidence. This milestone does not claim an exact reference replica.

## Milestone 3 — Complete the operational measures

Implement in this order so each group yields a reviewable improvement:

1. Invoice status/residual and cash receipt status/count measures, with independent
   header identities and source-state controls to prevent line-join multiplication.
2. Same-day invoice collection cohort and cash allocation measures, including
   allocation cutoff, credit-note exclusions, refunds and reversals.
3. Order status counts/values, cancellation rate and qualifying customer count.
4. Salesperson attribution for receipts and debt, plus exact overdue-day meaning.
5. Weekly order revenue, reference-specific comparison baselines and shares.

Route new metric IDs/dimensions/semantics through domain contracts, catalog,
validators and schemas first. Add source mapping/extraction, immutable certification
and prepared grain support in data. Application plans and UI consume published
capabilities; they do not implement independent formulas or query source databases.
Inspect actual Odoo/custom state fields before choosing field mappings. Reuse the
existing approved source boundary and govern any additional source scope explicitly.

Each group requires exact monetary/count controls and identity/duplicate evidence,
synthetic correction/state/currency tests, and reconciled company results at the
same cutoff. New definitions must not silently change existing report semantics.

## Milestone 4 — Complete the overview interactions and freshness

Match collapsible daily/monthly tables, global filters when fully supported,
deterministic rankings, accessible chart tables and refresh behavior. Reuse existing
renderers and centralized theme. Support Arabic/English, Light/Dark, keyboard use,
phone (~390px), tablet (~1024px) and desktop under the project dashboard quality
skill's AFTER review.

Publish a freshness contract per event/snapshot family. Source completion must
produce a complete accepted prepared revision before promotion. Keep previous
accepted data available during preparation. Report source-as-of, effective debt
cutoff, stale/error state and actual scheduler information. Finish the outstanding
Finance/Collections/Business refresh lifecycle before displaying a live promise.

The refresh action refreshes the report. Source synchronization remains a separate
authorized operation. Keep PDF/print bounded and implement it only with functional
output and explicit report dates; retain the existing Excel behavior.

## Milestone 5 — Acceptance and release

- Reconcile each new widget against its authoritative source at identical dates,
  currency, tax basis, state rules, identities, filters and cutoff. Preserve nulls,
  unknown states/maturity and signed credits. Include empty periods, late allocations,
  cancellations, zero denominators, restricted actors and publication changes.
- Verify month-end/opening snapshots, tenant-local midnight, month boundaries,
  six-week boundaries, current partial periods and rolling windows. Never sum
  balances across dates or calculate distinct customers by summing daily counts.
- Verify prepared selection and JIT off on actual cell reads, with zero raw-history
  fallback. Changing a report's metadata must not silently broaden its capability.
- Keep first <=5 seconds / repeat <=3 seconds and compare with a same-result native
  baseline where available. Earlier first-read exceptions apply only to the three
  reviewed reports/revision; they do not automatically cover this new overview.
- Measure browser refresh-to-complete and server execution separately; report their
  actual timings. Measure multi-user behavior separately from single-user evidence.
- Run targeted tests first, then the repository's frozen install, lint, architecture,
  quality, typecheck, regular/PostgreSQL tests, builds and diff gates before publishing.
  Record final SHA, exact results and CI state. No customer fixtures or developer env
  files enter tests or commits.
- Present the implementation, reconciliation receipt and rollout/recovery commands
  before deployment. Release uses the existing governed prepare/seal/promote process.
  Record deployment authorization separately; do not infer it from the previous
  prepared-reader release. Merge requires its own explicit request.

## Next implementation step

Start with milestone 1's exact widget/capability manifest and the report-composition
ADR. This resolves the two structural dependencies—multiple period windows and
shared filters—before adding the initial supported overview. Add source measures
in the priority order above until the overview is faithful and reconciled.

## Evidence and code ownership

Assessed at commit `d62262b`: `packages/domain/src/contracts.ts`, `catalog.ts`,
`business-catalog.ts`, `published-capabilities.ts`; application `executor.ts`,
`management-templates.ts`, `review-templates.ts`, `leadership-templates.ts`,
`business-templates.ts`; data `business/definitions.ts`, `review/definitions.ts`,
`operational/daily-capabilities.ts`, `prepared/read-plan.ts` and `selection.ts`.
Current activation evidence is the user's successful company log in this chat;
older rollout documents still describe pre-activation checkpoints.
