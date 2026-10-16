#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
: "${STAGING_RUNTIME_ENV_FILE:?Set the protected runtime env file}"
: "${STAGING_OPERATOR_ENV_FILE:?Set the protected operator env file}"
: "${STAGING_DATABASE_NETWORK:?Set the existing PostgreSQL network}"
test -f "$STAGING_RUNTIME_ENV_FILE"
test -f "$STAGING_OPERATOR_ENV_FILE"
release=$(git rev-parse HEAD)
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || exit 2
checkout_status=$(git status --porcelain --untracked-files=all)
if [[ -n "$checkout_status" ]]; then
  echo 'A clean reviewed checkout is required for commit-pinned images.' >&2
  exit 2
fi
export STAGING_API_IMAGE="el-dabboos-api:$release"
export STAGING_WEB_IMAGE="el-dabboos-web:$release"
STAGING_BUILD_NUMBER=$(git rev-list --count HEAD)
export STAGING_BUILD_NUMBER
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api web
source infra/staging/analytics-lock.sh
# Finish an active job before maintenance; timers can only skip while this lock is held.
acquire_analytics_lock wait
compose stop web api
compose run --rm --no-deps operator migrate
compose run --rm --no-deps operator verify
compose up -d --wait api web
printf 'Deployment healthy: %s. Scheduled jobs will resolve this deployed release.\n' "$release"
