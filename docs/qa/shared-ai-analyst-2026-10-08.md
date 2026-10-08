# Shared AI Analyst foundation — 8 October 2026

## Pre-feature checkpoint

Branch: `codex/production-pilot-lifecycle`. Prior accepted work committed first in
`47d1ebb` (`feat(analytics): checkpoint governed drill-through and local staging recovery`).
This was one coherent commit because drill, runtime composition, policy filters,
migrations 035–037 and final presentation evidence shared dependencies. Checkpoint
sanity: three focused API/web test files and diff gate passed; recorded prior full
731 unit / 172 PostgreSQL test evidence was retained rather than rerun. Only
`.archify/` remained untracked and untouched. Synthetic screenshots under docs/qa
are intentional acceptance evidence. Protected environment files, temporary
benchmarks, logs and local state were not staged.

The source Machine ID/least-privilege and operational live-sync acceptance blockers
in the prior QA record remain unresolved; committing the accepted code does not
assert their completion. No source connection or runtime staging modification was
needed for this core milestone.

## Foundation and representative results

See [semantic core](../architecture/shared-ai-analyst.md) for exact contracts.
Shared extraction includes series schema, transformation compiler, trusted metric
preferences, semantic instructions, authorized catalog context and row alignment.
Existing generation/edit schemas, resolver presentation defaults, canonical
validation, authorization, provider configuration and repair behavior remain intact.

Synthetic direct execution (no dashboard created):

- September order revenue = **425** across three Iraq salespeople.
- Scoped Baghdad manager revenue ranking = **rep:a (100), rep:c (75)**;
  Basra's 250 and Egypt's 9999 are excluded before ranking.
- Second place following the two-person order-revenue result = **rep:a**,
  preserving September's concrete period. Entity comparison retains rep:b/rep:a
  stable IDs and applies last_6_months without guessing names.
- Trusted PostgreSQL receivables as of **Oct 8** = **200** from the **Sept 30**
  snapshot, with exact reconciliation and immutable drill release. No interpolation
  or sum over snapshot dates. Scoped customer Top-1 returns only fixture:00001.
- Trusted PostgreSQL scoped event grouping = **rep:a, 100**, after the fixture
  source is deliberately interrupted. The executor has no source dependency.

Provider-fixture ambiguity: “Who is the best salesperson?” returns AMBIGUOUS with
Net Invoiced Revenue, Order Revenue and Order Count. Trending Products returns
UNSUPPORTED_CAPABILITY. Invalid canonical IDs fail INVALID_PLAN. Known unpublished
metrics/periods fail DATA_NOT_READY. An operational fixture that has not published
Top-N is rejected for Top-N; no transformation publication is fabricated.

## Dashboard parity and evaluation

32 reusable evaluation cases (16 EN, 16 AR): aggregate, ranking, comparison, trend,
derived, Finance, ambiguity, unsupported and multi-analysis. They are not runtime
special cases. Fixtures cover September invoiced revenue, last-month order revenue,
Top-1/Top-5, General/No Sugar, invoice/refund multi-series, six-month trends,
August–September comparison, contribution, moving average, running total,
receivables cutoff and overdue customer ranking. Direct result rows and metadata
match canonical dashboard execution for supported cases.

Existing Create Dashboard regressions also exercise monthly revenue/profit,
customer tables, Arabic branch profitability, explicit horizontal blue Top-5 bars,
sparse edits, relative/fixed dates, palettes, authorization, publication checks and
bounded repair. Focused planner/executor/fake-provider suite passed **96 tests**
before the final conversation-scope test was added. The final full-gate counts are
recorded below after completion.

Bonsai/local and Gemini-compatible shim conformance uses fake loopback HTTP through
the unchanged OpenAI-compatible adapter. It verifies the portable projected schema,
representative JSON output, malformed output, missing fields, unknown IDs and
extra provider text. No function/tool calling is sent. Prose-prefixed JSON fails
closed, matching existing normalization behavior. No live provider was called;
these tests establish contract/execution parity, not real-model language accuracy.
The evaluation runner accepts an injected live planner for later accuracy runs.

## Performance evidence

One focused local synthetic PostgreSQL scalar snapshot measurement:
capability/publication/schema/authorization work **14.13 ms**; deterministic
execution **14.66 ms**. These are single-run local measurements, not production
percentiles. The scalar uses one unique execution query; deduplicated identical
series share one repository call. Validation/planning does not add source reads.
A separate cold-start, in-process provider-fixture measurement recorded planning
(including request preparation) **11.53 ms**, schema validation **2.19 ms**,
capability resolution **0.78 ms**, and mock deterministic execution **1.55 ms**.
There is no live LLM in this measurement; real provider latency remains unmeasured.
The port adapter also retains its transport latency metadata. These samples are
diagnostics, not model-speed or production-performance claims.

## Verification

Final gates passed: frozen install, lint, architecture (0 diagnostics), quality
(0 diagnostics), typecheck, **782 unit tests**, **179 PostgreSQL tests**, API/web
build and diff (0 diagnostics), with **zero skips**. A final 45-test focused suite
verified the per-analysis follow-up correction; the full unit suite was rerun
after that correction and the no-publication regression. Workspaces with no
published metrics return DATA_NOT_READY before a provider invocation. The existing Vite bundle-size warning remains. Three
resolved short-name baseline entries were removed; no debt allowance was added.
Final commit references are recorded in the task delivery. CI is not run remotely
because no push is authorized. Manual browser work is not claimed
for this backend/application milestone. Previous milestone browser QA remains
separate evidence. The new tests use synthetic facts and disposable PostgreSQL 18.6,
without developer env files, real customer services or a live model endpoint.

## Remaining work

Fresh-session API/audit composition; conversational orchestration; live-provider
accuracy evaluation; deterministic direct-answer/table/chart rendering; time-point
drill composition; explicit unsaved dashboard handoff and later conversational UI.
Canonical queries currently have one grouping dimension. Per-analysis contexts and
ordinal selection cannot be silently compiled into DashboardSpec global filters.
Those adapter limits are explicit. No source publication or Finance definition is
changed to unlock a capability.

## Safety confirmation

- Current accepted milestone committed first = yes.
- Push = no; merge = no; unrelated history rewritten = no.
- Separate incompatible question planner created = no; dashboard analytical capability reduced = no.
- OpenAI/Gemini-specific architecture introduced = no.
- Bonsai/local-provider support removed = no; portable schema projection removed = no.
- LLM-generated SQL = no; LLM directly queries PostgreSQL = no; LLM directly queries Odoo = no.
- LLM calculates authoritative business truth = no.
- Unsupported metrics hallucinated = no; ambiguous business concepts silently guessed = no in verified conformance cases.
- Authorization bypassed = no; RLS bypassed = no.
- Finance semantics changed = no; snapshot semantics changed = no.
- Trusted analytical execution requires source connectivity = no.
- Odoo writes = no; external deployment = no.
