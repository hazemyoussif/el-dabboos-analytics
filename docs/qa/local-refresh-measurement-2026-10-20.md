# Local refresh measurement — 20 October 2026

One local run completed after explicit owner approval. No repeat measurement or
company run is authorized by this result.

The source cursor and receivable/lookup dependency changes have focused synthetic
correctness evidence. The remaining question is the cost of immutable monthly
refresh. This command measures that stage against existing local mart heads.
It does not reproduce source ingestion, changed company heads, dependency
initialization, prepared publication, or the full company job.

Last recorded local coverage is 13 fact months and approximately 178,000 active
facts. Company coverage is 29 fact months. Current counts are derived again by the
command; no expected business values or row counts are embedded in its code.
Local results cannot establish company performance or hardware/storage parity.

## Exact scope

- Loopback PostgreSQL only, using the protected host-side ingestor connection.
- Refuse superuser, bypass-RLS or migrator identities.
- Acquire the existing tenant job lock without waiting; hold it through rollback
  verification. An active local job causes an immediate stop.
- Rebuild every published local fact month/day using the existing refresh function
  and exact database guards. Keep the existing 15-second statement deadline.
- Allow 150 seconds for refresh and an external 165-second process cap. The command
  cancels only its own database backend. Setup queries also retain statement limits.
- All candidate database writes are rolled back on success, failure or cancellation.
  No code path issues COMMIT or updates a trusted pointer. Rollback can still produce
  WAL and aborted tuples; adequate local disk headroom is required.
- No source connection, migration, publication, timer change or Docker build.
- Record safe stage timings/counts and verify unchanged trusted revision and tenant
  partition count before releasing the lock. Errors contain only stage, SQLSTATE
  and parser position, never credentials, SQL parameters or customer records.
- The result file must be new and is created with mode 600 before database access.

## Command for one approved run

Run from the managed Sales Command Center worktree. Keep this as a manual local
measurement; protected environment files must never be loaded by automated tests.

```bash
cd '/home/hazem/.codex/worktrees/sales-command-center/El Dabboos Analytics'
timeout --signal=TERM --kill-after=5s 165s \
  node --env-file=/home/hazem/.config/el-dabboos-local-staging/operator-host.env \
  --experimental-transform-types --disable-warning=ExperimentalWarning \
  scripts/integration/measure-operational-refresh.ts \
  --tenant el-dabboos-iq --budget-ms 150000 \
  --output /tmp/el-dabboos-refresh-measurement-20261020-approved.json
```

A failed or interrupted run is not a performance pass. An empty result file means
that the process did not complete its report; cleanup must not be claimed from an
empty file. A completed local refresh is still partial evidence because it does
not cover the company's data volume or the full sync/preparation pipeline.

The earlier ignored helper failed with SQLSTATE 42601 before entering refresh.
This replacement uses explicit SQL aliases and reports the failing stage/parser
position. That failed attempt measured zero refreshed months.

## Approved run result

The single approved run exited successfully. All 13 published local fact months,
178,249 active facts and 364 business dates were included. Refresh completed in
70.994 seconds, within its 150-second budget. The trusted revision and tenant
partition count were unchanged after rollback; the script reported no cleanup
error. No source access or publication occurred.

Safe result artifact (local, owner-only):
`/tmp/el-dabboos-refresh-measurement-20261020-approved.json`.

| Refresh stage | Total seconds |
| --- | ---: |
| Rebuild fact membership | 21.390 |
| Exact aggregate proof | 17.297 |
| Rebuild daily aggregates | 12.705 |
| Exact drill proof | 5.228 |
| Copy prior fact membership | 5.151 |
| Serving membership guard | 4.931 |
| Monthly rollup | 3.234 |
| Copy prior daily aggregates | 0.992 |
| Remaining setup and proof lookups | 0.058 |

This run deliberately requested every existing local business date. It measures
broad refresh, not a typical small incremental update. It contains no before/after
baseline, so it does not establish a speedup from the current changes. The company
has 29 fact months, different history and different hardware/storage; its full-job
runtime remains unverified. The result supports retaining exact guards and reducing
the number of affected facts/dates through the dependency changes, rather than
raising timeouts. It does not demonstrate that the complete company job will fit
its existing deadline.
