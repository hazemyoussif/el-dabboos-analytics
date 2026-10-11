# Hosted single-mart historical parity

## Scope and approval

All twelve reports are existing product functionality: Executive Sales & Invoicing, Business Line Performance, Salesperson Performance, Customer Performance, Invoice & Refund Operations, Receivables & Aging, Historical Executive Trend, Sales vs Invoicing Trend, Business Line Trend, Salesperson Historical Analysis, Customer Historical Analysis, and Data & Certification Status. The accepted historical range is October 2025–September 2026. Staging demo parity was explicitly approved by the task owner on 2026-10-11; it is not production authorization or a replacement for exact reconciliation.

The hosted extraction/evidence/serving database is one mart. The default historical publisher is still a two-mart transfer. `--in-place` instead calls `promoteLocalBoundedRelease`: validate dedicated publication authority and current monthly certification, hash every release table using the existing bounded canonical fingerprint, then insert only the immutable promotion receipt. Reruns require the same reference and fingerprint. One repeatable-read write transaction covers proof, fingerprint and receipt; concurrent serialization failures can safely rerun. No fact, mapping, certificate, serving binding or operational cursor is changed by this operation.

Certification and derived ratio output certification remain the existing separate lifecycles. Activation still checks every exact monthly receipt and fingerprint and the database still requires complete paired event/aging months. The September anchor binding remains in place. There are no new metric definitions or capability registries.

The trusted repository includes the existing historical capability projection and delegates requests starting before operational coverage to the existing historical adapter. Sep/Oct requests continue through normal trusted serving. Finance publication reads the activated certified aging member at each exact month end, falling back to existing operational summaries only when there is no historical member. Its independent customer controls, exact ten totals, standing customer Finance lineage and immutable publication guards remain mandatory. Historical/operational windows that cross outside the accepted historical end are not stitched into a new release.

## Post-merge staging commands

Run from the merged checkout **on the approved staging host**, using the existing protected environment files and database network. Rebuild/redeploy the API with the merged source using the established staging deployment workflow first; the API image now includes `scripts/integration`. The commands below use Docker's env-file mechanism and never load developer `.env` files. The operator env file must contain `ENVIRONMENT=staging`, the hosted `MART_MIGRATOR_URL`, `MART_RUNTIME_URL`, existing control app configuration and the approved read-only Odoo source configuration/tunnel. In-place publication uses only `MART_MIGRATOR_URL`. Activation uses `MART_PUBLICATION_TARGET_URL`, supplied inside the container from that same URL.

Set these **path/image/network values**, not connection strings:

```sh
export STAGING_OPERATOR_ENV_FILE=/protected/path/to/existing-staging-operator.env
export STAGING_DATABASE_NETWORK=existing-staging-database-network
export STAGING_API_IMAGE=merged-staging-api-image
export HISTORY_CHECKPOINT_DIR=/protected/persistent/history-202510-202609
```

The checkpoint directory must belong to this hosted mart and be readable/writable by the image's `node` user. Retain all immutable extraction checkpoints, publication receipts and approvals; back them up with the database. Local-mart checkpoints are not proof of hosted extraction. Before the full-range rerun, retain the already-completed **hosted September historical** event/aging checkpoints in this directory: the existing backfill validates and skips them. If those files are missing, recover their original exact evidence files before running; do not re-extract September or author substitute checkpoints.

Use the existing `business-approval.json` when any member is already certified; do not replace its reference, approver or approvedAt. For a wholly new hosted job only, create that file exclusively with the authorized task-owner staging reference. `approvedAt` records when this approval evidence is written, while the reference identifies the 2026-10-11 authorization. It does not claim Finance approved these outputs or invent an earlier timestamp.

```sh
node --input-type=module - "$HISTORY_CHECKPOINT_DIR" <<'JS'
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const approval={
  reference:'staging-demo-parity-authorized-2026-10-11',
  approverReference:'task-owner:staging-demo-parity-approved-2026-10-11',
  approvedAt:new Date().toISOString()
};
await writeFile(join(process.argv[2],'business-approval.json'),JSON.stringify(approval),{flag:'wx',mode:0o600});
JS
```

Skip this creation command if the job already has its approval. Existing approvals are immutable; conflicting approval files must be recovered rather than overwritten.

Define a reusable operator wrapper with durable checkpoints:

```sh
history_operator() {
  docker run --rm --network "$STAGING_DATABASE_NETWORK" \
    --env-file "$STAGING_OPERATOR_ENV_FILE" \
    --mount "type=bind,src=$HISTORY_CHECKPOINT_DIR,dst=/history" \
    --read-only --tmpfs /tmp \
    --entrypoint node "$STAGING_API_IMAGE" \
    --experimental-transform-types --disable-warning=ExperimentalWarning "$@"
}
```

1. Backfill/reconcile monthly candidates. This does not publish or bind:

```sh
history_operator scripts/integration/historical-backfill.ts backfill \
  --tenant el-dabboos-iq --from 2025-10-01 --to 2026-09-30 \
  --checkpoint-dir /history
```

2. Certify, approve, certify derived ratios and record in-place receipts:

```sh
history_operator scripts/integration/historical-publish.ts backfill \
  --tenant el-dabboos-iq --from 2025-10-01 --to 2026-09-30 \
  --checkpoint-dir /history --in-place
```

3. Activate the separate immutable collection after all 24 receipts exist:

```sh
history_operator --input-type=module -e '
process.env.MART_PUBLICATION_TARGET_URL=process.env.MART_MIGRATOR_URL;
process.argv=[process.argv[0],"scripts/integration/historical-activate.ts","backfill","--tenant","el-dabboos-iq","--from","2025-10-01","--to","2026-09-30","--checkpoint-dir","/history"];
await import("./scripts/integration/historical-activate.ts");'
```

4. Publish all twelve customer Finance month-end snapshots. Already published snapshots are skipped; each new cutoff requires the exact activated summary and independent read-only source controls:

```sh
history_operator scripts/integration/finance-snapshots.ts
```

5. Read status using the dedicated runtime role:

```sh
history_operator apps/api/src/analytics-status-cli.ts status --tenant el-dabboos-iq
```

Require non-null `historicalCoverage` with `from=2025-10-01`, `to=2026-09-30`; require twelve `financeSnapshots` from `2025-10-31` through `2026-09-30`. Compare operational `cursor` and `trustedServingRevision` with the saved pre-operation status: historical operations must not move them. The prior handoff revision is `7440590f-cf8a-465f-b240-a9e6aff7a457`; use the fresh pre-operation value if another authorized operational sync occurred.

Finally verify `/health/ready` through the established staging HTTPS URL and sign in with the existing authorized staging identity. Check all twelve reports in both supported locales, historical monthly and customer analysis, Finance cutoff selection, and current Sep/Oct reporting. Check an unauthenticated request and a principal without tenant membership remain denied. Record these as **manual hosted evidence**, separate from synthetic tests. Employee provisioning is a separate task.

## Deployment blockers and evidence limits

No hosted extraction, approval, activation or customer publication is performed by the PR itself. Final hosted acceptance requires the merged API image, protected source connectivity, the retained hosted checkpoints/approval, all exact monthly certifications and receipts, existing customer Finance anchor capability, and successful operator commands above. Source control mismatches block publication; they never justify new metric semantics, fabricated controls, cursor rewinds or deletion of volumes. Runtime-role grants/RLS must remain those from the established staging migration workflow. Do not re-bootstrap operational serving to widen coverage: that operation is intentionally idempotent and does not import history into an existing baseline.
