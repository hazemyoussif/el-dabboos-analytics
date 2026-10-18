# Event month selection candidate — 18 October 2026

## Change

Migration 058 adds an invoker-rights, preparation-only input selector and replaces
only the source call inside prepared_work_start. Review/Business events restrict
published membership by the requested months, retaining the existing exact day
bounds. All other input selections use the original canonical reader. Independent
content/source-control validation still uses that original reader.

Applied migrations are untouched. No indexes, grains, source contracts, runtime
readers, timeouts, stored content identities or company settings change.

## Local verification

19 targeted PostgreSQL tests passed, zero failures or skips. Included: migrations
and rollback; exact source multiset comparison; event/snapshot binding controls;
independent prepared-cell proof; complete, delta and empty snapshots; policy,
Pareto and Top-N equivalence; resume; tenant isolation; runtime denial; workspace
bounds and proof ordering. The existing all-family reader comparison covered
492 synthetic metric/grouping queries across 71 metrics and four families.

The new source test covers 40 exact multiset comparisons for Review/Business
(two kinds, two revisions, five date windows), four cross-tenant denials, two
runtime permission denials, and Facts event/snapshot fallback comparisons.
935 regular unit/API/web tests passed, zero failures or skips. Architecture,
quality, full lint, type checking and diff checks passed. Frozen dependency
installation and API/web builds passed. The complete PostgreSQL release suite
subsequently passed 335 tests, zero failures/skips, in 532.59 seconds.

No company timing improvement is asserted. The prior company 109.14-second
population observation includes temporary-table creation, generated columns,
materialization and ANALYZE. Its estimated SELECT plan identified the missing
membership-month condition but did not measure physical reads or runtime.

## Remaining gates

A bounded company comparison on the pinned May input must establish exact values
and actual timing. Do not infer full-bootstrap duration or capacity from a single
period. Do not start a full-history run or activate company prepared reads.
All required local pre-push checks are complete. Publishing and the company
schema/deployment step remain pending user approval.


## Company read-only source evidence

On the fixed publication 79cd9d79-861e-4e2b-a12c-7addd3138626, May 2025
Business-event baseline SELECT exceeded its 90-second diagnostic deadline
(SQLSTATE 57014). It returned no completed execution plan. The candidate-only
follow-up executed the exact migration 058 selector body in memory, without
installing functions or preparing data:

- execution 4016.192 ms; planning 13.069 ms;
- 189288 source rows, one monthly membership row, one loop;
- 98705 shared hits, 134841 shared reads at the root;
- zero temporary reads/writes;
- review_facts used the existing review_facts_measure_date index.

This verifies the candidate source SELECT completes on company data. It does not
verify the company exact multiset comparison (which was not run), full prepared
content identity, end-to-end preparation time or sustainable refresh throughput.
The baseline/candidate observations were not a randomized cold-cache benchmark.
No company deployment, function installation, preparation or activation occurred.
The next gate remains the same bounded May-only rollback rehearsal, with all
independent content and source-control checks intact, before a full-history run.


## Astra review and exact next step

Astra reviewed the rehearsal boundary and recommended the existing normal
forward-migration deployment followed by the existing protected-ingestor May
rollback rehearsal. Do not install migration DDL inside that rehearsal or switch
its preparation identity to the migration owner. The reviewed rehearsal artifact
is company-event-month-single-period-rehearsal-2026-10-18.md; its new function
fingerprints were verified against a freshly migrated disposable database.
Its content identity/row count must match the prior company baseline, and its
stage summary reports whether population and total time improved. Company
activation and full-history preparation are outside this release approval scope.
