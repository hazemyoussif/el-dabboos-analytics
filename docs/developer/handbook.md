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
