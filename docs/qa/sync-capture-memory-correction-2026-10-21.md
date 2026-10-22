# Sync capture memory correction — 21 October 2026

Status: company deployment of `cffb5cf28c81f29163a65342246f283653469367` passed,
but its 21 October 21:08:18 UTC sync failed with JavaScript heap exhaustion at
21:17:01, before a committed capture. Source handoff completed at 482.048 seconds;
classification reported 569,542 entries at 513.282 seconds. The focused synthetic
result below did not establish a working company sync. Do not use this document's
historical rollout command as a recommendation to repeat that run. The unverified
[22 October code draft](../integration/proposals/delta-sync-correction-2026-10-22.md)
addresses cursor reset and whole-candidate buffering; the business refresh gap
remains open.

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
Full lint and API/web production builds also passed; the web build retains its
existing large-chunk warning.
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

## Local API rehearsal

The API image was built from a clean checkout of `cffb5cf`, excluding the unrelated
performance-fixture edit and private configuration. Under the shared maintenance
lock, operator schema/runtime verification passed against existing migration 064.
The API was replaced with `el-dabboos-api:cffb5cf28c81f29163a65342246f283653469367`;
web `6caf30e` was retained. The API is running and healthy, and HTTPS readiness
returned `ready` with persistence and analytics available. The first HTTPS request
immediately after the proxy restart was interrupted; the subsequent bounded
readiness check succeeded. An earlier local shell invocation stopped in an RVM
directory hook before deployment began; the non-login-shell invocation completed.
No migration, source connection, sync, timer change or browser QA was performed.

## Company API-only correction

Release code/image: `cffb5cf28c81f29163a65342246f283653469367`. Later handoff commits
do not change this pin. Run only after delivery confirms local readiness and remote
publication. The company already applied migration 064 under `8d449b9`; this block
refuses any further migration change and performs verification only. Preserve the
current `8d449b9` image for same-schema recovery, the retained web artifact and the
coordinated backup on `/mnt/HC_Volume_107192875`. No new backup, migration, bootstrap,
heap increase, source job or timer activation is performed by this code-only block.

Root had 5.2 GiB available after reviewed image/cache cleanup, before this build.
The 2 GiB reserve below is the existing deployment stop threshold, not evidence that
the complete catch-up fits. Monitor capacity during any subsequent source run.

```bash
export SYNC_MEMORY_RELEASE=cffb5cf28c81f29163a65342246f283653469367
(
set -euo pipefail
cd /opt/el-dabboos/analytics
[[ "$SYNC_MEMORY_RELEASE" =~ ^[0-9a-f]{40}$ ]]
test -z "$(git status --porcelain --untracked-files=all)"
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer; do
 test "$(systemctl show "$unit" -p ActiveState --value)" = inactive
done
for job in sync daily; do
 state=$(systemctl show "el-dabboos-analytics@$job.service" -p ActiveState --value)
 case "$state" in inactive|failed) ;; *) printf 'Analytics job is still running: %s\n' "$job" >&2; exit 1 ;; esac
done
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test "$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)" = el-dabboos-api:8d449b9df9fca8ae7f94c16541c96718e805daa1
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
git merge-base --is-ancestor "$SYNC_MEMORY_RELEASE" origin/main
git merge --ff-only "$SYNC_MEMORY_RELEASE"
test "$(git rev-parse HEAD)" = "$SYNC_MEMORY_RELEASE"
test -z "$(git diff --name-only 8d449b9df9fca8ae7f94c16541c96718e805daa1 HEAD -- packages/data/migrations)"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$SYNC_MEMORY_RELEASE"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
[[ "$STAGING_WEB_IMAGE" =~ ^el-dabboos-web:[0-9a-f]{40}$ ]]
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
check_root_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
compose run --rm --no-deps operator verify
compose up -d --wait --no-deps api
compose restart web
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{console.log('Readiness',r.status);process.exit(r.ok?0:1)})"
curl --retry 3 --retry-all-errors --retry-delay 1 --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nMemory correction deployed: %s; web retained: %s. Source jobs and timers remain paused.\n' "$SYNC_MEMORY_RELEASE" "$STAGING_WEB_IMAGE"
df -hT / /mnt/HC_Volume_107192875
)
```

Review deployment output before one supervised source run. An accepted publication
and advanced cursor remain the completion criteria. A completed source handoff or
capture checkpoint alone is intermediate progress. Preserve the final result and
checkpoint lines; do not automatically retry failures or enable timers based only
on application readiness.
