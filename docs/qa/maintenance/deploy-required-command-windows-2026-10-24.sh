#!/usr/bin/env bash
# Required-window scope and proven-key reuse; supervise the saved September unit afterwards.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
test "$(id -u)" = 0
test -z "$(git status --porcelain --untracked-files=all)"
previous=09d411ea3a05f81d93152dda7cdae9838ba3a143
release=$(git rev-parse HEAD)
git merge-base --is-ancestor "$previous" "$release"
test "$(git diff --name-status "$previous" "$release" -- packages/data/migrations)" = "$(printf 'A\tpackages/data/migrations/postgres/091_reuse_proven_business_keys.sql')"
test -z "$(git diff --name-only "$previous" "$release" -- apps/api/src apps/web/src)"
test "$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)" = "el-dabboos-api:$previous"
(( $(df --output=avail -B1 /var/lib/docker | tail -n1) > 3221225472 ))
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$release"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
for unit in sync daily command-background; do systemctl stop "el-dabboos-analytics-$unit.timer"; done
for attempt in $(seq 1 36); do
 busy=0
 for unit in sync daily command-background; do
  case "$(systemctl show "el-dabboos-analytics@$unit.service" -p ActiveState --value)" in active|activating|deactivating) busy=1 ;; esac
 done
 if test "$busy" = 0; then break; fi
 if test "$attempt" = 36; then echo 'Existing job still active; deployment stopped.' >&2; exit 1; fi
 sleep 5
done
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 60
exec 8>/run/lock/el-dabboos-command-background.lock
flock -w 60 8
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)"
mountpoint -q /mnt/HC_Volume_107192875
umask 077
record="/mnt/HC_Volume_107192875/el-dabboos-backups/required-command-windows-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$record"
printf '%s\n' "$previous" "$release" > "$record/releases.txt"
docker exec dabboos-analytics-mart-postgres-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" --schema-only el_dabboos_analytics_staging' > "$record/pre-migration-schema.sql"
sha256sum "$record/pre-migration-schema.sql" > "$record/SHA256SUMS"
compose run --rm --no-deps operator migrate
compose run --rm --no-deps operator verify
compose stop web
compose up -d --wait --no-deps api web
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nRequired-window API deployed: %s; web retained: %s. Source schedules await supervised completion.\n' "$release" "$STAGING_WEB_IMAGE"
df -hT /
