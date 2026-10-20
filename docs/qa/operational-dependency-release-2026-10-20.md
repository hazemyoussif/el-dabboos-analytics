# Operational dependency release — 20 October 2026

Status: release candidate, not pushed, merged or deployed. This is not permission
to retry company sync. GitHub CI remains disabled by owner instruction.

## Scope and evidence

Branch: `codex/bounded-ingestion-overlap`, based on
`0aaaa731192758a2fa65593d216aa59866c0f70a`. Candidate commit identity is supplied
with delivery; do not use the base SHA as this release's image tag.

- Execute each source object query once, using bounded transaction-scoped cursor
  fetches in the existing retained read-only snapshot.
- Track receivable identities and previous/current effective dates. After complete
  initialization, recheck only cutoffs affected by those dates.
- Track mapped lookup content separately from modification timestamps. After
  complete initialization, timestamp-only changes do not fan out document reads;
  actual names/assignments and independent header edits remain discoverable.
- Reuse prior partial-day partitions only with both immutable exact proofs. Keep
  all new-partition database exactness and publication guards.

Migrations **062 then 063** create empty, ingestor-only forced-RLS metadata tables
and guarded checkpoints. Migration 063 shares the successful audit/cursor guard
without breaking migration 062's trigger identity. Neither migration extracts
source records or populates these caches. Runtime has no cache privileges.
Facts, publication, audit, successful cursor and dependency evidence still commit
atomically; failure preserves previous accepted state. Source deadlines, statement
limits, systemd deadlines, exact controls and company filters remain unchanged.
No web, semantic metric, credential or company configuration changes are included.

Approved focused synthetic evidence, reused without rerunning:

- Four aggregate-proof safety checks passed.
- Six cursor/source checks and six receivable dependency checks passed.
- Nine lookup checks passed; the cursor/receivable checks also passed alongside
  the lookup implementation. Tests use disposable databases, not developer envs.
- The single approved local refresh measurement completed **13 months / 178,249
  active facts / 364 dates in 70.994 seconds**, then rolled back. Trusted revision
  and partition count were unchanged. See [stage costs and limits](local-refresh-measurement-2026-10-20.md).
- Frozen-lockfile installation, full lint, full typecheck, API/web production
  builds, architecture, baseline-aware quality and diff checks passed. The web
  build retains its large-chunk warning. No tests ran during release preparation.

The full regular and PostgreSQL suites have not run for this candidate. Repository
pre-push verification requires them. The owner's restriction requires approval
before running those existing suites; the focused approvals are not approval for
the full suite. No push/merge/release acceptance is claimed until this is resolved.
The unrelated uncommitted performance fixture experiment is excluded.

## Limits that must survive delivery

The first sync must initialize both caches and catch up document history. That
initial cost is unmeasured. The local refresh run excludes source discovery,
initialization, revision persistence, comparison and prepared publication. It has
no before/after baseline. Company coverage is 29 months and its history/storage
are different; this result cannot establish company runtime or a speedup.
Timestamp polling still cannot promise detection of hard lookup deletions or
changes without reliable modification timestamps. Existing sweep controls remain;
a source change log or governed catch-up is needed for those cases.
Business-family automatic refresh and remaining command-measure publication are
separate work. Do not report the dashboard's company rollout as complete.

## Deployment order after release verification

1. Rehearse the exact candidate locally: build the API, apply migrations 062/063
   through the existing operator, verify roles/schema, replace the API and retain
   the web artifact. This has not been performed for this candidate. Do not start
   a source sync merely as part of the application upgrade.
2. Supply the verified merged SHA for the user to deploy on the company host.
   Preserve current web `6caf30e` and the existing protected configuration.
3. Keep both company timers paused and confirm no running sync/daily job. Use the
   shared maintenance lock, existing mounted backup disk and coordinated backup
   procedure from the [company rollout](sales-command-center-company-rollout-2026-10-20.md).
   A prior archive inventory/checksum is not a new restore rehearsal. Review free
   space before building and before migration; the old 2 GiB stop threshold does
   not establish enough space for initialization or a full sync.
4. Build only the API. Under the maintenance lock, stop the API/web writers for
   backup, record current image identities, take the coordinated control/mart
   backup, then run `operator migrate` followed by `operator verify`. The migrator
   applies 062 before 063 and checks immutable migration history. Do not use the
   historical code-only command, whose migration guard intentionally rejects this
   release. No bootstrap, provisioning or Business exposure is required.
5. Start the new API and retained web artifact, verify readiness, then leave source
   jobs and timers paused. Failed migration or readiness requires inspection; do
   not automatically retry or launch sync. A matching code/schema ledger is needed
   for recovery; do not blindly start an old image after migration.
6. Review application deployment evidence and remaining capacity before separately
   authorizing one initial sync. Preserve its journal/result. No retry loop or
   larger deadline is part of this release. The dependency checkpoints advance
   only with complete initialization and successful publication/audit/cursor.
7. After a successful exact sync, use the existing fresh schedule gate before
   restoring timers. The services resolve the deployed API image automatically;
   no image-pin timer change is required. Their workload still excludes automatic
   Business-family refresh.

Final commands require the release SHA and locally rehearsed evidence. This draft
intentionally supplies no company sync command while those release gates remain
open. The user, not the agent, executes company deployment commands.
