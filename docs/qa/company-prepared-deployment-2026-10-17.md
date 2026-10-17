# Prepared-serving company deployment — 17 October 2026

This release contains the prepared-serving implementation already active on laptop staging, recovered from that running image. It includes immutable migrations 053–055. The subsequent [isolated discovery fix](company-prepared-discovery-preflight-2026-10-17.md) adds forward migration 056 after the original company inventory timed out. The unfinished source-refresh subsystem and its unpublished migrations are excluded. Existing operational timers remain unchanged. No claim is made that Finance, Collections and Business now refresh hourly.

Local acceptance is recorded in [the completed evidence](local-prepared-serving-2026-10-17.md): 43 validated chunks, 27 available reports, no failed widgets/series, exact accepted source controls, original data/manifest preserved, and backend execution of 23–1,098 ms on existing laptop coverage. Company history and hardware are larger/different; this is not a company performance guarantee.

## Phase 1: normal reviewed release deployment

Retain verified backups of both intended databases and the current source/trusted-publication status. Use the existing approved backup procedure; a dump inventory/checksum alone is not a new restore rehearsal. Run from the existing authenticated company terminal, with a clean checkout on the reviewed merged main commit:

```bash
set -e
cd /opt/el-dabboos/analytics
git switch main
git pull --ff-only origin main
git rev-parse HEAD
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
bash infra/staging/deploy.sh
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"
docker ps --filter name=el-dabboos-staging --format '{{.Names}} {{.Image}} {{.Status}}'
df -h /
```

The shared deployment lock waits for existing jobs, excludes migrations/source workers, and holds through schema verification and service health. Do not replace this with an independent migration while timers run. API startup never migrates or prepares data. No Odoo write or source refresh is part of this deployment.

**Healthy code deployment does not activate prepared serving.** On a tenant without `mart.prepared_activation`, the established reader continues serving the existing trusted publication while preparation is pending. Migrations do not delete or replace its original facts, Finance snapshots or native serving manifest.

## Phase 2: bounded company preparation and verification

Before starting preparation, use the deployed release to verify the intended analytics database, current trusted revision, required chunk inventory, original family/month membership and free disk. Pause the existing timers without killing an active service, and use the same host maintenance lock for preparation; the operator also holds the existing tenant writer lock. This freezes the preparation input. Preserve timer state for restoration.

The accepted operator commands already shipped in this release are:

```text
node --experimental-transform-types --disable-warning=ExperimentalWarning apps/api/src/analytics-status-cli.ts prepare --tenant TENANT --database DATABASE --revision REVISION --max-cells INTEGER --max-chunks INTEGER
node --experimental-transform-types --disable-warning=ExperimentalWarning apps/api/src/analytics-status-cli.ts activate-prepared --tenant TENANT --database DATABASE --revision REVISION --max-cells INTEGER --max-chunks INTEGER
```

Run inside the existing protected operator container. `prepare` uses the ingestor identity; activation uses the migrator. Do not guess a revision, database or company storage budget. Preparation processes existing accepted analytics data; it does not contact Odoo. Completed validated chunks are persistent/idempotent checkpoints. A failed current chunk rolls back; a rerun against the same revision reuses completed chunks. Old serving stays active until the explicit activation step.

Company preflight reported 114 native members and about 20.6 GiB free. These are **not** prepared chunk counts or a storage capacity pass. Laptop output was about 1.75 GiB for its smaller coverage. Use a free-disk reserve and bounded operator watchdog as in the local rehearsal; stop before consuming that reserve. If company output cannot fit, increase available capacity rather than deleting immutable native history or weakening validation.

After preparation: verify all required bindings and the completion seal, compare the original data counts and manifest, reconcile accepted exact controls, and shadow-run the available reports with their real periods/policy filters. Only then run explicit activation. Prepared runtime cannot fall back to raw history if a prepared capability is missing. Restore the existing timers and verify their next successful execution and publication after cutover. Their operational-facts scope remains unchanged; all-family source schedules remain separate unfinished work.

No company preparation, activation, storage acceptance or browser QA has been completed by creating this release. The next handoff after Phase 1 is its health/image/disk output, followed by the deployed preparation inventory and capacity check.
