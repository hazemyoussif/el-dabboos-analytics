# AI architecture

## Current contract

DashboardPlanner generates DashboardSpec v2 and edits DashboardPatch v2. MockDashboardPlanner remains a bounded demo implementation. StructuredDashboardPlanner receives authorized PlannerCapabilities, controlled tenant/market profile, approved semantic/template metadata and application-owned compact generation/edit schemas. Generation validates DashboardGenerationPlan and deterministically compiles canonical DashboardSpec; editing validates sparse DashboardEditPlan and compiles canonical DashboardPatch, which remains the internal/API edit contract. It calls LLMProvider with a portable schema projection and accepts **unknown JSON**, never trusted domain objects. No provider generates SQL or React.

The provider-neutral projection removes unsupported schema keywords and translates constants for portable constrained generation. Canonical DashboardSpec/Patch schemas remain unchanged and authoritative. Output passes full JSON Schema, semantic/layout/visualization validation, patch application validation for edits, and authorized metric checks. API performs post-planning authorization again before execution. Compatible operation vocabulary is bounded, not an expression language.

Bounded repair attempts default to one and may be configured 0..2. Validation failures can request constrained repair; transport failures are surfaced without unlimited retries. Optional application diagnostics callbacks report generation/edit, attempt, schema name, stage and safe issues; API config alone reads environment and redacts/caps development diagnostics. Browser sees generic safe errors only.

## Provider boundary

OpenAI-compatible HTTP adapter in apps/api accepts base URL, model ID, optional API key and timeout. Application does not know endpoint hosting location or a specific model runtime. llama.cpp/Ollama/Bonsai are deployment examples only. See [endpoint setup](openai-compatible-provider.md), [configuration](../developer/configuration.md) and [privacy boundary](source-integration.md#llm-privacy-boundary).

Generate/edit execute previews and change working drafts; they never save records. Planner availability does not determine analytics liveness/readiness. Fake HTTP providers exercise transport and validation in CI; no running model server/customer data is required. [Tests](../../packages/application/test/structured-planner.test.ts), [transport tests](../../apps/api/test/openai-compatible.test.ts), [AI QA](../qa/ai-tests.md).

## Structural intent and presentation

Summary generation widgets forbid dimension, require exactly one series and allow only optional explicit KPI presentation (palette only). Grouped widgets require dimension and 1–8 series; their optional type-specific presentation excludes KPI. Two closed, disjoint oneOf branches enforce this in the original and projected schemas; TypeScript mirrors the categories. Dimensionless Line/Bar/Area/Pie/Treemap/Combo/Table and grouped KPI cannot be represented. Deeper metric/dimension, unit, analysis, composition, Combo count and Top-N anchor rules remain canonical. Defaults remain code-owned: implicit summary KPI, compatible time Line, compatible category Bar, mixed units Table. No model/provider conditional or new schema keyword was introduced.

Manual and sparse AI palette edits converge on `WidgetPresentation.palette`; generation can supply the same governed token. The centralized web ChartTheme resolves actual Light/Dark colors. Builder and provider plans never store resolved colors, CSS or chart-library options. Global theme/locale remain preferences outside saved content.

## Planner reference/adherence follow-up

Explicit governed presentation intent remains model-owned. The generation instruction treats requested type/orientation/palette/options as required, attaches each only to its corresponding widget in a multi-widget request, and asks the model to check for dropped presentation adjectives before returning JSON. The existing horizontal-blue Top-5 example remains the single compact example. The deterministic compiler preserves emitted intent but never parses the raw request or reconstructs an omitted palette. Valid output that omits Blue still has no Blue token; prompt adherence is a live model acceptance concern, not hidden inference.

Sparse edits receive an `Editable widget index` before the unchanged full current DashboardSpec context and edit instruction. Each entry contains `widgetId`, `type`, optional `dimension`, unique ordered `metrics`, and `series: [{seriesId, metric}]`. The index is a deterministic projection of the already validated/authorized current spec. It excludes titles, result values/rows, business filter values, SQL and new authorization data; titles remain available in the full spec when needed. It is transient prompt context only, never an edit selector, schema or persisted record. Guidance resolves all supplied type/metric/dimension/title descriptors, preferring the complete description over the first shared metric: Revenue Line is distinct from Revenue KPI; branch gross profit identifies gross_profit grouped by branch. The model still outputs canonical widgetId/seriesId references; the compiler performs the deterministic sparse mutation. No fuzzy matching or natural-language selector enters application mutation code or DashboardEditPlan.
