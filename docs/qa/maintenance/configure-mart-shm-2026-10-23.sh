#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
test "$(id -u)" = 0
test -z "$(git status --porcelain)"
previous=d1559a43ec2857bcdb3f86f4e087e61105bcedef
release=$(git rev-parse HEAD)
test "$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)" = "el-dabboos-api:$previous"
test "$(git diff --name-status "$previous" "$release" -- packages/data/migrations)" = $'A\tpackages/data/migrations/postgres/083_sync_upgrade_visibility.sql'
for unit in sync daily command-background; do
 test "$(systemctl show "el-dabboos-analytics-$unit.timer" -p ActiveState --value)" = inactive
 case "$(systemctl show "el-dabboos-analytics@$unit.service" -p ActiveState --value)" in inactive|failed) ;; *) exit 1 ;; esac
done
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
test -z "$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)"
test -z "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)"
python3 - <<'PY'
import json,os,subprocess
container='dabboos-analytics-mart-postgres-1'
def inspect():
 return json.loads(subprocess.check_output(['docker','inspect',container]))[0]
def volume(state):
 return [(item['Type'],item.get('Name'),item['Source'],item['Destination']) for item in state['Mounts'] if item['Destination']=='/var/lib/postgresql']
before=inspect()
assert len(volume(before))==1 and volume(before)[0][0:2]==('volume','dabboos_analytics_data')
settings=dict(item.split('=',1) for item in before['Config']['Env'])
environment=dict(os.environ)
environment['MART_LOCAL_ADMIN_PASSWORD']=settings['POSTGRES_PASSWORD']
command=['docker','compose','-f','infra/postgres/compose.mart.yml']
configuration=json.loads(subprocess.check_output(command+['config','--format','json'],env=environment))
service=configuration['services']['postgres']
assert int(service['shm_size'])==1073741824, 'Unexpected PostgreSQL shared-memory ceiling'
assert service['image']==before['Config']['Image']=='postgres:18.6'
assert service['environment']['POSTGRES_USER']==settings['POSTGRES_USER']
assert service['environment']['POSTGRES_PASSWORD']==settings['POSTGRES_PASSWORD']
assert configuration['volumes'][service['volumes'][0]['source']]['name']==volume(before)[0][1]
subprocess.run(['docker','compose','-f','infra/staging/compose.yml','stop','web','api'],check=True)
subprocess.run(command+['up','-d','--wait','--no-deps','postgres'],env=environment,check=True)
after=inspect()
assert volume(after)==volume(before)
assert after['HostConfig']['ShmSize']==1073741824
assert after['State']['Health']['Status']=='healthy'
print('PostgreSQL shared memory: 1 GiB; existing database volume preserved.')
PY
compose run --rm --no-deps operator migrate
compose run --rm --no-deps operator verify
compose up -d --wait --no-deps api web
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nShared-memory correction deployed: %s; source jobs and timers remain paused.\n' "$release"
