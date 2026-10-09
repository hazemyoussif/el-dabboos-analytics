# El Dabboos AI Analytics

A governed bilingual analytics platform prototype: dashboards with manual/AI drafts and explicit Save, Ask Business with private semantic conversation history, trusted PostgreSQL serving, Finance snapshots and governed drill-through. Multi-tenant authorization and forced mart RLS protect production-style local staging. The default development mode uses synthetic Iraq (`demo-iq`) and Egypt (`demo-eg`) facts.

The [current milestone](docs/management/current-milestone.md) records accepted capabilities, limitations and QA. Company staging/server deployment remains pending; its separate company-hosted LLM is configured through runtime environment.

## Local startup

Requires Node.js 24 and pnpm 12.6.0. From the repository root:

```bash
pnpm install --frozen-lockfile
# Optional safe demo configuration (mock analytics + planner):
cp .env.example .env
pnpm run seed demo.db
# Governed demo metadata has an explicit schema/identity bootstrap.
export DASHBOARD_DB_PATH="$PWD/dashboards.db"
pnpm metadata:migrate "$DASHBOARD_DB_PATH" --demo
pnpm run dev:api
```

In another terminal:

```bash
pnpm run dev:web
```

Open <http://127.0.0.1:5173/>. The API listens at <http://127.0.0.1:3001/>. The seed command adds both `demo-iq` and `demo-eg` to a fresh local SQLite file; it refuses to overwrite existing facts for either tenant. If you retain an older v1 `demo.db`, the command can add the two new tenants to it. To use another path, pass it to `pnpm run seed <path>` and set `SQLITE_DB_PATH=<path>` for the API. API dev/start automatically load optional root `.env` then `.env.local`; shell variables take precedence. Tests do not load these files. Relative database paths are resolved from `apps/api` by workspace scripts; use absolute paths for a fixed database location. The built API starts with `pnpm run build` followed by `pnpm --filter @el-dabboos/api start`. `ANALYTICS_PROVIDER=mock` uses in-memory synthetic facts for both tenants.

The app opens the `Sales Performance` template under Iraq. Use the market selector to switch to Egypt, the language buttons for English/Arabic, and Templates navigation for the ready-made template library. The same template ID and widget definition are reused across markets. No AI service is required by default. The mock planner recognizes a bounded sales request such as `أريد dashboard للمبيعات ويّاه أعلى الزبائن والمديونيات` or `Create a sales dashboard`, then supports a few edits such as adding a three-month moving average or removing receivables. Unsupported intents return a structured error.

For generation and editing through a configured model endpoint, see the [OpenAI-compatible provider setup](docs/architecture/openai-compatible-provider.md). The API keeps the mock planner as its default.

## Checks

```bash
pnpm run lint
pnpm run check:architecture
pnpm run check:quality
pnpm run typecheck
pnpm test
pnpm run test:postgres
pnpm run build
pnpm run check:diff
```

CI runs frozen install and all listed gates, including disposable synthetic PostgreSQL coverage. It does not publish or deploy images. See the [testing guide](docs/developer/testing-guide.md) for database setup; tests do not use developer env files or live model/customer services.

## Product model

`packages/domain` owns canonical metric definitions, a wider available/planned product metric registry, server-governed TenantProfiles, and DashboardSpec/Patch v2 schemas. V1 schema files remain for historical reference; new routes accept v2 only. `packages/application` owns the market-neutral template catalog, mock and structured planners, and per-series executor. `packages/data` owns canonical source measures, deterministic calculations, and tenant-scoped mock/SQLite and trusted PostgreSQL adapters. API composes production control persistence and analytics serving; React calls HTTP rather than databases. [System design](docs/architecture/system-design.md) owns the five-layer boundaries.

KPI widgets have one series. Line/bar widgets can combine compatible metrics such as revenue and gross profit, with one dimension and one presentation unit; currency and percentage cannot share a single axis. Tables may mix metric types and format each column independently. A failed series can leave the rest of its widget usable. Aligned rows retain null for missing values. Chronological ordering does not reverse in RTL.

The browser receives currency, time zone, locale, and branch labels from the server's controlled profile. Synthetic Iraqi monetary facts are nominal IQD and Egyptian facts nominal EGP; there is no FX conversion. In an operational source, transaction currency, company/base currency, and reporting currency must be distinguished before any aggregation. Unrelated currencies must not be summed without an approved conversion policy. Arabic UI uses Modern Standard Arabic; Iraqi and Egyptian dialect synonyms support future planning/evaluation, not ordinary labels. The demo selector is not authentication. Dashboard records are stored separately from DashboardSpec, using local SQLite metadata (`DASHBOARD_DB_PATH`, default `dashboards.db`) or PostgreSQL control persistence in staging, independently of the analytics provider. Governed metadata requires [explicit migrations](docs/architecture/database-migrations.md) before startup.

The fixture spans October 2024 through September 2026 with synthetic branch/customer geography. No branch or customer represents actual El Dabboos operations. Planned metric concepts are discoverable but cannot execute until their data/formulas are approved. See [current assumptions](docs/architecture/current-assumptions.md), [architecture overview](docs/architecture/overview.md), and [ADRs](docs/architecture/adr/).

## Dashboard product flow

Choose **New dashboard** to create with AI, start blank, or select a template. Open a template and choose **Use template** to create an unsaved draft. Open a saved dashboard to view it, then choose **Edit** or **Edit with AI**. Choose **Blank dashboard** for an empty manual draft. Drag and resize cards, edit metrics and analyses, set dashboard filters, and use Undo/Redo. Choose a governed Palette in widget properties for an immediate preview; Undo/Redo and explicit Save retain the choice. Palette and layout changes reuse results; semantic changes preview real tenant-scoped analytics through the existing API. Choose **View** to return to the dashboard preview. Manual and AI edits stay in a working draft until **Save**. **Save As** creates a separate record; **Discard** restores the last saved version or abandons a new draft. Saved dashboards appear separately from immutable templates in the library and reopen at `/dashboards/:recordId`. The browser stores the preferred UI language and last selected tenant; the tenant is checked against server membership on startup. The synthetic demo identity selector is retained only for the browser session and revalidated by the API. Switching language does not edit DashboardSpec. Switching markets reloads an accessible dashboard/template and clears the prior builder history. Generated dashboards can also enter Edit mode, whether the configured planner is mock or structured.

## Dashboard customization

In Edit mode, use the dedicated handle to move a widget, or resize from its edges
and corners. Focus the handle for arrow-key movement and Shift+arrow resizing.
The properties panel supplies X/Y/Width/Height controls and type-specific presets.
Canvas actions offer Duplicate, Delete and Reset size. Drag a palette button onto
the desktop canvas to add a validated widget at the snapped location; click-to-add
remains available for keyboard users. Auto arrange retains sizes; Reset layout
returns to default placement. Both participate in Undo/Redo. All layout changes
stay in the working draft and do not execute analytics or auto-save. Narrow
screens stack widgets and disable direct grid manipulation.

See [the grid adapter decision](docs/architecture/adr/020-dashboard-customization.md)
and [all API environment settings](docs/architecture/openai-compatible-provider.md#native-api-environment-loading-node-24).

## Ask Business and staging

Ask Business shares validated Analytics Intent with dashboard AI and supports EN/AR, clarification, semantic follow-ups, deterministic trusted answers, provenance, View Details and supported answer-to-dashboard drafts. Its LLM plans intent; it never generates SQL, queries source databases or calculates authoritative values. [Shared AI architecture](docs/architecture/shared-ai-analyst.md) owns semantics; [QA evidence](docs/qa/README.md) records Bonsai recovery and final local acceptance.

For reproducible production-style local staging, use the [staging runbook](docs/integration/shared-staging.md). The [deployment contract](docs/architecture/runtime-and-deployment.md) specifies single-server Linux staging, protected runtime configuration, a separate company LLM and future immutable-image CI/CD. No external deployment or GitHub deployment automation is activated.

## Documentation

- [Current milestone](docs/management/current-milestone.md) and [QA index](docs/qa/README.md)
- [Finance snapshot semantics](docs/integration/receivables-aging-v1.md) and [event serving](docs/integration/event-serving-aggregates.md)
- [Product stories and acceptance](docs/product/user-stories.md)
- [System design](docs/architecture/system-design.md) and [ADRs](docs/architecture/adr/)
- [Developer handbook](docs/developer/handbook.md)
- [Debugging](docs/developer/debugging-guide.md) and [configuration](docs/developer/configuration.md)
- [Manual QA](docs/qa/manual-test-plan.md)
- [Agent guide](AGENTS.md)
- [Integration readiness](docs/integration/production-readiness.md) and [Malik questions](docs/integration/questions-for-malik.md)

See [brand assets and browser preference compatibility](docs/developer/branding.md).
