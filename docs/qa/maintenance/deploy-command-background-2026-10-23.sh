#!/usr/bin/env bash
# Company application deployment only. Source jobs and timers remain paused.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
: "${COMMAND_BACKGROUND_PREVIOUS_IMAGE:?Set the preflight-confirmed API image}"
: "${COMMAND_BACKGROUND_BACKUP_ROOT:?Set the existing separate backup mount}"
release=$(git rev-parse HEAD)
test "$(id -u)" = 0
test -z "$(git status --porcelain --untracked-files=all)"
previous=204271b5b48007595bc7cc8239d6ca3eea2dbe9f
test "$COMMAND_BACKGROUND_PREVIOUS_IMAGE" = "el-dabboos-api:$previous"
git merge-base --is-ancestor "$previous" "$release"
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer el-dabboos-analytics-command-background.timer; do
 if [[ "$unit" == el-dabboos-analytics-command-background.timer ]] && ! systemctl cat "$unit" >/dev/null 2>&1; then continue; fi
 state=$(systemctl show "$unit" -p ActiveState --value)
 case "$state" in inactive) ;; *) printf 'Pause timer before deployment: %s\n' "$unit" >&2; exit 1 ;; esac
done
for job in sync daily command-background; do
 state=$(systemctl show "el-dabboos-analytics@$job.service" -p ActiveState --value)
 case "$state" in inactive|failed) ;; *) printf 'Analytics job is still running: %s\n' "$job" >&2; exit 1 ;; esac
done
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)"
test "$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)" = "$COMMAND_BACKGROUND_PREVIOUS_IMAGE"
[[ "$COMMAND_BACKGROUND_PREVIOUS_IMAGE" =~ ^el-dabboos-api:[0-9a-f]{40}$ ]]
expected_migrations=$(printf 'A\tpackages/data/migrations/postgres/%s\n' \
 077_command_background_capture.sql \
 078_business_member_parent_check.sql \
 079_command_initialization_progress.sql \
 080_command_delta_checks.sql \
 081_private_business_runtime_isolation.sql)
test "$(git diff --name-status "$previous" "$release" -- packages/data/migrations)" = "$expected_migrations"
[[ "$COMMAND_BACKGROUND_BACKUP_ROOT" = /* ]]
mountpoint -q "$COMMAND_BACKGROUND_BACKUP_ROOT"
test "$(findmnt -n -o MAJ:MIN --target "$COMMAND_BACKGROUND_BACKUP_ROOT")" != "$(findmnt -n -o MAJ:MIN --target /)"
for file in staging-runtime.env staging-operator.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
reserve_bytes=2147483648
check_reserve() {
 local available location
 for location in /var/lib/docker /opt/el-dabboos/state "$COMMAND_BACKGROUND_BACKUP_ROOT"; do
  available=$(df --output=avail -B1 "$location" | tail -n 1 | tr -d ' ')
  [[ "$available" =~ ^[0-9]+$ ]] && (( available >= reserve_bytes )) || return 1
 done
}
check_reserve
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$release"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
[[ "$STAGING_WEB_IMAGE" =~ ^el-dabboos-web:[0-9a-f]{40}$ ]]
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
check_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
exec 8>"${STAGING_COMMAND_BACKGROUND_LOCK_FILE:-/run/lock/el-dabboos-command-background.lock}"
flock -w 300 8
# Recheck after both host locks; no source container may overlap schema maintenance.
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)"
umask 077
backup_dir="$COMMAND_BACKGROUND_BACKUP_ROOT/el-dabboos-backups/command-background-$(date -u +%Y%m%dT%H%M%SZ)"
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
install -m 644 infra/staging/el-dabboos-analytics-command-background.timer /etc/systemd/system/el-dabboos-analytics-command-background.timer
systemctl daemon-reload
compose up -d --wait --no-deps api web
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{console.log('Readiness',r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nIndependent sync/background API deployed: %s; web retained: %s. Source jobs and timers remain paused.\n' "$release" "$STAGING_WEB_IMAGE"
df -hT / "$COMMAND_BACKGROUND_BACKUP_ROOT"
