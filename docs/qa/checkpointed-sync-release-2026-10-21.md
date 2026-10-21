# Checkpointed sync release — 21 October 2026

Status: release code verified, merged release handoff pending. Local staging rehearsal
passed. Company deployment and source catch-up have not run. GitHub CI remains
disabled. Do not start company sync while capacity remains unresolved.

## Release scope

Branch: `codex/bounded-ingestion-overlap`; base:
`a6c715b9f4cd16b141f0be083ef951954d9b9c34`.
Release image/code: `8d449b9df9fca8ae7f94c16541c96718e805daa1`.
Production implementation is commit `ba784324df56eff34750fd47724d4da94aa8f9d1`;
the next two commits correct test assumptions: an optional `.github` directory
and a stale runtime-policy count. Later handoff commits do not change the release image.

The failed company catch-up previously rolled back completed work at the worker
deadline. Sync now seals a complete private source capture, closes the source,
and commits exact reconciliation, each month and each prepared chunk separately.
A later invocation resumes those checkpoints without reopening the source.
Successful audit, accepted heads, dependency checkpoints, cursor and trusted
publication still become visible in one final transaction. Readers retain the
previous accepted publication until then. Exact rejection never advances it.

Migration **064** adds the private lifecycle and restrictive runtime policies.
Run the existing staging `operator migrate`, which also copies migration-owned
privileges and policies to the non-inheriting staging logins, then `operator verify`.
No new bootstrap, source configuration, semantic metric, web artifact, timer
interval or timeout is needed. The service already invokes the repository runner;
the updated runner handles signals while waiting for Docker. Unit definitions are
unchanged. See [ADR 042](../architecture/adr/042-checkpointed-operational-sync.md)
and the [implementation record](../integration/proposals/checkpointed-sync-candidate-2026-10-21.md).

## Verification

The owner approved focused tests and the subsequent full local release checks.
The clean verification checkout excludes the unrelated performance-fixture edit
and all developer env files. PostgreSQL uses only disposable synthetic databases
on the isolated `foundation_test` service at port 55436.

Release checks on the clean checkout at `8d449b9df9fca8ae7f94c16541c96718e805daa1`:

- Frozen install, lint, architecture, baseline-aware quality, typecheck, API/web
  builds and diff checks passed. The web build retains its existing >500 kB chunk
  warning.
- The final regular suite passed all 986 tests (0 failures, skips or cancellations).
- The full PostgreSQL run covered 420 cases: 419 passed and one exposed a stale
  test policy-count assumption after migration 064. The test now compares the full
  restrictive policy set with login policies; that corrected focused test passed.
  Together, the original run and focused rerun cover all 420 cases; the full suite
  was not rerun after the test-only correction.
- Local staging migration 064 and runtime-role verification passed. Coordinated
  backups and readable archive inventories were created at
  `/home/hazem/.config/el-dabboos-local-staging/backups/checkpoint-sync-8d449b9df9fca8ae7f94c16541c96718e805daa1-20261021T133120Z`.
  API and retained web containers are healthy; API and HTTPS readiness both return
  200. HTTPS was checked with the configured local CA. No source connectivity,
  sync, or timer activation was performed. The backup archives were not restored.

Company-scale capture, final acceptance, total duration and storage are not
established by synthetic tests or application readiness.

## Company application deployment

Run only after delivery confirms publication and local migration rehearsal.
The company source connection is direct; this deployment does not use it.
Keep both timers paused and preserve the existing protected configuration.
The last reported root free space was 3.2 GiB. The existing 2 GiB reserve below
is only an application-deployment stop threshold, **not** sufficient evidence
that candidate revisions, new prepared data and WAL will fit during catch-up.
The mounted backup disk does not add space to the PostgreSQL volume.

This reuses the previous coordinated application deployment: build only the API,
lock maintenance, stop writers, back up both databases to the existing separate
mount, migrate and refresh grants, then start the API and retained web. It refuses
active jobs and unexpected migration changes. Backup checksums and readable
archive inventories do not constitute a restore rehearsal.

```bash
export CHECKPOINT_SYNC_RELEASE=8d449b9df9fca8ae7f94c16541c96718e805daa1
export CHECKPOINT_BACKUP_ROOT=/mnt/HC_Volume_107192875
(
set -euo pipefail
cd /opt/el-dabboos/analytics
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer; do
 test "$(systemctl show "$unit" -p ActiveState --value)" = inactive
done
for job in sync daily; do
 state=$(systemctl show "el-dabboos-analytics@$job.service" -p ActiveState --value)
 case "$state" in inactive|failed) ;; *) printf 'Analytics job is still running: %s\n' "$job" >&2; exit 1 ;; esac
done
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(git status --porcelain --untracked-files=all)"
[[ "$CHECKPOINT_SYNC_RELEASE" =~ ^[0-9a-f]{40}$ ]]
[[ "$CHECKPOINT_BACKUP_ROOT" = /* ]]
mountpoint -q "$CHECKPOINT_BACKUP_ROOT"
test "$(findmnt -n -o MAJ:MIN --target "$CHECKPOINT_BACKUP_ROOT")" != "$(findmnt -n -o MAJ:MIN --target /)"
for file in staging-runtime.env staging-operator.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
reserve_bytes=2147483648
check_reserve() {
 local available location
 for location in /var/lib/docker /opt/el-dabboos/state "$CHECKPOINT_BACKUP_ROOT"; do
  available=$(df --output=avail -B1 "$location" | tail -n 1 | tr -d ' ')
  [[ "$available" =~ ^[0-9]+$ ]] && (( available >= reserve_bytes )) || return 1
 done
}
check_reserve
git fetch origin main
git merge-base --is-ancestor "$CHECKPOINT_SYNC_RELEASE" origin/main
git merge --ff-only "$CHECKPOINT_SYNC_RELEASE"
test "$(git rev-parse HEAD)" = "$CHECKPOINT_SYNC_RELEASE"
test "$(git diff --name-only 1bdf4ec3476f2582d3be37eadc981b3b510dff77 HEAD -- packages/data/migrations)" = packages/data/migrations/postgres/064_checkpointed_operational_sync.sql
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$CHECKPOINT_SYNC_RELEASE"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
[[ "$STAGING_WEB_IMAGE" =~ ^el-dabboos-web:[0-9a-f]{40}$ ]]
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
check_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
umask 077
backup_dir="$CHECKPOINT_BACKUP_ROOT/el-dabboos-backups/checkpoint-sync-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
docker inspect --format '{{.Config.Image}} {{.Image}}' el-dabboos-staging-api-1 el-dabboos-staging-web-1 > "$backup_dir/previous-images.txt"
backup_identity=$(docker exec dabboos-analytics-mart-postgres-1 sh -c 'psql -X -At -U "$POSTGRES_USER" -d postgres -c "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user"')
test "$backup_identity" = t
compose stop web api
for database in el_dabboos_control_staging el_dabboos_analytics_staging; do
 available=$(df --output=avail -B1 "$backup_dir" | tail -n 1 | tr -d ' ')
 [[ "$available" =~ ^[0-9]+$ ]] && (( available > reserve_bytes ))
 backup_limit=$((available-reserve_bytes))
 docker exec dabboos-analytics-mart-postgres-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" --format=custom "$1"' sh "$database" | head -c "$backup_limit" > "$backup_dir/$database.dump.partial"
 mv "$backup_dir/$database.dump.partial" "$backup_dir/$database.dump"
 docker exec -i dabboos-analytics-mart-postgres-1 pg_restore --list < "$backup_dir/$database.dump" > "$backup_dir/$database.contents"
 test -s "$backup_dir/$database.contents"
 check_reserve
done
sha256sum "$backup_dir"/*.dump > "$backup_dir/SHA256SUMS"
printf 'Backup checksums and archive inventories saved: %s\n' "$backup_dir"
compose run --rm --no-deps operator migrate
compose run --rm --no-deps operator verify
compose up -d --wait --no-deps api web
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{console.log('Readiness',r.status);process.exit(r.ok?0:1)})"
curl --fail --silent --show-error --max-time 10 --output /dev/null http://127.0.0.1:8088/
printf 'Checkpoint API deployed: %s; web retained: %s. Source jobs and timers remain paused.\n' "$CHECKPOINT_SYNC_RELEASE" "$STAGING_WEB_IMAGE"
df -hT / "$CHECKPOINT_BACKUP_ROOT"
)
```

If backup fails before migration, the stopped existing containers can be resumed
with `docker start el-dabboos-staging-api-1 el-dabboos-staging-web-1`. Once migration
starts, inspect the failure and recover against a matching schema/code ledger;
do not blindly start the old API. Preserve the backup and previous image identities.

## Catch-up and timers

After application deployment, review free space and the safe status before one
controlled sync. A timeout after a `committed: true` checkpoint can retain useful
private progress; it does not establish acceptance or fresh data. Review the
pending candidate and journal before a later invocation. Do not run a retry loop,
delete pending metadata or increase deadlines. Capture and final acceptance remain
indivisible and must individually fit the current limits.

Leave timers paused until a complete accepted sync and the existing fresh schedule
gate pass. Neither installing this release nor readiness 200 enables scheduling.
The timer/service definitions need no change; the job resolves the deployed API.
This release does not complete automatic Finance, Review or Business-family
refresh, nor establish the full Sales Command Center company rollout.
