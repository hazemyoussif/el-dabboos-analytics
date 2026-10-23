# Independent Command preparation

Code implementation with focused synthetic verification; not company deployment or performance evidence.

Ordinary operational sync must never initialize Command recipes, enumerate historical Business members for initialization, or wait for Command background preparation. It retains the existing operational capture/reconciliation/cursor lifecycle. Business observations remain independent; an operational cursor advance is not Business freshness evidence.

## Separate lifecycle

`analytics command-background --tenant ID` is a separate awaited operator command. Its scheduler invokes one source-capture, prepared-chunk or publication unit. The API may drain at most ten canonical replay pages within a ten-second budget; it never loops over historical months in one invocation. Coverage is discovered from the trusted manifest and registered recipe observations. Missing current-period recipes precede older gaps. Published capabilities include only measures with complete source evidence. Previously accepted raw/prepared data remains the serving authority until atomic publication.

A missing recipe is captured into private pages under one live exported read-only source snapshot. Page writes commit separately. Capture seals only after independent source controls match, with contiguous page/count/identity/lineage checks. If the source owner is lost, its unsealed recipe capture is abandoned and recaptured from a new snapshot. Page checkpoints do not recreate an expired PostgreSQL snapshot. A sealed capture resumes offline without resolving source credentials.

Canonical persistence, prepared chunk work, and publication are separate phases. Preparation reuses accepted datasets and sparse Business ancestry. A final publication must retain the latest other-family membership and reject a changed Business base. No partial capture or prepared candidate may become visible to the runtime. Missing measures remain unavailable rather than fabricated zeroes. Each phase reports safe stage/count/duration metadata.

## Scheduling and locks

`el-dabboos-analytics@sync.service` remains ordinary sync. The separate `el-dabboos-analytics-command-background.timer` targets `el-dabboos-analytics@command-background.service`. It triggers another unit after the previous invocation exits; service deadlines are unchanged.

The background wrapper holds a dedicated background-instance lock. It defers at entry if the ordinary analytics file lock is held, then releases its brief ordinary-lock probe. It does not hold the ordinary file lock during private source capture. Database phases retain tenant locks and publication CAS. Each worker invocation must do one bounded phase and return, allowing ordinary work between units. After current initialization, already published Command measures use scoped root-change discovery for one month per unit. A separate scheduling check records when that month was examined; metric freshness still comes from accepted recipe observations. Explicit `sweep --mode allocations` is routed to the background path. Missing allocation dependency inventory remains a distinct dependency step, reported separately; it is not financial-history preparation.

Background containers carry their own label and database sessions use `PGAPPNAME=el-dabboos-analytics-command-background`; ordinary sessions use `el-dabboos-analytics-sync` or the actual job name.

Deployment must stop both existing analytics timers and the new background timer, and confirm no containers carrying either `el-dabboos.staging.analytics-job=true` or `el-dabboos.staging.command-background=true` remain active before migrations/replacement. Do not run an older deployment script that only checks ordinary job containers once this worker is installed. Start ordinary sync and one background unit under supervision only after the complete code/schema changes have been reviewed and verified; then enable their separate timers.

## Evidence

The owner approved focused synthetic PostgreSQL tests. They exercise capture exactness/privacy, abandoned unsealed captures, offline replay/resume, missing-recipe coverage, private prepared/raw isolation, same-base parent advance, changed-base rejection and atomic publication rollback. The test database contains synthetic data only. No company source job, deployment, timer installation or rehearsal was run. Full-suite and company performance acceptance are not claimed. See the accompanying guard design and QA handoff for exact results.
