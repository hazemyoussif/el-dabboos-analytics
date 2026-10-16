# Company staging report QA — 16 October 2026

## Release, scope and method

Company staging: `https://46.225.43.242`, deployed revision
`f5c1ed21fa349fd5716429664c15713087afde1d`, analytics migration 050.
The operator confirmed successful migration, ordinary `VACUUM (ANALYZE)`, runtime
verification, healthy API/web, readiness HTTP 200 and 25 GB free disk.

All 27 management navigation destinations were inspected in the authenticated
Arabic session: 26 analytical reports and Data & Certification Status. The parent
session collected the measurements and completed the sweep. Luna's earlier
direct-navigation sweep was inconclusive and is excluded from the results below;
the user subsequently requested no further Luna work.

Measurements below are **browser-observed elapsed intervals**, from normal sidebar
navigation to observed report heading, disappearance of the preparing state and
rendered widgets. They include browser automation/polling, transport, application
work and rendering. They are not SQL durations, precise real-user paint metrics,
percentiles, cold-cache tests or capacity/load benchmarks. Several samples cluster
around six seconds; that observation must not be treated as an exact backend
execution time. Pages were tested sequentially, without stress traffic.

Default report periods were retained. Depending on the report, these were current
year through 16 October 2026, September 2026, latest available October coverage
through 15 October, or published history from June 2024 through 15 October 2026.
Early readiness races for Business Line and Salesperson Performance were discarded
and those reports were rechecked with rendered-widget confirmation.

## Report-by-report results

“Loaded” means the page settled without a visible query timeout, query-limit error
or generic execution failure in the inspected default view. It does not certify
every metric as complete or independently reconciled to Odoo. Rows are rendered
table rows, including tables associated with charts; they are not source counts.

| Report | Observed interval | Widgets | Rendered table rows | Result |
| --- | ---: | ---: | --- | --- |
| Executive Sales & Invoicing | ~3.1 s | 7 | 10 | Loaded |
| Business Line Performance | ~9.2 s | 3 | 2 / 2 / 2 | Loaded; corrected sample |
| Salesperson Performance | ~12.7 s | 3 | 25 / 25 / 60 | Loaded; corrected sample |
| Customer Performance | ~7.9–9.2 s | 3 | 25 / 25 / 100 | Loaded, two settled passes |
| Invoice & Credit Note Operations | ~8.1 s | 9 | 10 / 10 / 53 | Loaded |
| Receivables & Aging | ~21.3–22.0 s | 13 | 25 / 100 | Loaded; slow on three passes |
| Customer Cash Collections | ~9.2 s | 10 | 25 / 100 / 100 / 100 | Loaded on repeat; Top 100 due table works |
| Confirmed Order Margin | ~6.2 s | 6 | 25 / 25 / 100 / 40 | Loaded |
| Product Invoice Performance | ~6.2 s | 4 | 25 / 25 / 100 / 36 | Loaded |
| Customer Debt & Aging | Still preparing at ~48.7–49.0 s on two passes | 8 eventually | 1 / 1 / 100 eventually | Partial detail-table timeout on both passes; completion timestamp not captured |
| Executive Monthly Overview | ~6.1 s | 9 | 5 / 5 / 100 | Loaded |
| Sales & Collections History | ~18.4–19.0 s | 4 | 27 / 3; other two tables absent | Repeated partial/failed widgets |
| Customer Positive-Sales Pareto | ~6.1 s | 7 | 25 / 100 / 100 / 5 | Loaded |
| Governorate, Salesperson & Calendar ABC | ~12.3 s | 8 | 19 / 25 / 19 / 39 / 3 / 100 | Loaded |
| Customer ABC Detail | ~27.5 s | 6 | 3 / 100 | Loaded, slow single sample |
| Product & Brand Positive-Sales Pareto | ~6.2 s | 8 | 25 / 25 / 100 / 100 / 100 / 100 | Loaded |
| Customer Movement in Observed History | ~27.5 s | 8 | 5 / 100 / 5 | Loaded, slow single sample |
| Current Stock & Expiry Coverage | ~6.2 s | 5 | 3 / 100 / 37 / 3 | Loaded |
| Physical Returns & Internal Transfers | ~6.2 s | 5 | 100 / 100 / 100 / 29 / 100 | Loaded |
| Current Unbilled Quantities & Order Age | ~6.2 s | 4 | 100 / 100 / 100 | Loaded |
| Book Liquidity & Payable Due Coverage | ~6.2 s | 9 | 25 / 71 / 43 | Loaded |
| Historical Executive Trends | ~6.2 s | 4 | 10 / 10 / 10 / 10 | Loaded |
| Sales versus Invoicing Trends | ~6.1 s | 1 | 10 | Loaded |
| Business Line Trends | ~6.1 s | 2 | 10 / 2 | Loaded |
| Salesperson Historical Analysis | ~6.1 s | 2 | 10 / 60 | Loaded |
| Customer Historical Analysis | ~6.1 s | 2 | 10 / 100 | Loaded |
| Data & Certification Status | Ready; precise interval not recorded | Status sections | Not applicable | Six status sections visible, no page-load error |

## Findings and priorities

1. **High — Customer Debt & Aging remains partially broken.** September's
   Top 100 signed-balance table renders 100 anchor rows but also shows the
   “selection took too long” warning. Both passes remained in preparing state
   at approximately 49 seconds, then showed the same partial table. A successful
   anchor is insufficient evidence that all dependent columns succeeded. The UI
   alone does not identify the failed metric. An unavailable ratio is not, by
   itself, evidence of incorrect arithmetic or missing source data.

2. **High — Sales & Collections History fails at its advertised default range.**
   The June 2024–October 2026 view reproduced timeout feedback twice. The monthly
   sales/cash and annual totals widgets contain partial results; salesperson
   and governorate widgets contain timeout states without data tables. This
   must be investigated at the shared business event-query path. Narrowing
   filters is not a successful QA result for the default full-history report.

3. **Performance priority — certified aging, Customer ABC Detail and Customer
   Movement.** Certified aging repeatedly took roughly 21–22 seconds; ABC detail
   and customer movement each took roughly 27.5 seconds in their single samples.
   These are real waiting-time observations, but not yet attributed to SQL,
   query scheduling, connection contention, transfer or rendering.

4. **High UX requirement — no outer scrolling on chart widgets.** The user's
   requirement is: chart widget containers must expand to fit their content;
   scrolling should remain inside the chart's existing scrolling surface.
   Do not remove table scrolling, hide overflow, truncate categories, or add
   dashboard-specific heights to simulate this behavior. Preserve chart headers,
   legends, paging/search controls and accessible value tables.

   Concrete evidence: Business Line chart cards had client height 336 px with
   content heights 551 and 488 px, while their nested `.bar-scroll` areas also
   overflowed (89 versus 190 px and 120 versus 190 px). At the phone breakpoint,
   certified aging's chart card had client height 478 px versus content height
   560 px. The shared rule `apps/web/src/styles/dashboard.css:126` applies
   `overflow:auto` to every widget with a direct result-window child; charts
   already have internal scrolling in `apps/web/src/styles/charts.css:3`.
   This establishes a shared layout cause, independent of report query speed.

## Functional, layout and displayed-data checks

- Customer Performance detail reached page 2 with 100 rows and no visible error.
- Certified aging's customer detail reached page 2 with 100 rows and no visible
  error. These paging checks were not continuously timed, so no paging-latency
  benchmark is claimed. Browser locator visibility deadlines were inconclusive;
  native accessibility actions and the resulting page/row DOM state confirmed
  success. These tool deadlines are not recorded as application failures.
- The earlier post-deployment Collections smoke check also confirmed next/back
  paging and its previously failing Top 100 due table. The current sweep again
  confirmed all its tables load without a timeout.
- At the displayed precision, certified aging's six signed age buckets reconcile
  to net aged receivables, and its five overdue buckets reconcile to total overdue.
  Comparisons allow only the rounding implied by summing formatted whole-IQD
  values. This is a UI consistency check, not source reconciliation.
- Collections' displayed cash collected equals applied cash plus unallocated
  receipts, within the same display-rounding allowance.
- Representative certified-aging layout was inspected at normal viewport and
  requested viewport widths 390, 1024 and 1440 px. Browser content widths were
  375, 1009 and 1425 px where a vertical scrollbar was present. No document-level
  horizontal overflow appeared in those samples. The phone chart-container
  overflow described above remains a finding. Temporary viewport overrides were
  reset afterward. This does not certify every report at every breakpoint.
- Arabic and the existing system theme were retained. English, all themes,
  keyboard/screen-reader accessibility, every filter combination and every drill
  were not exhaustively exercised. No export or saved-dashboard mutation was
  performed. The browser was returned to Collections with loaded results.

## Shared optimization investigations at the time of this audit

Subsequent operator diagnostics and local changes are recorded separately in the
[query and chart optimization evidence](report-query-optimization-2026-10-16.md).
The observations below remain the original pre-change evidence.

Start with per-series timing and the existing safe failure diagnostics for the
two failing report families. Then obtain bounded, read-only plans for their exact
generated queries using the approved runtime role and unchanged tenant/policy,
cutoff, definition and trusted revision. Keep metric identifiers, durations,
SQLSTATE categories and aggregate plan statistics; do not log customer identities,
amounts, source envelopes or credentials. No company SQL plans were collected in
this browser audit.

Relevant code facts that narrow the investigation:

- `packages/application/src/grouped-widget-execution.ts:29` executes a Top-N
  anchor followed by dependent series sequentially. The unanchored distinct-series
  loop is also sequential at line 35. Customer Debt & Aging has one balance anchor
  and four followers: month sales, balance/sales ratio and last invoice/cash dates.
  One failed follower can produce the observed partial table. Sequential execution
  is established by code; its share of the observed delay is not yet measured.
- `packages/data/src/postgres/result-window.ts:29` materializes the grouped input
  before output selection; the output-key filter at line 42 bounds returned
  identities, not necessarily underlying history work. Investigate safe sharing
  of related operands or earlier selected-key reduction only where exact global
  analysis, latest-entity selection, nulls and policy semantics remain intact.
  Do not blindly push filters ahead of latest-snapshot selection.
- Full-history business event queries use `review/event-rows.ts` for temporal
  aggregation and `review/grouped-query.ts` for categorical aggregation. Inspect
  actual rows, repeated scans, buffer reads, spills and membership selectivity
  before choosing any index or aggregate change. Migration 050 improves snapshot
  identities; it does not prove event history is optimized.
- Certified Finance aging uses precomputed `finance_snapshot_customers` vectors
  through `operational/finance-grouped-query.ts`, separately from review/business
  facts. Measure repeated vector expansion and multi-series execution before
  considering a shared batch projection. Do not rebuild aging from raw Odoo on
  every report request.
- Request-scoped deduplication already exists in `query-execution.ts:25`, and
  dashboard-level work is already bounded. A missing global cache or unbounded
  dashboard concurrency is not an established cause. Increasing concurrency,
  timeouts or database memory is not justified by these observations alone.

The next deliverable should be an exact per-series/plan diagnosis followed by the
smallest measured global fix and correctness regression. No report-specific
hardcoding, timeout increase, new persistent cache or speculative schema change
is recommended from this browser evidence.

## Boundaries

No source access, database writes, settings changes, credential changes, company
deployment, push, merge or GitHub CI run occurred during this audit. Only this QA
document was added. Existing unrelated workspace changes were preserved.
Source freshness/reconciliation warnings and pending Finance review remain
separate from query speed. Odoo correctness, all-month completeness, index usage,
database I/O/CPU and storage attribution require independent approved evidence;
this audit does not certify them or manufacture Finance approval.
