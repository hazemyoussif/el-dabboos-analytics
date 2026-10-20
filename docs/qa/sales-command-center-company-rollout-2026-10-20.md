# Sales Command Center company rollout

The user executes company-host commands; the agent owns the local Docker rehearsal
and repository merge. These are different installations. Keep the existing
prepared publication and protected configuration. Do not bootstrap, reprovision,
delete prepared data or copy laptop connection files to the company host.

First obtain the current [read-only company preflight](company-prepared-release-preflight-2026-10-17.md):
installed images, trusted revision, family/month coverage, prepared activation,
free storage and sync/daily timer state. The older company receipts are not a
substitute for this current evidence. Company source exposure/preparation and
reader acceptance follow application deployment, using that actual state.

The user confirmed the configured-source numbers are correct and authorized this
release on 20 October. Preserve that source connection; do not switch to another
Odoo environment as part of deployment. Reference/live-environment differences
are documented in the [implementation receipt](sales-command-center-2026-10-20.md).

## Company storage preflight

The 20 October company preflight reported a roughly 58.5 GB analytics database,
root storage at 98–99% usage, and an existing ext4 40 GiB disk mounted at
`/mnt/HC_Volume_107192875` with about 38 GiB available. The backup belongs on that
existing mounted disk, not the nearly full root filesystem. Do not format it,
move the database or delete immutable analytics/prepared history for this release.

Rebuildable cache cleanup, if still needed, preserves tagged images and volumes:

```bash
docker builder prune --force
docker image prune --force
df -hT / /mnt/HC_Volume_107192875
```

The image command deliberately omits `--all`; do not substitute volume or system
pruning. Keep the existing accepted images available for coordinated recovery.
Set `SALES_COMMAND_BACKUP_ROOT=/mnt/HC_Volume_107192875` for this company host after
confirming it remains mounted. The deployment block requires a mounted backup
filesystem distinct from root and checks available storage before the build,
after the build and throughout backup. Its 2 GiB reserve is a stop threshold,
not evidence of sufficient capacity for new source exposure. Company Business
publication needs a separate free-space/preparation-bounds decision; the local
43-chunk installation does not determine the company's 114-member publication.

## Application deployment

Set `SALES_COMMAND_RELEASE` to the exact merged SHA supplied with delivery. The
block uses the existing deployment order and shared maintenance lock, with a
coordinated local backup before migration. It preserves protected env files and
existing serving data. The PostgreSQL container must have its existing bootstrap
backup identity; otherwise stop and use the approved backup service. Verify
recovery/restore readiness under the existing shared-staging runbook first.

```bash
(
set -euo pipefail
cd /opt/el-dabboos/analytics
: "${SALES_COMMAND_RELEASE:?Set the exact reviewed merged SHA from delivery}"
: "${SALES_COMMAND_BACKUP_ROOT:?Set the verified existing backup mount point}"
[[ "$SALES_COMMAND_BACKUP_ROOT" = /* ]]
mountpoint -q "$SALES_COMMAND_BACKUP_ROOT"
root_device=$(findmnt -n -o MAJ:MIN --target /)
backup_device=$(findmnt -n -o MAJ:MIN --target "$SALES_COMMAND_BACKUP_ROOT")
test "$backup_device" != "$root_device"
[[ "$SALES_COMMAND_RELEASE" =~ ^[0-9a-f]{40}$ ]]
test -z "$(git status --porcelain --untracked-files=all)"
for file in staging-runtime.env staging-operator.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
reserve_bytes=2147483648
check_reserve() {
 local available location
 for location in /var/lib/docker /opt/el-dabboos/state "$SALES_COMMAND_BACKUP_ROOT"; do
  available=$(df --output=avail -B1 "$location" | tail -n 1 | tr -d ' ')
  [[ "$available" =~ ^[0-9]+$ ]] && (( available >= reserve_bytes )) || return 1
 done
}
check_reserve
git fetch origin main
git merge --ff-only "$SALES_COMMAND_RELEASE"
test "$(git rev-parse HEAD)" = "$SALES_COMMAND_RELEASE"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$SALES_COMMAND_RELEASE"
export STAGING_WEB_IMAGE="el-dabboos-web:$SALES_COMMAND_RELEASE"
export STAGING_BUILD_NUMBER=$(git rev-list --count HEAD)
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api web
check_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
umask 077
backup_dir="$SALES_COMMAND_BACKUP_ROOT/el-dabboos-backups/sales-command-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
docker inspect --format '{{.Config.Image}} {{.Image}}' el-dabboos-staging-api-1 el-dabboos-staging-web-1 > "$backup_dir/previous-images.txt"
backup_identity=$(docker exec dabboos-analytics-mart-postgres-1 sh -c 'psql -X -At -U "$POSTGRES_USER" -d postgres -c "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user"')
test "$backup_identity" = t
compose stop web api
for database in el_dabboos_control_staging el_dabboos_analytics_staging; do
 available=$(df --output=avail -B1 "$backup_dir" | tail -n 1 | tr -d ' ')
 [[ "$available" =~ ^[0-9]+$ ]] && (( available > reserve_bytes ))
 backup_limit=$((available-reserve_bytes))
 # pipefail stops on a truncated dump; the archive stays .partial and migration cannot start.
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
compose up -d --wait api web
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(async r=>{console.log('Readiness',r.status);process.exit(r.ok?0:1)})"
curl --fail --silent --show-error --max-time 10 --output /dev/null http://127.0.0.1:8088/
printf 'Application deployment healthy: %s. Source exposure and timer changes were not performed.\n' "$SALES_COMMAND_RELEASE"
systemctl list-timers --all 'el-dabboos-analytics-*' --no-pager
)
```

If backup fails before migration, the old containers are only stopped; resume them
with `docker start el-dabboos-staging-api-1 el-dabboos-staging-web-1` and inspect the
failure. Do not resume an old image after migration begins. A capped dump remains
`.partial` and cannot be treated as a recovery point.

The backup checks establish readable archive inventories and checksums, not a new
restore rehearsal. Migration 061 is forward-only. Old images require a matching
schema history; use a reviewed forward fix or coordinated recovery rather than
starting old code against a newer ledger.

After the deployment block releases its maintenance lock, verify the existing
scheduler against the newly deployed image. This check does not ingest source
records or change timer units:

```bash
(
set -euo pipefail
cd /opt/el-dabboos/analytics
test "$(stat -c '%a:%U' /opt/el-dabboos/secrets/staging-jobs.env)" = 600:root
set -a
source /opt/el-dabboos/secrets/staging-jobs.env
set +a
bash infra/staging/analytics-job.sh check
)
```

## Measures and scheduled freshness

The application command does not publish the new measures. The next company step
must use its actual reporting window, current revision, preparation bounds and
activation state. Prepare the months required by the trusted tenant clock for the
six-week window and comparison operands. Exact source/mart controls and all
required prepared grains must pass before acceptance/cutover. Check all 34 report
entries, shared filters and policies against the same revision, JIT off, no raw
history fallback, and first/repeat plus concurrent execution latency.

The existing timer services already resolve the healthy deployed API image.
Their image configuration needs no update for this release. Their workload does
need a future family-aware Business refresh extension; operational sync/daily
reconciliation do not refresh these command observations. Do not schedule repeated
monthly exposure. Follow the [recorded refresh requirements](../integration/sales-command-center.md#deployment-ownership-and-scheduled-freshness)
and ADR 040 before claiming automatic freshness.
