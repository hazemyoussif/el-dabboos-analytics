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

Pinned deployment and supervised continuation remain to be recorded. Current accepted recipes and ordinary/daily jobs remain available. Unused obsolete API images were removed after confirming no container referenced them; current API `09d411e`, rollback `a01bfd1`, web and PostgreSQL were retained. This increased root disk headroom from 1.9 GiB to 4.3 GiB before the final measurement. No database volume, source data or recovery archive was removed.

## Deployment

Run the [pinned predecessor rollout](maintenance/deploy-required-command-windows-2026-10-24.sh) only after complete company measurement succeeds. It expects API `09d411ea3a05f81d93152dda7cdae9838ba3a143`, pauses all three timers, waits for jobs, acquires both existing host locks, retains the web image, records the previous schema on the separate backup volume, applies the migration and verifies identities/schema. Resume the saved September candidate under supervision before restoring its timer. Ordinary and daily schedules remain independent.
