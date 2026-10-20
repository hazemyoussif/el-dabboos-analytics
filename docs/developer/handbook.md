# Developer handbook — returning to the project

Start with [system design](../architecture/system-design.md), then [local development](local-development.md). This is a source-independent prototype, not a production Odoo connection. Read [current assumptions](../architecture/current-assumptions.md) before making integration claims.

## What starts where?

Web main.tsx mounts App, theme provider and workspace feature hooks. API server.ts parses runtime config, composes analytics/metadata/model adapters and calls buildApi. app.ts registers cohesive route modules and the shared safe error handler. Tests compose buildApi directly without reading developer env files.

## File map

| Question | Inspect first |
| --- | --- |
| Where do requests enter? | apps/web/src/api/client.ts → apps/api/src/app.ts → routes/ |
| Identity and tenant state? | web hooks/useWorkspace.ts; API context.ts and routes/identity.ts |
| Authorization? | application/security.ts; API context.ts; domain/security.ts; data engine policy intersection |
| Metrics / formulas? | domain/contracts.ts and catalog.ts; metric-registry.ts for product availability/domains |
| Source measures / calculation? | data/facts.ts, engine.ts, calendar.ts, sqlite.ts, mock.ts |
| Layout / chart rules? | domain/layout.ts, visualization.ts, validation.ts and canonical schemas |
| Builder and metric drop? | web hooks/useDashboardBuilder.ts; builder/model.ts, metric-drop.ts, grid-map.ts, DashboardGrid.tsx |
| Templates? | application/templates.ts; API routes/templates.ts; web library/TemplateBrowser.tsx |
| Sales Command Center? | application/sales-command-center.ts and sales-command-center-definition.ts; API routes/sales-command-center.ts; web reports/SalesCommandCenterPage.tsx; [implementation and inspection](../integration/sales-command-center.md) |
| Saved dashboard lifecycle? | application/saved-dashboards.ts; data/dashboard-sqlite.ts; API routes/saved-dashboards.ts; web dashboard-lifecycle.ts and hooks/useDashboardProductFlow.ts |
| Folders/preferences? | application/dashboard-library.ts; data/library-sqlite.ts; API routes/dashboard-library.ts; web library-model.ts and hooks/useDashboardLibrary.ts |
| LLM transport / planner? | API providers/openai-compatible.ts; application/structured-planner.ts, generation-plan.ts, edit-plan.ts, visualization-intent.ts, provider-schema.ts, structured-diagnostics.ts; API structured-diagnostics.ts |
| Ask Business / conversations? | web analyst/; API routes/ai-analyst.ts; application analyst-conversations.ts, analyst-answer.ts; data metadata/analyst.ts and analyst-access.ts; domain analyst.ts |
| AI operation progress/errors? | web hooks/useDashboardPlanner.ts, planner-activity.ts, planner-copy.ts and product/AiProgress.tsx |
| Themes and chart colors? | web presentation/ThemeProvider.tsx, preferences.ts; styles/tokens.css; rendering/chart-theme.ts |
| Sidebar/navigation? | web shell/WorkspaceNavigation.tsx; product/ and library/ flows |
| Renderer? | web Renderer.tsx plus focused rendering/*Content.tsx and composition.ts |
| Configuration / health? | API startup-config.ts, server.ts, routes/health.ts |

Paths above are relative to packages or apps stated; [repository map](../architecture/repository-map.md) gives responsibilities and allowed dependencies. Use [debugging guide](debugging-guide.md) for symptom traces, [change guides](change-guides/add-metric.md) for extension checklists, and [testing guide](testing-guide.md) before pushing.

## First useful session

Run frozen install and targeted tests; start mock API with a disposable metadata DB; browse IQ and EG templates; create a draft, edit, Save, reopen, then change theme/language while monitoring requests. Confirm layout-only changes and preferences do not execute queries/save. Read an API authorization test and a data engine test before touching security/semantics. Preserve established ports rather than moving HTTP into application code.

## Administration metadata

For the approved source pilot, use [Odoo PostgreSQL operations](../integration/odoo-postgres-pilot.md). `pnpm odoo:pilot` is an explicit offline API composition boundary; it reads local source configuration, registers candidates and executes paged extraction/DB controls under one bounded retained PostgreSQL snapshot. It cannot approve a release or create a serving binding.

Use the dedicated metadata migration/bootstrap commands before starting the governed API; repositories never auto-upgrade. Keep the metadata database separate from demo analytics and the PostgreSQL mart. Read [local administration operations](../security/administration-operations.md) for explicit demo reconciliation, trusted operational bootstrap, tenant candidates, version conflicts and source-readiness behavior. [Verification status](../security/access-control-implementation-status.md) distinguishes automated evidence from the deferred manual UI and production gates.

## Engineering review and administration operations

Follow [engineering standards](engineering-standards.md) in addition to functional tests. Run `check:architecture`, `check:quality` and `check:diff`; debt may not grow beyond the historical pre-feature source. See [remaining debt](engineering-quality-debt.md).

For one administration flow, read the named operation in `packages/application/src/administration/<area>.ts`, its typed HTTP handler in `apps/api/src/routes/administration/<area>.ts`, and its concrete page in `apps/web/src/admin/`. The composition module binds operations and owns no generic resource/action dispatch. Operational bootstrap/provisioning is composed by `apps/api/src/administration-cli.ts`; the command `pnpm metadata:bootstrap` is unchanged. SQLite's connection/transaction owner remains the metadata store, with explicit transaction-bound repository factories beside it.

For persistent local PostgreSQL mart setup on port 55437, use [local Analytics mart operations](../integration/local-analytics-mart.md). The disposable PostgreSQL suite remains on port 55436; local bootstrap and migration commands explicitly load root environment files.

The PostgreSQL test runner executes test files serially against the shared disposable server so large source and serving benchmarks do not exhaust its temporary storage. Transaction-race tests still run concurrent operations inside each test.

## PostgreSQL control persistence

Use [control-plane operations](../integration/postgres-control-plane.md) for provisioning, explicit control migrations, source references and approved SQLite cutover. `CONTROL_PROVIDER=sqlite` remains local compatibility; `postgres` uses only `CONTROL_DATABASE_URL` for runtime storage and requires disabled or local session identity. Keep `demo.db` synthetic/local, `dashboards.db` as compatibility/migration source, and control credentials separate from all mart identities. No runtime auto-migration, dual writes or source-discovery serving dependency is introduced.

## Shared staging

Use [shared staging operations](../integration/shared-staging.md) for immutable API/web images, separate staging DB identities, explicit `pnpm staging provision|migrate|bootstrap|verify`, inactive identity placeholders and backup/restore. These commands never load developer env files. Shared-mode startup requires PostgreSQL and approved CORS origins and rejects synthetic identity. Bootstrap uses fresh governed metadata rather than the demo seed or legacy SQLite import.

Local authentication uses pinned Better Auth behind provider-neutral ports, separate `auth.*` control storage and fresh product authorization. See [local identity operations and security gates](../security/local-authentication.md) and [ADR 030](../architecture/adr/030-local-identity-provider.md). `pnpm auth:local provision` is privileged offline initial setup with protected stdin; it never grants membership.

The [operational analytics milestone](../integration/operational-analytics-v1.md)
records historical range/ratio/snapshot improvements, stored operational evidence,
read-only status, and the unimplemented production job/serving adapters. Do not
interpret the application transaction ports as a configured synchronization job.

Trusted event range serving reuses daily full-dimensional bases and selects exact
monthly rollups plus daily edges. See [event aggregate operations](../integration/event-serving-aggregates.md)
for migration 034, resumable backfill, planner diagnostics and staging grants.

## Ask Business runtime

Read [shared AI Analyst](../architecture/shared-ai-analyst.md) before changing conversational behavior. Apply SQLite metadata 005 or PostgreSQL control 008 explicitly before starting the page. The structured dashboard provider also plans questions; optional `ANALYST_SYNTHESIS` defaults false. Questions and history require fresh AI-generation and analytics permissions. History is private to the user and tenant, expires after 30 days, and uses optimistic versions. Keep live-provider smoke outside tests and do not load developer env in automated coverage. See [delivery evidence](../qa/ask-business-2026-10-08.md).

## Excel exports

The dashboard viewer provides **Export dashboard to Excel** (one worksheet per
dashboard, with a labeled section for each widget). Tables, including the expandable chart-value tables, provide **Export
table to Excel**. Both use the existing authorized execution in the browser;
export never fetches additional rows, executes analytics or saves the dashboard.
Top N and current viewer filters therefore remain in effect. Exported sheets carry
the resolved date range, selected dimension identities, workspace, currency,
execution time, data status and snapshot cutoff where supplied. Missing values
remain blank, failed cards remain identified, and comparisons retain their exact
numeric values. Numbers use numeric Excel cells without UI rounding; percentages
retain the application's percentage-point scale. Untrusted labels remain text,
including labels beginning with formula characters. English and Arabic labels and
RTL worksheets follow the current locale. The XLSX writer loads only on export.
Dashboard Excel export contains the cards' data, rather than chart images or the
screen layout. PDF export is not included.

Excel export is available on dashboard tables, drill-through details, Ask Business answer tables, data-status capability tables and administration tables. Drill-through exports the currently loaded rows after search/sort; use **Load more** before exporting to include additional pages. Administration exports the displayed page and excludes the Actions column. Ask Business exports its returned rows and records the omitted-row count. Drill contributions retain their exact decimal strings as Excel text to avoid precision loss. These exports do not fetch hidden records or change access scope.

### Table scrolling and report links

Tables use bounded internal vertical/horizontal scrolling with sticky column headers. Their scroll region is keyboard focusable; short tables retain all rows without requiring vertical scrolling. Dashboard, chart-value, Ask Business, drill, capability and administration tables share this behavior. Existing exports retain all currently loaded rows, including rows below the visible scroll area.

Available report, template and saved-dashboard destinations are native links. Right-click offers browser link actions; middle-click and Ctrl/Cmd-click open another tab without replacing the current draft. Ordinary clicks keep the existing guarded navigation and unsaved-change checks. Unavailable destinations remain disabled controls. Mobile drawer keyboard containment includes the new links.

Chart cards fit their headings, legends, paging/search controls and chart-value action without an outer scrollbar. Viewer grid tracks can grow while preserving saved grid coordinates; the builder layout model is unchanged. The plot retains a bounded scrolling viewport, and chart-value/detail tables keep their internal table scrolling. This also applies to chart-only reports and wrapped Arabic/mobile controls.

### Purposeful charts and large reports

The source-backed management templates add chart companions where trends, ranked comparisons or cumulative positive sales share clarify the question. Detail tables remain available. Optional new charts appear only when their published metric/grouping pairs cover the report period; missing chart capabilities retain the original supported report. Pareto shows its actual cumulative percentage on a 0–100% axis with an 80% reference; it never mixes monetary bars and percentages on one axis. Monetary margin and margin percentage use separate panels. Calendar dates, mixed product-unit quantities and actionable exceptions remain tables. Known aging, credits, provisional segments, book balances and observed cohorts keep their existing definitions and limitations.

Large dashboard/expanded chart-value tables use 100-row presentation pages above 200 loaded rows. Search covers all loaded row labels; exports retain all loaded rows, including other pages and search exclusions, as disclosed beside search. Categorical bar charts above 50 categories use 25-category pages with the same numeric extent across pages. Numeric category comparisons without explicit analyses sort by the first plotted measure; explicit analysis order is preserved. They retain negative/null categories and keep original row identity for drill actions. Temporal order stays chronological. Large hidden chart-value tables mount on demand; large line charts expose point-level drill through the exact-value table rather than thousands of marks. No page, search, layout or theme change issues a new analytics query or changes saved content.

October 15 chart/performance verification: nineteen optional chart companions across fourteen source-backed report templates; original detail widgets and saved records remain intact. The optional-chart API regression retains supported summary reports when monthly grouping is unpublished. The full suite passed 900 unit/API/web tests, with zero failures/skips; lint, architecture, quality, typecheck, build and diff checks passed. No data adapter, source schema, source permissions, migration or stored financial definition changed.

Synthetic local benchmarks (individual CPU operations, not end-to-end source/dashboard latency): alignment of 10,000 rows × six metrics fell from 2,220 ms to 53 ms; formatting 60,000 currency values fell from 2,116 ms to 97 ms. Alignment tests enforce linear key access and preserve null/duplicate/selection behavior. A 10,000-row UI regression mounts 100 rows, searches the full loaded population and exports all 10,000 rows. Existing request-local query deduplication makes margin chart/table companions reuse the original six repository queries.

Manual AFTER evidence: all fourteen enhanced previews were exercised in English/Light desktop and Arabic/Dark phone layouts, with tablet Arabic/Dark checks, no page-level horizontal overflow, Pareto percentage/80% reference, chart paging, full-population row-label search and on-demand exact chart values. RTL bar labels and mobile plot height were corrected during review. Previews used explicitly synthetic data and were removed afterward; this is not hosted staging acceptance. Source-backed monetary/control verification remains the separate integration evidence.
