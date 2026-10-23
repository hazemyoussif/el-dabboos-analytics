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
