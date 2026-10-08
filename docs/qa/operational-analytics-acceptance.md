# Operational analytics v1 acceptance — October 8, 2026 Cairo

## Commits and ownership

Foundation: `c6b381b` — `feat(analytics): establish operational sync foundation`.
Its 22 files cover domain impact/job contracts, application lifecycle, migration
026, PostgreSQL evidence/cursor/status helpers, API/CLI status composition, overlap
watermark tests, and the foundation documentation/handoff. The exact file list is
available with `git show --stat c6b381b`.

Implementation: `d4a9925` — concrete incremental source synchronization (13 files);
`e8ec5bf` — trusted lifecycle, affected aggregates, sweep and operator commands
(25 files). Verification/evidence is a separate local commit. Pre-existing
historical/UI changes and `.archify/` are preserved outside the operational
commits. This implementation was verified in the current historical checkout;
several historical adapter/migration dependencies remain pre-existing uncommitted
work. A standalone checkout deployment requires that baseline to be committed
separately. No push or merge was performed.

## Live incremental acceptance

The operator-provided protected environment selected the actual published local
staging mart, rather than the empty development mart. Migrations 027–030 and direct
staging role grants were applied. Initial explicit bootstrap copied 178,002
certified facts and twelve October 2025–September 2026 partitions into separate
operational storage, with source cutoff `2026-10-07T15:38:27.277Z`. The original
certified September binding/history were retained.

Successful real sync `e8aa1419-8f4e-4e02-b97a-c22358100f73`:

| Item | Result |
|---|---|
| Source cutoff | `2026-10-07T23:03:43.456Z` |
| Previous cutoff | `2026-10-07T15:38:27.277Z` |
| Modified headers discovered | 12 |
| New-month source records seeded | 141 |
| New distinct source identities | 141 |
| Existing identities updated | 0 |
| Canonical revisions | 513 |
| Raw affected partitions | 495 |
| Exact source/mart cases | 202 |
| Mismatches | 0 |
| Refreshed months | October 2026 only |
| Trusted revision | `7c752b1f-f1f4-46e8-b5eb-65ad79d8dc54` |
| Total duration | 29,184.41 ms |
| Ingestion | 22,371.35 ms |
| Reconciliation | 4,506.72 ms |
| Aggregate refresh | 18.13 ms |

The new-month seed is necessary: reading only changed October headers would omit
previously created October records outside the last modification window. An
initial 41-case candidate exposed that incompleteness with 27 mismatches and
correctly preserved the trusted pointer/cursor. The bounded month hydration
resolved it, without rebuilding twelve existing event months. Failed cases remain
stored for investigation. Detailed immutable evidence hashes and version/cursor
metadata are in [the sanitized JSON record](operational-analytics-acceptance.json).
That record excludes dimension/customer identities and labels from source cases.

The normal operator commands and exact protected-file invocation are documented
in [operational v1](../integration/operational-analytics-v1.md). No LLM runs in the
source/job/impact/reconciliation/serving path.

## Cursor and idempotency

Immediate fresh-cutoff rerun: `9ee6d5c4-52ec-4f35-bae9-329c474778e2`, 20,936.31 ms,
zero discovered rows, new/updated identities, canonical revisions or refreshed
partitions. Object watermark positions remained unchanged; the successful cutoff
advanced normally. This was a new retained snapshot, not an identical cutoff.

An additional **identical bounded snapshot** replay used two retained handles:
`6d926c9b-24b4-4434-b550-4f86480c46bb` and
`e7ba3f5d-624c-4c30-b371-c9d2b68dcc82`. Both used cutoff
`2026-10-07T23:37:53.466Z` and the same MVCC revision. Both were unchanged, with
zero new/updated rows, revisions or refreshes. The second preserved the exact
first cursor and trusted manifest. Durations were 22,389.39 and 26,112.41 ms.
The adapter's retained-handle cleanup is also tested against a real synthetic
read-only PostgreSQL source.

## Historical corrections and failures

Automated PostgreSQL fixtures drive the concrete source discovery and concrete
mart transaction adapter. A January business record with an October write date
is discovered and promoted into January serving. The test checks January value,
only January refresh, immutable original certificate count and identical replay.
A business-date/dimension move invalidates old January/Cairo and new February/
Baghdad footprints, refreshes exactly those two months and retains both revisions.
Snapshot tests select February's balance rather than adding January and February.
An approved ratio fixture proves `(100 + 900) / (1 + 3) = 250`, rather than the
monthly-average result `200`.

Injected mart write, exact reconciliation, aggregate write and mid-discovery
interruption failures preserve the previous trusted pointer and successful
cursor. Failed cases persist after candidate rollback. Source closure failure
also rolls back before mart commit. A failed daily run retains exact evidence
without requiring an ingestion savepoint. Tenant-b runtime reads cannot see
Tenant-a aggregates. Migration and source fixtures exercise forced RLS, runtime
read-only privileges, explicit read-only source transactions and expired leases.

Live sweep initially expired safely under the original lease. Measured query
optimization then completed the sweep without increasing any deadline. Synthetic
missing-identity tests verify tombstones, old immutable revisions, old business
footprints and no sync-cursor advancement. Date-less ineligible drafts also retire
existing contributions without inventing a business date.

## Live sweep and reconciliation

Sweep `c5f3508b-479f-4f82-8adf-7414a0a918fe`: cutoff
`2026-10-07T23:27:34.850Z`, 88,347.32 ms, unchanged. It checks distinct governed
sale-order/invoice IDs and all published receivable summary cutoffs. No missing
identity or changed snapshot produced a revision; the pointer and cursor remained.
This is live zero-deletion evidence; hard-delete behavior is synthetic fixture
coverage, not a source mutation performed for acceptance.

Daily `15e50a0c-aa25-4874-8671-ff21e02c0fe4`: cutoff
`2026-10-07T23:34:16.242Z`, 248 exact cases, zero mismatches, 79,228.05 ms.
Reconciliation itself took 73,918.65 ms. It covers twelve published snapshot
cutoffs and thirteen current event months; it refreshes nothing and does not
advance the sync cursor. Affected reconciliation is separately recorded in JSON.
Daily/deep v1 are complete **summary** profiles; they are not new business
certification or exhaustive categorical recertification. Changed categorical
partitions are checked by affected reconciliation.

## Query plans and performance

All plans used `EXPLAIN (ANALYZE, BUFFERS)` with unchanged tenant/source scope.

| Path | Before | After | Evidence |
|---|---:|---:|---|
| Synthetic 5,000-fact month reconciliation, selecting 100 | 14.927 ms | 0.406 ms | 15,051 → 304 shared hits; typed month/measure/status index |
| Actual local mart presence first page | 210.125 ms | 0.844 ms | 8,722 → 4 shared hits; distinct source-ID covering index |
| Actual source summary reconstruction | 8,181.523 ms | 1,566.692 ms | 5,875,755 → 1,418,949 shared hits; signed-effects summary joins |

The presence index follows a measured payload-probe path, not speculation. The
sweep now pages distinct source IDs and fetches payloads only for missing ones.
Receivable summaries avoid repeatedly transporting all component rows and
joining all counterpart context. Full counterpart quality still runs once for
the retained published scope; canonical and independent Finance summary
reconstructions remain distinct and exact. A hash-join preference was measured
and rejected because it did not improve latency; no optimizer setting change is
shipped. Batched event controls scan requested months once per measure/grouping.
Source statement timeout remains 15 seconds; the lease remains 120 seconds.

Representative backend reads, first/warm on an already running database:

| Range/report shape | First | Warm |
|---|---:|---:|
| September monthly net invoice | 30.70 ms | 6.15 ms |
| Six-month monthly net invoice | 14.82 ms | 13.64 ms |
| Twelve-month monthly net invoice | 58.79 ms | 25.12 ms |
| September business-line order revenue | 161.73 ms | 120.19 ms |
| Six-month business-line order revenue | 128.58 ms | 132.96 ms |
| Twelve-month business-line order revenue | 165.87 ms | 176.40 ms |
| Snapshot summary, all three ranges | 4.03–4.62 ms | 3.41–3.81 ms |
| September customer aged balances, all 2,217 | 2,383.18 ms | 2,229.61 ms |
| September customer overdue percentage, all 2,217 | 2,587.09 ms | 2,729.87 ms |
| Stored status | 7.02 ms | 2.20 ms |

These are individual backend query timings, not full browser/dashboard/network
latencies or a database cold-cache claim. The JSON additionally records a final repeat while regression suites contended
for CPU: complete customer first reads were 3.06–3.63 seconds, warm 2.43–2.71
seconds; status 10.10/2.51 ms. No cold-cache or isolated-load claim is made.
Customer outputs use the independently
pinned original September release and cached positive proofs only. They are not
incrementally refreshed by the Phase-A summary adapter. Future component-level
operational promotion remains a scope limitation, explicitly documented.

All September anchors remain exact: net invoice 1,447,166,500; posted invoice
1,465,712,000; refund 18,545,500; order revenue 1,461,335,500; order count 2,895;
net aged receivable 1,359,461,092.61 IQD. Six-/twelve-month totals and full-period
ratios, with the latest eligible September snapshot, are recorded in JSON.
Synthetic correction, affected reconciliation and refresh timings are included
separately; those small fixtures are not production throughput claims.

Final guarded live sync `b9d983de-1530-4906-b590-9e3ea4241390` completed in
21,646.23 ms at cutoff `2026-10-08T00:21:08.728Z`: zero discoveries, revisions,
refreshes or mismatches, unchanged trusted revision, and unchanged object tuple
positions. Only the successfully completed cutoff advanced. Its CLI output
contains scope counts/months/metrics/dimensions rather than partition identities.

Final serving regressions also verify business-timezone coverage at a UTC date
boundary, period-scoped categorical keys and returned-key-only labels, rejection
of a changed reporting currency or executable metric definition, and removal of
capabilities lacking an enforced policy dimension. Missing cached anchor proof
fails closed. These guards require explicit certified migration rather than
silently rewriting an immutable baseline.

At the final status capture the successful cutoff was 59 seconds old against
a 600-second target, with no pending failed candidate. The older technical-failure
audit remains visible as history; subsequent daily reconciliation passed. Final
guarded reads still return all 2,217 customer rows: aged balance first/warm
3,089.56/2,380.69 ms; overdue percentage 2,862.23/2,915.78 ms. Stored status took
9.59/3.03 ms. All timing samples are retained in JSON.

## Gates and operational limits

Frozen install passed with no lockfile change. Full suites: **698 unit/API/web and
159 PostgreSQL tests, zero failures or skips**. Lint, architecture, baseline-aware
quality, typecheck, builds and diff gates passed. Build retains the existing large web chunk warning. No quality baseline
was edited by this task. No UI work or visual QA was performed in this task.

The operator jobs are ready for future orchestration to invoke; no scheduler or
external service was created. Fixed overlap still requires a validated production
source transaction policy. Historical summaries conservatively recheck all
published snapshot cutoffs for receivable dependencies. Technical failure audits
record bounded operational metadata, not raw errors, credentials or source data.

Safety: source writes no; new and updated records detected yes (updated-record
behavior is fixture-proven); old-period corrections supported yes; business and
write dates kept distinct; no early cursor advancement, failed promotion,
discarded prior trusted state, immutable certification rewrite, runtime RLS bypass
or timeout increase. Hard deletes have a governed sweep. No online staging,
external CD, push or merge. Runtime sync/reconciliation/serving LLM dependency =
zero.
