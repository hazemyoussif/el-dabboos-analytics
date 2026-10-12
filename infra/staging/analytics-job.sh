#!/usr/bin/env bash
set -euo pipefail
job=${1:?Use sync or daily}
case "$job" in sync|daily) ;; *) echo 'Use sync or daily' >&2; exit 2;; esac
: "${STAGING_API_IMAGE:?Set the pinned API image}"
: "${STAGING_DATABASE_NETWORK:?Set the existing database network}"
: "${STAGING_OPERATOR_ENV_FILE:?Set the protected operator env-file path}"
: "${STAGING_SOURCE_ENV_FILE:?Set the protected source env-file path}"
: "${STAGING_ANALYTICS_TENANT:?Set the tenant}"
[[ "$STAGING_API_IMAGE" =~ :[0-9a-f]{40}$ ]] || { echo 'A commit-pinned API image is required' >&2; exit 2; }
test -f "$STAGING_OPERATOR_ENV_FILE"
test -f "$STAGING_SOURCE_ENV_FILE"
exec 9>"${STAGING_ANALYTICS_LOCK_FILE:-/run/lock/el-dabboos-analytics.lock}"
if ! flock -n 9; then
  echo 'Another scheduled analytics job is running; skipped.'
  exit 0
fi
run() {
  docker run --rm --pull never --network "$STAGING_DATABASE_NETWORK" \
    --env-file "$STAGING_OPERATOR_ENV_FILE" --env-file "$STAGING_SOURCE_ENV_FILE" \
    -e ENVIRONMENT=staging -e ANALYTICS_JOB_TRIGGER=scheduled -e ANALYTICS_OPERATOR_ID=staging-scheduler \
    --read-only --tmpfs /tmp --entrypoint node "$STAGING_API_IMAGE" \
    --experimental-transform-types --disable-warning=ExperimentalWarning \
    apps/api/src/analytics-status-cli.ts "$1" --tenant "$STAGING_ANALYTICS_TENANT" "${@:2}"
}
if [[ "$job" == sync ]]; then
  run sync
else
  run reconcile --mode daily
  run sweep
fi
