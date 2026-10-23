# Bounded sync seal identity validation

## Observed company failure

The supervised 23 October 2026 15:24 UTC sync completed source capture and canonical revision writes, then rolled back at 15:34:22 UTC. PostgreSQL reported statement timeout inside `mart.seal_sync_candidate`, specifically its whole-candidate head/payload identity join. Approximately 486 revision pages completed. Root still had 13 GiB free before rollback. This is separate from the earlier confirmed filesystem exhaustion, which storage cleanup resolved.

## Correction

Migration 082 validates each candidate head's month, measure, status, source object and source identity against its exact immutable fact revision during insertion. The keyed lookup runs within the existing bounded write page. Final sealing retains specification validation, exact head count, dependency page counts, row counts and contiguity, without repeating the full JSON identity join.

Installation locks candidate-head/seal writes and refuses pre-existing unsealed heads. Previously sealed heads passed the original validation. Immutable revision/head triggers, tenant RLS, foreign keys, source controls, reconciliation and atomic publication remain active. No timeout increase, source mutation or historical initialization is introduced.

## Verification

Owner-approved focused synthetic PostgreSQL 18.6 tests: 3 passed, 0 failed, 0 skipped (2.21 seconds). These cover each mismatched identity field, exact valid sealing, immutable sealed heads, missing heads/dependencies and transaction rollback. ESLint for the new test, architecture, quality, TypeScript, diff gate and API build passed. An initial sandbox attempt blocked Git subprocesses; the static checks were rerun successfully with the required filesystem permissions.

No full test suite, GitHub CI or local rehearsal deployment was run. Company deployment and successful sync publication remain pending; synthetic correctness is not company performance evidence.

## Company capture success and shared-memory failure

Migration 082 deployed as `d1559a43ec2857bcdb3f86f4e087e61105bcedef`. The next company run committed capture `71cf4cec-6e43-4339-b827-7871fedd1711`: 484,933 heads, 225,368 controls. Source handoff took 466 seconds; capture/sealing completed at 582 seconds. This confirms the former seal timeout was passed on the company workload.

Reconciliation then completed comparison in 159.9 seconds but PostgreSQL failed its evidence guard trying to allocate a 294,092,288-byte shared-memory segment. The actual PostgreSQL container had Docker's 67,108,864-byte `/dev/shm` limit, despite 6.4 GiB available host RAM. Capture remains durable; reconciliation can resume offline.

Both persistent and disposable PostgreSQL Compose definitions now declare configurable `MART_POSTGRES_SHM_SIZE`, default `1073741824` bytes (1 GiB). This changes the shared-memory ceiling, not allocated RAM or metric logic. The official [PostgreSQL image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md#caveats) describes this exact failure and setting. Company rollout preserves the existing named database volume and bootstrap environment, recreates only PostgreSQL and the application containers, and leaves timers paused.

Migration 083 makes the 082 upgrade precondition effective for the NOBYPASSRLS migrator with no tenant selected. Transaction-scoped owner read policies permit inspection of all tenants' unsealed heads; both policies are removed before commit. Application grants and forced tenant RLS remain unchanged. The focused incomplete-capture test now checks this upgrade rejection and policy rollback. Three focused tests passed again (0 failures/skips, 2.25 seconds); lint, architecture, quality, TypeScript and diff checks passed.

## Preparation query scope correction

Company release `540cf016fec879fbd04278e481a64835f68ff616` has a verified 1 GiB PostgreSQL shared-memory limit and the original named data volume. Offline resume passed reconciliation and all 22 monthly aggregate/drill proofs. It committed 22 Business event bindings, then hit the unchanged 120-second limit while populating the January 2025 Business snapshot. The source capture and completed checkpoints remain committed.

The actual preparation-role EXPLAIN showed the shared `review_fact_population` view expanding two full raw-table snapshot scans before the requested partition/measure filters. An initial scoped call through the general nullable-filter lineage reader still selected a full scan and was not deployed. Migration 084 instead selects accepted observations and member roots first, follows only those roots' existing sparse ancestry, and joins raw rows by typed tenant/partition/measure/date. The revised company EXPLAIN uses `review_facts_typed_access`; planner cost changed from about 5,183,058 to 110,457. Costs are planner estimates, not elapsed-time measurements.

Binding identity validation uses the same scoped reader separately at every accepted observation cutoff, retaining historical identity checks without reopening the all-history view. Complete source-control, cell proof, sparse replacement, immutable lineage, tenant and publication guards remain active. No deadline increase or source reread is introduced.

Owner-approved focused PostgreSQL 18.6 tests: 3 passed, 0 failed/skipped (3.70 seconds), covering dense operand equivalence through preparation, sparse updates/deletions with independently dated measures, unchanged ancestor data, and exclusion of unrelated partitions/families/tenants. Earlier local iterations exposed a test SQL alias, collation normalization and PL/pgSQL expression grouping; these were corrected before deployment. ESLint, architecture, quality, TypeScript and diff checks passed. Company publication remains pending.

## Company preparation completion and staging column grants

Release `29ba52d522c08d0e4b64d3cda96247ff6c32fe6f` completed every required prepared chunk for candidate `71cf4cec-6e43-4339-b827-7871fedd1711`; its prepared revision seal is committed. Business and Facts each have 22 event chunks, Business has 22 snapshots, and Facts/Receivables/Review have 21 snapshots each; Review also has 21 event chunks. Bounded service deadlines required offline resumes, which retained these committed chunks. No source capture was repeated for those resumes.

Final acceptance failed at 17:54:47 UTC with PostgreSQL `permission denied for table analytics_receivable_dependencies`. All 50 head-write pages completed inside the acceptance transaction before it rolled back; the accepted cursor and trusted revision therefore remain unchanged. Preparation remains sealed and reusable.

The migration-owned ingestor has column-level UPDATE grants on the four dependency/checkpoint tables. Staging logins deliberately use non-inheriting membership. `grantStagingPrivileges` copied relation and function ACLs but omitted `pg_attribute.attacl`, so the staging ingestor lacked all 13 required dependency UPDATE column grants. Provisioning now copies exactly the group-owned column ACLs within the existing approved schema list, without granting table-wide UPDATE, role inheritance or new tenant access.

The owner-approved focused staging PostgreSQL test passed: 1 passed, 0 failed/skipped (1.63 seconds total). It compares the staging login's dependency column privileges against the migration-owned group, exercises allowed allocation-link updates, rejects source identity updates, and retains the existing database/role/RLS isolation assertions. ESLint, architecture, quality, TypeScript and diff gates passed. No full suite, rehearsal or GitHub CI was run. Successful company acceptance remains pending.

## Company acceptance and ordinary sync restored

The column-grant correction deployed as `748019930070afed4625f6a6026eb60f747ab77e` through the normal staging operator migration/provisioning path. All dependency column privileges now match the migration-owned ingestor; table-wide UPDATE remains absent. No new migration or source change was required.

Candidate `71cf4cec-6e43-4339-b827-7871fedd1711` committed successfully at **18:07:08 UTC**; its service finished successfully at 18:07:09. It accepted **120,587 changed records**, **484,933 canonical revisions**, and **225,368 reconciliation cases with zero mismatches**. All prepared bindings and the prepared revision seal are present, no pending candidate remains, and the trusted serving revision equals the accepted candidate. The source cursor advanced from 20 October 07:24:09.590 UTC to **23 October 15:50:11.818 UTC**.

The operation record's `completed_at` is 18:04:52.483 UTC, captured before the final acceptance writes; it is not the commit time or service finish time. The final resume took 168,956 ms inside the analytics command and about 175 seconds including the wrapper. The earlier hours included the supervised catch-up/preparation checkpoints; the final resume duration does not describe the full catch-up.

A new ordinary incremental cycle ran from **18:09:39 to 18:09:49 UTC**. It returned `unchanged`, zero changed records/affected partitions, and accepted cutoff **18:09:45.382 UTC** (run `49f5bf3a-d860-49a9-b933-0ba9a406a833`). It reused the published revision and left no pending candidate. This is direct company evidence of a roughly ten-second ordinary cycle, rather than a synthetic performance result.

The ordinary sync timer was enabled after that success. Its first two automatic cycles completed successfully at **18:15:04 UTC** and **18:20:15 UTC**, including while the independent background worker was active. The separate Command background worker then sealed October invoice capture (5,379 operand facts, 11 pages) in **7.8 seconds**. Its timer is installed/enabled and is advancing sealed canonical/control pages in bounded invocations. This is background progress, not yet evidence that new Command measures have published. Daily reconciliation remains paused.

Readiness returns `ready` with persistence and analytics available. The API uses release `748019930070afed4625f6a6026eb60f747ab77e`; web remains `6caf30ec647801d36a303aae2acc9cf36ce37b81`. Root has approximately **7.8 GiB free**, the separate backup volume about 24 GiB. No new broad test suite, rehearsal or GitHub CI was run.
