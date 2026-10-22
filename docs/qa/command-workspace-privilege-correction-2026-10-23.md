# Staging ingestor workspace privilege correction

Base: `ee78f57dd0dd3209453750e3dc4f62ba5da797e7` on `codex/bounded-ingestion-overlap`.

Staging provisioning revokes PUBLIC database privileges and previously restored only CONNECT. Sync capture and Business delta paths create temporary tables. Provisioning now explicitly grants TEMPORARY to the staging mart ingestor. Verification checks ingestor access and rejects runtime TEMPORARY access. Existing NOINHERIT/SET FALSE memberships do not supply this privilege.

The analytics CLI exposes a fixed setup stage and validated error code for early failures. It does not print SQL, parameters, credentials or raw error messages. The code mismatch is established; the exact company exception remains unconfirmed.

## Company deployment

From the exact correction revision:

```bash
bash docs/qa/maintenance/deploy-command-workspace-fix-2026-10-23.sh
```

The script requires the deployed API base above, paused timers/jobs, a clean checkout, unchanged migrations and at least 2 GiB free before and after building. It retains the running web image, builds the API, takes the shared analytics lock, runs explicit administrator-only provisioning using the existing protected operator environment, verifies schemas/runtime/workspace privileges, replaces the API, and checks readiness. No source configuration is passed; jobs and timers remain paused. Provisioning changes database privileges and is deliberately separate from sync and serving startup.

If provisioning or verification fails, stop at that output. Do not start sync. After successful deployment the owner can start one supervised sync using the existing service; scheduled timers remain paused until successful synchronization is confirmed.

## Verification limits

Code review only. No tests, rehearsal, company database queries or deployment were run for this change under the owner's instruction. No prior test result is claimed for this correction. GitHub CI remains disabled. Server build, privilege verification and readiness output are the next deployment evidence, not proof of completed synchronization.
