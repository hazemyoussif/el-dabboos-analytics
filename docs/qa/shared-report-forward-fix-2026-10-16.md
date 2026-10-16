# Shared report forward fix — 16 October 2026

Status: revised candidate passed both company runtime history preflights and the
final combined index/query rehearsal. All local release gates and company rehearsal/
restoration gates passed; the user approved push and merge. Publication is in
progress; manual company deployment and post-deployment QA remain pending. Its preceding combined
candidate was rejected. Nothing committed, pushed, merged or deployed. GitHub Actions
minutes used: zero. The broad compact-store experiment remains archived, excluded
from this candidate. Company currently remains on 74d7d48/schema 051.

## Accepted company index-only evidence

The operator used existing analytics data and the deployed SQL. Five exact result
sets matched; original index/heap/RLS/schema/serving state was verified after
ROLLBACK, then API and web restarted healthy on the same images.

| Selection | Current ms | Amount-only index ms |
| --- | ---: | ---: |
| Collections due Top 100 | 17470.849 | 6386.432 |
| History salesperson | 16283.681 | 15533.648 |
| History governorate | 15661.279 | 15247.157 |
| Customer debt balance | 7654.609 | 6965.121 |
| Monthly sales totals | 583.525 | 576.879 |

This restores the measured Collections deadline without observed slowdown in these
controls. Both histories still miss 15 seconds; this is not a complete history fix.
Index construction changes cache state, so one pair is not a latency guarantee.

## Combined local candidate

Migration 052 contains the exact index-only DDL from that rehearsal; no data
projection/table, heap rewrite or source reload is added. Failure after the old
index drop restores its original OID/file/definition, facts, controls, serving and
RLS, leaving the ledger at schema 051. Versions 49/50/51 upgrade tests preserve
existing state. Migration 051 and all earlier accepted bytes remain unchanged.

The shared categorical adapter resolves eligible trusted event partitions first
on the same repeatable-read transaction and binds their actual IDs. Previously
an unknown membership count severely underestimated history input. It then
materializes scalar grouping operands so full attribution JSON is not sorted in
the final aggregate. Required distinct-count dimensions and UOM evidence remain;
full-population numeric validity, labels, ratios, analyses and windows are preserved.
Snapshot date/entity selection and Top 100/paging algorithms are unchanged.
No report/metric/date/tenant exception or planner/timeout override is added.

A manual 60,000-event synthetic comparison used three months, 31 salespeople,
seven states and unique customer attribution. Exact rows, labels, flags, dates and
totals matched the deployed query. Candidate scans once, has no large attribution
sort, and estimated 59,700 rows versus 60,000 actual. Warm times were 87.699 ms
(salesperson) and 83.845 ms (state). These do not predict company performance.

Focused PostgreSQL runs: 16/16 and 8/8, zero skips (23 unique tests with history
repeated after the source-helper change). They cover populated migration upgrade
and rollback, snapshots/carry/zero/attribution, trusted scope, labels/UOM, policy,
nulls, global Pareto/rank, Unicode continuation and diverse historical groups.
The complete generated rehearsal also passed a separate synthetic safety test:
five exact comparisons against frozen deployed SQL on normal rollback, plus
restoration after an injected failure immediately after dropping the old index.
Quality and architecture report zero diagnostics; typecheck and lint pass. Final full
unit/PostgreSQL sweeps and build remain required before any push.

## Required company proof

The prepared combined rollback-only rehearsal embeds the exact local source
helpers in operator memory and compares against the actual deployed shared query.
It reuses existing tables and the tested index-only replacement in an uncommitted
repeatable-read transaction. Source/manifest/schema/permissions are never written.
All five candidate queries, including both histories, must now pass the existing
15-second deadline and match raw results exactly. Compare control timings too.
Original state must verify after rollback, followed by original-image health.
No company execution is authorized merely by preparing the command; obtain the
user's approval for this maintenance operation. Runtime-role/browser verification
and all-report QA remain separate deployment acceptance gates.

## Combined company rehearsal — rejected

The operator ran the combined rollback-only rehearsal on image 74d7d48, schema
051, against serving revision d3bb4553-ec5e-4a95-9415-f33a6c72a75c.

| Selection | Current ms | Combined candidate | Exact result comparison |
| --- | ---: | --- | --- |
| Collections due Top 100 | 17148.512 | 6142.766 ms; within 15-second deadline | Matched, 100 rows |
| History salesperson | 16109.643 | Cancelled at 15 seconds, SQLSTATE 57014 | Not completed |
| History governorate | 15167.563 | Not reached after cancellation | Not performed |
| Customer debt balance | 6072.690 | Not reached after cancellation | Not performed |
| Monthly sales totals | 599.424 | Not reached after cancellation | Not performed |

The estimated salesperson plan no longer contains the large attribution sort;
it estimates 474,402 input rows and still uses a high-cost heap-reading index
scan. This is an estimated plan, not actual node-level timing or buffer evidence.
Removing that sort and improving cardinality estimates did not establish a
history deadline fix. The combined candidate must not be released as successful.
The previously successful index-only rehearsal remains separate evidence; its
five exact comparisons do not substitute for the aborted combined comparisons.

The script reported originalIndexHeapRlsSchemaAndServingRestored=true after
ROLLBACK, and both original API and web images restarted healthy. No permanent
company migration, query deployment, source access or serving change occurred.
No further company operation, push, merge or deployment is authorized by this
failed result. Preserve the proven Collections correction while history remains
unaccepted; do not increase the application timeout or introduce report-specific
paths to accept this candidate.

## Revised event-only folding candidate — company proof pending

The failed candidate forced its single-use operands into a materialized CTE.
A disposable synthetic comparison of 60,000 diverse events found:

| Projection | Expression statistics | Execution ms | Temporary blocks written | Plan |
| --- | --- | ---: | ---: | --- |
| Materialized | Absent | 93.395 | 422 | Serial hash aggregation |
| Foldable | Absent | 61.154 | 0 | Parallel partial aggregation; two workers |
| Foldable | Present, experimental | 31.754 | 0 | Parallel partial hash aggregation |

All raw result comparisons matched. These are small warm synthetic runs, not
company latency estimates. Expression statistics and an offset projection fence
were exploratory controls only: neither is part of the revised candidate, and no
new statistics migration was created. Existing production schema changes remain
limited to the separately proven amount-only index replacement in 052.

The revised shared event operands use NOT MATERIALIZED; snapshot operands retain
MATERIALIZED. Their scope, full-population aggregation, label/UOM validity and
windowing remain unchanged. The history regression checks that any large sort
carries narrow scalar operands; parallel sorting is permitted rather than pinning
a specific aggregate algorithm. Eleven targeted PostgreSQL tests passed, zero
skips, including both snapshot paths, window/rank traversal, labels and UOM.
The revised history test recorded zero temporary writes and 46.375 ms locally.

The prepared company preflight uses the existing API container's dedicated runtime
login under REPEATABLE READ READ ONLY. No owner credential, table/index writes,
scratch copy, statistics update, Odoo contact or application restart is required.
It embeds the exact revised local helpers in memory. For each failed history it
captures one deployed result, one actual candidate plan, and one candidate result
at the unchanged 15-second deadline, comparing results without printing values.
The profile has a separate 30-second diagnostic bound and does not change the
application setting. Metadata time is separately reported and included in the
candidate duration. The unchanged current index is intentional: final combined
index/query verification remains pending even if this preflight passes.

The complete generated command passed synthetic safety validation against frozen
74d7d48 query code: both exact comparisons passed with unchanged state. An injected
CREATE TABLE attempt was refused with SQLSTATE 25006 by the read-only transaction;
state remained unchanged on that failure too. Shell and Node syntax checks pass.
No company execution, publish, merge or deployment has occurred for this revision.

Revised candidate local lint, typecheck, architecture, quality and diff gates pass.
Full unit/PostgreSQL/build release gates remain deferred until company proof; no
GitHub Actions run or CI minutes were used.

## Company runtime event-folding preflight — passed

The operator executed the revised read-only command on existing image 74d7d48
and the unchanged schema-051 index using the dedicated runtime role. Both exact
raw result comparisons passed under the original application deadline:

| Selection | Deployed query ms | Candidate SELECT ms | Membership ms | Candidate including membership ms | Rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| History salesperson | 12211.151 | 8082.902 | 53.495 | 8136.398 | 77 |
| History governorate | 11285.346 | 8028.305 | 54.499 | 8082.805 | 19 |

The separately instrumented plans completed in 6905.611 ms and 6605.797 ms,
respectively. Both launched two parallel workers under Gather Merge and reduced
821,265 input facts to the expected groups. This company evidence confirms
parallel execution; it does not confirm the local narrow-sort or zero-spill plan.
Each company plan still carries width-349 rows into external merge sorts and
reports approximately 100,540 temporary blocks written and 651,448 shared blocks
read at its root. Parent/child counters are inclusive; do not sum them. These
reads, disk sorts and JIT work remain real costs; no additional tuning is part of
this frozen candidate. Timing is one sequential comparison, not a concurrent
report-load or cold-cache guarantee.

The command reports two of two selections passed and
originalServingHeapIndexAndRlsUnchanged=true. No source connection, database write,
index/statistics update or service restart occurred. The proven amount-only index
and revised event query have not yet been exercised together on company staging.
No push, merge or deployment has been performed. Final combined verification and
post-deployment runtime/browser QA remain separate requirements.

## Final combined rehearsal preparation — local protocol validated

The regenerated command embeds the frozen revised query helpers and includes
membership-preparation time in each candidate's 15-second acceptance duration.
The protected owner, exact database/schema/index/image and scratch/WAL guards
remain in place; the company operation requires a separately approved service
pause and transaction-only index build. It is not a read-only operation.

A separate synthetic plan check confirmed Gather Merge with two workers both on
the committed amount-only index under runtime and after recreating that index
inside the owner's uncommitted rehearsal transaction. The rehearsal does not
intrinsically suppress the parallel plan demonstrated by the runtime preflight.
This is plan-capability evidence, not company latency evidence.

The complete final generated command passed synthetic validation: five exact raw
result comparisons on normal rollback, plus exact original-state restoration
when a failure was injected immediately after dropping the old index. The same
heap, original index identity/definition, controls, serving and RLS were retained.
The Bash and Node syntax checks pass. Company execution still awaits approval;
no deployment, publication or CI run was performed.

## Full local release run — history assertion correction

The first full PostgreSQL run completed 312 tests: 311 passed, one failed, zero
skips. The failed history test had already passed independent exact totals,
group counts and metadata checks; it failed an assertion that all temporary
writes must be zero (426 blocks observed). The successful company plans already
show external sorts, so that assertion and a narrow-sort-width assumption were
not valid universal requirements. No production code change followed this result.

The corrected physical regression verifies that CTE scans contain only the known
reduced group population, rather than a materialized copy of source-history
operands. It does not require a specific aggregate algorithm, worker availability,
sort width or absence of legitimate sorting spills. Exact totals, per-group
values, result bounds and data-through checks remain. Temporary I/O is recorded
as diagnostic evidence. Targeted and full verification will be recorded below.

The corrected history regression passed on targeted rerun: 1/1, zero skips,
16.322 seconds total test duration. Its categorical SELECT recorded 49.630 ms
and zero temporary blocks in that individual local run; this does not replace
the company spill measurements or promise a zero-spill plan. Production source
and migration 052 remained unchanged throughout the assertion correction.

The full non-PostgreSQL release run passed 910/910 tests, zero skips. Frozen
install, lint, architecture, quality, typecheck, API/web build and diff gates
passed before the test correction. The corrected test passed the final
lint/type/quality/diff gates. The previous full PostgreSQL run is still
recorded as 311/312, not rewritten as a clean full pass. A clean full PostgreSQL
rerun remains required before publishing; defer it until final combined company
proof to avoid repeating the long suite before a possible source change.

## Final combined company rehearsal — five exact comparisons passed

The operator ran the final command against original image 74d7d48, schema 051,
trusted revision d3bb4553-ec5e-4a95-9415-f33a6c72a75c. The revised shared query
and amount-only typed index were exercised together inside the owner's
uncommitted transaction, with forced tenant RLS and no source/Odoo connection.

| Selection | Original ms | Candidate including preparation ms | Rows | Exact match | Under 15 seconds |
| --- | ---: | ---: | ---: | --- | --- |
| Collections due Top 100 | 16766.710 | 6238.172 | 100 | Yes | Yes |
| History salesperson | 15613.583 | 8245.033 | 77 | Yes | Yes |
| History governorate | 14961.251 | 7899.577 | 19 | Yes | Yes |
| Customer debt balance | 6203.090 | 8179.325 | 101 | Yes | Yes |
| Monthly sales totals | 590.410 | 668.371 | 29 | Yes | Yes |

This proves the selected exact-result/deadline gate, not uniform improvement.
Debt balance measured 1,976.236 ms (31.9%) slower, and monthly totals 77.961 ms
(13.2%) slower in this single sequential comparison. Cache state, workload and
the owner's role differ from concurrent runtime/browser QA; neither dismiss
these differences as noise nor treat them as a universal latency prediction.
Disclose the measured tradeoff before publishing. No additional production
changes or tuning are authorized by these results. Both event estimated plans
contain Gather Merge, consistent with the earlier actual runtime plans; the
combined estimated plans do not establish actual node timing or worker counts.

The script reported originalIndexHeapRlsSchemaAndServingRestored=true after
ROLLBACK. Its pasted JSON ends at restoration and omits the API/web restart and
health output. Original-service health confirmation was requested separately;
do not claim healthy restart from the restoration flag alone. Staging remains
on the original application/schema/index, with no candidate deployment or
permanent database change. No CI minutes were used.

A clean full PostgreSQL suite has now been started locally after the corrected
history test. Its final result will be recorded below. All 910 unit/API/web tests
and the remaining release gates passed previously; production code is unchanged.

Original-service health was subsequently confirmed by the operator: web running,
API healthy, and readiness HTTP 200 with persistence and analytics available.
This closes the rehearsal restoration/health gate. No candidate was deployed.

Frozen candidate source fingerprints (SHA-256):

- `packages/data/migrations/postgres/052_review_amount_cover.sql`: `f3c5c853f72e5e49bb83637b6dc6ba73ecd03519630b268b517759350945954b`
- `packages/data/src/review/grouped-base.ts`: `dc2c11412a660e68eff1c9acc6241a7bdc24dc97187782ad859bcbf82fd4a4e1`
- `packages/data/src/review/grouped-query.ts`: `013ba6b62e89d13d0e1464fdceadc4e29dc1d3d8031325dadf368dd512eba711`

## Final clean release validation — passed

The clean full PostgreSQL rerun completed 312/312 tests, zero failures,
cancellations or skips, in 848.889 seconds. The corrected history regression
passed within that full run. This supersedes the earlier failed benchmark-test
run as release-gate evidence without deleting its diagnostic history.

All 910 unit/API/web tests passed, zero skips. Frozen install, lint, architecture,
quality, typecheck, API/web build and diff checks passed. Production fingerprints
still match the frozen candidate exercised by the company rehearsals. No extra
production tuning or changes were made following those measurements. No GitHub
CI run or minutes were used.

The combined exact-result/deadline gate passed all five selections; original
company heap/index/RLS/schema/serving state was restored, and the operator
confirmed API healthy, web running and readiness 200. The candidate is not
published, merged or deployed. Publishing requires explicit user approval,
including acknowledgement of the measured debt-control slowdown. Existing CI
budget restrictions remain in force; publishing must not start CI runs.
Manual company deployment and all-report runtime/browser QA remain separate
from these local and rehearsal gates. Do not label Finance review approved or
claim source data refreshed; neither occurred in this change.

## Publishing authorization

The user explicitly approved pushing and merging the verified candidate while
avoiding CI runs, acknowledging the measured debt-control slowdown. Publication
uses [skip ci] on both the branch commit and merge commit; workflow files and
branch protections are not changed. This is authorization to publish the tested
software for the user's manual company staging deployment, not authorization
for the agent to deploy company infrastructure or approve Finance review.
