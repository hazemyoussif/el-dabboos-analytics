# Company sync diagnostics — 21 October 2026

Status: focused/full local verification and the local API rehearsal passed.
Company deployment is pending; remote publication is reported with delivery.
No source call, company retry, timer change or new measurement is authorized by
this document. GitHub CI remains disabled. The unrelated performance fixture
experiment remains excluded from this patch.

## Company evidence received

The company deployed API `2edef2993c90d69feec3a34a9270a5b30a59fe02`, applied
062/063, verified roles and returned readiness 200. Web remained `6caf30e`.
Coordinated backups and archive inventories were saved at
`/mnt/HC_Volume_107192875/el-dabboos-backups/dependencies-20261020T192418Z`.
After rebuildable-cache and obsolete-image cleanup, root had 4.2 GiB free. This
was not a capacity guarantee for initialization or publication.

The controlled run started 20 October at 19:54:54 UTC and timed out at 20:09:54
UTC during offline refresh. Systemd subsequently killed the bash/Docker clients
at 20:11:24 UTC. Logs alone did not establish the final transaction outcome.
The later runtime status reported a new sync failure at 20:14:49.806 UTC,
`pendingCandidateRun: null`, the unchanged trusted revision
`887a79fe-df49-44c7-951b-217db4b1f688` and the unchanged successful source
cutoff `2026-10-20T07:24:09.590Z`. No successful accepted-state advance occurred.
The user has not supplied the requested container-list output; absence of an
outlived job container is not independently established.

Observed operation timings (nested totals must not be summed):

| Work | Seconds |
| --- | ---: |
| Lookup discovery | 2.113 |
| Source object pages | 62.578 |
| Candidate planning, including nested head reads | 112.699 |
| Receivable dependency initialization | 114.361 |
| All 28 receivable snapshot cutoffs | 64.904 |
| Source handoff reached, elapsed from operation start | 468.755 |
| Offline fact persistence | 222.415 |
| Candidate comparison | 61.837 |
| Offline refresh reached, elapsed from operation start | 769.830 |

The source read stream completed 286 pages. Persistence completed 57 revision and
57 head batches. At the existing 10,000-entry write bound this implies between
560,001 and 570,000 candidate entries, not necessarily unique identities. Existing
business-content equality already skips observation-only metadata changes. These
logs cannot establish whether inserts, labels, lineage, statuses, amounts or other
content differences caused the candidate population.

Astra's read-only review confirmed that both dependency caches remain cold after
failed acceptance because they commit with the successful audit/cursor transaction.
The first lookup catch-up and receivable initialization therefore repeat. Simply
committing the caches earlier would break their successful-cursor/completeness
contract. Resumability requires separate lifecycle design if later evidence shows
that it is needed; it is not implemented by this patch.

## Diagnostic code prepared

- Summarize already planned entries after source closure and before fact writes.
  Report previous/no-previous and active/tombstone counts by closed source object
  bucket and next business month. Classify existing-entry differences using fixed
  schema field paths and the existing canonical comparator. Do not collect or emit
  customer identities, values or arbitrary property names. Unknown object names
  are bucketed as `other`. Parent/child field counts deliberately overlap.
- Emit each refresh SQL substep's start/completion/failure immediately, including
  its month where applicable. Enclosing month events report index/total. This
  makes the last started step visible even if client termination prevents the
  final observation flush. All events describe uncommitted candidate work.
- Preserve SQL, parameters, order, exact guards, source lifetime, successful cursor
  and atomic publication. No migration, checkpoint relocation, longer deadline or
  additional source/mart query is introduced.
- Observation is optional. Classification is absent without an observer. Its
  synchronous CPU overhead is visible as `classificationMs`, but unmeasured at
  company scale. No zero-overhead or runtime improvement claim is made.

Astra reviewed the actual diagnostic diff read-only and found no blocking
correctness/privacy defect. It identified repeated nested serialization as an
unmeasured CPU cost; that caveat remains. TypeScript, targeted lint, architecture,
baseline-aware quality and diff checks passed. Static checks are separate from the focused
verification below. The earlier 973 regular / 411 PostgreSQL passes apply to release
`2edef29`, not to this diagnostic patch.

## Approved focused verification

After explicit owner approval, 13 focused synthetic unit tests passed with zero
failures, cancellations or skips. They used in-memory query clients and local
stderr capture, without a database connection, developer env file or source call.
Coverage:

1. Previous/no-previous, active/tombstone and repeated-key entry counts; nested
   business-field differences, canonical key-order equality and observation-field
   exclusion; malformed/unknown names never appear in diagnostic output.
2. Operator stderr includes aggregate counts and fixed names, excludes fixture
   sentinel values/identities, and emits refresh boundaries immediately rather
   than waiting for periodic progress or final cleanup.
3. Refresh observer enabled/disabled preserves SQL text, bound values and order;
   the failing substep is reported and its error propagates without downstream
   month completion. These stubs verify error propagation and ordering, not actual
   PostgreSQL guard execution or transactional rollback.

Exact command (run once, 13 passed):

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  packages/data/test/operational-change-summary.test.ts \
  packages/data/test/operational-refresh-observation.test.ts \
  apps/api/test/analytics-job-observation.test.ts
```

## Full local release verification — passed

The owner subsequently authorized one full local verification pass and publication
if it passes. Tested production code is pinned to
`1bdf4ec3476f2582d3be37eadc981b3b510dff77`. Frozen install, full lint, full
typecheck, architecture, quality, diff and API/web production builds passed. The
web build retains its existing large-chunk warning. Both full suites ran once:
**986 regular tests passed** in 57.518 seconds and **411 PostgreSQL tests passed**
in 642.374 seconds, with zero failures, cancellations or skips. PostgreSQL used
only the existing isolated synthetic `foundation_test` endpoint on port 55436.
The unrelated performance fixture edit keeps its original default size and remains
excluded from the released commit and the clean-archive Docker image.
No company command, source run or GitHub CI has been executed.

## Local container rehearsal — passed

The diagnostic API image was built from a clean archive of code commit `1bdf4ec`.
Operator role/schema verification passed with the existing schema 063; no migration
ran. Local API now uses `el-dabboos-api:1bdf4ec3476f2582d3be37eadc981b3b510dff77`,
with web `6caf30e` retained. The API container is healthy and HTTPS readiness returned
`ready`, with persistence and analytics available. The first HTTPS request was
interrupted immediately after proxy restart; after waiting for the proxy, the
request succeeded. No source job, cache initialization, company command, timer
change or browser QA was performed. Company-scale diagnostic overhead and sync
performance remain unverified.

## Company API-only rollout

Do not run until delivery confirms the full local gates and remote publication.
This deploys diagnostics; it does not fix or retry the initialization timeout.
The company already applied migrations 062/063 under `2edef29`. This block refuses
additional migration changes and runs verification only. Retain the prior
`2edef29` API for same-schema recovery, the current web artifact and the existing
coordinated backup. No source credentials are passed to a job; no source job,
bootstrap, publication or timer activation is performed. The existing 2 GiB disk
reserve is a deployment stop threshold, not a capacity guarantee for future sync.
An active systemd job or outlived analytics container stops this rollout.

```bash
export SYNC_DIAGNOSTIC_RELEASE=1bdf4ec3476f2582d3be37eadc981b3b510dff77
(
set -euo pipefail
cd /opt/el-dabboos/analytics
: "${SYNC_DIAGNOSTIC_RELEASE:?Set the reviewed merged correction SHA}"
[[ "$SYNC_DIAGNOSTIC_RELEASE" =~ ^[0-9a-f]{40}$ ]]
test -z "$(git status --porcelain --untracked-files=all)"
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer; do
 test "$(systemctl show "$unit" -p ActiveState --value)" = inactive
done
for job in sync daily; do
 state=$(systemctl show "el-dabboos-analytics@$job.service" -p ActiveState --value)
 case "$state" in inactive|failed) ;; *) printf 'Analytics job is still running: %s\n' "$job" >&2; exit 1 ;; esac
done
active_jobs=$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)
if [[ -n "$active_jobs" ]]; then
 printf 'An analytics container is still running; inspect it before deployment.\n' >&2
 exit 1
fi
for file in staging-runtime.env staging-operator.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
check_root_reserve() {
 local available
 available=$(df --output=avail -B1 /var/lib/docker | tail -n 1 | tr -d ' ')
 [[ "$available" =~ ^[0-9]+$ ]] && (( available >= 2147483648 ))
}
check_root_reserve
git fetch origin main
git merge --ff-only "$SYNC_DIAGNOSTIC_RELEASE"
test "$(git rev-parse HEAD)" = "$SYNC_DIAGNOSTIC_RELEASE"
# Stop if unrelated schema changes entered the selected release.
test -z "$(git diff --name-only 2edef2993c90d69feec3a34a9270a5b30a59fe02 HEAD -- packages/data/migrations)"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$SYNC_DIAGNOSTIC_RELEASE"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
[[ "$STAGING_WEB_IMAGE" =~ ^el-dabboos-web:[0-9a-f]{40}$ ]]
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
check_root_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
compose run --rm --no-deps operator verify
compose up -d --wait --no-deps api
# Restart the existing proxy to resolve the recreated API container address.
compose restart web
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nDiagnostic API deployed: %s; web retained: %s\n' "$SYNC_DIAGNOSTIC_RELEASE" "$STAGING_WEB_IMAGE"
df -hT / /mnt/HC_Volume_107192875
)
```

Stop after readiness and share the application deployment output. Any diagnostic
source run remains separate and requires review of container state, capacity and
explicit owner authorization. Do not retry the failed initial sync automatically.
