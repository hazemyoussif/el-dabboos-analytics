#!/usr/bin/env bash
# Same-schema API correction. Test the exact company selector before replacement.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
release=$(git rev-parse HEAD)
previous=07c28296b33ef9b242af39c2cca84da5b6241546
test -z "$(git status --porcelain --untracked-files=all)"
git merge-base --is-ancestor "$previous" "$release"
test "$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)" = "el-dabboos-api:$previous"
test -z "$(git diff --name-only "$previous" "$release" -- packages/data/migrations)"
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer; do
 test "$(systemctl show "$unit" -p ActiveState --value)" = inactive
done
for job in sync daily; do
 state=$(systemctl show "el-dabboos-analytics@$job.service" -p ActiveState --value)
 case "$state" in inactive|failed) ;; *) printf 'Analytics job is still running: %s\n' "$job" >&2; exit 1 ;; esac
done
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
check_reserve() {
 local available
 available=$(df --output=avail -B1 /var/lib/docker | tail -n 1 | tr -d ' ')
 [[ "$available" =~ ^[0-9]+$ ]] && (( available >= 2147483648 ))
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
compose run --rm --no-deps operator verify
# No source env file is passed. This is the exact production selector against
# existing company metadata, inside its read-only tenant transaction.
compose run --rm --no-deps --entrypoint node operator \
 --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module -e '
import {createMartPool} from "./packages/data/src/postgres/session.ts";
import {commandSyncMembers} from "./packages/data/src/business/command-sync.ts";
const pool=createMartPool(process.env.MART_INGESTOR_URL,1);
try { console.log(JSON.stringify({commandSyncMembers:(await commandSyncMembers(pool,"el-dabboos-iq")).length})); }
finally { await pool.end(); }
'
compose stop web
compose up -d --wait --no-deps api web
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{console.log('Readiness',r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nStartup correction deployed: %s. Source jobs and timers remain paused.\n' "$release"
df -hT / /mnt/HC_Volume_107192875
