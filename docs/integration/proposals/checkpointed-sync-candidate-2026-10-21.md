# Checkpointed operational sync — implementation and verification

Status: the owner approved the schema/security change and subsequently approved
focused synthetic tests. Capture, resume, migration 064 and API composition are
implemented in release `8d449b9df9fca8ae7f94c16541c96718e805daa1`. Company rollout
is not performed. The earlier
automatic-review rejection was resolved through explicit approval and focused
patches. [ADR 042](../../architecture/adr/042-checkpointed-operational-sync.md)
owns the lifecycle decision.

## Confirmed company failure

The 20 October 23:07 diagnostic run planned 569,465 revision entries:
202,794 without previous facts and 366,671 with previous facts. Every existing-fact
change included `transaction.labels.businessLine`; 53 additionally changed
coordinates. The log does not reveal the before/after labels, so semantic label
equivalence cannot be assumed. Counts are entries, not distinct identities.

Source handoff took 468.8 seconds. Candidate classification took 31.2 seconds,
revision/head persistence 222.2 seconds, and comparison 76.4 seconds. Refresh
started at 813.5 seconds and completed 16 of 28 months before termination during
the seventeenth. No final prepared-publication or dependency-acceptance timing was
obtained. A completed month in those logs was still uncommitted.

Astra's read-only review agrees that label differences must be retained. It found
no evidenced formatting regression in the business-line projection and no small
optimization demonstrated to fit the entire catch-up within the existing deadline.

## Implemented behavior

1. Under the tenant writer lock, read the source once using the existing bounded
   RR/RO snapshot. Plan changes and capture independent exact source controls.
2. Close the source successfully. Atomically persist the complete private capture:
   source cutoff/fingerprint, original request, baseline versions, accepted parent
   and previous cursor, next cursor, staged revisions/heads, controls and complete
   dependency observations. Only a sealed complete capture is resumable. Failure
   before sealing requires a new source snapshot; an exported snapshot token is
   never stored or resumed.
3. Keep accepted heads and cursor unchanged. Compare through a private candidate
   overlay and persist exact evidence. Build each affected month and prepared
   chunk in its own bounded transaction. Resume completed immutable checkpoints.
4. Revalidate parent, cursor and versions before each phase. Hold the same tenant
   advisory lock across transactions; refuse conflicting publication or head
   writes while a candidate is pending. A conflict fails closed.
5. After complete exact evidence and prepared coverage, atomically accept staged
   heads, successful audit, dependency state, source cursor and trusted publication.
   Readers continue using the old accepted publication until that commit.

This retains real renames, locations, tombstones, source cutoff, tenant isolation,
exact controls and the current source/job deadlines. It does not change dashboard
semantics or add a raw-history serving fallback.

## Approved schema/security changes

Migration 064 adds ingestion-only candidate metadata, staged heads,
dependency pages, capture seals, pending-candidate pointers, reconciliation
checkpoints and acceptance evidence. Candidate data requires forced tenant RLS,
immutable capture contents after sealing and no runtime payload access.

A private working-head view overlays the selected staged revisions over accepted
heads for comparison and refresh. The exact aggregate proof must use this same
selected population. Ordinary operations continue using accepted heads.

The previous `analytics_serving_revisions` foreign key required its successful
operation audit to exist in the same transaction as the entire refresh. Offline
checkpoint commits cannot meet that requirement. The replacement is a
deferred database constraint that permits either an existing operation audit or a
sealed candidate with exactly matching tenant, parent, run/revision identity and
source cutoff. Final promotion still requires the successful exact operation
audit and all existing completeness guards. The owner explicitly approved this
foreign-key replacement after the initial automatic-review rejection.

Earlier runtime policies treated membership as published evidence because membership
committed with publication. Restrictive policies now hide candidate revisions,
memberships, daily aggregates and partitions until acceptance. Existing downstream
membership/prepared policies hide their facts, bindings, cells and seals. A safe
status projection exposes the pending candidate ID only. Staging provisioning must
copy the policies to its non-inheriting runtime login before restart.

These are lifecycle/security changes requiring migration and role provisioning;
the old API-only deployment block is insufficient. Migration 064 passed in
disposable synthetic databases and the local staging rehearsal; it has not run in
company databases.

## Owning implementation

- `packages/domain/src/analytics-sync.ts`: capture/session contracts.
- `packages/application/src/analytics-sync.ts`: capture-or-resume orchestration.
- `packages/data/src/operational/sync-context.ts`: session-owned bounded transaction
  context and captured metadata types.
- `packages/data/src/operational/sync-capture.ts`: complete source/controls capture.
- `sync-store.ts`, `sync-evidence.ts`, `sync-refresh.ts`, `sync-acceptance.ts` in the
  same directory: private resume, exact comparison, month/chunk commits and final
  atomic acceptance/rejection. Existing refresh and preparation algorithms are reused.
- `apps/api/src/analytics-jobs.ts`: sync selects the checkpointed lifecycle; source
  configuration resolves only when no capture exists. Other kinds keep their lifecycle.
- `infra/staging/analytics-job.sh`: background child plus `wait` permits prompt
  TERM/INT cleanup; no deadline or timer definition changes.

No source calls, Docker builds, deployments, timer changes or GitHub CI were run.
The existing unrelated performance-fixture edit is preserved and excluded.

## Focused verification approved and performed

Nine PostgreSQL tests passed on the isolated `foundation_test` server at port 55436,
with no skips. They apply all migrations in disposable databases and cover:

- Injected interruption after committed capture, reconciliation, a month and a
  prepared chunk; retry preserves their IDs and evidence and opens no source.
- Dependency acceptance failure rolls back heads, trusted pointer, audit, cursor,
  dependencies and acceptance marker together; a later retry succeeds.
- Incomplete capture rollback, exact mismatch rejection, no-change acceptance,
  real labels/coordinates, date moves, tombstones and the legacy atomic job path.
- Runtime denial of private tables and unpublished revisions/partitions/facts/
  prepared cells, tenant isolation, immutable capture, incomplete evidence denial,
  acceptance-flag misuse, concurrent writer exclusion and lineage conflicts.

Eight existing refresh/diagnostic tests and nine mocked staging-runner tests also
passed: **26 focused tests in total**, with no skips. The focused results were first
obtained on the working tree based on `a6c715b`.
Final release verification and local rehearsal are recorded in the
[release handoff](../../qa/checkpointed-sync-release-2026-10-21.md). The initial fixture failures
were an invalid synthetic projection version and an unquoted test SQL alias; both
were corrected without weakening production constraints. Interruption tests inject
exceptions at commit boundaries; they do not measure a company process kill or
company performance. Full release suites/builds remain separate from focused approval.

Focused database command:

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-concurrency=1 \
  packages/data/test/postgres/checkpointed-sync.test.ts \
  packages/data/test/postgres/checkpointed-sync-guards.test.ts
```

The command receives only the disposable `PG_TEST_ADMIN_URL`; it does not load
developer env files. Release branch and company handoff are tracked in the
[release handoff](../../qa/checkpointed-sync-release-2026-10-21.md).

## Remaining release conditions

The company root filesystem last had 3.2 GiB free. Durable candidate revisions and
prepared replacements need storage beyond that used by the accepted release;
company capacity is not established. No cleanup of database history or volumes is
part of this change. Capture and final acceptance must each fit the existing job
bound; their company timing and temporary storage remain unmeasured. Individual
statements retain their existing limits. Conflicting restored metadata fails closed;
an operator abandonment/pruning workflow is not introduced. No end-to-end company
speed or completion guarantee is claimed from these small synthetic fixtures.

Next: approved full local release gates, then a reviewed migration-aware rehearsal
and company handoff after capacity is established. Do not rerun the old company
API-only deployment block or enable timers based on this document.
