# Prepared serving acceptance investigation — 19 October 2026

Status: local correction candidate; company acceptance remains failed and prepared
serving is not approved for activation. Work starts from feature commit
`921482a53f883347c374556281cb2141e35a6896` in the isolated
`prepared-acceptance-fixes` worktree on branch `codex/prepared-acceptance-fixes`.
The base is the feature commit above; the final reviewed correction commit is
reported separately with the release package. The primary checkout and original release
checkout's unrelated edits are preserved. No push, merge or deployment was performed. No company schema change, cleanup,
preparation, source access or activation was performed.

## Findings and corrections

Independent synthetic complete observations demonstrated that the original
categorical reader retained a settled customer from August in September's detail,
even though September's complete source no longer contained that identity. For
signed inputs `0.1`, `-0.3`, `0.2`, the original summary returned
`2.7755575615628914e-17` instead of canonical zero. Prepared summary and detail
matched the independently known September population. These are demonstrated local
causes, not proof that they account for every company mismatch.

The candidate corrects the original Review/Business reader to use the latest
accepted complete observation per measure before filtering and exact SQL decimal
aggregation for summary/time operands. Controlled emptiness clears the population;
missing observations do not fabricate balances. Ratio zero denominators remain
null; date snapshots use max; compatible quantity units and six-decimal safe-number
bounds remain enforced. Source controls are read by the existing source-backed
reader, never by prepared requests.

The product-invoice report's original local executor profile measured first
108.1 ms / repeat 103.2 ms / baseline 43.4 ms. There were 48 publication statements
per prepared execution, accounting for about 49–50 accumulated ms, versus 8 cell
statements taking about 12 ms. After request-scoped publication reuse, one sample
measured first 51.9 ms / repeat 46.6 ms / baseline 50.3 ms, 6 publication statements
(about 6 ms) and 8 cell statements (about 12 ms). These are tiny synthetic, single-user
samples on the same local test database, not cold-cache or company-size benchmarks.
They demonstrate eliminated repeated metadata work, not compliance with the new
strict no-slowdown gate: first execution in that sample still regressed.

The profile additionally records accumulated pool/queue wait and transaction,
guard/binding, publication and cell statement durations. Parallel wait durations
can exceed executor wall time and must not be added to it. The company profile below establishes where its accumulated query time is spent.
The baseline classifier labels statements mentioning `review_extractions` as
publication work even when they also read source facts; its baseline publication
bucket must not be interpreted as pure metadata overhead.

## Owning code

- [Prepared repository](../../packages/data/src/prepared/repository.ts): request-scoped publication projection with the existing transaction/revision guard.
- [Prepared result](../../packages/data/src/prepared/result.ts): independently owned returned provenance.
- [Snapshot selection](../../packages/data/src/review/snapshot-selection.ts): complete observations applied after the covered identity scan.
- [Snapshot result](../../packages/data/src/review/snapshot-result.ts): exact decimal summary/time operands, null and unit checks.
- [Review repository](../../packages/data/src/review/repository.ts): route snapshot summaries through the shared population logic.

## Verification

Targeted coverage includes the independent signed-balance fixture, complete
replacement, authoritative empty observations, ratio nulls, opening cutoffs,
policy restrictions, context changes, result ownership, mid-request publication
refusal and fresh scopes. The existing exhaustive fixture compares 492 metric /
grouping queries over 71 metrics across four families. The new catalog check
executes every report actually supported by its synthetic capabilities and reports
all unavailable reports; it does not claim the company catalog's 27-report coverage.

The latest full regular suite passed **949 tests**, zero failures/skips. Ten focused
diagnostic tests also pass, including the subsequently added report-remeasurement
connection-option guard. Frozen install,
lint, architecture, baseline-aware quality, types, API/web build and diff gates
passed. The build retains its existing large-chunk warning, and concurrent SSR
tests emitted their existing HMR-port warnings without failures. The final PostgreSQL
rerun after the JIT correction passed **353 tests**, zero failures/skips (898779 ms).
It includes the full prepared report fixture, native/off/native-repeat plan probe,
diagnostic startup connection isolation and transaction-local runtime JIT regression. The first full run exposed two outdated carry-forward expectations and the
covering-index regression; all three were resolved before the complete rerun.

The two history fixtures now independently expect 7 rather than 37 for the current
customer because the old 30 balance disappeared from the complete September source.
The original covering-index assertion was retained: the 60000-snapshot fixture
used an index-only identity scan with zero heap fetches, followed by fetching only
the current accepted observation's operands. One local EXPLAIN measured 120.153 ms.
The new purpose-report fixture compares all **17 locally supported reports**;
missing certifications/history are explicitly reported rather than invented to
match the company's 27-report catalog.
Manual browser, company latency/concurrency and ongoing freshness have not been
accepted. CI has not run. Local green tests cannot authorize company serving.

## Company diagnostic startup correction

The first manual company attempt returned only
`{"stage":"diagnosisDeadlineExceeded","activationPerformed":false}` and status 124.
No report or reconciliation result was produced. This is not evidence that company
report execution itself took 180 seconds.

The diagnostic profiler incorrectly replaced `pg.Pool.connect(callback)` with a
promise-only wrapper. `verifyMartRuntimeRole` calls `Pool.query`, which uses callback
checkout; its callback was dropped, so startup waited for the overall deadline.
The original synthetic end-to-end test began after role verification and missed
this startup boundary. A new callback regression reproduced the hang before the
fix. The profiler now preserves callback and promise checkout/query completion,
errors and release behavior. The revised real PostgreSQL test verifies both
instrumented runtime roles before running the complete diagnostic; it passes.
Six focused diagnostic tests also pass, including error forwarding and the raw
history guard. The revised real PostgreSQL diagnostic test passed (one targeted
test), and the full regular suite passed 941 tests with zero failures/skips. Lint,
types and diff checks passed. The original product source changes remain unchanged;
the prior full 351-test PostgreSQL result is product-candidate evidence, not a
claim that the former diagnostic startup boundary was covered.

The updated command identifies itself as `callback-fix-v2`, emits startup and
report/reconciliation start stages, and includes the last progress stage and safe
counters on timeout. The deadline stays 180 seconds. Copy the updated command
again; a previously copied company-side file still contains the old wrapper.
The corrected company command subsequently completed; its results are recorded below.

## Completed company diagnosis

The user supplied the successful `callback-fix-v2` output for the pinned sealed
inactive revision. Startup and `boundedDiagnosisComplete` both completed, with
`activationPerformed:false` and zero prepared raw-history attempts. No local
product fixes were deployed for this measurement.

| Report | First ms | Repeat ms | Baseline ms | Exact result equality | Absolute gate | No-slowdown gate |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Customer debt aging | 5073.957 | 4960.711 | 19859.751 | No | Fail | Pass |
| Product invoice performance | 3547.456 | 3702.771 | 998.350 | Yes | Fail | Fail |

The displayed timings are rounded for readability only; the gate uses the original
unrounded measurements. Both reports were stable between prepared executions.
Debt is faster than its baseline but misses both absolute limits. Product invoices
are an established regression, despite equal results.

All five independently checked complete snapshot measures (`review_customer_balance`,
`receivable_unknown_due`, `positive_receivable_not_due`, `positive_due_0_30`,
`positive_due_over_90`) match accepted source controls exactly in prepared serving.
For each measure, prepared totals match and all 2214 customer rows match with no
missing/extra identities, duplicates, null/numeric/other differences or ordering
differences. The baseline returns 3760 rows, including 1546 extra identities; its
total fails canonical equality for each measure. Among the canonical customer
identities its numeric mismatch counts are respectively 1812, 938, 1445, 1379 and
337. This supports the complete-observation correction; it does not prove all
company reports or policy combinations.

The debt report Top-100 anchor changes membership (39 missing and 39 extra
identities); associated sales and date series have equal shared-identity values
but different membership. Do not infer that every peer metric calculation is wrong.

The fact metadata pair has equal rows and differs only in `coverage.from`: baseline
2024-06-01 versus prepared 2025-01-01. Coverage status, through date and cutoff
match. The business metadata pair has all 22 monthly rows equal and differs only
in `release.period.from` by the same dates; period end and all six recorded source,
mapping and certification identifiers match. These observed differences follow
the prepared reporting window. A governed expected-window comparison remains
to be defined; globally excluding coverage/release metadata is not acceptable.

Prepared repeat product execution issued 12 cell statements with 11415.528 ms
accumulated time, 72 publication statements with 3216.343 ms, and guard/binding
statements with 1022.586 ms. Pool wait was only 1.456 ms. Debt issued 16 cell
statements with 20931.398 ms accumulated time. Concurrent durations overlap;
these sums are not wall time. Request-scoped publication reuse addresses repeated
metadata work, but company cell SQL now requires its own execution-plan evidence.
Subsequent access-plan evidence identifies JIT overhead below; the profile alone
did not identify its cause.

## Completed company prepared-cell access plans

The [three-case plan probe](maintenance/prepared-cell-plans-2026-10-19.sh) captures
the exact installed prepared-cell SQL for product detail, debt detail and debt
summary, then explains it under the same tenant runtime role. It exports structural
plan nodes, row/loop/block counters and safe JIT counters; conditions, expressions,
SQL parameters and customer rows are omitted. It retains the maintenance lock,
image/revision/seal/inactive guards, one connection, a 15-second statement cap and
180-second worker deadline. It blocks raw history reads.

Only when a native plan actually uses JIT, the probe also executes the same SQL
with transaction-local JIT disabled, restores the native setting and repeats the
native plan to distinguish cache warming. This changes no persistent settings,
policies, indexes, prepared data or activation. Sequential SQL plan timings are
not report/browser acceptance timings.

The plan helper has three passing unit tests for redaction, structural bounds and
exact shell embedding. A targeted real PostgreSQL test runs all three cases and
forces JIT only in its synthetic fixture, exercising all nine native/off/repeat
plans, native-setting restoration, role startup, publication guards and zero
raw-history access. The company probe subsequently completed all nine plans with zero raw-history
attempts and no activation. It selected one monthly product grain (520 cells),
one customer cutoff grain (2214 cells), and one scalar cutoff grain (one cell).
Every case used `prepared_cells_pkey`, with no temporary block reads/writes. The
binding/security subplans executed once in these plans, not once per returned cell.

| Case | Native first execution ms | Native cached repeat ms | Transaction JIT-off execution ms | Native JIT functions |
| --- | ---: | ---: | ---: | ---: |
| Product detail | 1203.116 | 1090.000 | 5.300 | 108 |
| Debt detail | 1125.817 | 1114.884 | 12.213 | 108 |
| Debt summary | 881.154 | 876.503 | 0.894 | 91 |

The JIT-off plans retain the same access plan, cost, row counts and loop counts.
Native repeats remain slow with zero shared read blocks after the JIT-off run;
cache warming alone does not explain the difference. JIT is therefore a demonstrated
major source of overhead for these three prepared statements. Because the probe
uses `TIMING OFF`, JIT compilation phase timings are not emitted; the controlled
on/off/on execution-time comparison is the evidence, not a measured compiler
phase breakdown. Estimated costs are high (8443938 for product detail and about
612107 for the debt queries) despite small actual cell populations. PostgreSQL
chooses JIT from estimated cost, and explicitly documents that short-query
compilation overhead can exceed its savings ([PostgreSQL 18 JIT decision](https://www.postgresql.org/docs/18/jit-decision.html)).
The exact source of inflated cost estimates has not been isolated; weakening
security checks or adding indexes is not justified by these plans.

The runtime candidate now sets `jit=off` transaction-locally at the start of
`PreparedAnalyticsRepository` execution. Both direct and request-scoped execution
use it. Tenant scoping, RLS, revision guards, timeouts and business calculations
remain enforced by the existing read-only transaction. Commit or rollback restores
the pooled connection's prior setting; source preparation and baseline readers
retain their existing configuration. The raw low-level selection helper remains
usable by the native/on/off/on diagnostic, which explicitly controls its settings.

A new real PostgreSQL regression failed before this change (`jit` was still `on`
at the actual cell statement). With the change it passes for product detail, debt
detail and debt summary through both direct and request-scoped execution. The
fixture forces a zero JIT cost threshold and proves zero compiled functions in
the actual cell plans, exact result equality, prior session setting restoration
after success and injected failure, and refusal before cells for a foreign tenant.
All eight targeted acceptance PostgreSQL tests pass.

## Completed company report-level JIT remeasurement

The [bounded report remeasurement](maintenance/prepared-jit-report-probe-2026-10-19.sh)
uses the installed code with JIT disabled only on its dedicated diagnostic prepared
connections; baseline connections retain their configured setting. It repeats the
same two reports and canonical checks with the same strict gates, image/revision
guards, SQL limits and deadline. Its startup reports both JIT settings. No company
files, persistent database settings or serving activation change. The connection
setting covers all prepared diagnostic queries, so this is a process-level JIT
experiment, not acceptance of the undeployed candidate's exact transaction scope
or its publication-reuse and baseline-reader changes.

The revised startup/end-to-end PostgreSQL diagnostic test verifies dedicated
prepared connections use JIT off while separate baseline connections remain on.
Ten focused diagnostic unit tests pass, including exact embedding and isolation
of the new connection option. The user subsequently supplied a successful `jit-report-v1` run: prepared
diagnostic connections reported JIT off and baseline connections JIT on. The
worker reached `boundedDiagnosisComplete`, with zero prepared raw-history attempts
and no activation.

| Report | First ms | Repeat ms | Baseline ms | Exact result equality | Absolute gate | No-slowdown gate |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Customer debt aging | 1334.371 | 1146.844 | 19249.347 | No | Pass | Pass |
| Product invoice performance | 900.176 | 829.578 | 977.670 | Yes | Pass | Pass |

Both prepared reports remained stable. All five independent complete-source
reconciliations again passed prepared totals and all 2214 customer rows, while
the old baseline retained the same 1546 extra identities and numeric differences.
Observed coverage/release-window differences were also unchanged. Disabling JIT
did not change these correctness findings.

Prepared repeat accumulated cell time fell to 389.637 ms across 16 debt statements
and 108.508 ms across 12 product statements. Publication time remained 3775.151 /
3005.639 accumulated ms with the original 96 / 72 statements, so the separately
implemented request-scoped publication reuse still targets demonstrated overhead.
These overlapping durations are not report wall time.

This experiment establishes full-report benefit on the installed release for
two reports and passes the selected timing gates against its existing baseline.
The old debt baseline is incorrect; the corrected baseline must be measured again
and may have different timing. The process-wide diagnostic connection setting
also covers metadata operations outside the candidate's per-execution transaction.
The final release still needs fixed-candidate 27-report equality, strict latency,
browser, concurrency and freshness evidence. No candidate deployment, persistent
company configuration change or serving activation was performed.

## Diagnostic command reference

[Bounded read-only diagnostic command](maintenance/prepared-acceptance-diagnosis-2026-10-19.sh)
was used for the completed company diagnosis above. It embeds the
[testable diagnostic helper](maintenance/prepared-acceptance-diagnosis-2026-10-19.mjs)
and uses the installed release; it does not require copying product changes,
building images, preparing data or deploying. Copy the complete shell script into
the company shell. It acquires the existing maintenance lock, requires the recorded
API image, dedicated read-only runtime identity, exact sealed inactive revision
`6eb4a954-7437-4774-98f2-dae23d60bd81`, SQL bounds capped at 15 seconds, at most 8
connections per pool and a 180-second worker deadline. If publication/image changed,
it stops; review the new safe state before adapting the pin.

It profiles only debt aging and product invoices (first, repeat, baseline); compares
five debt measures to independently accepted complete-source totals/customer
aggregates; reports exact safe coverage dates and release-period/identifier-equality
fields; and blocks prepared raw-history access. Customer values/identities remain
in memory. Output contains only timings, safe metadata and mismatch categories.
Canonical customer aggregates are capped at 4001 rows and fail above the report's
4000-group bound. Its checks establish a diagnosis, not full release acceptance.

The user selected **no slower than baseline**: both first and repeat must be no
slower, with the existing first ≤ 5 s / repeat ≤ 3 s gates retained. The [updated full-report helper](maintenance/prepared-report-acceptance-2026-10-19.mjs)
applies the same strict rule and reports absolute and relative outcomes separately.
Previously emitted commands and historical pass flags retain their old gates. Comparisons exclude only execution
timestamps; coverage/release mismatches are not normalized away. The diagnostic
preserves the original first → repeat → baseline order; caching can affect it.

Before release: reconcile the company mismatch categories against the canonical
complete/delta contract, resolve exact provenance expectations, evaluate the strict
regression gate on the fixed candidate, then repeat all 27 company reports and
boundary checks. Deployment or any affected-data repair requires a separately
reviewed concrete plan. Full browser latency, concurrency and hourly current /
nightly historical freshness schedules remain unfinished acceptance gates.


## Final local validation for the JIT correction

Frozen installation, lint, architecture, baseline-aware quality, type checking,
regular tests, API/web builds and diff gates passed. The full regular run passed
944 tests, and all ten focused diagnostic tests passed after the last diagnostic
guard addition. The full PostgreSQL run passed 353 tests with zero failures or
skips, including all eight acceptance tests. `git diff --check`, Bash syntax and
the embedded report-probe JavaScript parse also passed. Existing web bundle-size
warnings remain. The disposable synthetic PostgreSQL test container was removed
after verification. All company observations above are manual evidence provided
by the user; local automated tests do not substitute for company release acceptance.
The JIT investigation preceded release packaging. No CI, push, merge, candidate
deployment or activation was performed during that investigation.


## Report release packaging follow-up

The user's next priority is actual company reports. The [concrete rollout plan](prepared-reports-rollout-2026-10-19.md)
and [durable full-catalog runner](maintenance/prepared-company-acceptance-2026-10-19.sh)
are prepared for review. The comparison now derives eligibility dates from the
registered window rather than excluding any coverage/release field. Both the raw
native diff and the expected-window diff remain visible. Four focused tooling tests
and three real PostgreSQL window tests verify the contract, including a source
cutoff difference that must remain a failure and accepted December opening dates
that must remain unchanged. A first assertion expected Finance result metadata to
carry a period, but its result lineage has no period; the test was corrected to
compare the actual authoritative fields. Product runtime source remains the exact
source that passed the full 353-test PostgreSQL run. Publication, deployment,
activation and actual authenticated report acceptance remain pending.


Release-packaging verification passed all 949 regular tests with zero failures or
skips, plus lint, types, architecture, baseline-aware quality and diff checks.
The three real PostgreSQL reporting-window checks passed after the tooling change;
product runtime source retains the completed 353-test full PostgreSQL result.
The release package is pinned by a local reviewable commit reported in chat.
No publication, merge, deployment or activation has been performed.

## Company enablement receipt and scoped-read follow-up

Candidate `154dd6937e6f204f511e0f36d8bfb6cd911929f3` is deployed. Preparation
completed for current revision `bd9d281d-a865-4819-945a-59fe10d401f9`; the
27-report run stopped before activation. All boundary/policy checks passed and
prepared execution attempted zero history reads. Two report comparisons failed
only the previously agreed strict no-regression gate; both had exact results and
stable repeats:

| Report | Prepared first / repeat ms | Native ms |
| --- | --- | --- |
| confirmed-order-margin | 256.075 / 180.626 | 132.755 |
| product-brand-positive-sales-pareto | 1926.110 / 333.933 | 1181.475 |

The follow-up loads only the capability families needed for a query, retaining
Finance-to-Facts and product Facts-to-Review source priority. One authorized
execution shares in-flight immutable sealed binding loads by revision, family
and event/snapshot kind. Direct queries own fresh loaders; there is no cross-request
cache. Selection still checks the live revision, seal and reporting window in its
own read-only transaction before cells are read. The scope still pins the actor
and final revision. Lazy capability discovery now also runs inside the prepared read transaction after
JIT is disabled, instead of during scope creation beforehand. The setting remains
transaction-local and is restored on commit or rollback.
No values, date eligibility, policy rules, numeric comparisons or latency gates
change. No migration or data re-preparation is needed for this reader follow-up;
if scheduled work advances the publication, the retry must prepare that current
revision through the existing governed operator rather than reuse a stale pin.

The concurrent PostgreSQL regression proves a Business execution loads one
publication projection and two binding sets (event and snapshot), reads no Finance
evidence, returns exact direct-query results, creates fresh metadata for the next
execution and rejects an advanced publication. Company timing against this
follow-up remains to be measured; local SQL-count reduction is not company latency
acceptance.

Follow-up release verification: frozen install, lint, architecture, baseline-aware
quality, typecheck, **949 regular tests**, API/web builds and diff checks pass.
The final complete PostgreSQL suite passed **354 tests**, zero failures/skips
(662106 ms), on disposable PostgreSQL 18.6. This includes the concurrent metadata
and binding reuse regression and its JIT-off capability-discovery assertion.
The one-job enablement retry separately passed nine guard/lifecycle checks,
including real synthetic preparation, refusal after failed acceptance, reuse of a
complete current seal, governed activation and normal-reader JIT verification.
Company activation and company timing of this follow-up remain unconfirmed until
the retry produces its passing receipt.
