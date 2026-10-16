#!/usr/bin/env bash
set -euo pipefail
job=${1:?Use check, sync or daily}
case "$job" in check|sync|daily) ;; *) echo 'Use check, sync or daily' >&2; exit 2;; esac
: "${STAGING_API_CONTAINER:?Set the deployed API container name}"
: "${STAGING_DATABASE_NETWORK:?Set the existing database network}"
: "${STAGING_OPERATOR_ENV_FILE:?Set the protected operator env-file path}"
: "${STAGING_SOURCE_ENV_FILE:?Set the protected source env-file path}"
: "${STAGING_ANALYTICS_TENANT:?Set the tenant}"
test -f "$STAGING_OPERATOR_ENV_FILE"
test -f "$STAGING_SOURCE_ENV_FILE"
source "$(dirname "${BASH_SOURCE[0]}")/analytics-lock.sh"
if [[ "$job" == sync ]]; then acquire_analytics_lock skip; else acquire_analytics_lock wait 300; fi

# Resolve every invocation from the healthy deployed binary; never use an old jobs.env image pin.
deployed=$(docker inspect --format '{{.Config.Image}} {{.Image}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$STAGING_API_CONTAINER")
read -r image image_id state health extra <<< "$deployed"
if [[ ! "$image" =~ :[0-9a-f]{40}$ || ! "$image_id" =~ ^sha256:[0-9a-f]{64}$ || "$state" != running || "$health" != healthy || -n "$extra" ]]; then
  echo 'A healthy commit-pinned deployed API image is required; no source access performed.' >&2
  exit 2
fi
printf 'Scheduled analytics image: %s\n' "$image"
state_directory=$(mktemp -d)
cleanup_job_container() {
  local container_id
  if [[ -f "$state_directory/container.cid" ]]; then
    container_id=$(<"$state_directory/container.cid")
    if [[ "$container_id" =~ ^[0-9a-f]{64}$ ]]; then docker rm -f "$container_id" >/dev/null 2>&1 || true; fi
  fi
  rm -rf -- "$state_directory"
}
trap cleanup_job_container EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
run_job_container() {
  rm -f -- "$state_directory/container.cid"
  docker run --rm --pull never --network "$STAGING_DATABASE_NETWORK" \
    --label el-dabboos.staging.analytics-job=true --cidfile "$state_directory/container.cid" \
    "$@" --env-file "$STAGING_OPERATOR_ENV_FILE" \
    -e ENVIRONMENT=staging -e CONTROL_PROVIDER=postgres \
    -e ANALYTICS_JOB_TRIGGER=scheduled -e ANALYTICS_OPERATOR_ID=staging-scheduler \
    --read-only --tmpfs /tmp --entrypoint node "$image_id" \
    --experimental-transform-types --disable-warning=ExperimentalWarning "${job_command[@]}"
}
# Offline role/schema verification finishes before a container receives source configuration.
job_command=(apps/api/src/staging-cli.ts verify)
run_job_container
if [[ "$job" == check ]]; then
  job_command=(apps/api/src/analytics-status-cli.ts verify-schedule --tenant "$STAGING_ANALYTICS_TENANT")
  if [[ "${STAGING_JOB_REQUIRE_FRESH:-0}" == 1 ]]; then job_command+=(--require-fresh); fi
  run_job_container
else
  job_command=(apps/api/src/analytics-status-cli.ts verify-schedule --tenant "$STAGING_ANALYTICS_TENANT")
  run_job_container
  run_source_job() {
    job_command=(apps/api/src/analytics-status-cli.ts "$1" --tenant "$STAGING_ANALYTICS_TENANT" "${@:2}")
    run_job_container --env-file "$STAGING_SOURCE_ENV_FILE"
  }
  if [[ "$job" == sync ]]; then run_source_job sync; else run_source_job reconcile --mode daily; run_source_job sweep; fi
fi
