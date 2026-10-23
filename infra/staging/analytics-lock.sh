#!/usr/bin/env bash
# Shared by jobs and deployment. Keep this inode in place across releases.
acquire_analytics_lock() {
  local mode=${1:?Use wait or skip} wait_seconds=${2:-900} active_jobs lock_status
  command -v docker flock >/dev/null
  exec 9>"${STAGING_ANALYTICS_LOCK_FILE:-/run/lock/el-dabboos-analytics.lock}"
  case "$mode" in
    wait) flock -w "$wait_seconds" 9 || { echo 'Analytics lock deadline reached; stopped before source access or maintenance.' >&2; exit 75; } ;;
    skip)
      if flock -n -E 75 9; then :; else
        lock_status=$?
        if [[ "$lock_status" != 75 ]]; then exit "$lock_status"; fi
        echo 'Another analytics job or deployment holds the lock; skipped.'
        if [[ "${STAGING_JOB_REQUIRE_RUN:-0}" == 1 ]]; then exit 75; fi
        exit 0
      fi ;;
    *) echo 'Invalid analytics lock mode' >&2; exit 2 ;;
  esac
  active_jobs=$(docker ps -q --filter label=el-dabboos.staging.analytics-job=true)
  if [[ "$mode" == wait && "${STAGING_ANALYTICS_JOB_KIND:-maintenance}" == maintenance ]] && [[ -n "$(docker ps -q --filter label=el-dabboos.staging.command-background=true)" ]]; then
    echo 'A Command background unit is active. Pause its timer and wait for it before deployment or maintenance.' >&2
    exit 1
  fi
  if [[ -n "$active_jobs" ]]; then
    echo 'A scheduled container outlived its host process. Inspect it before running jobs or migrations.' >&2
    exit 1
  fi
}
