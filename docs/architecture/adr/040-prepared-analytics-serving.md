# ADR 040 — Prepared analytics serving

Status: user-directed prepared serving is active on laptop staging after exact validation of its existing coverage. Company deployment, company-scale acceptance and all-family automated source freshness remain open. Company rollout remains subject to the user's manual deployment workflow. Supersedes any proposed interactive fallback to raw history. ADR 039 remains the consistency boundary.

## Required architecture

Background preparation → exact validation → immutable prepared datasets → atomic publication → authorized dashboard reads.

All report families use this architecture. Source adapters supply governed inputs; report identifiers never select algorithms. Event datasets have daily/monthly states. Snapshot datasets have prepared cutoff populations, with their declared complete-or-delta source contract applied before policy filtering. Exact customer Finance snapshots already exist and are reused. Ratios retain their canonical operands; snapshots never add across dates. Serving may combine prepared cells for requested date ranges, as in the user's original daily-summary direction; historical reconstruction, raw-fact scans and repeated source-population reductions belong only to background preparation.

## Prepared grains and selection

The registry describes semantic kind, required operands, retained dimensions, business coverage, currency, definition and input publication. Prepare full governed dimension tuples, grand totals and reusable dimension rollups. A read can select a rollup only when it retains every grouping, viewer-filter and enforced-policy dimension. Daily cells cover partial month edges; monthly cells accelerate complete months. The fine-grain fallback is also prepared data, never raw source history. Preparation and serving preserve exact count/sum/min/max states and label-conflict evidence. Analysis and output paging reuse the existing governed implementation.

Snapshot preparation applies the versioned source contract in the background: complete observations replace their whole prior population, while dated delta observations resolve latest entity state. It then reduces the eligible population for the published cutoff points. Readers select an eligible prepared cutoff and never run latest-per-entity history searches. Complete Finance snapshots retain their explicit zero/empty rules; positive debt remains a separate canonical definition. Metric/currency/UOM and missing/zero semantics remain governed by existing catalogs and controls.

## Publication, refresh and storage

Prepared membership references the existing immutable input revision. Initial coverage is built and verified before activation. Once activated, a source publication cannot become trusted before its required prepared coverage is validated. Failed preparation leaves the previous trusted release available. Backdated edits invalidate affected event dates and dependent snapshot preparation signatures. A later complete observation remains its accepted whole population until that source cutoff is revalidated; rebuilding old mart data does not prove fresh later source observations. Current-only observations do not fabricate past inventory.

Unchanged data members are reused. New validation evidence records the observed source cutoff separately from the original data extraction watermark. No-change detection must compare complete canonical populations and exact states, not summary totals alone. Preparation is bounded and resumable; it does not insert a full new copy merely because a lease timestamp changed.

The implementation will use additive PostgreSQL tables with forced tenant RLS and immutable contents, through existing role and publication boundaries. No source write, permission expansion, new external database/cache, or existing-table rewrite is part of this design. Storage and write amplification must be measured before company application.

## Acceptance and anti-drift gate

Inventory every currently exposed metric, grouping, filter/policy dimension, supported cutoff and analysis. Verify prepared coverage before cutover. Compare exact sums, entity/detail populations, dates, labels, null/zero, credits, maturity fallback, UOMs, attribution changes, history corrections and immutable membership. Check all reports rather than one improved report. Measure complete dashboard cold/warm and representative concurrent loads; routine three-second and heavy five-second targets remain goals until demonstrated.

Runtime readers must not import raw-history reconstruction or source readers. Add an architecture assertion for that boundary. A missing prepared capability reports a preparation/coverage condition; it never silently selects an expensive raw-history path. Keep the installed release unchanged until the replacement has the required coverage and approval.

## Implementation and operational gate

Historical local attempts before the final workspace implementation: migration 053 is additive; after disposable synthetic verification the user explicitly approved its application to local staging. Original local data/manifest fingerprints were preserved. Initial real-data preparation hit the 120-second exact-cell proof deadline and rolled back; prepared serving remains inactive. Migration 054 subsequently applied to local staging with explicit user approval, retaining exact content/cardinality and independent source controls. Original local data and manifest fingerprints remained unchanged; the bounded retry also timed out in the new exact proof and its first chunk rolled back completely. Zero prepared datasets, bindings, seals or activations were accepted. Serving remains inactive and no prepared real-data performance claim is established. `PublishedAnalyticsRepository` chooses the installed reader until an explicit tenant activation, then chooses `PreparedAnalyticsRepository` with no error fallback. Publication hooks prepare before the trusted pointer changes. Preparation and activation are separate bounded protected-operator actions; database and revision are explicit rather than inferred from developer defaults. The full evidence, compatibility gaps, temporary-storage limitation and all-family source-freshness work are recorded in [the QA artifact](../../qa/prepared-serving-2026-10-17.md). A green synthetic matrix is insufficient to authorize cutover.

### Approved snapshot population correction

On 17 October 2026 the user explicitly approved correcting complete-versus-delta population behavior. Population mode belongs to the versioned source-family contract and immutable prepared configuration. Complete review/business/Finance observations replace absent identities using accepted cutoff controls, including controlled empty observations. The canonical dated facts protocol retains declared delta carry-forward. Missing source evidence is never an implicit zero. The background binding guard independently reconciles stored total cells/counts to accepted complete-population controls in addition to its exact materialization comparison. Empty date maxima and zero-denominator ratios remain null. No source writes, staged activation or retroactive fabricated observations follow from this approval.


## Current local acceptance and company release gate

Migration 055 freezes each chunk in controlled transaction-private tables, analyzes/indexes validation intermediates and checks exact contents against independent canonical populations before immutable persistence. Completed chunks are persistent checkpoints; private tables are not resumability state. The protected ingestion login retains no general TEMP privilege and runtime cannot invoke build functions.

All 43 local chunks completed and the revision was sealed and explicitly activated under the user's instruction to deliver a working local staging. All 27 available reports executed successfully; 22 were bit-exact against legacy values and five differed only by legacy floating-point summary accumulation. All 11 affected metric/cutoff combinations matched independent accepted source controls exactly, without a tolerance. Existing metadata, original record counts and manifest membership were preserved. Activated local backend execution measured 23–1,098 ms, not a company SLA. See [the completed local evidence](../../qa/local-prepared-serving-2026-10-17.md).

The existing timer follows deployed code and verifies schema/roles but refreshes only operational facts/reconciliation/sweep. Preparing a changed mart publication does not refresh the source evidence for exact Finance, review or business. Per-family automated freshness, unchanged-population reuse and historical correction dependency coverage remain separate release work. Do not claim all-dataset freshness or install repeated monthly exposure as a shortcut. Obtain [company storage/coverage/timer preflight](../../qa/company-prepared-release-preflight-2026-10-17.md) before planning that environment's initial preparation/cutover.

## Scoped binding correction under local verification — 18 October 2026

Company bootstrap stopped after eleven Business-event chunks. Existing PostgreSQL
logs place the 120-second statement timeout at the final binding statistics check;
all preceding trigger work shares that INSERT deadline. A committed April
comparison measured the count at 1.583 seconds and the input signature at 0.003
seconds, while the unrelated snapshot-history uniqueness check exceeded its
15-second diagnostic bound. These are not measurements of the failed transaction's
fresh cells or its exact-cell proof.

Forward migration 057 limits snapshot identity validation to actual snapshot
bindings and retains event exact-content/count validation. Optional preparation
step observations expose start/completion/failure, duration, declared grain and
safe SQLSTATE classifications through the protected CLI. They omit SQL, argument
values, raw errors and customer data. A completed binding step remains provisional
until the transaction commits; only the existing committed-chunk callback is a
durable checkpoint. No company cutover or throughput claim follows from this
local correction. Grains, snapshot population semantics, security boundaries and
all-family freshness work are unchanged.


## Event membership selection candidate — 18 October 2026

Forward migration 058 pushes the event date range into Review/Business monthly
membership selection before reading fact operands. Accepted partitions already
require each fact's business date to belong to its partition month. The exact
business-day predicate remains for partial edges. The original canonical input
reader remains the independent validation source; Facts and Finance populations
and all snapshot-history selection retain their existing path. No grains, stored
cells, signatures, deadlines or activation settings change.

Local targeted PostgreSQL verification passed 19 tests; the complete required
release suite subsequently passed 335 PostgreSQL tests and 935 regular tests.
Coverage includes 492 synthetic
metric/grouping comparisons across four families, independent exact proof,
complete/delta/empty snapshots, resume, tenant isolation and controlled workspace
security. The new source-selection test compares exact multisets for full and
partial event periods and historical snapshot cutoffs over old/new publications.
This establishes local correctness, not company preparation throughput. Company
May input comparison and population-stage timing remain required before claiming
that this candidate improves the measured 109-second population stage. No full
company preparation or activation follows from these local checks.


## Complete snapshot observation selection candidate — 18 October 2026

Forward migration 059 selects each complete Review/Business snapshot measure's
latest accepted observation before reading its certified monthly partition and
exact day. It retains duplicate operands, per-measure observation dates and the
existing independently controlled empty markers. Missing observations remain
unavailable. Facts delta carry-forward, Finance, event preparation, original
canonical readers and independent proofs are unchanged; no new grain, index,
source contract, deadline or activation behavior is introduced.

The protected company read-only proof compared every column and duplicate against
the canonical population across all 30 accepted observations on one pinned
publication: 122404 rows, zero differences including the empty marker. The candidate
full population SELECT measured 1.584 seconds after that comparison. This is source
selection evidence, not full preparation or a serving SLA. The reviewed next gate
is the failed Business cutoff's full rollback rehearsal after separately approved
normal deployment. Full-history bootstrap and activation remain excluded. See
[the exact evidence and boundaries](../../qa/prepared-complete-snapshot-selection-2026-10-18.md).

## Explicit reporting window candidate — 18 October 2026

The user narrowed company reporting to calendar years2025–2026, retaining2025
for later2026year-over-year comparisons. Forward060registers a tenant-scoped,
immutable month-aligned reporting window before any prepared revision is sealed
or serving activated. Unsealed checkpoints can already exist and are retained;
registration does not rewrite their contents or native publication membership.
The protected registration operation holds the established tenant writer lock
before starting a READ COMMITTED transaction. The database requires that isolation
level, checks the current input revision and rejects registration after any seal
or activation, including stale repeatable-read lifecycle requests.

Chunk discovery uses only accepted metadata. It excludes out-of-window event
chunks, but retains each family's latest earlier snapshot as an opening anchor.
Runtime capability periods, explicit query ranges, dimension discovery and
comparison slots obey the same reporting window. Earlier opening snapshots can
still supply balances for an eligible2025cutoff without exposing2024report slots.
An opening-only latest-snapshot release retains its original source authority;
it is not silently replaced by Facts. A2026comparison can read prepared2025
operands; a comparison reaching2024remains unavailable. Certified source analysis
capabilities are not widened by this registration.

This candidate does not delete native source rows/history, fabricate opening
balances, activate serving or implement remaining source freshness schedules.
Deletion of the seven approved unused2024Business-event prepared datasets was a
separate scoped maintenance operation; all77new checkpoints were preserved.
Company registration/deployment and full prepared report acceptance remain open.

The completed local candidate passed all935regular tests and345PostgreSQL tests
(nine new scope tests), zero failures/skips, plus frozen install, lint,
architecture/quality/types, API/web build and diff gates. This is local synthetic
acceptance, not company registration, source freshness or serving activation.

## Acceptance correction candidate — 19 October 2026

Company acceptance failed: 6 of 27 supported reports passed, with returned-row
and metadata differences as well as regressions. Serving remains inactive in the
recorded evidence. Local fixes do not supersede that failed company acceptance.

The request adapter now builds one immutable publication projection per execution
scope. Every cell selection still verifies the pinned live revision in its own
read-only tenant transaction, and the executor verifies publication again at the
end. The scope binds the complete actor context; fresh requests and different
policies receive fresh projections. Returned release metadata is cloned so result
mutation cannot change another series' authorization or provenance.

Synthetic reconciliation demonstrated two defects in the original Review/Business
snapshot reader: categorical reads carried settled identities across complete
observations, and summary reads added decimal balances using binary floating point.
The candidate selects the latest accepted complete observation per required measure
before applying filters, including explicitly controlled empty observations. Summary
operands aggregate as exact SQL decimals before bounded numeric conversion and
ratio calculation. The summary and categorical paths share population selection.
Facts delta semantics and Finance snapshot selection remain unchanged. No stored
prepared cells, registry, migration, source recipe or business formula changes.

The user selected a strict release gate: prepared first and repeat executor times
must each be no slower than the same-report baseline, in addition to the existing
5-second first / 3-second repeat limits, exact result equality and stable repetition.
This gate is implemented in both the bounded diagnostic and the updated full-report
acceptance helper. Previously emitted company commands retain their historical gates. No coverage or release metadata is
excluded from equality. Reporting-window provenance differences still require
paired company evidence and an explicit expected contract.

See [local investigation and remaining acceptance gates](../../qa/prepared-acceptance-fixes-2026-10-19.md).

Before the diagnostic and JIT follow-ups, the local candidate passed 938 regular
and 351 disposable PostgreSQL tests,
zero failures/skips, frozen install, lint, architecture, quality, types, API/web
build and diff checks. The purpose-report fixture supports 17 reports; company
acceptance of 27 reports, its strict latency gate and freshness remain open.
No CI, push, merge, company deployment, preparation or activation was performed.


### Prepared runtime JIT overhead — company plan evidence

The bounded company on/off/on probe demonstrates disproportionate JIT overhead
for indexed product-detail, customer-debt-detail and scalar debt reads: cached
native execution took 1090.000 / 1114.884 / 876.503 ms, versus 5.300 / 12.213 /
0.894 ms with JIT off in the same transaction. Access structure and actual cell
counts remain unchanged; native plans compile 108 / 108 / 91 functions.
PostgreSQL enables JIT from estimated plan costs, which here are high despite
small selected populations. These are individual SQL measurements, not report SLA
or full-catalog acceptance.

Prepared repository execution now disables JIT with transaction-local
`set_config('jit','off',true)` inside its existing read-only tenant transaction.
The database restores the prior connection setting on commit/rollback. This
policy applies to bounded prepared result execution through both direct and
request-scoped calls. RLS, tenant/revision guards, timeouts and exact calculations
retain their existing behavior. Native source preparation, baseline execution and
other runtime transactions retain their prior JIT configuration. The low-level
selection helper has no global setting policy, so controlled plan probes remain
possible. Larger future prepared workloads should remeasure this scoped policy
before relying on different JIT behavior.

The PostgreSQL regression forces an enabled session with zero JIT cost threshold,
checks zero compiled functions at actual prepared cell statements, compares full
results, verifies pooled-setting restoration after success/failure, and exercises
foreign-tenant refusal. Company report-level remeasurement and release acceptance
remain open; no deployment or activation follows from these SQL timings.


A subsequent two-report company experiment disabled JIT only on dedicated
read-only diagnostic prepared connections, retaining JIT on for the installed
baseline. Debt first/repeat fell to 1334.371 / 1146.844 ms (baseline 19249.347 ms);
product first/repeat fell to 900.176 / 829.578 ms (baseline 977.670 ms). Both pass
the strict timing gates in that run; product results match exactly. Independent
controls again validate all five checked prepared debt measures, while the old
uncorrected baseline still differs. This experiment uses the old installed image
and does not deploy the candidate, accept all 27 reports, or establish timing
against the corrected debt baseline. See the QA evidence for settings scope and
remaining release gates.


Final local JIT-candidate verification passed 353 PostgreSQL tests (zero failures
or skips), the 944-test full regular suite, ten focused diagnostic tests, frozen
install, lint, architecture, baseline-aware quality, types, API/web build and diff
gates. The diagnostic guard added after the regular run is covered by the focused
tests. This remains a local candidate with manual company diagnostic evidence, not
deployed release acceptance.


Full-catalog acceptance now derives only reporting eligibility dates from the
registered window and retains the complete native diff separately. Source cutoff,
opening snapshot, source/certification authority, labels and every data field
remain exact. Four focused tooling tests and three real PostgreSQL window checks
passed; the final release-packaging regular suite passed 949 tests. Product source
is unchanged from the full 353-test PostgreSQL run. See the [rollout plan](../../qa/prepared-reports-rollout-2026-10-19.md)
for the exact deployment, acceptance and separately approved activation sequence.
