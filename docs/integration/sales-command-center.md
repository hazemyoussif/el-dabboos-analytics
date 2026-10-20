# Sales Command Center

Status: the report and source extension are implemented locally. Company deployment,
new-measure publication and company performance acceptance have not been performed.
The [implementation receipt](../qa/sales-command-center-2026-10-20.md) separates
source checks, synthetic prepared-reader evidence and the remaining release work.

## Report boundary

[ADR 041](../architecture/adr/041-sales-command-center-composition.md) owns the
built-in composition. `SalesCommandCenter` coordinates canonical queries through
repository ports; API owns `POST /api/reports/sales-command-center`; web owns
`/reports/sales-command-center`. Ordinary DashboardSpec v2, AI plans and explicit
Save/version rules are unchanged. This report does not auto-save a dashboard.

The 34 entries retain Today, Month, Customers to Follow Up, Order Trends and Top
Customers in that order. One trusted tenant-local clock supplies Today and
month-to-date. Selected inclusive dates control the order summary, daily orders
and customer ranking. Weekly revenue uses six consecutive Saturday-start weeks
through today, including the partial current week. The reference's “last 30 days”
caption actually follows selected dates; the report labels that period honestly.

One outer execution pins a serving revision, shares deduplication and a concurrency
budget, settles all reads and retries publication changes as a whole. Canonical
validation, metric-domain authorization and exact publication checks precede every
read, including comparison operands and displayed-debtor ownership queries.
Enforced policy filters are never removed. Unsupported viewer filters are visibly
disclosed; unsupported metric/period/group/filter cases remain unavailable.

Every command result proves coverage from accepted source observations or actual
validated prepared segments, including accepted empty observations; it does not
infer completeness from capability listings. Every result retains coverage, source-as-of, business data-through, effective
snapshot cutoff and Finance-review-pending provenance. Missing dates are Unknown;
an older balance cutoff is called out, including the date used to calculate age.
Refresh rereads the report; it does not ingest source data or invent a next-sync
promise. Tables collapse, exact chart values and existing Excel export remain
available, and the existing bilingual theme/rendering system is reused. PDF is
not introduced by this change.

## New metric and source contracts

The [generated widget inventory](proposals/sales-command-center-widget-manifest-2026-10-19.json)
records every metric, date rule, source recipe, required measure and filter/grain
case. There are 26 new `command_*` metrics; existing canonical measures retain
their definitions. The new contract is domain-owned in `sales-command-catalog.ts`.
Source SQL and mappings are owned by the Business adapter, never the UI.

- Invoices use independent customer invoice headers, including tax. Document
  states and payment states are distinct dimensions. Residual and settled-to-cutoff
  amounts are observed at extraction; settlement is not labelled cash.
- Invoice salesperson is the unique receivable-line assignment. The source check
  found 59 header/line owner differences among 745 October posted invoices, so
  `invoice_user_id` is deliberately not substituted. Ambiguity fails extraction;
  missing assignment remains Unassigned. Multiple maturity lines cannot multiply
  header counts or amounts.
- Cash uses signed customer payment headers: paid/in-process inbound cash positive,
  outbound refunds negative. Every state remains available for receipt counts and
  document values. Partnerless zero documents remain; nonzero transfers do not.
  Receipt attribution uses the payment's salesperson.
- Same-day cash requires matching invoice issue date, payment date, allocation
  accounting date and tenant-local reconciliation creation day. Credit-note
  offsets and later-created backdated allocations are excluded. Zero denominators
  stay null; actual cash is separate from invoice total minus residual.
- Orders confirm `sale`/`done`; all source states remain visible. Cancellation is
  cancelled / (confirmed + cancelled); quotations are excluded from that denominator.
  Customer counts use stable IDs over the whole period, never sums of daily counts.
- Debt reconstructs signed open receivable items using the existing accepted
  source control. Current customer owner precedes line salesperson. Unknown
  maturity remains a separate signed balance. Overdue days are the maximum days
  late among positive open debits with known maturity strictly before the cutoff;
  no qualifying maturity gives null. Owners are shown for the displayed debtors,
  preserving multiple assignments and stable identities.
- Shares use the complete policy-filtered confirmed-order denominator before
  Top-N selection. Unknown governorates remain in that denominator but cannot win
  the leading-known-governorate insight. Identity ties use canonical code-point order.
- Comparisons query four separate prior same weekdays and average their amounts,
  or the same elapsed dates last month with month-end clamping. Missing operands
  make the comparison unavailable; no partial baseline or zero replacement is used.

## Preparing the new measures

The command mapping explicitly extends a complete Business partition, retaining
all original Business measures. Compatible event windows stitch per metric, so
current-only residual measures cannot disable weekly or comparison history.
Obsolete command recipe versions are not published; unchanged Business measures
retain eligibility. Its immutable version fingerprints the semantic
catalog and source recipes. Business and operational family definition hashes
remain compatible with their existing measures and prepared history. New command
metrics require their own accepted partitions and prepared grains; metadata alone
cannot make them available.

Forward migration 061 registers the operands and status columns, retains view
security, and extends the exact-control guard only for the explicitly versioned
command mapping. Existing migration SQL, forced RLS, grouped exact controls,
lineage and immutable membership are preserved. Startup does not migrate anything.

After an authorized deployment, schema verification and backup/recovery preflight,
the protected operator can opt into a complete month exposure:

```bash
pnpm analytics expose-business --tenant TENANT_ID --month YYYY-MM --sales-command
```

**This is a write/promotion operation, not a diagnostic.** It extracts a complete
Business month, verifies independent header aggregates plus exact grouped source/mart
controls, prepares through the existing lifecycle and advances the trusted revision
atomically. Do not run it as a connection test. Select the months needed by the
trusted clock for comparisons and the six-week window; do not hard-code a reporting
month in application code. Current residual/ownership observations are not fabricated
for historical months.

The source lease covers reads, independent controls and the exact source/mart
comparison. The checked source-read handoff closes it before offline preparation;
no source access occurs afterwards. Reconciled facts, controls, preparation and
promotion remain one atomic mart transaction. Source loss before handoff or failed
preparation leaves the accepted publication unchanged. This avoids retaining an
unused source snapshot during longer preparation without relaxing source checks
or raising the maximum lease duration.

Prepared history serves report reads. New source observations must complete the
accepted preparation lifecycle before becoming current; incomplete work cannot be
stitched into a report. No route or browser queries Odoo directly. Source refresh
and report refresh remain separate operations.

## Read-only diagnostics

`analytics inspect-sales-command --tenant TENANT_ID --from YYYY-MM-DD --to YYYY-MM-DD`
uses the configured runtime identity, approved source resolver and retained RR/RO
snapshot. It reports field/FK metadata, aggregate states/header identity controls and
exact publication cases; no customer rows, monetary amounts, credentials or SQL are
printed. Optional missing payment-state metadata is null, not an empty cohort.

The host SSH tunnel and supplied credentials work. The existing staging read-only
mode was explicitly selected for the user-authorized bounded source inspections;
no source grants, persistent connection settings or default privilege guards changed.
Production least-privilege acceptance is separate from this staging evidence.

## Deployment ownership and scheduled freshness

The agreed workflow on 20 October 2026 is local Docker rehearsal first, repository
merge second, then company-host commands executed by the user. Local and company
staging are separate installations with separate serving revisions and prepared
coverage. A successful local rehearsal does not certify the company publication.

The existing sync/daily services resolve the healthy deployed commit-pinned API
image on every invocation. An application update does not require changing an
image pin in the timer configuration. Deployment and jobs already share the host
maintenance lock.

Their workload remains operational facts sync, daily reconciliation and presence
sweep. They do not refresh the Business source observations used by the new command
metrics. Report refresh only rereads accepted prepared data. Therefore automatic
freshness for this overview remains unfinished even after the application deploys.

[ADR 040](../architecture/adr/040-prepared-analytics-serving.md) requires complete
population equality/reuse and correction/dependency coverage before recurring
Business exposure. Do not attach repeated full-month extraction to the five-minute
timer. The remaining refresh work must cover changed and deleted documents,
allocations created later or backdated, customer/salesperson reassignment, current
balance observations, month rollover and affected historical event periods; then
reuse unchanged prepared populations, publish atomically, and measure source,
preparation and storage cost. Each family must retain its own truthful freshness.
The existing timer units can continue their existing workload while this is built;
they must not be presented as keeping the entire report current.

## Release and recovery

Follow [shared staging](shared-staging.md) and
[prepared serving](../architecture/adr/040-prepared-analytics-serving.md). Before
company release, verify the intended schema/revision, prepare the needed command
months, execute all exact widget/filter cases through the company reader with JIT
off and zero raw fallback, compare source controls and measure first/repeat plus
concurrent-user performance. Retain the previous accepted revision during preparation.
A schema rollback is not promised; use verified backups or a reviewed forward fix.

Deployment, source exposure/promotion, push and merge have not been performed by
this implementation. Company Finance review remains visibly pending.
