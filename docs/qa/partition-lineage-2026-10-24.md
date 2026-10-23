# Partition-first Business lineage reads — 24 October 2026

## Company evidence

Invoices and receipts are accepted. Receipt publication on API 70da55e completed in 1.759 seconds, versus 594.622 seconds for the invoice before the changed-publication-set correction. Ordinary sync passed, all three timers were active, and timer accuracy was verified at one second after the timer-only d69bf63 update.

The next saved October order chunk reached its unchanged 120-second statement deadline inside `review_effective_facts`. The Command timer paused automatically; accepted invoice/receipt publications and other schedules were preserved. The original company EXPLAIN showed a sequential scan of all 9,040,862 tenant fact rows followed by a hash join to estimated recursive ancestry. The current measure-aware join still allowed the planner to read unrelated history.

## Correction

Migration 090 enumerates actual raw and prepared ancestry first, then executes each read with one explicit tenant/partition or tenant/dataset equality. A prefix of already visited newer ancestors applies the same root/key replacement masking. Key, measure, grain, date, cutoff and NULL/empty-array semantics remain. The prepared reader retains its existing non-bypass security definer, forced tenant RLS and currently published root authorization. No source changes, source reads, raw month copies, timeout increases or planner-setting overrides are introduced.

The same company EXPLAIN inspection showed the prepared reader scanning the shared prepared-cell relation before joining ancestry. Applying the same dataset-first access prevents unrelated prepared-history reads. A `(tenant_id,data_id)` prepared-binding index also supports the existing immutable-content check on every inserted cell/key: the actual plan changed from a full binding-table scan to an index-only lookup. No guard is removed.

## Verification

- Owner-approved existing focused reader/delta/equivalence tests: 8 passed, zero failures/skips in 60.04 seconds, including corrections, deletion, snapshot rollover, retained rows, empty/duplicate keys, tenant/private isolation, extrema/labels and rollback.
- Final company rolled-back transaction under the actual ingestor identity constructed the complete saved order chunk in 54.317 seconds and inserted its binding through the actual full guard in 66.241 seconds. Both remained under the unchanged 120-second bound. All diagnostic writes and definitions were rolled back; no source read or publication occurred.
- An intermediate raw-reader-only variant validated but took 107.057 seconds for binding, leaving little headroom; it was not deployed. The prepared-reader plan identified the remaining broad scan before final verification.
- Changed behavior is SQL-only. Prior 70da55e changed-file lint, TypeScript, architecture and quality results remain applicable to unchanged TypeScript; diff and SQL migration validation are recorded for this revision. No broad suite, rehearsal deployment or GitHub CI was run.

## Deployment

`docs/qa/maintenance/deploy-partition-lineage-2026-10-24.sh` requires the 70da55e API and exactly migration 090. The timer-only commit may be present; its one-second accuracy remains installed. Source schedules pause for migration/replacement, accepted data and the web image remain, and the sealed order candidate resumes after a successful supervised unit. Actual company completion and final Command Center browser acceptance remain pending.
