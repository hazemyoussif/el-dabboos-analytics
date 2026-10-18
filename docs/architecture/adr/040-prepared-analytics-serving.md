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
