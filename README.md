# El-Dabbous AI Analytics

A bilingual deterministic analytics prototype. Manual DashboardSpecs and supported English/Arabic prompts use one path: Fastify API → DashboardExecutor → tenant-scoped AnalyticsRepository → SQLite canonical measures → AnalyticsResult → React renderer. The prompt planner is a deterministic mock; no LLM provider is connected.

## Local startup

Requires Node.js 24 and pnpm 12.6.0. From the repository root, run:

```bash
pnpm install --frozen-lockfile
pnpm run seed demo.db demo
pnpm run dev:api
```

In another terminal, also from the repository root:

```bash
pnpm run dev:web
```

Open <http://127.0.0.1:5173/>. The API listens on <http://127.0.0.1:3001/>. The web app sends the controlled `x-tenant-id: demo` header; this is a local demonstration gate, not production authentication. The API uses the repository-root `demo.db` by default, including when started from its built bundle. Set `SQLITE_DB_PATH` to override it, or set `ANALYTICS_PROVIDER=mock` to run with in-memory canonical facts. `postgres` and `api` source providers are reserved but not implemented. To use the bundle, run `pnpm run build` then `pnpm --filter @el-dabbous/api start`.

The first screen loads the manual Executive Sales dashboard. Select Finance & Receivables or Maintenance Operations in the sidebar for other manual specs. For the planner path, enter either:

- `Create an executive sales dashboard for this year showing revenue, gross margin, order count, monthly revenue vs last year, top customers and outstanding receivables.`
- `اعمل لي لوحة لمتابعة المبيعات السنة دي فيها الإيرادات وهامش الربح وعدد الطلبات وأعلى العملاء والمديونيات`

The edit box supports replacing order count with average order value, filtering Cairo and Alexandria, changing top customers to gross profit, adding a three-month moving average, and removing outstanding receivables. English and Arabic versions are supported. Other prompt/edit intents return a structured unsupported-intent error. The language switch changes layout direction, labels, dates, and numeric formatting; chart dates remain chronological.

## Verification

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

CI runs frozen install plus all four checks. `apps/api` can be checked independently using `pnpm --filter @el-dabbous/api build`; the web bundle uses `pnpm --filter @el-dabbous/web build`. The seeded database and build output are local artifacts and are ignored by Git. Seed into a fresh database path when resetting; the seed command refuses to overwrite existing tenant facts.

## Model and boundaries

`packages/domain` owns source-independent metric IDs, aggregation recipes, the semantic catalog, bounded analysis contracts, and DashboardSpec/Patch v1 schemas. `packages/data` owns canonical source measures, deterministic calculations, SQLite and mock adapters, and the two-year fixture. `packages/application` owns the mock planner, three manual specs, and per-widget execution. `apps/api` wires dependencies once and validates tenant context; `apps/web` sends dashboard actions to the API and renders returned results. React never opens SQLite or directly executes a repository query.

Additive measures sum by default; ratios and durations divide aggregated components; sales growth derives from a revenue comparison. Stock and receivable balances select the latest observation per stable entity on or before the requested date. Moving averages and running totals require ordered time; monthly and quarterly comparisons align to prior calendar buckets using UTC calendar arithmetic. The API accepts no SQL.

The fixture spans October 2024 through September 2026 with six branches, twelve salespeople, 360 customers, 160 products, five warehouses, and 150 assets. Patterns are intentionally synthetic. Currency is provisionally displayed in EGP; production currency and accounting rules require business validation. Each result carries source ID, execution time, optional source-as-of time, and metric metadata. See [current assumptions](docs/architecture/current-assumptions.md), [integration questions](docs/integration/questions-for-malik.md), [architecture overview](docs/architecture/overview.md), and [ADRs](docs/architecture/adr/).
