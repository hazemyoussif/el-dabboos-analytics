# Independent Command preparation

Code implementation with focused synthetic verification. Company operational evidence is recorded separately below.

Ordinary operational sync must never initialize Command recipes, enumerate historical Business members for initialization, or wait for Command background preparation. It retains the existing operational capture/reconciliation/cursor lifecycle. Business observations remain independent; an operational cursor advance is not Business freshness evidence.

## Separate lifecycle

`analytics command-background --tenant ID` is a separate awaited operator command. Its scheduler invokes one source-capture, prepared-chunk or publication unit. The API may drain at most ten canonical replay pages or reused binding metadata units within a ten-second budget; it never loops over historical months in one invocation. Coverage is discovered from the trusted manifest and registered recipe observations. Missing current-period recipes precede historical windows required by the overview. Automatic capture and refresh use the domain-owned prior-month invoice comparison, four prior same-weekday cash observations and six Saturday-start order weeks. Only invoice, receipt or order recipes needed by those windows are added to an accepted historical month; historical allocation and debt recipes are not added for this overview. Older Command history requires an explicit operator request. Current-month coverage retains all five recipes. Published capabilities include only measures with complete source evidence. Previously accepted raw/prepared data remains the serving authority until atomic publication.

A missing recipe is captured into private pages under one live exported read-only source snapshot. Page writes commit separately. Capture seals only after independent source controls match, with contiguous page/count/identity/lineage checks. If the source owner is lost, its unsealed recipe capture is abandoned and recaptured from a new snapshot. Page checkpoints do not recreate an expired PostgreSQL snapshot. A sealed capture resumes offline without resolving source credentials.

Canonical persistence, prepared chunk work, and publication are separate phases. Preparation reuses accepted datasets and sparse Business ancestry. A final publication must retain the latest other-family membership and reject a changed Business base. No partial capture or prepared candidate may become visible to the runtime. Missing measures remain unavailable rather than fabricated zeroes. Each phase reports safe stage/count/duration metadata.

## Scheduling and locks

`el-dabboos-analytics@sync.service` remains ordinary sync. The separate `el-dabboos-analytics-command-background.timer` targets `el-dabboos-analytics@command-background.service`. It triggers another unit after the previous invocation exits; service deadlines are unchanged.

The background wrapper holds a dedicated background-instance lock. It defers at entry if the ordinary analytics file lock is held, then releases its brief ordinary-lock probe. It does not hold the ordinary file lock during private source capture. Database phases retain tenant locks and publication CAS. Each worker invocation must do one bounded phase and return, allowing ordinary work between units. After current initialization, already published Command measures use scoped root-change discovery for one month per unit. A separate scheduling check records when that month was examined; metric freshness still comes from accepted recipe observations. Explicit `sweep --mode allocations` is routed to the background path. Missing allocation dependency inventory remains a distinct dependency step, reported separately; it is not financial-history preparation.

Background containers carry their own label and database sessions use `PGAPPNAME=el-dabboos-analytics-command-background`; ordinary sessions use `el-dabboos-analytics-sync` or the actual job name.

Deployment must stop both existing analytics timers and the new background timer, and confirm no containers carrying either `el-dabboos.staging.analytics-job=true` or `el-dabboos.staging.command-background=true` remain active before migrations/replacement. Do not run an older deployment script that only checks ordinary job containers once this worker is installed. Start ordinary sync and one background unit under supervision only after the complete code/schema changes have been reviewed and verified; then enable their separate timers.

## Evidence

The owner approved focused synthetic PostgreSQL tests. They exercise capture exactness/privacy, abandoned unsealed captures, offline replay/resume, missing-recipe coverage, private prepared/raw isolation, same-base parent advance, changed-base rejection and atomic publication rollback. The test database contains synthetic data only. Those initial results cover synthetic verification only. Later company deployments and measured operation are recorded separately below; a full-suite or rehearsal pass is not claimed. See the accompanying guard design and QA handoff for exact results.

## Company retention boundary — 23 October 2026

The owner authorized removal of live 2024 analytics data. The company purge removed 2024 accepted membership and corresponding raw/prepared populations while preserving 2025+ membership and bindings. Ordinary sync derives its earliest governed period from the baseline plus accepted fact coverage; Command initialization selects existing accepted Business months. Neither path should recreate the removed 2024 months. Do not restore those reporting partitions as an initialization prerequisite. Correctly dated 2025+ balance snapshots may still include debts originating earlier in Odoo; the read-only source is unchanged. The [maintenance record](../qa/company-storage-retention-2026-10-23.md) owns the recovery point, deletion scope, storage results and outstanding sync validation.

## Company operation — 24 October 2026

Company API `09d411ea3a05f81d93152dda7cdae9838ba3a143` is healthy; the existing web image is retained. All five current-period recipes published. Ordinary sync passed on this release, daily run `d3fc99b4-4311-4406-adca-f62a78d1fbdb` passed 428 cases with zero mismatches, and its operational presence sweep completed unchanged. All three timers were restored after supervised completion. A subsequent September preparation timeout paused only the Command timer; ordinary sync and daily reconciliation remain scheduled while that saved chunk is corrected.

The current Business delta replaced 26 identities and persisted 82 fact rows while retaining accepted ancestry. It completed in 234.383 seconds. The separate allocation presence unit passed in 119.462 seconds after changing repeated inventory reconstruction to a transaction-owned cursor. A read-only company measurement under the ingestor read all 148,314 recorded IDs in 149 pages in 6.029 seconds. Source presence, prior-link requirements, tenant scope, source leases and exact publication proofs remain enforced. See the [cursor release evidence](../qa/allocation-presence-cursor-2026-10-24.md).

The report visibly shows renewed source observations at 09:36 Cairo time on October 24. September's new recipe coverage is advancing separately for prior-period comparisons and the six-week order chart; older gaps do not block ordinary sync or already accepted report measures. Finance review is still pending.

## Bounded reuse and automatic failure pausing

A reused prepared dataset reports `prepared_binding`; the API may drain another cheap replay/binding unit within the same ten-unit/ten-second ceiling. Newly materialized preparation, a sealed preparation, source capture and publication return immediately to the scheduler. This batches metadata attachment without copying prepared cells or historical raw facts.

The shared systemd service uses [OnFailure](https://www.freedesktop.org/software/systemd/man/systemd.unit.html#OnFailure=) to activate `el-dabboos-analytics-pause@JOB.service`. The handler stops only `el-dabboos-analytics-JOB.timer`. It preserves the failed service result, logs and saved checkpoints; other job timers remain independent. Install the handler alongside the service template and reload systemd before enabling timers. A correction followed by an explicit successful supervised run is required before the operator restarts a paused timer.

## Continuation timer accuracy

The five-second post-completion interval uses `AccuracySec=1s`. systemd otherwise defaults to a one-minute coalescing window, which the company host confirmed and which introduced unnecessary delays between saved units. This changes only scheduling accuracy, not the per-unit budget, writer locks, source checks or service deadline. See the [systemd timer documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html#AccuracySec=).

## Pending ordinary prepared-update correction — 24 October 2026

Company jobs and all three timers were stopped at the owner's request. Migration 094 and the shared `prepared/changed-cells.ts` builder are local implementation only; they have been verified on isolated synthetic PostgreSQL 18.6, but have not been deployed or measured on the company database. No additional job, persistent table or publication state is added.

Ordinary fact preparation uses the same replacement-key/cell storage already used by Command preparation. It compares the old and new base populations projected into each configured group. Only changes to values, dates, eligibility or that group's assignments require numeric reduction. A label-only difference retains the accepted numeric value, count, extrema and data-through date and calculates that group's labels. Changed values or assignments replace both old and new groups; an empty replacement removes the old output. All unrelated prepared cells remain inherited.

The existing reader and exact binding guard are extended to ordinary facts. A complete independently derived replacement-key set and exact replacement contents are still required, with matching sealed parent, tenant, source configuration and logical row bounds. The accepted parent remains immutable. Snapshot selection remains latest-per-entity and rejects ambiguous observations; cutoff changes compare the old and new populations. Unchanged output groups can reuse their accepted dataset and its actual observation date, even when the containing monthly base receives a new identifier.

This correction narrows prepared writes. Ordinary source discovery, independent source controls and monthly aggregate/drill validation remain in the existing flow. Initial preparation without a compatible accepted parent retains the existing full initialization path. No company job, source read, deployment or rehearsal has been started for this correction. The owner subsequently approved focused synthetic verification after coding was complete.

### Approved verification for migration 094

Twenty focused PostgreSQL cases passed: six new cases covering label-only numeric preservation, affected-group/period reuse, successive value/date/assignment corrections, cross-month movement and deletion, detail/observation-only reuse, snapshot selection and duplicate rejection; plus fourteen existing Command replacement-key, rollback, checkpoint/privacy and source-free resume cases. New cases compare the effective prepared output with the independent complete canonical calculation and runtime base-reader results, and exercise dimension options and tenant isolation. Previously accepted cells are asserted byte-for-byte unchanged.

The combined run passed eighteen cases. The remaining two synthetic inputs were corrected (a duplicate transaction-label property and a missing declared dimension), then those two cases passed separately without further production-code changes. Earlier migration verification exposed a CASE syntax error and the existing parent guard's Business-only restriction; both were corrected before the combined run. This is correctness evidence on small synthetic populations, not a company throughput or deployment claim.

Changed-file ESLint, root TypeScript, architecture, quality and diff gates pass. No full suite, GitHub CI or local staging rehearsal was run. The temporary synthetic PostgreSQL service was removed after verification. Company schedules remain paused for owner review.

### Company bounded check — migration 094 not deployed

Code commit `1d13e206fb5e9a2f9db0763221adf7df8b22b24a` was pushed to the existing feature branch. A source-free, rolled-back check used the actual company migration owner and restricted ingestor identity for the first missing ordinary event period, December 2025, of saved capture `d789ac88-9da6-4dc2-9846-c2ee2a6231ac`. Its signature took 16.488 seconds; replacement-key construction took 19.618 seconds and produced 24,387 affected groups. The replacement-cell INSERT inside `materialize_fact_delta_cells` exceeded the unchanged 120-second statement limit. Exact binding and complete-output comparison were not reached.

The connection closed with the transaction aborted. A subsequent read-only check confirmed the temporary migration was absent and December had no new binding. No source access, accepted-data change, deployment, publication or sync restart occurred. All three schedules remain paused. This correction has synthetic correctness coverage but has failed company performance verification; it must not be presented as ready. Work stopped for owner consultation as requested when the same issue recurs.
