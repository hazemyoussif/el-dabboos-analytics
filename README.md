# El-Dabbous AI Analytics

A source-independent, bilingual analytics prototype with two controlled synthetic markets, a ready-made dashboard library, a manual Dashboard Builder with saved dashboard records, and DashboardSpec v2 multi-metric visualizations. The default local tenant is Iraq (`demo-iq`); Egypt (`demo-eg`) uses the same templates and metrics.

## Local startup

Requires Node.js 24 and pnpm 12.6.0. From the repository root:

```bash
pnpm install --frozen-lockfile
# Optional safe demo configuration (mock analytics + planner):
cp .env.example .env
pnpm run seed demo.db
pnpm run dev:api
```

In another terminal:

```bash
pnpm run dev:web
```

Open <http://127.0.0.1:5173/>. The API listens at <http://127.0.0.1:3001/>. The seed command adds both `demo-iq` and `demo-eg` to a fresh local SQLite file; it refuses to overwrite existing facts for either tenant. If you retain an older v1 `demo.db`, the command can add the two new tenants to it. To use another path, pass it to `pnpm run seed <path>` and set `SQLITE_DB_PATH=<path>` for the API. API dev/start automatically load optional root `.env` then `.env.local`; shell variables take precedence. Tests do not load these files. Relative database paths are resolved from `apps/api` by workspace scripts; use absolute paths for a fixed database location. The built API starts with `pnpm run build` followed by `pnpm --filter @el-dabbous/api start`. `ANALYTICS_PROVIDER=mock` uses in-memory synthetic facts for both tenants.

The app opens the `Sales Performance` template under Iraq. Use the market selector to switch to Egypt, the language buttons for English/Arabic, and the sidebar for ten ready-made templates. The same template ID and widget definition are reused across markets. No AI service is required by default. The mock planner recognizes a bounded sales request such as `أريد dashboard للمبيعات ويّاه أعلى الزبائن والمديونيات` or `Create a sales dashboard`, then supports a few edits such as adding a three-month moving average or removing receivables. Unsupported intents return a structured error.

For generation and editing through a configured model endpoint, see the [OpenAI-compatible provider setup](docs/architecture/openai-compatible-provider.md). The API keeps the mock planner as its default.

## Checks

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

CI runs frozen install, lint, typecheck, all tests, and both builds.

## Product model

`packages/domain` owns 24 executable canonical metric definitions, a wider available/planned product metric registry, two server-governed TenantProfiles, and DashboardSpec/Patch v2 schemas. V1 schema files remain for historical reference; new routes accept v2 only. `packages/application` owns the market-neutral template catalog, mock and structured planners, and per-series executor. `packages/data` owns canonical source measures, deterministic calculations, and tenant-scoped mock/SQLite adapters. React never talks to SQLite or constructs AnalyticsQuery.

KPI widgets have one series. Line/bar widgets can combine compatible metrics such as revenue and gross profit, with one dimension and one presentation unit; currency and percentage cannot share a single axis. Tables may mix metric types and format each column independently. A failed series can leave the rest of its widget usable. Aligned rows retain null for missing values. Chronological ordering does not reverse in RTL.

The browser receives currency, time zone, locale, and branch labels from the server's controlled profile. Synthetic Iraqi monetary facts are nominal IQD and Egyptian facts nominal EGP; there is no FX conversion. In an operational source, transaction currency, company/base currency, and reporting currency must be distinguished before any aggregation. Unrelated currencies must not be summed without an approved conversion policy. Arabic UI uses Modern Standard Arabic; Iraqi and Egyptian dialect synonyms support future planning/evaluation, not ordinary labels. The demo selector is not authentication. Dashboard records are stored separately from DashboardSpec in SQLite (`DASHBOARD_DB_PATH`, default `dashboards.db`), independently of the analytics provider.

The fixture spans October 2024 through September 2026 with synthetic branch/customer geography. No branch or customer represents actual El-Dabbous operations. Planned metric concepts are discoverable but cannot execute until their data/formulas are approved. See [current assumptions](docs/architecture/current-assumptions.md), [architecture overview](docs/architecture/overview.md), and [ADRs](docs/architecture/adr/).

## Dashboard product flow

Choose **New dashboard** to create with AI, start blank, or select a template. Open a template and choose **Use template** to create an unsaved draft. Open a saved dashboard to view it, then choose **Edit** or **Edit with AI**. Choose **Blank dashboard** for an empty manual draft. Drag and resize cards, edit metrics and analyses, set dashboard filters, and use Undo/Redo. Layout changes stay local; semantic changes preview real tenant-scoped analytics through the existing API. Choose **View** to return to the dashboard preview. Manual and AI edits stay in a working draft until **Save**. **Save As** creates a separate record; **Discard** restores the last saved version or abandons a new draft. Saved dashboards appear separately from immutable templates in the library and reopen at `/dashboards/:recordId`. The browser stores the preferred UI language and last selected tenant; the tenant is checked against server membership on startup. The synthetic demo identity selector is retained only for the browser session and revalidated by the API. Switching language does not edit DashboardSpec. Switching markets reloads an accessible dashboard/template and clears the prior builder history. Generated dashboards can also enter Edit mode, whether the configured planner is mock or structured.

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
