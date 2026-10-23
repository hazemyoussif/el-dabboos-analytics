# Scoped Business preparation correction — 2026-10-23

Ordinary sync is accepted and operating on schedule. The supervised daily reconciliation and deletion sweep completed successfully at 19:42 UTC on October 23. Command invoice capture and canonical replay remain saved privately; the report still has no published Command measures.

After migration 085 made the exact canonical proof complete, the changed October event preparation hit its 120-second statement deadline. Migration 086 gives explicit measure populations their own typed access path and projects each necessary contributor/grain/time bucket once before matching affected dimensions. It preserves the original exact values, counts, minimums, maximums, provenance, labels, sparse root masking and tenant checks. It does not copy historical months or reread the source for saved work.

## Evidence before deployment

- Company read-only computation, with proposed definitions installed inside a rolled-back transaction under the actual preparation role: 79,804 replacement cells in 23.089 seconds for the pending October event chunk (17 measures, 13 grains). This does not establish completion of the full insertion or publication.
- Approved focused PostgreSQL replacement/delta tests: 5 passed, zero failures/skips, 75.73 seconds. The added comparison uses the original immutable migration 071 query as an oracle for all returned cell fields and covers corrections, new roots, deletion and an empty receivables snapshot.
- Approved focused keyed-reader/control tests: 3 passed, zero failures/skips, 4.78 seconds, including the added explicit measure-array branch, duplicates, empty selection and tenant isolation.
- Approved scheduler tests: 3 passed, zero failures/skips. Reused bindings drain within the existing ten-unit/ten-second limit; newly materialized preparation or publication stops the invocation. The systemd failure handler pauses only the failed job timer.
- Changed-file ESLint, architecture, baseline-aware quality, TypeScript, diff gates and systemd unit verification passed. Broad tests, rehearsal deployment and GitHub CI were not run, per owner instruction.

## Deployment

Run `docs/qa/maintenance/deploy-scheduler-guards-2026-10-23.sh` as root from the clean pinned company checkout after pausing all three timers and waiting for active work to finish. It requires the deployed 9b75d57 API, preserves the web image, takes a schema backup on the separate volume, applies only migration 086, verifies roles, recreates the API and installs both systemd services. Timers remain paused until supervised continuation.

After deployment, resume saved Command preparation, observe actual publication and report availability, restore daily scheduling based on the successful daily run, and verify the approved synthetic timer-failure case. Browser access is now confirmed, but the report currently displays no published metrics. Completion remains pending actual company publication and browser verification.

## Company continuation and binding correction

Release `9404b190636fc78aec34650e829b05d654b18f37` was deployed. Ordinary sync passed in 11 seconds; restoring daily scheduling ran overdue reconciliation/sweep successfully. Command aggregation completed, but the original `business_prepared_delta_exact` binding proof reached its 120-second timeout. The new failure handler paused only Command scheduling; no candidate was published.

Migration 087 compares distinct affected keys and grouped replacement cells with their physical primary-key identities in separate materialized statements. Missing/extra identities reject. Every dimension, value, count, minimum, maximum, provenance date, label and conflict array is compared exactly, including NULL semantics. Independent controls remain mandatory. It retains the previous semantics without the combined bidirectional set comparison and planner flattening.

The final proposed definitions were verified in a rolled-back company transaction under `staging_mart_ingestor_login`: full private dataset construction 100.374 seconds, independent controls true in 0.573 seconds, complete exact replacement proof true in 44.150 seconds. The same production statement bound was retained. No source read or publication occurred. An earlier SQL-expression-only variant exceeded a 30-second diagnostic bound and was not deployed. Approved focused PostgreSQL tests on the final definitions: 5 passed, zero failures/skips, 52.26 seconds. No broad tests, rehearsal deployment or GitHub CI.

The pinned follow-up rollout is `docs/qa/maintenance/deploy-business-binding-2026-10-23.sh`, requiring the 9404b19 API and only additive migration 087. Actual chunk commitment, publication and browser acceptance remain pending at this checkpoint.
