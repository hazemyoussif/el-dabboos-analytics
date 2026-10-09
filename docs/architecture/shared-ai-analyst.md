# Shared AI Analyst semantic core

The application exports a provider-neutral `StructuredAnalyticsPlanner` and
`AnalyticsIntentExecutor`. The Ask Business HTTP service and bilingual web page compose them. The
caller resolves fresh membership and supplies the trusted tenant profile,
published-capability provider and runtime analytics repository. Production
composition must use `TrustedAnalyticsRepository` and its forced-RLS runtime pool;
synthetic capabilities are an explicit test/demo composition, never a fallback.

## Shared planning

`AnalyticsSeriesIntent`, its compact schema, transformation compiler, trusted
preferred-metric resolver, semantic instructions and authorized catalog context
are shared with `StructuredDashboardPlanner`. The existing dashboard schema and
bounded generation/edit repair protocol stay operational. Dashboard generation
validates the extracted `AnalyticsIntent` before compiling canonical widgets and
retains full canonical validation and post-output authorization/publication checks.
No analytical field is removed. Presentation remains in `requestedPresentation`;
IDs, layout and defaults remain deterministic.

`AnalyticsIntent` contains a global business context and up to 24 analyses, each
with up to eight shared series and one existing governed grouping dimension.
An analysis can supply a complete context override. Relative periods use existing
tenant-timezone calendar resolution. Per-analysis ordinal selection is bounded
1–100 and requires full ranking; it cannot combine with Top-N. Contexts and
series are closed schemas, rejecting SQL, physical source properties, security,
presentation, unknown IDs, incomplete dates and non-anchor Top-N.

`analyticsIntentFromGenerationPlan` preserves every analytical field without
presentation. `compileDashboardFromAnalyticsIntent` consumes the validated intent
without another model invocation. It separates dimensionless summaries into KPI
widgets and delegates presentation defaults to the existing resolver. Canonical
DashboardSpec has global filters, so per-analysis context and ordinal selection
are explicitly unsupported in this adapter; they are never silently discarded.
Direct questions therefore cover all current dashboard analytical intent, with
additional direct ordinal selection. Existing saved specs and sparse edits retain
existing semantics.

## Validation and execution

Planner output is unknown until strict schema validation. Authorized/published
metric choices and deterministic query semantics follow. The executor fetches
fresh published capabilities, resolves every query and checks action, metrics,
tenant evidence, supported dimensions, business **and enforced policy** filters,
analyses, comparisons/windows and published periods before any query executes.
Capability failures are structured INVALID_PLAN, UNAUTHORIZED,
UNSUPPORTED_CAPABILITY or DATA_NOT_READY outcomes. Repository coverage, missing
partitions and unavailable snapshots retain PARTIAL_COVERAGE/DATA_NOT_READY;
no missing value becomes zero. Actual execution failures have fixed safe codes.

Execution uses existing normalization, request-local query identity and bounded
concurrency. No global result cache, source reader, ingestion, SQL planning or
business-value calculation is added. Multi-series results reuse dashboard row
alignment, Top-N anchor selection, null gaps and anchor-failure behavior. Multiple
analyses remain ordered structured results, suitable for bounded later rendering.

Every series retains the concrete executed query, metric, dimension/grain, period,
business filters, result rows and **all** repository metadata: immutable release,
source cutoff, snapshot cutoff, coverage and reconciliation. Scalar, grouped,
ranked, time-series, comparison and snapshot forms are classified deterministically;
aligned rows provide precise table data. `analyticsResultDrillRequest` supplies
existing governed scalar/categorical drill requests from stable keys and immutable
lineage. Time-group results retain their queries and per-point `drillReleases` for
later period-aware drill composition; transformed values are not treated as raw
metric details.

Finance remains owned by existing repositories: latest trusted snapshot <= cutoff,
never event aggregation, interpolation or summing balances across dates. Scoped
ranking happens inside governed execution, before selection. Unsupported Product
questions return an explicit planning outcome; unknown Product metrics are invalid
plans and never become source queries.

## Language and provider compatibility

Bounded language context uses catalog labels, descriptions, existing synonyms and
date definitions, plus customer/client/account phrases and explicit ambiguity
rules. “Best salesperson” requires published metric choices; no new governed
default is invented. Repeated publications are compacted into metric capability
summaries for model context. Actual publication evidence remains authoritative in
validation/execution. No physical database schema, source recipe or customer facts
are placed in the prompt.

The existing `LLMProvider` and OpenAI-compatible HTTP adapter remain unchanged,
including configured base URL/model/inference controls, portable schema projection
and deterministic validation afterward. No vendor tool/function calling is added.
Bonsai and Gemini-shim transport tests use fake loopback HTTP. Extra reasoning
fields are ignored as before; prose-prefixed JSON fails closed because the existing
adapter does not normalize it. CI never calls a live model.

## Semantic conversation state

Server-owned state retains effective period, business/viewer filters, metrics,
dimensions, categorical stable entity IDs (bounded to 100 per series), previous
validated intent, result references and resolved ambiguity slots. Ownership and
current authorization-scope signatures must match before reuse. Signatures and
principal/membership fields are excluded from model context. Changed scopes require
a fresh question/result; historical references cannot cross users/workspaces.

`resolveAnalyticsFollowUp` maps second-place intent to the same metric/grouping and
concrete effective period with rank=2. Comparing prior entities uses retained IDs,
not display strings. The new last-six-month period remains symbolic. These are
validated transient planner operations resolved by the conversational orchestrator, never runtime hardcoded question text. A new independent ranking replaces prior entity selections; ordinal and explicit retained-entity contexts preserve the related identities.

## Evaluation, timing and limits

`analyticsEvaluationCases` contains 32 EN/AR ground-truth cases across aggregate,
ranking, comparison, trend, derived, Finance, ambiguity, unsupported and
multi-analysis categories. They are evaluation data, never runtime phrase matches.
`evaluateAnalyticsPlanner` accepts any configured portable planner and produces
per-case pass/fail/timing records. Contract tests inject representative local-model
outputs and compare direct results with canonical dashboard execution. This proves
schema/execution conformance, **not** live-model natural-language accuracy.

Planner timing separates provider latency, schema validation and capability
resolution; executor timing separates capability work from deterministic execution.
Synthetic PostgreSQL tests establish actual trusted snapshots, RLS, drill lineage
and source-independent reads. Performance evidence is recorded in the
[implementation handoff](../qa/shared-ai-analyst-2026-10-08.md).

Current AnalyticsQuery supports one grouping dimension per analysis. A request
requiring simultaneous Salesperson × Month grouping is not silently flattened;
that remains a future canonical query capability. The shared layer preserves all
existing grouping, multi-series and supported transformations. An operational
publication that does not admit Top-N remains unavailable for Top-N even if a
synthetic engine can calculate it. More capable models do not alter publication
or authorization boundaries.

## Ask Business service and persistence

`AnalystConversations` owns question orchestration and deterministic answers.
The planner inherits visible page context when dates/filters are omitted; explicit
question context overrides it. Canonical clarification choices retain their original
context and cannot introduce a metric that was not offered. FOLLOW_UP rank and
compare_entities outcomes compile against server semantic memory before validation.
Each question performs fresh session checks after planning, during capability
preflight and before persistence. The append transaction rechecks live membership,
roles, tenant/customer status and policy scope, then atomically saves a versioned
conversation plus safe question audit. No provider call runs inside that transaction.

Direct planning uses bounded, authorized contract examples and distinguishes grouped
analyses from summaries in its schema: enabled ranking and Top-N require grouping.
Named months use fixed dates, even if the visible page period currently matches.
Dimension labels and synonyms are vocabulary, not entity values. A supplied canonical
metric choice resolves ambiguity; unresolved revenue measures still require a choice.
The planner checks new entity filter values against the current tenant/policy-scoped
dimension repository; values already supplied by page context or owned semantic state
remain references. Unknown values produce INVALID_PLAN before analytics execution,
rather than a misleading successful empty answer. Lookup values stay local and never
enter the model prompt. Missing grounding evidence fails closed. This uses the existing
domain dimension-value port and provider-neutral transport; it adds no model fallback.

`/api/ai-analyst/conversations` supports authenticated create/list;
`/:id` loads private history, and `/:id/messages` accepts question, pageContext,
expectedVersion and optional canonical choice. Owner predicates apply to every
read/write. Version conflict returns 409. Scope changes invalidate reuse. Draft
conversion and detail selection live under `/:id/messages/:messageId/dashboard`
and `/details`. Conversion revalidates the saved intent and canonical spec, executes
through the existing dashboard executor and opens an unsaved draft. It makes no
semantic model call and performs no save. Details derive exact keys, release and
query from saved validated evidence, then use the existing governed drill API.
Ranking/Top-N selection can drill; transformed, partial and time-group answers
cannot be misrepresented as raw metric details.

SQLite metadata migration 005 and PostgreSQL control migration 008 add private
conversations and immutable question audit. Apply them explicitly with existing
operator migration commands; normal runtime does not migrate storage. No mart
schema changes are needed. Conversations expire after 30 days, with at most 20
sessions per owner and 20 display turns per session. Oldest display turns are evicted
at a 1 MiB record budget. Answers retain at most 30 rows per panel / 600 total;
truncation is visible. Semantic IDs are separately bounded. Questions are limited
to 2,000 characters, validated intent to 24 total series / 16 KiB. Question audits
retain periods, intent hash, status and release/snapshot references for 90 days;
no question text, result rows, credentials or provider response body is audited.
Expiry cleanup is opportunistic on create/append; there is no scheduler.

## Answer experience and runtime

The `/ask-business[/conversation-id]` page exposes workspace, period, history,
clarification, localized authoritative summaries, exact tables and temporal charts,
and readable evidence. Definition, period, filters, grouping, analysis, certification,
reconciliation, freshness, coverage and snapshot cutoff remain distinct. Dates
used in an answer always reflect execution, not the current page selector. Native
controls, existing theme tokens, chart theme, RTL and existing drill modal are reused.
Presentation preferences are outside specs and persisted semantic state.

Structured runtime uses the same configured provider-neutral LLMProvider as
dashboard generation. Mock/disabled planning returns AI_UNAVAILABLE for Ask
Business; ordinary analytics remain usable. `ANALYST_SYNTHESIS=true` optionally
selects grounded highlight references for three or more panels. It receives bounded
evidence and can return only validated panel indices; deterministic summaries own
all numerical claims. Invalid/unavailable synthesis falls back without losing results.
Simple answers use no second model call. Timing separates planner, capability,
execution and synthesis; total covers the pipeline before persistence, while the QA
HTTP measurement also includes audit and persistence.

The original 32 semantic evaluations remain, augmented by 16 EN/AR conversational
cases across clarification, resolution, ordinal, entity reference, explicit override,
page inheritance, dashboard action and detail action. Fake-provider contract results
prove orchestration and execution fidelity, not live-model language accuracy. See
[conversational QA handoff](../qa/ask-business-2026-10-08.md) for actual gates,
browser evidence, performance and live-provider limitations.

## Local staging acceptance follow-up — 2026-10-09

An ordinal requires a prior categorical entity result; dimensionless totals and
time groups cannot provide ranked entity references. Conversation planning also
omits prior semantic state while the latest turn is unresolved or failed, unless
the user supplies its offered canonical clarification. This prevents a following
ordinal from answering an older, unrelated question. Successful and partial
answers retain stable-ID continuation; history is preserved.

The shared instructions distinguish explicitly named metrics from ambiguous
measures and leave unrequested grouping to the application. Strict validation is
unchanged: these instructions are guidance, not a reason to accept invalid output.
Live Bonsai interpretation remains an acceptance gate; see the
[local staging acceptance report](../qa/ask-business-staging-2026-10-09.md).
