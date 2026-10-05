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
| Saved dashboard lifecycle? | application/saved-dashboards.ts; data/dashboard-sqlite.ts; API routes/saved-dashboards.ts; web dashboard-lifecycle.ts and hooks/useDashboardProductFlow.ts |
| Folders/preferences? | application/dashboard-library.ts; data/library-sqlite.ts; API routes/dashboard-library.ts; web library-model.ts and hooks/useDashboardLibrary.ts |
| LLM transport / planner? | API providers/openai-compatible.ts; application/structured-planner.ts, generation-plan.ts, edit-plan.ts, visualization-intent.ts, provider-schema.ts, structured-diagnostics.ts; API structured-diagnostics.ts |
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
