# Controlled staging loading rollout — 2026-10-12

## Recovery state and release preparation

Host: `analytics-dashboard`, through the user's authenticated Teleport session. Checkout: `/opt/el-dabboos/analytics`. The agent has no authenticated remote shell. Original local proposals remain untouched; implementation uses isolated worktrees. Employee provisioning reuses PR #10. Neither PR merge nor deployment is implied by this preparation.

Live evidence supplied by the operator:

- API/web images: `el-dabboos-api:679f9750f8718cce20d9868e5e7b2c55dd35f0a7` and `el-dabboos-web:679f9750f8718cce20d9868e5e7b2c55dd35f0a7`.
- `el-dabboos-sync-pr19` is exited, code 137. Preserve it; do not restart it during preparation.
- Trusted revision: `8fe99918-2b62-4e6b-a008-114d7a8605a7`; cursor cutoff: `2026-10-12T06:31:12.266Z`; `account_move` cursor: `["2026-10-12 03:15:58.006131","236458"]`.
- No pending candidate; zero pending aggregate partitions; 13 trusted fact months; customer Finance snapshots empty.
- Existing checkpoints/approval: `/opt/el-dabboos/state/historical-202510-202609`. Preserve them.
- Existing pre-040 backup: `/opt/el-dabboos/state/pre-040/el_dabboos_analytics_staging-before-040.dump`. It does not verify recovery of today's revision.
- Database inventory includes `el_dabboos_analytics_staging` and `el_dabboos_control_staging`. The unrelated `el_dabboos_analytics` database is outside this rollout.

Before migration 041 or publication, create fresh protected custom-format dumps of both staging databases, archive existing immutable checkpoints, and restore both into a new disposable PostgreSQL 18.6 instance with no network/ports. Compare restored trusted revision/cursor, schema ledger and control/auth counts against the pre-operation state. Record the actual restore result. Merely listing a dump is not recovery verification. Retain the protected runtime/operator/source env files through the established secrets backup process; never print or rewrite them.

Use the exact reviewed integrated release SHA after its gates pass. In the same terminal, set the following public configuration:

```sh
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
```

Set `STAGING_API_IMAGE` and `STAGING_WEB_IMAGE` to literal SHA-pinned image tags supplied in the final release handoff. Do not rely on exports from a previous terminal. Review a clean checkout and verify `git rev-parse HEAD` matches the intended release before building both Dockerfiles. Pin rollback tags to the currently running images before restart.

Run the existing staging `migrate` and `verify` operator commands with the protected operator env file. `migrate` applies the additive migration 041 and re-establishes the existing role grants. It must not modify the released 040 SQL/companion/checksum. Do not run `provision`, `bootstrap`, reset, volume removal, pointer edits or legacy historical activation. Restart API/web only after migration and role verification pass; verify `/health/ready` and ingress/session continuity. A pre-publication rollback uses the paired pre-rollout database backups and old images. After publication, application-only rollback to pre-041 code does not establish schema compatibility.

## Bounded historical operator

Use a new hosted checkpoint directory for June 2024–September 2025, readable/writable by the image's `node` user and protected from unrelated users. Do not reuse or alter the old job's approval. The task owner has already granted standing approval for this handoff. Record that existing authorization through the loader's existing `business-approval.json` input; no further business sign-off is required. Preserve original job evidence.

With the reviewed SHA-pinned API image and new checkpoint path set in this terminal:

```sh
history_operator() {
  docker run --rm --network dabboos-analytics-mart_default     --env-file /opt/el-dabboos/secrets/staging-operator.env     --env-file /opt/el-dabboos/secrets/odoo-source.env     -e ENVIRONMENT=staging -e CONTROL_PROVIDER=postgres     --mount "type=bind,src=$HISTORY_CHECKPOINT_DIR,dst=/history"     --read-only --tmpfs /tmp --entrypoint node "$STAGING_API_IMAGE"     --experimental-transform-types --disable-warning=ExperimentalWarning "$@"
}
```

First run one complete June month, keeping extraction separate from publication:

```sh
history_operator scripts/integration/historical-backfill.ts backfill --tenant el-dabboos-iq --from 2024-06-01 --to 2024-06-30 --checkpoint-dir /history
history_operator scripts/integration/historical-publish.ts backfill --tenant el-dabboos-iq --from 2024-06-01 --to 2024-06-30 --checkpoint-dir /history --in-place
history_operator scripts/integration/historical-import.ts backfill --tenant el-dabboos-iq --from 2024-06-01 --to 2024-06-30 --checkpoint-dir /history
history_operator apps/api/src/analytics-status-cli.ts status --tenant el-dabboos-iq
```

Require exact source/mart controls, tuple parity, aggregate/drill parity, an immutable June import checkpoint, intended trusted revision advancement and an unchanged operational cursor. Record full stage durations and source lease evidence. Never infer full workload speed from a single page. On interruption, preserve the failed extraction. After its lease expires, use the existing `--retry-incomplete` extraction flag for the affected month. Import retries use their immutable database checkpoint automatically.

Then repeat the three extraction/certification/import steps for each month July 2024–September 2025. The sixteen-month range is within the 24-month bound, but one-month invocations allow measured operator control. Empty event months still require exact zero-population proof and paired aging evidence. Existing October 2025–October 2026 fact members must remain intact.

An identity/date conflict with current heads must stop publication atomically. After the loading path passes review, synthetic gates and the source canary, a separately observed sync using the reviewed scope handling can reconcile/retire prior covered footprints, followed by a fresh exact monthly extraction if required. Do not restart the old stopped container or introduce a scheduler. Record any legitimate cursor change separately from historical import behavior.

## Independent customer Finance and report acceptance

Use the reviewed image to publish customer evidence for all closed cutoffs, split at the existing 24-month bound:

```sh
history_operator scripts/integration/finance-snapshots.ts backfill --tenant el-dabboos-iq --from 2024-06-01 --to 2026-05-31 --checkpoint-dir /history
history_operator scripts/integration/finance-snapshots.ts backfill --tenant el-dabboos-iq --from 2026-06-01 --to 2026-09-30 --checkpoint-dir /history
history_operator apps/api/src/analytics-status-cli.ts status --tenant el-dabboos-iq
```

Each cutoff needs independent customer controls, exact ten signed-bucket totals, month-end evidence and approved customer dimensions. Summary-only evidence cannot supply customer grouping. Existing customer snapshots are skipped; refreshing an already trusted cutoff is a deliberate follow-up, not an automatic scheduler. A missing/invalid population remains an explicit blocker.

Verify each of the twelve reports named in [hosted parity](hosted-historical-parity.md) in English/Arabic, with historical dates, company 1 / IQD, customer/salesperson/business-line filters and drill-through. Exercise Save/reopen/version conflict and scoped access. Confirm incomplete coverage stays honest while the monthly manifest is being extended.

For PR #10, verify an administrator creates an employee, the employee signs in, candidate provisioning is idempotent, and a separately assigned membership/role/scope grants only intended access. A viewer must not create users; suspended users/bindings must fail on the next request. Initial password change enforcement remains deferred. Do not create arbitrary live employee privileges as part of rollout testing.

Only after complete intended coverage, customer controls, hosted report acceptance and recovery evidence pass should one newly named incremental benchmark run. Measure discovery, persistence, reconciliation, refresh and replay separately; verify rollback and RLS. Preserve stopped PR19 evidence. Continuous sync remains unconfigured.

## Repository report-opening parity

Trusted staging capabilities are projected per metric, unlike the combined release often used in local fixtures. Certified template dates now resolve shared coverage across those releases, including intersecting coverage boundaries; historical dashboards prefer the widest supported shared period. A report without shared coverage is incompatible rather than offered with a relative preset that fails on opening. This does not manufacture missing data or extend any published metric capability.

HTTP regression checks the exact available twelve-template list and opens every template in English and Arabic with zero failed series using synthetic fixtures. The application regression matrix checks all twelve dashboard templates (the Sales & Invoicing template, six management and five historical) in English and Arabic with the staging capability format, explicit dates and canonical dashboard authorization. Data & Certification Status is a separate information page. Finance uses the published customer snapshot range. This automated evidence is separate from hosted report execution and browser acceptance. The deployment acceptance target remains all twelve reports working on staging before merging; green CI alone does not establish that outcome.

Exact immutable customer Finance vectors supply the customer/month grain declared by the semantic catalog, independently of company-summary baseline dimensions. Summary-only facts still never supply customer rows; analysis restrictions and tenant/policy enforcement remain in place. No schema or extra approval workflow is added for this fix.
