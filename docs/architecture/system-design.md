# System design — primary architecture entry

## Status and responsibilities

**Unified serving core:** the runtime now uses one trusted revision per tenant for monthly fact partitions and exact receivables snapshots. Migration 040 adopts certified mart history without Odoo access. Historical bindings and Finance publications remain migration/rollback evidence. See [core lifecycle and migration](../integration/unified-serving-core.md). Explicit certified monthly history imports extend the trusted manifest without moving the operational cursor; incremental discovery no longer implicitly backfills absent older months.

The approved production comparison pilot extends the offline mart through [ADR 029](adr/029-ingestion-certification-lifecycle.md): immutable candidate → bounded paged extraction → completed reconciliation → metadata approval → separately authorized serving binding. [ADR 031](adr/031-certified-release-promotion.md) adds append-only authorized business approval as an alternative to external-report evidence and exact transactional promotion into a separate staging mart. Odoo source transport stays inside data; the operator command stays in API configuration/composition. [Pilot status](../integration/odoo-postgres-pilot.md) explicitly separates synthetic evidence from unavailable live evidence.

**Current:** governed bilingual dashboards and Ask Business with shared Analytics Intent, explicit versioned persistence and semantic conversation history; synthetic IQ/EG development plus accepted production-style local PostgreSQL staging. Read-only source ingestion, historical backfill, trusted event/snapshot serving, forced RLS, governed drill-through, local credentials/sessions and immutable migrations are implemented. [Current milestone](../management/current-milestone.md) and [QA index](../qa/README.md) delimit accepted evidence. **Future/gated:** company hosting, employee activation, company LLM access, scheduled source sync, full tracing and operational recovery approvals. The product remains an analytics system, not an ERP, SQL generation service or FX engine. [Readiness](../integration/production-readiness.md) owns launch gates.

## Five layers

| Layer | Responsibility | Must not own |
| --- | --- | --- |
| apps/web | React composition, API client, workspace/planner/builder hooks, rendering, local presentation preferences | SQL, direct DB access, authoritative permissions or source formulas |
| apps/api | Fastify routes, HTTP/session context, safe errors, provider HTTP adapter, configuration and dependency composition | Semantic formulas or chart-library domain contracts |
| packages/application | Templates, planners, executor, authorization orchestration, saved dashboard/library services | process.env, Fastify/React, source SQL |
| packages/domain | Contracts, semantic catalog, registry, canonical schemas, validators, ports and layout/chart rules | React, Fastify, SQLite, Recharts or LLM SDKs |
| packages/data | Canonical facts, deterministic engine/calendar, mock/SQLite and PostgreSQL analytics, mart ingestion/reconciliation and SQLite metadata adapters | HTTP, user UI state, planner prompts |

### Dependency direction

Runtime flow is Web → HTTP API → Application → domain ports/contracts → configured adapters. Compile-time dependency inversion differs: application and data depend on domain; domain never imports data. API composes implementations. Web imports portable domain/presentation rules, application execution/template types, and pure date/filter helpers for authoring and temporary viewing, and calls HTTP. It does not invoke repositories in the browser. [Repository map](repository-map.md) and [diagrams](diagrams.md) show both views.

## Contracts and why they exist

| Contract | Purpose / owner |
| --- | --- |
| MetricId | Closed executable metric vocabulary, contracts.ts |
| SemanticMetric | Source-independent name, measure requirements, dimensions, type/unit/formula, catalog.ts |
| MetricSemantics | Additive, ratio, snapshot, comparison-derived and duration-derived aggregation meaning |
| AnalyticsQuery | Bounded metric, grouping, date, filters and compatible analysis request |
| AnalyticsResult | Nullable rows with comparison/rank plus sourceId, executedAt, dataThrough and optional sourceAsOf/type/unit |
| DashboardGenerationPlan | Transient application-owned model intent; deterministic compilation into DashboardSpec, never persistence/execution |
| DashboardEditPlan | Transient sparse application intent; deterministic compilation into canonical patch, never persistence/execution |
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

Generation uses prompt → compact application-owned DashboardGenerationPlan → plan validation → deterministic compiler → full canonical DashboardSpec v2/semantic validation → authorization → execution. The model chooses governed business intent and only explicitly requested presentation/analysis. Generation schema separates one-series, dimensionless KPI summaries from required-dimension non-KPI groups. A deterministic resolver owns unspecified KPI/Line/Bar/Table choice and compatible presentation defaults; explicit incompatible requests fail canonical validation. Only governed palette names can enter spec/patch, with actual colors resolved by web themes. Code owns IDs and canonical 12-column layout; relative date intent remains symbolic until tenant-timezone execution resolution. Provider schema constraints must not weaken domain contracts. Editing validates transient sparse DashboardEditPlan, compiles canonical DashboardPatch v2 and fully validates/authorizes the applied draft; omitted values preserve current business intent and layout. [ADR-025](adr/025-compact-dashboard-edit-plan.md). Repair is bounded; HTTP failures do not trigger semantic repair. [ADR 024](adr/024-compact-generation-plan.md), [provider contract and diagnostics](openai-compatible-provider.md).

## Semantics and representation

Revenue/order counts are additive. AOV = sum(revenue)/sum(order_count); gross margin = sum(gross_profit)/sum(net_revenue) with catalog scale; win rate derives from won/closed opportunities. Sales growth is comparison-derived. MTBF and MTTR derive from operating/failure and repair/completed-repair measures. Snapshot balances take latest entity/measure at cutoff, then aggregate entities, never dates. Compare periods using deterministic UTC calendar functions, not JavaScript overflowing month arithmetic. See [data model](../developer/data-model.md).

Multi-series top N is allowed only on the first series: it selects alignment keys. Remaining series align to those keys. If this required anchor fails, alignment remains empty with partial/error evidence; no unrestricted union. Aligned series retain value, comparisonValue, absoluteChange, percentageChange and rank; missing values remain null.

## Product boundaries

Theme/UI locale are preferences outside spec and never imply Save. Layout-only changes update a draft without analytics; semantic changes preview. Save is explicit and expected-version guarded. Library folders/favorites are personal records, not dashboard content. Recharts and React Grid Layout remain rendering/builder adapters. [Lifecycle ADR](adr/019-dashboard-persistence-lifecycle.md), [library ADR](adr/021-dashboard-library.md), [theme ADR](adr/022-web-presentation-themes.md).

## Current operational limits

Node DatabaseSync executes synchronously; async repository facades and bounded concurrency do not make SQLite parallel/non-blocking. Analytics loads relevant tenant measure facts into memory for the deterministic engine. The opt-in PostgreSQL mart adapter has a pool, statement timeout, forced tenant RLS, versioned migrations and frozen synthetic reconciliation. Company employee activation, additional source integration and production operational backup/restore evidence remain gated; local credentials/sessions and immutable security audit are implemented in the control database. Health probes check structure without business data and cannot interrupt synchronous blocking work. These are explicit integration risks, not completed production capabilities.

## Manual palette path

The manual builder offers a native localized Palette / لوحة الألوان selector for the domain governed palette vocabulary. Existing widgets preview a palette change immediately through normal BuilderCommand/canonical replacement, without another analytics request. Metrics, dimension, analyses, filters, layout and unrelated presentation remain unchanged; pending editor settings are retained. Undo/Redo participates in normal bounded history. Changes remain unsaved until explicit Save and survive record reopening. A new widget retains its chosen palette in the editor until Apply adds it. Selecting Default writes `palette: "default"`; omission from older specs or unrequested AI intent resolves to the same default colors. No raw color picker is exposed.

Manual and sparse AI palette edits converge on `WidgetPresentation.palette`; generation can supply the same governed token. The centralized web ChartTheme resolves actual Light/Dark colors. Builder and provider plans never store resolved colors, CSS or chart-library options. Global theme/locale remain preferences outside saved content.

## Relative periods and viewer filters

DashboardSpec v2 business filters persist a symbolic datePreset, fixed dateRange, or neither for all time. The modes are mutually exclusive. Templates and blank drafts preserve relative intent. Execution accepts a separate trusted timezone plus transient viewer overrides, resolves concrete business filters once, then validates/identifies repository queries. effectiveFilters metadata exposes only business selections; source coverage and policy remain separate. Viewer controls use the governed cross-series dimension intersection and policy-scoped values. Reset/navigation/enter-edit restore canonical defaults without dirtying or saving; authoring uses normal semantic patches/history and explicit Save. [ADR 026](adr/026-relative-dates-and-viewer-filters.md).

## Offline production foundation

[ADR 027](adr/027-production-data-foundation.md) establishes an El Dabboos-owned PostgreSQL mart, separate ingestion envelope, source reader, versioned mapping certification and reconciliation contracts. Domain validators, the current [immutable migration set](database-migrations.md), role/RLS enforcement, a mart writer, frozen reconciliation and bounded SQL-based serving are implemented and tested on PostgreSQL 18.6. [Operations](../integration/postgres-mart-operations.md) documents provisioning and limits. Existing mock/SQLite execution is unchanged. Additional production sources/mappings require separate approval; accepted local publications do not authorize general production rollout.

## Administration architecture checkpoint

[ADR 028](adr/028-customer-tenant-access-control.md) defines customer/tenant, identity/membership and role/scope/grant administration with separate platform authority. Versioned metadata persistence, transactional services, strict APIs, grant-aware saved records and permission-gated admin pages are implemented. AccessDirectory and TenantProfileProvider load current persisted state; dynamic profiles have no fabricated branch labels/examples and analytics readiness is independent of workspace lifecycle. Analytics contracts and the PostgreSQL mart are unchanged. [Implementation handoff](../security/access-control-sol-handoff.md), [local operations](../security/administration-operations.md), [verification status](../security/access-control-implementation-status.md).

## Engineering quality decomposition

Administration composition now binds named typed operations in `packages/application/src/administration/`: roles, memberships, workspace, audiences, customers, tenants and users. The runtime owns fresh transactional actor resolution and safe failure audit, while each operation owns its authorization, CAS, recovery and successful audit. Operational provisioning lives in application operations composed by `apps/api/src/administration-cli.ts`.

`SqliteAdministrationStore` retains the real-path queue, `BEGIN IMMEDIATE`, connection and unit of work. Transaction-bound metadata repositories and row mapping reside in `packages/data/src/metadata/administration/`; none starts a transaction. Operational persistence ports remain available only to trusted composition, never an HTTP endpoint.

Resource route modules in `apps/api/src/routes/administration/` validate each request and call its named operation without command casts. Eight concrete page components in `apps/web/src/admin/` own their DTOs and versioned form serialization. Shared request ownership protects loads, mutations, unmounts and customer selection. No visual redesign is included. Governed persistence readiness now invokes the configured probe without requiring the legacy dashboard repository; health response semantics remain unchanged.

[Engineering standards](../developer/engineering-standards.md) and fixture-tested architecture/quality/diff checks are mandatory. Historical ceilings derive only from `fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368`; administration has no allowance. [Historical debt](../developer/engineering-quality-debt.md) is a subsequent workstream.

## Control database boundary

[PostgreSQL control operations](../integration/postgres-control-plane.md) implement a separate control database with explicit immutable migrations, dedicated migrator/app identities, shared administration contracts and a transactional exact-row SQLite cutover tool. Source/company scope and governed mapping authoring live there; source secrets resolve externally. The Analytics mart retains immutable evidence/releases/bindings and independent serving authority. PostgreSQL control mode never opens metadata SQLite and refuses synthetic production authentication. Shared staging images, explicit offline bootstrap, separate staging database logins, safe deployment configuration, correlation logs and exact schema readiness are implemented; see [shared staging runbook](../integration/shared-staging.md). Local password/session identity now resolves provider + stable subject through current IdentityBinding/ProductUser, with authorization fresh on each protected operation; [ADR 030](adr/030-local-identity-provider.md) and [local auth runbook](../security/local-authentication.md). External deployment, employee activation and additional IdP integrations remain pending.

## Operational serving v1

The application-owned `AnalyticsOperations` lifecycle now composes a retained
read-only Odoo source adapter and one tenant-owned PostgreSQL transaction. Separate
immutable operational revisions and affected-month aggregate partitions reference
approved baseline semantics; deferred exact-evidence guards control a pinned
trusted manifest. Rejected candidates preserve current reads and successful source
cursors. Runtime RLS permits current trusted aggregates only. Operator commands
own synchronization, presence checks and reconciliation; no planner/model runs in
these jobs or in stored trusted report retrieval.

Historical Phase-A receivable summaries conservatively recheck their published
cutoffs when a component dependency changes. Original September categorical
Finance outputs remain independently certified and pinned, with cached-proof-only
reads; they are not part of this summary adapter's incremental promotion scope.
See [operational analytics v1](../integration/operational-analytics-v1.md) for exact
scope, source watermark limits, migration/bootstrap ownership and command usage.

## Event aggregate range serving

Migration 034 adds exact, frozen monthly rollups above the existing daily event
bases. The operational lifecycle copies untouched days, rebuilds old/new changed
dates and reconciles both grains before promotion. A deterministic planner selects
complete trusted months and daily edges per output slot, preserving full dimension
and policy intersections. Semantic compatibility follows immutable baseline and
manifest partition lineage; snapshot Finance remains separate. See
[event aggregate operations](../integration/event-serving-aggregates.md).

## Shared AI Analyst foundation

Dashboard generation and direct business questions now share application-owned
analytics series intent/schema, semantic context, trusted preference resolution,
transformation compilation and result alignment. `AnalyticsIntentExecutor` executes
validated intent against configured governed repositories without creating a
dashboard. It preserves publication, policy, coverage and snapshot semantics;
provider output remains untrusted. Ask Business adds a bilingual conversational page,
fresh-session API, private versioned control-plane history and atomic safe question
audits. Deterministic answers, clarification and stable entity follow-ups reuse this
core; dashboard handoff opens an explicit unsaved draft. See
[shared semantic core](shared-ai-analyst.md) for contracts, evaluation, bounded
conversation state, provider compatibility and current capability limits.
