# Sales Command Center

Status (24 October 2026): company API `09d411ea3a05f81d93152dda7cdae9838ba3a143`
is healthy. All five current-period Command recipes are published; scoped refresh,
allocation presence checking, ordinary sync and daily reconciliation have completed
on the company host. September comparison and six-week trend coverage is still
preparing. Automatic history is restricted to the report’s calculated comparison and six-week windows; older Command history requires an explicit operator request. Finance review remains visibly pending. Local evidence does not certify
company readiness; the [company cursor release record](../qa/allocation-presence-cursor-2026-10-24.md)
separates actual company results from static and synthetic verification.

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

Normal preparation uses the separate `analytics command-background --tenant TENANT_ID`
worker described in [independent Command preparation](command-background-preparation.md).
It captures only a missing recipe under a live read-only source snapshot and seals
that evidence before offline replay. Saved pages, one prepared chunk and atomic
publication are separate units. Accepted raw/prepared ancestry remains the serving
authority; incomplete work is private. Existing prepared datasets are reused.
Ordinary operational sync does not initialize Command recipes or enumerate history
as a prerequisite.

After current recipes are available, a scoped refresh discovers updated identities
and their actual dependencies, compares complete replacements with accepted rows,
and prepares affected cells. Unchanged facts remain in immutable ancestry. A separate
presence sweep detects deleted allocations through recorded identities and prior
links without changing Odoo. The inventory cursor reads the deduplicated set once,
then checks source presence in 1,000-ID batches. Missing prior links reject rather
than inventing a deletion footprint.

Manual `expose-business --sales-command` remains an explicit complete-month promotion
operation. It is not required for ordinary sync or used as a connection test or
recurring refresh. Runtime report reads use accepted prepared data; report refresh
rereads that data and never connects the browser or HTTP route to Odoo.

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

The owner subsequently authorized direct company SSH deployment and verification,
and stopped further local rehearsals and GitHub CI. Local and company installations
have separate accepted populations and publications. Actual company acceptance is
recorded separately from earlier local results.

Ordinary sync, daily reconciliation/presence sweeping and independent Command
background preparation resolve the healthy deployed commit-pinned API image. Their
separate timers share the required writer/publication serialization. A failed job
pauses only its own timer. A busy tenant publication lock is a deferral, not a
successful reconciliation; the deferred midnight daily job was explicitly completed
under supervision later on October 24.

The Command worker prioritizes missing current recipes, scoped current refresh and
allocation presence checks before older recipe gaps. Its current freshness target
is ten minutes; every metric still shows its own actual accepted source observation.
The operational cursor cannot establish Business freshness. Pending historical
coverage remains unavailable until accepted, including comparison operands.

[ADR 040](../architecture/adr/040-prepared-analytics-serving.md) retains complete
population equality/reuse, dependency coverage and atomic publication. On the company
host, the supervised current delta replaced 26 identities and persisted 82 fact rows;
it retained the rest of the month through sparse ancestry. The corrected allocation
presence unit completed in 119.462 seconds. Neither path repeats a full-month raw
copy or requires rebuilding all retained Business months before ordinary sync.

## Release and recovery

Follow [shared staging](shared-staging.md) and
[prepared serving](../architecture/adr/040-prepared-analytics-serving.md). Before
company release, verify the intended schema/revision, prepare the needed command
months, execute all exact widget/filter cases through the company reader with JIT
off and zero raw fallback, compare source controls and measure first/repeat plus
concurrent-user performance. Retain the previous accepted revision during preparation.
A schema rollback is not promised; use verified backups or a reviewed forward fix.

Company current-period recipe publication, renewed source observations and scheduled
ordinary/daily work have been verified on the deployed API. September comparison
and trend acceptance remains pending while its saved background units advance.
Historical rollout documents are recovery history, not instructions to repeat old
full-month preparation. Company Finance review remains visibly pending.
