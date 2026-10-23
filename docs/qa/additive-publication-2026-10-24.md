# Additive Command publication and scheduling — 24 October 2026

## Observed company state

Company release ca6be22 committed the October invoice prepared chunk at 20:31:46 UTC on October 23 and sealed all 150 bindings by 20:39:40 UTC. Invoice publication completed at 20:49:45 UTC. The private receipt capture then sealed, but replay creation rejected with `Business delta requires the current compatible accepted partition`. Existing guard 065 admitted only the first legacy-to-Command extension, not a subsequent additive recipe.

Ordinary sync failed at 20:44:14 UTC while publication owned the shared tenant writer lock. The failure handler paused its timer. Daily scheduling remained enabled. This is expected contention incorrectly classified as a failed job; the source was not read by that checkpointed attempt.

## Corrections

Migration 088 admits an additive Command-to-Command extension only at the same recipe definition version, retaining every existing rule and capability unchanged. Original source, tenant, dataset, currency, definition, accepted-parent and increasing-cutoff checks remain. Changed/removed definitions and stale parents reject.

A domain-owned `AnalyticsOperationBusy` identifies writer contention. Both adapters raise it before candidate changes, application lifecycles release resources without recording a false failure, and the CLI reports a normal deferred result. Real errors retain failure auditing and nonzero exit behavior. This does not weaken serialization or publication proofs.

The original publication guard query also entered dense history proof despite only one changed partition. Its read-only reproduction reached a five-second bound inside `business_complete_partition_exact`. Selecting the changed set first with a materialized CTE proved exactly one changed company partition in 2.090 seconds. Migration 089 applies that query scope inside the existing guard, preserving all other family, affected-month, parent, cutoff and exactness checks.

## Evidence

- Corrected additive guard accepted the actual sealed receipt metadata under the company ingestor in a rolled-back transaction, with no source read or publication.
- Focused synthetic compatibility and lock tests: seven passed, zero failures/skips in 2.95 seconds. They accept a second recipe, reject changed/removed rules and capabilities, reject incompatible versions/stale parents, preserve tenant/private isolation and locks, and distinguish contention from job failure.
- Final focused verification, including existing publication/rebase/atomic rollback and true-failure audit cases: 24 passed, zero failures/skips, 8.79 seconds. Changed-file lint, architecture, baseline-aware quality, TypeScript and diff gates passed. No full suite, rehearsal or GitHub CI is authorized or used.
- Browser access works; refreshing after midnight still showed unavailable metrics for the requested October 24 coverage. Invoice publication from October 23 alone does not establish October 24 coverage or completion of other recipes.

## Rollout

The root-only pinned script is `docs/qa/maintenance/deploy-additive-publication-2026-10-24.sh`. It requires deployed ca6be22 and exactly migrations 088–089, pauses schedules, takes a schema recovery record on the separate volume, preserves the web image and verifies the upgraded API. Run a fresh ordinary cycle, resume the sealed receipt candidate, then restore independent timers. Actual remaining recipe publication, freshness and browser acceptance remain pending.

## Continuation evidence

The 70da55e API deployment is healthy. Ordinary sync passed at 22:52:58 UTC on October 23 in 11 seconds, and the saved receipt worker advanced ten canonical pages successfully by 22:53:03 UTC. All three timers were restored. The receipt's changed prepared chunk subsequently committed; unchanged history is reused. The existing sales/invoicing report was verified serving actual figures in the signed-in Arabic browser.

Company timer inspection showed `AccuracyUSec=1min` despite a five-second continuation interval; observed gaps exceeded that intended interval. A timer-only configuration correction sets the standard `AccuracySec=1s`, with the application image retained at 70da55e. No synthetic test or image rebuild is needed for this single setting; unit verification and effective configuration observation establish application of the setting. Actual remaining publication and Command Center acceptance remain pending.
