# Company Command delta rollout — 23 October 2026

The owner authorized company deployment and one supervised server sync. The
[implementation verification](command-delta-verification-2026-10-23.md) covers
`d5371491914e6aa60107e1c37cc04d0a3855f67a`. This delivery adds documentation and
the existing deployment procedure as an executable runbook; production code is
unchanged. GitHub CI and local staging rehearsals remain disabled by request.

Preflight supplied by the owner: API/checkout `cffb5cf`, retained web `6caf30e`,
both timers inactive, sync failed, daily inactive, no running job containers.
Root has 4.5 GiB free; the existing backup mount has 32 GiB free. These values
describe preflight only and do not establish sync storage requirements.

## Application deployment

After delivery publishes the exact revision to main, fetch and fast-forward to
that revision. Set the preflight-confirmed inputs and run:

```bash
export COMMAND_DELTA_PREVIOUS_IMAGE=el-dabboos-api:cffb5cf28c81f29163a65342246f283653469367
export COMMAND_DELTA_BACKUP_ROOT=/mnt/HC_Volume_107192875
bash docs/qa/maintenance/deploy-command-delta-2026-10-23.sh
```

The runbook builds only the API, retains the current web image, uses the shared
maintenance lock and stops writers for fresh coordinated control/mart backups on
the separate disk. It verifies archive inventories/checksums, applies additive
migrations 065–076, verifies runtime grants and starts the application. No source
configuration is injected during application deployment. The migration runner
checks every immutable historical checksum and commits each migration separately.

The existing 2 GiB application stop threshold is retained. Monitor actual capacity
during the source run; backup-disk space does not extend the PostgreSQL volume.
Do not prune database volumes or history. Archive inventories/checksums are not a
restore rehearsal. If backup fails before migration, existing containers can be
resumed with `docker start el-dabboos-staging-api-1 el-dabboos-staging-web-1`.
After migration begins, inspect any failure against the code/schema ledger before
recovery; do not blindly restart the old API. No automatic retry is included.

Review deployment readiness and free space before starting the already authorized
single sync. Both timers stay paused.

## One supervised sync

Use the existing systemd service, whose runner selects the healthy deployed API
image and checks schemas before loading protected source configuration. The company
uses its existing direct source connection. No SSH tunnel or credentials in chat
are needed. Service files, deadlines and heap limits remain unchanged.

```bash
delta_sync_started=$(date --iso-8601=seconds)
systemctl reset-failed el-dabboos-analytics@sync.service
systemctl start --no-block el-dabboos-analytics@sync.service
journalctl -fu el-dabboos-analytics@sync.service --since "$delta_sync_started" --no-pager
```

Ctrl+C stops the journal follower only. Preserve the final result, then inspect:

```bash
systemctl show el-dabboos-analytics@sync.service -p ActiveState -p SubState -p Result -p ExecMainStatus -p ExecMainStartTimestamp -p ExecMainExitTimestamp
df -hT / /mnt/HC_Volume_107192875
```

Completion requires a successful exact operational result and its accepted cursor,
plus the reported Business member observations. A checkpoint or source handoff
alone is intermediate progress. A pending sealed operational candidate can defer
Business source work while resuming offline; report this explicitly rather than
claiming Command freshness. Failure stops this supervised attempt; inspect its
evidence before further work. Recipe initialization and affected summaries may
still take time; company duration is not inferred from the synthetic tests.

Allocation deletion checking is a separate operator sweep and is not launched by
this sync block. Odoo remains unchanged. After successful publication, check the
authenticated report's values, section periods, filters and freshness before
restoring timers through the existing fresh-schedule gate. Timer restoration is
not part of these commands.
