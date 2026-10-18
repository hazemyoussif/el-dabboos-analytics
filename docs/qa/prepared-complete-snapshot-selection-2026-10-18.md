# Complete snapshot observation selection — 18 October 2026

## Scope and diagnosis

Company six-family rollback sizing passed Finance snapshot, Facts event/snapshot
and Review event/snapshot. Business complete snapshot cutoff 2026-10-15 failed
at 120 seconds. Existing PostgreSQL logs place statement_timeout in the population
INSERT within prepared_work_start (not ANALYZE). Its deployed source materializes
historical operands before joining per-measure latest accepted observations.
This identified the failing statement; it did not measure every internal cost.

Migration 059 changes only preparation of complete Review/Business snapshots.
It selects each measure's latest accepted observation first, then reads the exact
published monthly partition and day. Certified fact/partition month membership is
an existing invariant. Different measures may select different observation dates.
Duplicates and full operands remain intact. Existing accepted-empty markers are
still added by the unchanged population expression; missing evidence is not zero.
Controls with expected_count=0 do not suppress actual fact reads.

The 058 helper's history contract, canonical/independent proofs, Facts delta,
Finance, events, runtime readers, grains, source contracts, signatures, roles,
indexes, request deadlines and activation settings are unchanged. Applied migration
history is untouched. The new helper is invoker-rights, PUBLIC-revoked and granted
only to the protected ingestor. The workspace selects it only after validating
the governed complete-snapshot configuration.

## Company exact proof

Candidate migration SHA-256:
`a04af6077113fdd59f9044f378a5d2232788b89e9d3f501e767569380fb87142`.
Pinned immutable publication: `63e7536d-884a-4cd5-a3a5-d271aec92938`.
Cutoff: 2026-10-15. Protected ingestion role; repeatable-read/read-only transaction;
120-second statement and 260-second overall bounds; no changes or Odoo access.

A combined canonical/candidate comparison timed out without proving equality.
Astra approved decomposing the exact proof by the 30 disjoint accepted measure/date
observations. All reference plans first passed selective tenant/partition/measure
index access. The reference retained every published family membership and the
canonical reader; it did not acquire the candidate's observation-month restriction.
Symmetric EXCEPT ALL compared every column and duplicate, including empty markers.

All 30 observations passed, including the one accepted empty observation:
**122404 reference rows = 122404 candidate rows; zero differences**. This is
122403 fact operands plus one explicit empty marker, not a prepared-cell count.

The exact full candidate population SELECT then measured 1584.401 ms execution,
6.942 ms planning, returning 122404 rows. Its root recorded 69321 shared hits,
46631 shared reads, and 7756 temporary read/write blocks each (about 60.6 MiB
each at 8 KiB). This followed the comparison and is not a cold-cache benchmark.
It does not establish full temporary workspace, aggregation, independent validation,
persistence or binding time. No baseline-path timing improvement factor is claimed.

## Local verification and reviewed next step

Targeted PostgreSQL regressions cover exact complete populations, distinct latest
observation dates by measure, partial cutoffs, accepted empty versus missing,
immutable historical corrections, tenant isolation and runtime denial. Existing
complete/delta behavior, duplicate/null-identity rejection, events and independent
prepared-cell proofs remain covered. The identity rejection fixture now corrupts
only disposable synthetic source payloads so both readers observe the same invalid
input; it no longer mocks only the old canonical function.

Exact server diagnostic SQL also passed the synthetic multi-cutoff and corrected-
publication fixture. The rehearsal's function hashes were checked against actual
PostgreSQL migration output. Astra reviewed 059 and the one-cutoff runner and found
no blocking issue. Required full release checks are recorded below when completed.

Publishing and company schema changes still require user approval. The proposed
normal forward deployment is followed only by the failed-cutoff rollback rehearsal
in company-complete-snapshot-rehearsal-2026-10-18.md. It pins the current publication,
requires its source/configuration to match the proved revision, rejects reuse,
runs the ordinary full pipeline and rolls all writes back. Existing disk/statement/
lock/host limits remain unchanged. Full-history capacity, automated source freshness,
prepared-read latency and company activation remain separate, unpassed gates.

## Required release checks completed

Frozen dependency installation, lint, architecture (0 diagnostics), quality
(0 diagnostics), type checking, API/web build and diff checks passed. The regular
suite passed 935 tests in 54.44 seconds. The complete disposable PostgreSQL 18.6
suite passed 336 tests in 552.85 seconds. Both suites had zero failures, cancellations
or skips. Synthetic diagnostic SQL tests and migrated function-body hash checks
also passed. No CI or company deployment ran. The web build retains its existing
large-bundle warning; no frontend behavior was changed by this release.
