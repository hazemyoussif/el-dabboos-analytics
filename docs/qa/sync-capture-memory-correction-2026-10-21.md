# Sync capture memory correction — 21 October 2026

Status: code correction and approved focused verification completed. Local release
rehearsal and publication are in progress. Company deployment of the correction
and a successful company catch-up remain unverified.

## Observed failure

The company deployed `8d449b9` and verified migration 064, runtime roles and
application readiness. During the single 13:56:55 UTC sync, source handoff completed
at 14:04:51 (470.220 seconds). Classification reported 569,542 changes at 14:05:22.
Node then aborted at 14:05:28 with `Reached heap limit` / `JavaScript heap out of
memory`; the last GC reported approximately 2,080 MiB retained heap. No committed
capture checkpoint was reported. This was not the systemd job deadline.

The log does not provide an allocation stack or heap snapshot. Code inspection
identified avoidable full-population allocations immediately after classification:
`changes.map(...)` plus another head index, an array of all head values, flattened
old/new dates, and arrays containing every dependency page.

## Correction

Checkpointed capture reuses the planner's existing final-head index. This index
already reflects sequential corrections and final tombstones; it is retained only
when requested by checkpointed capture. Other ingestion callers retain their
existing lifetime. Head writes iterate that index in the existing 10,000-record
pages. Changed dates accumulate directly into a set, and dependency pages are
serialized one at a time using the existing 1,000-record bound, including an empty
completed page when appropriate.

The change preserves fact hashes, final-head selection, source handoff before
payload writes, immutable capture contents, exact evidence, tenant RLS and atomic
acceptance. It changes no migration, business rule, heap limit, source/job deadline,
credential or timer. It does not make the whole ingestion pipeline constant-memory:
the original planned changes and dependency observations are still retained until
capture. Company peak memory and completion remain to be established.

## Approved verification

The owner approved one synthetic memory regression around 570,000 changes with a
2 GiB heap cap, plus the existing checkpoint correctness tests. The memory check
exercises real ingestion, classification and capture serialization with a recording
SQL boundary, not a live source or database. It verifies final duplicate-key
selection, tombstones, changed dates and write-page bounds. Separate PostgreSQL
checks cover real sealing, RLS, interruption/resume and atomic rollback.

The memory case passed in **43.496 seconds**, with **570,001 changes / 570,000 final
heads**, a sampled peak JS heap of **1,253 MiB**, and process maximum RSS of
**1,517,448 KiB**, under `--max-old-space-size=2048`. Sampling is not an allocation
trace. This fixture has one covered month and uses a recording SQL boundary; its
runtime and memory are not company-source or PostgreSQL performance measurements.
It does not establish how the earlier code performs on the same fixture.

All **nine existing PostgreSQL checkpoint correctness tests passed** in 5.742
seconds with zero failures, cancellations or skips. They used disposable synthetic
databases on the existing isolated `foundation_test` service at port 55436; the
test container was returned to its prior stopped state afterward. The first static
compile caught an invalid lookup-object name in the new synthetic fixture; it was
corrected to the adapter's existing `customer` vocabulary before tests ran.

Targeted lint, full root/web typecheck, architecture, quality and diff checks passed.
The owner authorized only focused tests for this correction. The earlier release's
986 regular / 419 PostgreSQL plus corrected policy-test results remain historical
evidence for `8d449b9`, and are not full-suite results for this changed production
tree. No full-suite rerun, company retry or GitHub Actions run was performed.

Commands (no developer env files):

```bash
node --max-old-space-size=2048 --experimental-transform-types --disable-warning=ExperimentalWarning --test packages/data/test/performance/sync-capture-memory.test.ts
# The next command receives only the disposable PG_TEST_ADMIN_URL.
node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-concurrency=1 packages/data/test/postgres/checkpointed-sync.test.ts packages/data/test/postgres/checkpointed-sync-guards.test.ts
```
