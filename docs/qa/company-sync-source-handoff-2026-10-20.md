# Company sync source handoff — 20 October 2026

Historical code-only rollout instructions below apply through `0aaaa73`. The
pending dependency release adds migrations 062 and 063 and must use the
[migration-aware release handoff](operational-dependency-release-2026-10-20.md).
Do not reuse this document’s no-migration block for that release.

The company application deployed release
`6caf30ec647801d36a303aae2acc9cf36ce37b81` successfully, including migration 061,
verified roles and readiness 200. Its coordinated backup is on the existing mounted
backup disk. The sync/daily timers remain paused during recovery. The last accepted
operational source cutoff reported by the company was `2026-10-20T07:24:09.590Z`.

## Evidence and correction

The old deployed sync repeatedly reached systemd's 15-minute limit; another run
ended with the safe generic CLI error. Those logs do not identify every failing
phase. Inspection found a concrete lifecycle defect: operational sync retained
its source snapshot through offline aggregate refresh and prepared publication,
then validated the source lease during closure. Expiry during offline work could
therefore reject already reconciled observations.

The application now completes source reading after exact reconciliation and before
offline refresh/preparation, inside the same mart transaction. A failed handoff
prevents downstream work. Refresh, preparation, audit and cursor failures still
roll back the candidate and retain the previous accepted serving revision. Source
lease, statement, prepared bounds and systemd timeouts are unchanged.

The synthetic PostgreSQL regression failed against the old implementation. It
advances the simulated source expiry during actual offline revision creation and
proves the corrected publication can commit with the source already closed.
The separate source-closure failure case still rolls back facts/cursor/publication.
The unit failure matrix covers ingest, reconciliation, handoff, refresh, promotion,
audit and cursor failures.

Local verification passed: frozen-lockfile installation, lint, architecture and
baseline-aware quality gates (zero diagnostics), typecheck, 968 regular tests,
386 PostgreSQL tests (zero failed/skipped), production build and diff checks.
All rollout shell blocks pass `bash -n`. The PostgreSQL suite uses the disposable
synthetic test database; no company database or developer env file is loaded.
Release CI and local container identity are supplied with the merged release.

The operator CLI emits only phase names and elapsed milliseconds on stderr;
stdout retains its final machine-readable JSON. Phase events contain no credentials,
queries, source/customer rows or business values. HTTP composition has no observer
unless explicitly supplied. This improves diagnosis of the controlled company
retry; it does not prove that every company timeout has the same cause.

## Controlled company retry outcome

The company API upgrade to `f01fa523f5662790134106f0a0508f98cb127f36`
passed role/schema verification and readiness. Web remains `6caf30e`; root had
4.3 GiB free after the build. The controlled sync then failed after approximately
ten minutes in `source_read`, before reconciliation or the corrected source
handoff. That run does not establish current source freshness or timer readiness.
Use the [bounded direct-source diagnostic](company-source-read-diagnostic-2026-10-20.md)
to locate the earlier ingestion cost. Keep both timers paused; no repeated sync or
timeout increase is approved by this evidence.

## API-only rollout

This correction has no schema migration, new metric or source exposure. Keep the
current web artifact and database publication. The existing code-only recovery
image supports the same schema. The prior full deployment's backup remains intact.
Set `ANALYTICS_SYNC_RELEASE` to the exact merged correction SHA from delivery.
Run on the company host after both timers are paused:

```bash
(
set -euo pipefail
cd /opt/el-dabboos/analytics
: "${ANALYTICS_SYNC_RELEASE:?Set the reviewed merged correction SHA}"
[[ "$ANALYTICS_SYNC_RELEASE" =~ ^[0-9a-f]{40}$ ]]
test -z "$(git status --porcelain --untracked-files=all)"
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer; do
 if systemctl is-active --quiet "$unit"; then
  printf 'Pause %s before maintenance.\n' "$unit" >&2
  exit 1
 fi
done
for file in staging-runtime.env staging-operator.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
check_root_reserve() {
 local available
 available=$(df --output=avail -B1 /var/lib/docker | tail -n 1 | tr -d ' ')
 [[ "$available" =~ ^[0-9]+$ ]] && (( available >= 2147483648 ))
}
check_root_reserve
git fetch origin main
git merge --ff-only "$ANALYTICS_SYNC_RELEASE"
test "$(git rev-parse HEAD)" = "$ANALYTICS_SYNC_RELEASE"
# Stop if unrelated schema changes entered the selected release.
test -z "$(git diff --name-only 6caf30ec647801d36a303aae2acc9cf36ce37b81 HEAD -- packages/data/migrations)"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$ANALYTICS_SYNC_RELEASE"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
[[ "$STAGING_WEB_IMAGE" =~ ^el-dabboos-web:[0-9a-f]{40}$ ]]
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
check_root_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
compose run --rm --no-deps operator verify
compose up -d --wait --no-deps api
# Restart the existing proxy to resolve the recreated API container address.
compose restart web
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8088/health/ready
printf '\nAPI-only correction deployed: %s; web retained: %s\n' "$ANALYTICS_SYNC_RELEASE" "$STAGING_WEB_IMAGE"
df -hT / /mnt/HC_Volume_107192875
)
```

This block performs no migrations, bootstrap, source job, Business exposure or timer
activation. Preserve the prior `6caf30e` API image for same-schema code recovery.
The 2 GiB reserve is a stop condition, not a storage approval for new data populations.

## Controlled recovery

After health/role checks pass and current free space is reviewed, run one sync
through the existing systemd service while timers remain paused. Its deadline and
source/mart guards are unchanged. Follow its journal for the new phase timings;
inspect the final run result and disk space before another attempt. Do not clear
failure evidence, restart recurring jobs blindly, raise timeouts or repeat monthly
Business exposure to conceal a failure.

Start the single controlled run after reviewing the deployment output:

```bash
systemctl start --no-block el-dabboos-analytics@sync.service
journalctl -u el-dabboos-analytics@sync.service --since '2 minutes ago' -f
```

Ctrl+C exits journal follow without stopping the service. After it finishes, collect:

```bash
systemctl show el-dabboos-analytics@sync.service -p ActiveState -p SubState -p Result -p ExecMainStatus
journalctl -u el-dabboos-analytics@sync.service -n 60 --no-pager
df -hT / /mnt/HC_Volume_107192875
```

Only after a successful exact sync should the following block perform the fresh
schedule gate and restore both existing timers. It stops if the service is still
running, failed, or the fresh gate rejects the current source/publication state:

```bash
(
set -euo pipefail
cd /opt/el-dabboos/analytics
test "$(systemctl show el-dabboos-analytics@sync.service -p ActiveState --value)" = inactive
test "$(systemctl show el-dabboos-analytics@sync.service -p Result --value)" = success
test "$(stat -c '%a:%U' /opt/el-dabboos/secrets/staging-jobs.env)" = 600:root
set -a
source /opt/el-dabboos/secrets/staging-jobs.env
set +a
STAGING_JOB_REQUIRE_FRESH=1 bash infra/staging/analytics-job.sh check
systemctl start el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer
systemctl list-timers --all el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer
)
```

The existing units resolve the healthy deployed API image automatically; their
configuration needs no image-pin change. Their workload still excludes automated
Business-family refresh.

The company's existing prepared activation is 1,000,000 cells per chunk / 256
chunks, with an immutable 2025-01-01 through 2026-12-31 reporting window. Keep
those values. September/October command-measure publication and company reader
acceptance remain separate, capacity-checked steps. Do not copy the local
43-chunk plan or delete immutable history to fit that work.
