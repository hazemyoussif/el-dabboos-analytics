#!/usr/bin/env bash
# Provisioning-only column privilege correction; no source access or timer activation.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
test "$(id -u)" = 0
test -z "$(git status --porcelain --untracked-files=all)"
previous=29ba52d522c08d0e4b64d3cda96247ff6c32fe6f
release=$(git rev-parse HEAD)
git merge-base --is-ancestor "$previous" "$release"
test -z "$(git diff --name-status "$previous" "$release" -- packages/data/migrations)"
test "$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)" = "el-dabboos-api:$previous"
for unit in sync daily command-background; do
 test "$(systemctl show "el-dabboos-analytics-$unit.timer" -p ActiveState --value)" = inactive
 case "$(systemctl show "el-dabboos-analytics@$unit.service" -p ActiveState --value)" in inactive|failed) ;; *) exit 1 ;; esac
done
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)"
recovery=/mnt/HC_Volume_107192875/el-dabboos-backups/pre-2024-retention-20261023T144846Z
test -s "$recovery/analytics.dump"
mountpoint -q /mnt/HC_Volume_107192875
(( $(df --output=avail -B1 /var/lib/docker | tail -n1) > 8589934592 ))
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$release"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 60
exec 8>/run/lock/el-dabboos-command-background.lock
flock -w 60 8
# Recheck after acquiring both job locks.
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)"
umask 077
record="/mnt/HC_Volume_107192875/el-dabboos-backups/staging-column-grants-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$record"
printf '%s\n' "$previous" "$release" "$recovery" > "$record/releases-and-recovery.txt"
docker exec dabboos-analytics-mart-postgres-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" --schema-only el_dabboos_analytics_staging' > "$record/pre-migration-schema.sql"
sha256sum "$record/pre-migration-schema.sql" > "$record/SHA256SUMS"
compose run --rm --no-deps operator migrate
compose run --rm --no-deps operator verify
compose stop web
compose up -d --wait --no-deps api web
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nStaging column privilege correction deployed: %s. Source jobs and timers remain paused.\n' "$release"
df -hT /
