# Required Command windows and bounded prepared statements — 24 October 2026

## Scope and correction

The owner selected automatic preparation only for this overview’s required windows. The worker uses existing domain calendar functions for prior-month elapsed invoice comparison, four separate prior same weekdays for receipts, and six Saturday-start order weeks. Current coverage keeps all five recipes. Historical coverage adds only the recipes needed by those windows, within existing accepted Business membership. This does not recreate removed 2024 reporting months. Explicit allocation sweeps retain their operator scope.

A sealed September invoice candidate reached its first changed event preparation with 20 existing bindings. That statement exceeded its existing 120-second limit. Company source-free measurements found 284,187 affected keys, 1,480,284 projected contributor rows, and separate durations of 24.786 seconds for keys, 33.750 seconds for projection, and 26.383 seconds for reduction/output (temporary diagnostic tables, rolled back). These phase measurements exclude persistent insert overhead and are not a completed-publication claim. The actual stored-key plan then exposed a one-row estimate for 284,187 newly inserted keys, selecting a nested-loop contributor join. Refreshing key-column statistics changed that join to a hash join (the raw key-table estimate became approximately 283,000). Autovacuum cannot analyze uncommitted dataset rows, so the builder explicitly refreshes `tenant_id,data_id` statistics after each key/cell bulk load, before dependent statements. This follows PostgreSQL’s documented [post-load ANALYZE guidance](https://www.postgresql.org/docs/18/populate.html#POPULATE-ANALYZE), without hints or fixed company cardinalities.

Migration 091 reuses the builder’s complete stored key set during cell materialization. The binding guard independently derives and compares all expected keys before using that proven set for a source-contributor cell comparison. Missing or extra keys still reject. Distinct label sets are aggregated per cell before expanding label fields; repeated labels cannot create new values or suppress conflicts.

The application invokes key creation and cell construction as separate SQL statements in the same owning transaction, followed by existing statistics and exact binding checks. This preserves atomic rollback, current statement bounds, finite cell limits, source-free replay and immutable publication. It introduces no partial publication or additional checkpoint lifecycle. The original combined SQL entry point remains available for explicit callers. Source definitions, Odoo configuration, service deadlines and prepared reader contracts are unchanged.

## Approved verification

The owner approved only focused synthetic PostgreSQL and window-boundary tests. Six PostgreSQL tests passed: Business corrections/deletions and native-reader equivalence, snapshot rollover, mismatch/promotion rollback, missing sealed-parent rejection, missing/extra prepared-key rejection, and comparison against the original replacement query. The equivalence fixture includes repeated and conflicting labels. Three calendar tests passed, covering current/historical recipe selection, a six-week window spanning three months and a year boundary. One initial test used an incorrect expected calendar boundary; its date was corrected and the focused rerun passed.

Changed-file ESLint and root TypeScript passed. Static architecture, quality and diff gates each returned zero diagnostics. No full suite, local rehearsal, customer fixtures or GitHub CI was run.

## Company acceptance

The complete saved September invoice build and binding passed on the company database under the actual migration owner and restricted ingestor identity, using the exact application statement sequence. Key creation completed in **45.094 seconds**, all **284,187** replacement cells materialized in **81.554 seconds**, statistics completed in **20.479 seconds**, and the exact binding insert passed in **101.534 seconds**. Each statement retained the **120-second** limit. The transaction rolled back, including temporary migration definitions and prepared data; this was source-free manual company evidence, not a publication or rehearsal claim.

Earlier combined probes timed out and were rolled back without deployment. One binding probe included an extra statistics calculation in its binding statement; the corrected measurement uses the application’s existing separate statistics call. A preliminary measurement also created new functions as the administrator rather than the migration owner; the final measurement uses actual deployment ownership and copied execution grants.

API `b8666a61130b14d61fe6caf18670394dcd374adf` was then deployed on the company host, migration 091 applied, staging roles/schema verified, and readiness returned 200. The web image remained `6caf30ec647801d36a303aae2acc9cf36ce37b81`. Root headroom after deployment was 5.0 GiB.

The saved September invoice candidate’s actual scheduled preparation completed at **07:46:33 UTC**: aggregation (keys, cells and statistics) took **158.533 seconds** across separate statements, its exact binding took **103.988 seconds**, and the complete unit took **263.341 seconds**. This persisted the private chunk successfully; subsequent sealing/publication remains a separate phase. Ordinary, daily and Command timers were all restored active after that success. Required September recipe publication and fresh current/historical monthly checks are still being observed. Current accepted recipes and ordinary/daily jobs remain available. Unused obsolete API images were removed after confirming no container referenced them; current API `09d411e`, rollback `a01bfd1`, web and PostgreSQL were retained. This increased root disk headroom from 1.9 GiB to 4.3 GiB before the final measurement. No database volume, source data or recovery archive was removed.

## Deployment

Run the [pinned predecessor rollout](maintenance/deploy-required-command-windows-2026-10-24.sh) only after complete company measurement succeeds. It expects API `09d411ea3a05f81d93152dda7cdae9838ba3a143`, pauses all three timers, waits for jobs, acquires both existing host locks, retains the web image, records the previous schema on the separate backup volume, applies the migration and verifies identities/schema. Resume the saved September candidate under supervision before restoring its timer. Ordinary and daily schedules remain independent.


## Final order binding follow-up

September invoices were published by 07:53:36 UTC and receipts by 08:11:40 UTC. Both comparisons were confirmed available in the company browser. Normal sync completed on `b8666a6` in approximately four seconds while background work continued.

The remaining September order candidate completed aggregation in 242.350 seconds across separate statements, then its binding statement timed out at 08:25:36 UTC. The database context identifies `business_prepared_statistics` reading `business_prepared_cells` from the last statistics comparison in the binding guard; the preceding exact key/value/control proof had returned successfully. Only the Command timer paused. Ordinary and daily timers remained active.

Migration 092 pushes the replacement-key join into each concrete parent dataset read before counting inherited rows. It retains parent statistics, subtraction of removed measures, physical new-cell counts, sparse ancestry tombstone masking, snapshot cutoff identity, exact dimensions/grains and rejection of negative totals. It changes one statistics function, with no new store or lifecycle, no source changes, and no deadline changes. The previously approved six existing Business delta/key/equivalence tests pass; no new automated tests were written for this follow-up. Architecture, quality and diff gates return zero diagnostics.

Company comparison of the original and filtered statistics and complete order binding is pending; do not treat this follow-up as deployed until its company acceptance is recorded. The [pinned SQL-only rollout](maintenance/deploy-business-counts-2026-10-24.sh) requires API `b8666a6` and no application-source differences.

## Continuation status and access blocker

The first filtered-count company transaction produced statistics identical to the original function (original 53.186 seconds; filtered 42.680 seconds), but its complete binding still reached the existing 120-second limit and rolled back. The pending revision additionally excludes ancestry reads when no requested replacement key belongs to both the parent’s configured measures and grains. This predicate is based on dataset metadata, with no company-specific constants.

The six approved existing PostgreSQL cases passed after that predicate was added. Architecture, quality, diff and deployment-shell syntax checks were rerun successfully on the pending files. No broader tests, GitHub CI or rehearsal were run.

The final company rollback measurement result could not be recovered after the execution session ended. It must not be counted as a pass. The previously used temporary SSH identity is no longer present, and this PC’s persistent identity was rejected by the company server. Restoring authorized SSH access is required before completing the measurement, deploying migration 092 or changing schedules. No deployment or server job was restarted during this continuation. Company release `b8666a6` remains the last verified deployed release; current live status has not been rechecked.

## Migration 092 company acceptance

Authorized SSH access was restored. The final source-free transaction used the actual migration owner and restricted staging ingestor, retained the 120-second per-statement limit, and rolled back every change. The saved September order candidate produced **330,662** replacement cells: keys **97.203 seconds**, materialization **89.377 seconds**, original statistics **52.156 seconds**, corrected statistics **3.903 seconds**, and the complete guarded binding **105.797 seconds**. Original and corrected statistics matched exactly. This validates the saved candidate; deployment/publication remain separate operations.

The live check also found ordinary sync had paused after a later bulk capture at 09:34 UTC. Its sealed capture `d789ac88-9da6-4dc2-9846-c2ee2a6231ac` remains resumable. After PostgreSQL refreshed table statistics, its captured first summary aggregate completed in **219.674 ms** under the existing 15-second bound. This is one aggregate measurement, not a completed sync claim. Daily remained active. Both saved jobs will resume without source recapture.

## Saved ordinary-sync evidence guard

Migration 092 was deployed as API `8fbcad94bd6f474c2cb2741eb4ce0f3e34ed611a`; migration/role verification passed and readiness returned 200. The saved September order unit resumed. Ordinary sync independently resumed its sealed capture without reopening Odoo. Its complete reconciliation succeeded in **186.536 seconds**, then `guard_sync_reconciliation` exceeded its unchanged 15-second statement limit. The capture contains **225,370 controls** for **120,608 changed records**. It remains private and resumable.

Migration 093 replaces the evidence guard’s repeated large-array membership scans with one materialized relation of distinct requested IDs and one joined evidence relation. It retains ID cardinality/duplicate rejection, complete `EXCEPT ALL` control equality, source cutoff/revision and mapping/definition checks. It changes no storage, scheduler, timeout or publication contract.

The owner approved the existing focused checkpoint tests: **9 passed, 0 skipped**, including source-free resume, incomplete evidence rejection, atomic acceptance rollback, immutable capture, exact rejection, tenant isolation and stale-lineage rejection. Architecture, quality, diff and rollout-shell syntax checks passed. No new tests, full suite, rehearsal or GitHub CI were run. The synthetic PostgreSQL container was removed afterwards. Actual company acceptance of migration 093 is pending the [pinned SQL-only rollout](maintenance/deploy-sync-evidence-2026-10-24.sh).
