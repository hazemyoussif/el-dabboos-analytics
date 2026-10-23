#!/usr/bin/env bash
# Owner-approved synthetic systemd verification. No database/source execution.
set -euo pipefail
test "$(id -u)" = 0
test "$(systemctl show el-dabboos-analytics-sync.timer -p ActiveState --value)" = active
test "$(systemctl show el-dabboos-analytics-command-background.timer -p ActiveState --value)" = active
fixture=synthetic-pause
fixture_timer="el-dabboos-analytics-$fixture.timer"
fixture_job="el-dabboos-analytics@$fixture.service"
case "$(systemctl show "$fixture_timer" -p LoadState --value)" in not-found) ;; *) echo 'Synthetic timer name already in use'; exit 1 ;; esac
cleanup() {
 systemctl stop "$fixture_timer" "el-dabboos-analytics-$fixture.service" >/dev/null 2>&1 || true
 systemctl reset-failed "$fixture_job" >/dev/null 2>&1 || true
}
trap cleanup EXIT
systemd-run --quiet --unit="el-dabboos-analytics-$fixture" --on-active=1h /usr/bin/true
test "$(systemctl show "$fixture_timer" -p ActiveState --value)" = active
# An unsupported job is rejected by the existing wrapper before any container,
# source access or analytics operation. The actual shared OnFailure handles it.
if systemctl start "$fixture_job"; then echo 'Expected synthetic wrapper rejection'; exit 1; fi
for observation in $(seq 1 10); do
 if test "$(systemctl show "$fixture_timer" -p ActiveState --value)" = inactive; then break; fi
 sleep 1
done
test "$(systemctl show "$fixture_timer" -p ActiveState --value)" = inactive
test "$(systemctl show "el-dabboos-analytics-pause@$fixture.service" -p Result --value)" = success
test "$(systemctl show "$fixture_job" -p Result --value)" = exit-code
test "$(systemctl show el-dabboos-analytics-sync.timer -p ActiveState --value)" = active
test "$(systemctl show el-dabboos-analytics-command-background.timer -p ActiveState --value)" = active
printf '%s\n' 'PASS: failed synthetic job paused only its timer; ordinary/background timers stayed active; no source or database operation.'
