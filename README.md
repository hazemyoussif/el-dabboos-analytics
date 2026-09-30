# El-Dabbous AI Analytics

A source-independent, bilingual analytics prototype with two controlled synthetic markets, a ready-made dashboard library, a session-only manual Dashboard Builder, and DashboardSpec v2 multi-metric visualizations. The default local tenant is Iraq (`demo-iq`); Egypt (`demo-eg`) uses the same templates and metrics.

## Local startup

Requires Node.js 24 and pnpm 12.6.0. From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run seed demo.db
pnpm run dev:api
```

In another terminal:

```bash
pnpm run dev:web
```

Open <http://127.0.0.1:5173/>. The API listens at <http://127.0.0.1:3001/>. The seed command adds both `demo-iq` and `demo-eg` to a fresh local SQLite file; it refuses to overwrite existing facts for either tenant. If you retain an older v1 `demo.db`, the command can add the two new tenants to it. To use another path, pass it to `pnpm run seed <path>` and set `SQLITE_DB_PATH=<path>` for the API. The built API starts with `pnpm run build` followed by `pnpm --filter @el-dabbous/api start`. `ANALYTICS_PROVIDER=mock` uses in-memory synthetic facts for both tenants.

The app opens the `Sales Performance` template under Iraq. Use the market selector to switch to Egypt, the language buttons for English/Arabic, and the sidebar for ten ready-made templates. The same template ID and widget definition are reused across markets. No AI service is required. The mock planner recognizes a bounded sales request such as `أريد dashboard للمبيعات ويّاه أعلى الزبائن والمديونيات` or `Create a sales dashboard`, then supports a few edits such as adding a three-month moving average or removing receivables. Unsupported intents return a structured error.

## Checks

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

CI runs frozen install, lint, typecheck, all tests, and both builds.

## Product model

`packages/domain` owns 24 executable canonical metric definitions, a wider available/planned product metric registry, two server-governed TenantProfiles, and DashboardSpec/Patch v2 schemas. V1 schema files remain for historical reference; new routes accept v2 only. `packages/application` owns the market-neutral template catalog, mock planner, and per-series executor. `packages/data` owns canonical source measures, deterministic calculations, and tenant-scoped mock/SQLite adapters. React never talks to SQLite or constructs AnalyticsQuery.

KPI widgets have one series. Line/bar widgets can combine compatible metrics such as revenue and gross profit, with one dimension and one presentation unit; currency and percentage cannot share a single axis. Tables may mix metric types and format each column independently. A failed series can leave the rest of its widget usable. Aligned rows retain null for missing values. Chronological ordering does not reverse in RTL.

The browser receives currency, time zone, locale, and branch labels from the server's controlled profile. Synthetic Iraqi monetary facts are nominal IQD and Egyptian facts nominal EGP; there is no FX conversion. In an operational source, transaction currency, company/base currency, and reporting currency must be distinguished before any aggregation. Unrelated currencies must not be summed without an approved conversion policy. Arabic UI uses Modern Standard Arabic; Iraqi and Egyptian dialect synonyms support future planning/evaluation, not ordinary labels. The demo selector is not authentication.

The fixture spans October 2024 through September 2026 with synthetic branch/customer geography. No branch or customer represents actual El-Dabbous operations. Planned metric concepts are discoverable but cannot execute until their data/formulas are approved. See [current assumptions](docs/architecture/current-assumptions.md), [architecture overview](docs/architecture/overview.md), and [ADRs](docs/architecture/adr/).

## Manual Dashboard Builder

Open a template and choose **Edit**, or choose **New dashboard** for an empty draft. Drag and resize cards, edit metrics and analyses, set dashboard filters, and use Undo/Redo. Layout changes stay local; semantic changes preview real tenant-scoped analytics through the existing API. Choose **View** to return to the dashboard. Builder changes are not persisted and switching markets reloads the active template. The demo planner’s generated dashboards can also enter Edit mode.
