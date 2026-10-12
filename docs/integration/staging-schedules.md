# Staging analytics schedules

The host invokes the existing analytics CLI in the deployed commit-pinned API image. There is no worker framework, in-process scheduler, model dependency or new database schema. The runtime API does not receive source credentials.

`el-dabboos-analytics-sync.timer` runs sync five minutes after the previous invocation finishes (first invocation five minutes after timer activation). `el-dabboos-analytics-daily.timer` runs daily reconciliation and then presence sweep at 00:00 UTC / 03:00 Baghdad. Both services share a nonblocking host lock, so an overlapping scheduled invocation is skipped and logged. The existing tenant writer lock still protects against manual jobs. A failed reconciliation prevents the following sweep, exits nonzero and leaves a failed systemd service plus the existing durable run evidence. Failed jobs retain the existing rollback/cursor rules. No source/SQL deadline is increased; systemd terminates a stuck service after fifteen minutes. Replays use the existing cursor and unchanged-run lifecycle.

`ANALYTICS_JOB_TRIGGER=scheduled` records the actual origin in the existing audit. Normal CLI invocations retain `operator`; the HTTP path retains `manual`.

## Prepare without starting

Copy `infra/staging/jobs.env.example` to `/opt/el-dabboos/secrets/staging-jobs.env`, set its image to the deployed full commit SHA, and keep it root-owned mode 0600. It contains release metadata and existing protected env-file paths, not credential values. Keep the operator/source files unchanged. The runner rejects an unpinned image and uses `--pull never` to execute only the locally built release.

```sh
install -m 644 infra/staging/el-dabboos-analytics@.service /etc/systemd/system/
install -m 644 infra/staging/el-dabboos-analytics-sync.timer /etc/systemd/system/
install -m 644 infra/staging/el-dabboos-analytics-daily.timer /etc/systemd/system/
systemctl daemon-reload
```

This installs definitions only. It does not enable timers, start jobs, restart the stopped PR19 container or load any source data. Deployments must update the image in `staging-jobs.env` together with API/web. Timer configuration alone does not prove data freshness.

## Verify before enabling

Complete the required historical loading through [the existing monthly path](hosted-historical-parity.md). Check stored coverage, zero pending aggregates and independently published customer month-end snapshots. Run one foreground sync using the deployed image and existing operator/source configuration; inspect its result, zero mismatches, cursor and trusted revision. Run it again to verify replay rather than assuming every replay is unchanged when the source has moved. Verify report reads and filters after those operations. Keep the original `el-dabboos-sync-pr19` container stopped as evidence.

Only after those hosted checks pass:

```sh
systemctl enable --now el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer
systemctl list-timers 'el-dabboos-analytics-*'
```

Monitor `journalctl -u 'el-dabboos-analytics@*'` and the existing analytics status endpoint for failures, freshness and pending candidates. Daily audit success does not resolve failed sync evidence. Timers do not send notifications; alert delivery is outside this change. To stop future runs, disable both timers; an already running service must be stopped separately when needed. No automatic retry loops or bootstrap operations are added.

These jobs update the existing operational event/summary path. Immutable customer Finance month ends are loaded with the existing explicit Finance loader; they are not fabricated or silently refreshed by the timers. Finishing historical Finance loading and future month-end publication are separate from incremental source freshness.

## Report loading

The workspace renders completed report execution before requesting optional filter choices. Choice requests run sequentially; a failed dimension leaves other successful choices available and displays a bilingual retry message. Customer search remains the existing bounded server search. Query/result bounds remain unchanged: high-cardinality customer detail requires a selected customer/date scope and never silently drops rows. No report/template availability is hardcoded.
