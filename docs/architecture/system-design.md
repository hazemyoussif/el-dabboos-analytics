# System design — primary architecture entry

## Status and responsibilities

**Current:** governed bilingual analytics over synthetic IQ/EG canonical facts; templates, manual/AI working drafts, explicit versioned persistence, personal library organization, centralized presentation. The product is not an operational ERP, source ETL, production identity system, SQL generation service or FX engine. **Proposed/future:** real source adapter, production identity, tracing, operational migrations and approved reconciliation. [Readiness](../integration/production-readiness.md) owns those gates.

## Five layers

| Layer | Responsibility | Must not own |
| --- | --- | --- |
| apps/web | React composition, API client, workspace/planner/builder hooks, rendering, local presentation preferences | SQL, direct DB access, authoritative permissions or source formulas |
| apps/api | Fastify routes, HTTP/session context, safe errors, provider HTTP adapter, configuration and dependency composition | Semantic formulas or chart-library domain contracts |
| packages/application | Templates, planners, executor, authorization orchestration, saved dashboard/library services | process.env, Fastify/React, source SQL |
| packages/domain | Contracts, semantic catalog, registry, canonical schemas, validators, ports and layout/chart rules | React, Fastify, SQLite, Recharts or LLM SDKs |
| packages/data | Canonical facts, deterministic engine/calendar, mock/SQLite analytics and metadata adapters | HTTP, user UI state, planner prompts |

### Dependency direction

Runtime flow is Web → HTTP API → Application → domain ports/contracts → configured adapters. Compile-time dependency inversion differs: application and data depend on domain; domain never imports data. API composes implementations. Web imports portable domain/presentation rules, application execution/template types, and the pure resolveDatePreset helper for blank drafts, and calls HTTP. It does not invoke repositories in the browser. [Repository map](repository-map.md) and [diagrams](diagrams.md) show both views.

## Contracts and why they exist

| Contract | Purpose / owner |
| --- | --- |
| MetricId | Closed executable metric vocabulary, contracts.ts |
| SemanticMetric | Source-independent name, measure requirements, dimensions, type/unit/formula, catalog.ts |
| MetricSemantics | Additive, ratio, snapshot, comparison-derived and duration-derived aggregation meaning |
| AnalyticsQuery | Bounded metric, grouping, date, filters and compatible analysis request |
| AnalyticsResult | Nullable rows with comparison/rank plus sourceId, executedAt, dataThrough and optional sourceAsOf/type/unit |
| DashboardGenerationPlan | Transient application-owned model intent; deterministic compilation into DashboardSpec, never persistence/execution |
| DashboardSpec | Portable v2 titles, widgets/series, user filters and canonical layout; no policy/theme/folder/SQL |
| DashboardPatch | Bounded add/remove/replace/title/filter/layout edit operations, not an expression language |
| DashboardRecord | Persisted spec plus record ID, tenant, owner, scope, optimistic version and timestamps |
| DashboardLibraryPreference | Personal favorite/folder association, separate from saved record |
| DashboardFolder | Flat personal tenant/user folder; deleting it does not delete records |
| RequestContext | Validated principal, membership, permissions, metric domains and enforced filters |
| AnalyticsRepository | Execute governed query in supplied tenant/locale/policy context |
| DashboardRepository | Tenant/owner/access/version-aware record persistence |
| DashboardLibraryRepository | Personal preferences and folder storage |
| DashboardPlanner | Generate spec / edit patch behind provider-independent application port |
| LLMProvider | Structured-output messages and schema contract returning unknown output |

See [domain contracts](../../packages/domain/src/contracts.ts), [security](../../packages/domain/src/security.ts), [record port](../../packages/domain/src/dashboard-repository.ts), [library port](../../packages/domain/src/dashboard-library.ts). Existing IdentityProvider, AuthorizationPolicy, AuditSink and DimensionValueRepository ports are preserved.

## Request boundaries

API validates identity membership and route permission; canonical validators enforce full JSON Schema, semantic analysis, visualization and layout rules; metric authorization runs before execution and again after planning/editing. Policy filters travel through RequestContext → AnalyticsContext and are ANDed with user filters; they are not editable spec state. Saved record access is tenant/owner/scope-aware, with metric authorization even for shared records.

Executor validates, normalizes and deduplicates queries **within one execute call**, then runs unique repository calls with a configurable bound (default 8). Identity includes metric/aggregation/group/date/filters/analysis and tenant/locale/enforced policy. No global cache exists. Result clones preserve independent series behavior and deterministic widget order. Failure isolation and required top-N anchor semantics are unchanged. [ADR 023](adr/023-execution-and-runtime-readiness.md).

## Structured planning

Generation uses prompt → compact application-owned DashboardGenerationPlan → plan validation → deterministic compiler → full canonical DashboardSpec v2/semantic validation → authorization → execution. The model chooses governed business intent; code owns IDs, tenant-timezone dates and canonical 12-column layout. Provider schema constraints must not weaken domain contracts. Editing continues through canonical DashboardPatch v2 and full validation of the applied draft. Repair is bounded; HTTP failures do not trigger semantic repair. [ADR 024](adr/024-compact-generation-plan.md), [provider contract and diagnostics](openai-compatible-provider.md).

## Semantics and representation

Revenue/order counts are additive. AOV = sum(revenue)/sum(order_count); gross margin = sum(gross_profit)/sum(net_revenue) with catalog scale; win rate derives from won/closed opportunities. Sales growth is comparison-derived. MTBF and MTTR derive from operating/failure and repair/completed-repair measures. Snapshot balances take latest entity/measure at cutoff, then aggregate entities, never dates. Compare periods using deterministic UTC calendar functions, not JavaScript overflowing month arithmetic. See [data model](../developer/data-model.md).

Multi-series top N is allowed only on the first series: it selects alignment keys. Remaining series align to those keys. If this required anchor fails, alignment remains empty with partial/error evidence; no unrestricted union. Aligned series retain value, comparisonValue, absoluteChange, percentageChange and rank; missing values remain null.

## Product boundaries

Theme/UI locale are preferences outside spec and never imply Save. Layout-only changes update a draft without analytics; semantic changes preview. Save is explicit and expected-version guarded. Library folders/favorites are personal records, not dashboard content. Recharts and React Grid Layout remain rendering/builder adapters. [Lifecycle ADR](adr/019-dashboard-persistence-lifecycle.md), [library ADR](adr/021-dashboard-library.md), [theme ADR](adr/022-web-presentation-themes.md).

## Current operational limits

Node DatabaseSync executes synchronously; async repository facades and bounded concurrency do not make SQLite parallel/non-blocking. Analytics loads relevant tenant measure facts into memory for the deterministic engine. There is no source query cancellation/pool, production authentication, persistent audit, migration version table or operational data reconciliation. Health probes check structure without business data and cannot interrupt synchronous blocking work. These are explicit integration risks, not completed production capabilities.
