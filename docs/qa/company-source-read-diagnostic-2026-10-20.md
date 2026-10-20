# Company source-read diagnostic — 20 October 2026

The company API is healthy on `f01fa523f5662790134106f0a0508f98cb127f36`;
web remains `6caf30e`. The controlled sync opened the source at 16:27:06 Cairo
(13:27:06 UTC) and failed at 16:37:09 Cairo (13:37:09 UTC) while still in
`source_read`. It never reached
reconciliation, source handoff, offline refresh or preparation. The ten-minute
interval is consistent with the source lease bound, but the safe generic error
alone does not establish the failing query or distinguish source reads from
interleaved mart persistence. Keep both timers paused.

The company source connection is direct. Use its existing protected configuration;
SSH tunneling is only a local-rehearsal concern. No host, credentials, grants,
source indexes, production deadlines or mappings are changed here.

The operational adapter streams event headers, then checks accounting changes.
Any relevant receivable change currently reconstructs every covered historical
cutoff because the summary contract lacks a component-level previous-date ledger.
This is a candidate cost, not a confirmed cause. Do not skip old cutoffs or advance
the modification cursor to conceal a failed source read.

## Bounded read-only probe

Pull the documentation/diagnostic revision; no image build or application restart
is needed. The mounted diagnostic runs in the existing deployed API image using
its runtime mart identity and the existing direct source configuration. It invokes
the real source adapter without the operational store: there are no mart fact,
control, preparation, cursor, publication or audit writes. Source transactions are
read-only. The mart metadata transaction is also read-only.

Output contains fixed phase labels, counts, timings and validated SQLSTATE only.
No SQL text, bind values, customer rows, record IDs, credentials or amounts are
printed. Source statements are limited to the smaller of the configured timeout
and 15 seconds, with at most 100 pages and a 75-second process deadline. The host
adds a 90-second stop and removes only this probe's container on exit. These are
stricter diagnostic limits; production job configuration is unchanged.

Run once on the company host and return the JSON output:

```bash
(
set -euo pipefail
cd /opt/el-dabboos/analytics
test -z "$(git status --porcelain --untracked-files=all)"
git pull --ff-only origin main
probe="$PWD/docs/qa/maintenance/source-read-diagnostic-2026-10-20.mjs"
test -r "$probe"
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer el-dabboos-analytics@sync.service el-dabboos-analytics@daily.service; do
 if systemctl is-active --quiet "$unit"; then
  printf 'Wait for or pause %s before the diagnostic.\n' "$unit" >&2
  exit 1
 fi
done
for file in staging-runtime.env odoo-source.env staging-jobs.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
set -a
source /opt/el-dabboos/secrets/staging-jobs.env
set +a
: "${STAGING_API_CONTAINER:?}" "${STAGING_DATABASE_NETWORK:?}" "${STAGING_SOURCE_ENV_FILE:?}" "${STAGING_ANALYTICS_TENANT:?}"
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 5
read -r image_id state health <<< "$(docker inspect --format '{{.Image}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$STAGING_API_CONTAINER")"
[[ "$image_id" =~ ^sha256:[0-9a-f]{64}$ && "$state" = running && "$health" = healthy ]]
probe_state=$(mktemp -d)
cleanup_probe() {
 if test -f "$probe_state/container.cid"; then
  local container_id
  container_id=$(<"$probe_state/container.cid")
  if [[ "$container_id" =~ ^[0-9a-f]{64}$ ]]; then docker rm -f "$container_id" >/dev/null 2>&1 || true; fi
 fi
 rm -rf -- "$probe_state"
}
trap cleanup_probe EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
timeout --foreground --kill-after=5s 90s docker run --rm \
 --cidfile "$probe_state/container.cid" --label el-dabboos.staging.analytics-job=true \
 --network "$STAGING_DATABASE_NETWORK" \
 --env-file /opt/el-dabboos/secrets/staging-runtime.env \
 --env-file "$STAGING_SOURCE_ENV_FILE" \
 -e CONTROL_PROVIDER=postgres -e "DIAGNOSTIC_TENANT=$STAGING_ANALYTICS_TENANT" \
 --mount "type=bind,src=$probe,target=/workspace/docs/qa/maintenance/source-read-diagnostic-2026-10-20.mjs,readonly" \
 --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges \
 --entrypoint node "$image_id" --experimental-transform-types --disable-warning=ExperimentalWarning \
 docs/qa/maintenance/source-read-diagnostic-2026-10-20.mjs
)
```

The page limit/deadline is an incomplete diagnostic result, never a successful sync
or complete source comparison. A source-only probe omits mart persistence, so a
fast probe would redirect investigation to persistence/transaction waits rather
than prove the whole sync fast. A 15-second probe statement cancellation does not
prove the production statement reaches its own configured deadline. Keep exact
reconciliation, lease validation and cursor atomicity intact when selecting a fix.

## Verification

Node syntax, all shell-block syntax, documentation sanity (3 tests) and diff
checks passed. An actual local adapter smoke emitted classified page timings and
stopped at its 75-second deadline (exit 124), as designed. Its source cursor and
13-month coverage differ from the company, so that incomplete local sample does
not identify the company bottleneck or certify source completeness. The local
smoke used the already approved local staging credential policy/relay; the company
block uses its existing direct connection. Application/build/test inputs are
unchanged from the previously verified release (968 regular and 386 PostgreSQL
tests); this diagnostic does not rebuild or redeploy that application. GitHub CI
is removed by owner instruction and was not started for this change.
