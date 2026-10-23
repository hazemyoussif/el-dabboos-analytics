# Bounded sync seal identity validation

## Observed company failure

The supervised 23 October 2026 15:24 UTC sync completed source capture and canonical revision writes, then rolled back at 15:34:22 UTC. PostgreSQL reported statement timeout inside `mart.seal_sync_candidate`, specifically its whole-candidate head/payload identity join. Approximately 486 revision pages completed. Root still had 13 GiB free before rollback. This is separate from the earlier confirmed filesystem exhaustion, which storage cleanup resolved.

## Correction

Migration 082 validates each candidate head's month, measure, status, source object and source identity against its exact immutable fact revision during insertion. The keyed lookup runs within the existing bounded write page. Final sealing retains specification validation, exact head count, dependency page counts, row counts and contiguity, without repeating the full JSON identity join.

Installation locks candidate-head/seal writes and refuses pre-existing unsealed heads. Previously sealed heads passed the original validation. Immutable revision/head triggers, tenant RLS, foreign keys, source controls, reconciliation and atomic publication remain active. No timeout increase, source mutation or historical initialization is introduced.

## Verification

Owner-approved focused synthetic PostgreSQL 18.6 tests: 3 passed, 0 failed, 0 skipped (2.21 seconds). These cover each mismatched identity field, exact valid sealing, immutable sealed heads, missing heads/dependencies and transaction rollback. ESLint for the new test, architecture, quality, TypeScript, diff gate and API build passed. An initial sandbox attempt blocked Git subprocesses; the static checks were rerun successfully with the required filesystem permissions.

No full test suite, GitHub CI or local rehearsal deployment was run. Company deployment and successful sync publication remain pending; synthetic correctness is not company performance evidence.
