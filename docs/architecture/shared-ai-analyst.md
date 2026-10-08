# Shared AI Analyst semantic core

The application exports a provider-neutral `StructuredAnalyticsPlanner` and
`AnalyticsIntentExecutor`. They have no HTTP route or conversational UI yet. The
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
semantic operations for a later orchestrator, not runtime hardcoded question text.

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

Next milestone: fresh-session API composition and audit, conversational request
orchestration, verified live-provider evaluations, deterministic answer rendering,
period-aware detail actions and explicit dashboard-draft handoff. No Ask Business
page, chat history, answer cards, deployment, auto-save or source access is included.
