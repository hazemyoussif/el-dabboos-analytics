# Staging analytics schedules

The host runs the existing analytics CLI in the healthy deployed API image. The jobs configuration contains protected file references, tenant and API container identity, never credentials or a second release pin. Each invocation inspects that container, requires a healthy running commit-tagged image, and executes its immutable local image ID with `--pull never`. An old `STAGING_API_IMAGE` in an existing jobs file is ignored. Runtime API containers still have no source credentials.

## Scope and integrity

With migration 064 and the checkpointed sync release, the same sync invocation
resumes a sealed private candidate before opening the source. Committed month and
prepared-chunk progress survives worker interruption. `analytics-sync-checkpoint`
events mark durable progress; a substep completion alone does not. Freshness still
uses the last successful accepted cutoff. No timer interval or deadline changes.
The runner now waits on a background Docker child so signal cleanup can remove
that worker promptly. This code change and its synthetic runner checks do not
establish company rollout; follow the migration-aware release handoff first.

The sync timer runs five minutes after activation and five minutes after the previous invocation finishes. Daily reconciliation followed by the presence sweep runs at 00:00 UTC / 03:00 Baghdad. Reconciliation failure stops the sweep. All jobs retain the existing tenant writer lock, independent source controls, candidate rollback, immutable serving publication and successful cursor rules. Source access stays read-only through the existing adapter. Nothing marks Finance approval.

These two schedules cover the existing operational fact/event/summary path. They **do not refresh** immutable Finance month ends or the newer `review` and `business` extraction families. Their existing `expose` / `expose-business` commands replace a complete month with a new immutable partition. Repeating those full loaders every five minutes would consume source capacity and grow history even when business values have not changed. A separate change-aware refresh design and measured source proof are required for those families; no whole-history loop or automatic month-end publication is installed here. Read source timestamps separately when reviewing their dashboards.

The runner and [normal deployment command](#deployments-and-schema-updates) share `/run/lock/el-dabboos-analytics.lock`. If overriding `STAGING_ANALYTICS_LOCK_FILE`, export the identical path for jobs and deployment. Keep this lock file's inode in place; never remove it to bypass a running operation. A scheduled sync skips a busy lock and records the skip in the system journal. Foreground activation sets `STAGING_JOB_REQUIRE_RUN=1`, making such a skip exit 75 rather than pass the activation gate. Daily/check operations wait up to five minutes; deployment waits up to fifteen minutes before any maintenance. Existing systemd total job and source/SQL deadlines remain unchanged.

Before a job receives source configuration it runs `staging-cli.ts verify` using only the protected operator file. This checks intended staging database identities, immutable schema history and runtime roles. A migration mismatch or unhealthy API stops before Odoo access. `verify-schedule` then requires an established baseline, a trusted revision and completed event aggregate coverage, using only read-only analytics status. `check` runs these offline checks without source configuration. Its optional `STAGING_JOB_REQUIRE_FRESH=1` additionally requires no unresolved candidate, a recent zero-mismatch successful sync, finite freshness within the configured target and no later failed job. A failed candidate is retained evidence, not an active writer; normal scheduled sync can retry through the existing validated lifecycle. Activation requires that unresolved candidate to have been resolved by a successful run. Old failure evidence predating the successful sync is retained and does not block recovery. Readiness is structural evidence, not source reconciliation or freshness proof.

Worker containers carry the staging analytics-job label. Exit/signal cleanup removes the specific container ID created by that invocation. If a killed host process leaves a container alive, subsequent jobs and deployment refuse to proceed. Inspect that container and recover explicitly; do not delete the lock or blindly retry maintenance. Scheduled job origin remains `scheduled` in the existing durable analytics audit. Preflight/container failures remain visible through systemd; timers do not deliver external notifications.

## Install definitions without starting jobs

On the company host, retain the existing protected operator and Odoo configuration files. For a **new** jobs configuration only:

```bash
cd /opt/el-dabboos/analytics
if ! test -e /opt/el-dabboos/secrets/staging-jobs.env; then
  install -m 600 infra/staging/jobs.env.example /opt/el-dabboos/secrets/staging-jobs.env
fi
```

For an existing jobs file, preserve all configured paths and tenant. Add `STAGING_API_CONTAINER=el-dabboos-staging-api-1` if absent. The old image pin is no longer used. Check that `STAGING_SOURCE_ENV_FILE` points to the existing protected source configuration used by the accepted loader; a missing file is a blocker, never a reason to invent credentials or fall back to another connection. Keep this metadata file root-owned mode 0600.

Install both timers and their shared service only after the reviewed release is present on the host:

```bash
install -m 644 infra/staging/el-dabboos-analytics@.service /etc/systemd/system/
install -m 644 infra/staging/el-dabboos-analytics-pause@.service /etc/systemd/system/
install -m 644 infra/staging/el-dabboos-analytics-sync.timer /etc/systemd/system/
install -m 644 infra/staging/el-dabboos-analytics-daily.timer /etc/systemd/system/
systemctl daemon-reload
```

This does not enable timers, load source data, migrate databases or restart the old PR19 evidence container.

## Refresh now and enable only on success

Historical serving coverage, pending candidates/aggregates and accepted exact snapshots must already be checked. The current staging has historical evidence through September; verify the actual status rather than substituting a new bootstrap or historical reload. Keep the original stopped PR19 container as evidence.

The following foreground sequence deliberately performs the authorized sync and reconciliation. It uses the already-protected connection, never prints credentials, and enables neither timer if any operation fails. Inspect the JSON for exact controls, cursor movement and the trusted revision. A replay may change if Odoo changed between the two snapshots.

```bash
(
set -e
cd /opt/el-dabboos/analytics
set -a
source /opt/el-dabboos/secrets/staging-jobs.env
set +a
systemctl disable --now el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer
for unit in el-dabboos-analytics@sync.service el-dabboos-analytics@daily.service; do
  state=$(systemctl is-active "$unit" || true)
  case "$state" in
    inactive|failed) ;;
    *) printf 'Wait for the active service before activation: %s (%s)\n' "$unit" "$state"; exit 75 ;;
  esac
done
export STAGING_JOB_REQUIRE_RUN=1
bash infra/staging/analytics-job.sh check
bash infra/staging/analytics-job.sh sync
bash infra/staging/analytics-job.sh sync
bash infra/staging/analytics-job.sh daily
STAGING_JOB_REQUIRE_FRESH=1 bash infra/staging/analytics-job.sh check
systemctl enable --now el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer
systemctl list-timers 'el-dabboos-analytics-*'
)
```

Do not substitute `|| true` for a failed foreground stage. A successful sync/replay can be `passed` or `unchanged`; a failed reconciliation exits nonzero. If activation stops, leave scheduling disabled and review the safe result together with `journalctl -u 'el-dabboos-analytics@*'`. Review finance/report reads against the final trusted revision separately. Timer presence alone never proves fresh data.

## Deployments and schema updates

Use the shared deployment entry point for every future release, including releases with migrations. After the reviewed main checkout has been pulled and its exact SHA checked, set the existing configuration references and run:

```bash
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
bash infra/staging/deploy.sh
```

This requires a clean checkout, derives API/web tags and public build number from its commit, and builds while the current release remains available. It then waits for the shared job lock, rejects orphan workers, stops API/web, runs explicit migrations and role/schema verification, and starts both services with `--wait`. The lock is held through health checks. A failed migration or verification stops the sequence before restart; preserve the failure and recover using verified binary/schema compatibility. It never blindly restarts an old image against a new schema.

Enabled timers remain enabled through maintenance; a sync can only skip the shared lock. After successful restart, the next job resolves the new healthy API image ID and verifies its matching schema before receiving source configuration. No jobs image pin needs a manual update. Do not bypass this entry point with raw `migrate` or an independent deployment while timers are enabled. Restore backups through the same maintenance exclusion; bootstrap/provision, rollback and database restore remain separate explicit operations.

After a release changes timer/service definitions, reinstall the service template, failure handler and enabled timer unit files and run `systemctl daemon-reload`. For this runner migration, stop/disable existing timers before replacing old scripts and wait for old services to finish: an invocation already running the previous runner has no new safety guarantees. Existing approved backup/restore policy still applies.

## Verify ongoing operation

```bash
systemctl list-timers 'el-dabboos-analytics-*'
systemctl status el-dabboos-analytics@sync.service el-dabboos-analytics@daily.service --no-pager
journalctl -u 'el-dabboos-analytics@*' --since '1 hour ago' --no-pager
```

Check the read-only analytics status for recent successful sync, zero mismatches, no pending candidate/aggregates and intended trusted revision. A failure preserves the last trusted data and must be investigated. Daily success does not clear failed sync evidence. To stop future invocations, disable both timers; an active job needs separate controlled stopping. Source credential rotation, recovery and notifications are outside this setup.

## Failed-job scheduling

The installed service template's `OnFailure` handler stops only the failed job's timer. It does not reset its failed state or loop on the same error. Investigate the original failure and resume the saved checkpoint under supervision; re-enable that timer only after success. Ordinary sync, daily reconciliation and Command background timers are independent. Install `el-dabboos-analytics-pause@.service` whenever installing or replacing the shared template.
