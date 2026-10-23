# Independent Command preparation

Code implementation with focused synthetic verification. Company operational evidence is recorded separately below.

Ordinary operational sync must never initialize Command recipes, enumerate historical Business members for initialization, or wait for Command background preparation. It retains the existing operational capture/reconciliation/cursor lifecycle. Business observations remain independent; an operational cursor advance is not Business freshness evidence.

## Separate lifecycle

`analytics command-background --tenant ID` is a separate awaited operator command. Its scheduler invokes one source-capture, prepared-chunk or publication unit. The API may drain at most ten canonical replay pages or reused binding metadata units within a ten-second budget; it never loops over historical months in one invocation. Coverage is discovered from the trusted manifest and registered recipe observations. Missing current-period recipes precede older gaps. Published capabilities include only measures with complete source evidence. Previously accepted raw/prepared data remains the serving authority until atomic publication.

A missing recipe is captured into private pages under one live exported read-only source snapshot. Page writes commit separately. Capture seals only after independent source controls match, with contiguous page/count/identity/lineage checks. If the source owner is lost, its unsealed recipe capture is abandoned and recaptured from a new snapshot. Page checkpoints do not recreate an expired PostgreSQL snapshot. A sealed capture resumes offline without resolving source credentials.

Canonical persistence, prepared chunk work, and publication are separate phases. Preparation reuses accepted datasets and sparse Business ancestry. A final publication must retain the latest other-family membership and reject a changed Business base. No partial capture or prepared candidate may become visible to the runtime. Missing measures remain unavailable rather than fabricated zeroes. Each phase reports safe stage/count/duration metadata.

## Scheduling and locks

`el-dabboos-analytics@sync.service` remains ordinary sync. The separate `el-dabboos-analytics-command-background.timer` targets `el-dabboos-analytics@command-background.service`. It triggers another unit after the previous invocation exits; service deadlines are unchanged.

The background wrapper holds a dedicated background-instance lock. It defers at entry if the ordinary analytics file lock is held, then releases its brief ordinary-lock probe. It does not hold the ordinary file lock during private source capture. Database phases retain tenant locks and publication CAS. Each worker invocation must do one bounded phase and return, allowing ordinary work between units. After current initialization, already published Command measures use scoped root-change discovery for one month per unit. A separate scheduling check records when that month was examined; metric freshness still comes from accepted recipe observations. Explicit `sweep --mode allocations` is routed to the background path. Missing allocation dependency inventory remains a distinct dependency step, reported separately; it is not financial-history preparation.

Background containers carry their own label and database sessions use `PGAPPNAME=el-dabboos-analytics-command-background`; ordinary sessions use `el-dabboos-analytics-sync` or the actual job name.

Deployment must stop both existing analytics timers and the new background timer, and confirm no containers carrying either `el-dabboos.staging.analytics-job=true` or `el-dabboos.staging.command-background=true` remain active before migrations/replacement. Do not run an older deployment script that only checks ordinary job containers once this worker is installed. Start ordinary sync and one background unit under supervision only after the complete code/schema changes have been reviewed and verified; then enable their separate timers.

## Evidence

The owner approved focused synthetic PostgreSQL tests. They exercise capture exactness/privacy, abandoned unsealed captures, offline replay/resume, missing-recipe coverage, private prepared/raw isolation, same-base parent advance, changed-base rejection and atomic publication rollback. The test database contains synthetic data only. No company source job, deployment, timer installation or rehearsal was run. Full-suite and company performance acceptance are not claimed. See the accompanying guard design and QA handoff for exact results.

## Company retention boundary — 23 October 2026

The owner authorized removal of live 2024 analytics data. The company purge removed 2024 accepted membership and corresponding raw/prepared populations while preserving 2025+ membership and bindings. Ordinary sync derives its earliest governed period from the baseline plus accepted fact coverage; Command initialization selects existing accepted Business months. Neither path should recreate the removed 2024 months. Do not restore those reporting partitions as an initialization prerequisite. Correctly dated 2025+ balance snapshots may still include debts originating earlier in Odoo; the read-only source is unchanged. The [maintenance record](../qa/company-storage-retention-2026-10-23.md) owns the recovery point, deletion scope, storage results and outstanding sync validation.

## Company operation — 23 October 2026

Ordinary sync is restored on company release `748019930070afed4625f6a6026eb60f747ab77e`: the saved catch-up candidate published with zero reconciliation mismatches, a fresh ordinary cycle completed in about ten seconds, and the ordinary sync timer is enabled. The first supervised Command background unit sealed the current-month invoice capture in 7.8 seconds. Its separate timer is enabled and advancing saved replay pages. New Command capability publication and historical background completion remain pending; an operational source cursor advance does not imply those recipes are fresh. Daily reconciliation remains paused. Exact run IDs, cutoffs, counts and timings are in the [company sync record](../qa/sync-seal-identity-correction-2026-10-23.md).

## Bounded reuse and automatic failure pausing

A reused prepared dataset reports `prepared_binding`; the API may drain another cheap replay/binding unit within the same ten-unit/ten-second ceiling. Newly materialized preparation, a sealed preparation, source capture and publication return immediately to the scheduler. This batches metadata attachment without copying prepared cells or historical raw facts.

The shared systemd service uses [OnFailure](https://www.freedesktop.org/software/systemd/man/systemd.unit.html#OnFailure=) to activate `el-dabboos-analytics-pause@JOB.service`. The handler stops only `el-dabboos-analytics-JOB.timer`. It preserves the failed service result, logs and saved checkpoints; other job timers remain independent. Install the handler alongside the service template and reload systemd before enabling timers. A correction followed by an explicit successful supervised run is required before the operator restarts a paused timer.
