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

Both persistent and disposable PostgreSQL Compose definitions now declare configurable `MART_POSTGRES_SHM_SIZE`, default `1g`. This changes the shared-memory ceiling, not allocated RAM or metric logic. The official [PostgreSQL image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md#caveats) describes this exact failure and setting. Company rollout preserves the existing named database volume and bootstrap environment, recreates only PostgreSQL and the application containers, and leaves timers paused.

Migration 083 makes the 082 upgrade precondition effective for the NOBYPASSRLS migrator with no tenant selected. Transaction-scoped owner read policies permit inspection of all tenants' unsealed heads; both policies are removed before commit. Application grants and forced tenant RLS remain unchanged. The focused incomplete-capture test now checks this upgrade rejection and policy rollback. Three focused tests passed again (0 failures/skips, 2.25 seconds); lint, architecture, quality, TypeScript and diff checks passed.
