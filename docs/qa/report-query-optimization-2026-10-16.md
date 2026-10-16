# Shared report query and chart sizing evidence — 16 October 2026

## Scope and status

The [authenticated browser audit](company-staging-performance-2026-10-16.md)
covered all 26 analytical reports and Data Status on company release
`f5c1ed21fa349fd5716429664c15713087afde1d`, schema 050. This document records
subsequent operator-supplied read-only company diagnostics and local changes.
The changes are not yet deployed or verified on company staging. No Odoo access,
company database write, setting change, source reload, push, merge or CI run was
performed for this work. The original checkout's unrelated work was preserved.

## Company evidence

The operator ran the [query profile](company-query-profile-command-2026-10-16.md)
and [exact-plan follow-up](company-query-plans-command-2026-10-16.md) through the
deployed operator image against `el_dabboos_analytics_staging`, read-only. Customer
values, identities and credentials were not printed. Exact plans ran sequentially
with a 30-second diagnostic bound; the application retains its 15-second bound.
`TIMING OFF` avoids per-node timing overhead; JIT flags do not establish JIT cost.
Buffer counters at parent nodes include children and must not be summed.

| September debt series, same Top-100 anchor identities | SQL time | Total | Rows | Null rows |
| --- | ---: | ---: | ---: | ---: |
| Signed customer balance anchor | 9,770 ms | 9,856 ms | 100 | 0 |
| Customer period sales | 5,212 ms | 5,278 ms | 100 | 0 |
| Balance/sales percentage | 12,976 ms | 13,048 ms | 100 | 26 |
| Last invoice date | 7,972 ms | 8,031 ms | 99 | 0 |
| Last collection date | 6,628 ms | 6,692 ms | 100 | 0 |

All passed individually. Their cumulative 42.905 seconds is consistent with the
slow sequential widget path, but does not identify one reproducibly failing
series. Null ratios and absent last dates are not by themselves data defects.

| Exact actual plan | Execution | Shared blocks read | Significant work |
| --- | ---: | ---: | --- |
| Snapshot balance/sales ratio | 13,255 ms | 244,400 | 191,292 historical rows; 49,042 latest operand lookups; 22,608 KiB identity sort and 18,872 KiB grouping sort spilled |
| Full-history monthly net sales | 15,016 ms | 639,940 | 821,265 events over 29 published partitions; 53,008 KiB grouping sort spilled |
| Full-history salesperson net sales | 17,552 ms | 639,937 | Same event population; 429,960 KiB wide grouping sort spilled |

The event timings reach/exceed the application's existing timeout. Metadata was
small compared with data SQL. Company fact visibility was 2,424,505 all-visible
pages out of 2,424,517, with approximately 10.3 million rows. Initial snapshot
selection and event queries used `review_facts_typed_access` with heap reads;
latest operand lookups used `review_facts_snapshot_identity`. The planner
underestimated published partition and event cardinality. These observations
justify reducing heap reads and grouping sorts; they do not justify blanket
concurrency, timeout, JIT, memory or database-setting changes.

## Changes and local proof

Migration 051 replaces the existing typed-access index with the same tenant,
partition, measure and day keys plus included entity identity and exact amount.
No source envelopes, dimensions or labels are copied into it. The heap, source
facts, controls, trusted serving revision, membership history and RLS are unchanged.
The replacement occurs inside the migration transaction and retains one typed
index after success. It increases index storage; included-column indexes cannot
use B-tree deduplication. Temporary disk for both indexes, sorting and WAL remains
a deployment requirement. It does not repeat schema 049's heap rewrite.

Categorical review/business grouping now tests label consistency using equal
minimum/maximum non-null labels. This has the same result as one distinct label,
including all missing labels, one label mixed with missing values and conflicting
labels. Compatible-unit validation uses unequal bounds plus the existing missing
or unassigned-unit rejection. This removes DISTINCT consistency aggregates that
forced sorting wide attribution objects. Exact sums/ratios, latest entity selection,
policy filters, full-population safety and result selection remain in the same order.

Local experiments used only owned disposable PostgreSQL 18.6 databases and
synthetic facts, with real exposure, trusted membership and the read-only runtime
role. Actual rows and returned metadata matched exactly before/after each query
change. Single-sample timings below establish mechanism, not capacity, cold-cache
behavior or a company performance guarantee.

| Synthetic scenario | Before | Covering index only | Covering index + label bounds |
| --- | ---: | ---: | ---: |
| 60,000 events across 3 months, monthly query | 61.8 ms | 36.5 ms | 52.7 ms |
| Same events, salesperson grouping | 146.3 ms | 153.6 ms | 84.3 ms |
| 12,000 historical snapshot operands, ratio | 57.7 ms | 64.4 ms | 58.4 ms |

Monthly buffer hits fell from 12,070 to 781; the covering scan fetched zero heap
rows. Categorical temporary writes fell from 1,280 blocks to zero with label bounds;
the covering index alone did not help categorical reads. The snapshot fixture
already chose the identity-only history index, so it demonstrated semantic parity,
not a snapshot speedup. Company snapshot acceptance remains open. In a separate
150,000-event run, monthly execution changed from 224.6 to 87.3 ms with zero heap
fetches on the new scan. Cache state and fixture sizes differ between runs.

The smaller fixture's old typed index was 1,040,384 bytes and its replacement
14,688,256 bytes across 132,063 total facts. Repeated old keys deduplicate heavily
in this synthetic fixture; its size multiplier is not a company estimate. Inspect
actual company index size and disk headroom before deployment.

Permanent regressions cover populated schema-49 and schema-50 forward upgrades,
unchanged heap identity and exact payloads/controls/membership/trusted revision/RLS,
idempotence, one valid non-unique replacement index, visible history index-only
access, missing/conflicting labels and unit validation outside selected output keys.
Existing snapshot tests cover moved entities, zeros, absent entities, superseded
partitions, ratios, scope, continuation and later-month exclusion.

## Chart sizing and manual review

Shared viewer grid tracks can grow for chart content. Chart cards fit titles,
legends, search/paging controls and the value-table toggle; the plot retains a
bounded viewport and its own scroll. Table result windows retain scrolling.
Saved grid coordinates, the builder and domain layout contracts are unchanged.

A temporary synthetic preview used the actual renderer, chart cards and result
controls, with 100 categories, long headings, multiple series and a 100-row table,
with and without KPIs. Desktop, tablet and phone content widths were 1425, 1009
and 375 px; English/Arabic and light/dark samples were checked. No outer chart
scroll, clipped controls or page horizontal overflow remained. Internal plot and
table scrolling remained. Chart presentation paging and expanding/collapsing the
accessible values table also fit. Desktop English/light and phone Arabic/dark
screenshots were visually inspected. The preview files/server were removed and
the temporary browser viewport was reset. This is local manual evidence, not a
post-deployment check of all company reports.

## Deployment acceptance still required

Use the normal [staging workflow](../integration/shared-staging.md#typed-covering-index-migration-051)
after publication is separately authorized. Rerun the same profile/plans and the
default history/debt reports to compare exact scopes and verify no timeout/partial
state. Verify narrow event/history index-only access where the planner selects it,
heap fetches, grouping spills, disk size and actual elapsed SQL. Repeat certified
aging, ABC and movement timings; their remaining latency has not been attributed
to these SQL paths. Preserve freshness and Finance-pending labels. Do not reload
source months or approve Finance data to resolve report latency.

## Automated delivery verification

Branch: `codex/optimize-report-query-paths`, based on
`f5c1ed21fa349fd5716429664c15713087afde1d`. Local changes only; no CI was used.

- Frozen dependency install, lint, typecheck, architecture, engineering quality,
  API/web build and diff gates passed. The existing Vite large-chunk warning remains.
- All 910 unit/API/web tests passed, zero skipped.
- The complete PostgreSQL sweep executed 311 cases: 310 passed and one historical
  upgrade assertion still expected schema 050 instead of 051. That test expectation
  was corrected; the clean rerun of its entire Finance file passed all 10 tests,
  zero skipped. No runtime failure or unresolved test failure remains. This is a
  full sweep plus a corrected-file rerun, not a claim of a second clean full sweep.
- Focused populated upgrades and the exact index-only assertion passed together
  (3 tests). A forced error after index replacement restored the old four-column
  index and schema-50 ledger, with exact data/history unchanged; the real migration
  then applied successfully and idempotently.
- The 300,000-event actual-plan regression passed both standalone and in the full
  sweep, with zero categorical temporary writes and exact expected totals. The
  60,000-snapshot regression had zero identity-history heap fetches. These are
  synthetic regression results, separate from company measurements and browser QA.
