# Local development

Requires Node.js 24 and pnpm 12.6.0. From repository root:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run dev:api
# second terminal
pnpm run dev:web
```

The example selects mock analytics/planner and requires no model server. API defaults without env files are SQLite analytics and mock planner. Web opens at http://127.0.0.1:5173 and proxies API 3001. Root default metadata file is dashboards.db; explicit relative DASHBOARD_DB_PATH from workspace scripts is relative to apps/api. Use absolute paths to avoid surprises.

For SQLite analytics, create a **new** fixture file with `pnpm run seed /absolute/path/demo.db`, set ANALYTICS_PROVIDER=sqlite and SQLITE_DB_PATH to that absolute file. Seed refuses to overwrite facts for existing demo tenants. The fixture spans October 2024–September 2026; current-year presets beyond that range may legitimately have little/no data. Do not reseed a live operational source.

API scripts load root .env then .env.local; shell values override both. Copy only safe placeholders, never commit credentials. Tests do not load either file. See [configuration](configuration.md) and [provider deployment example](../architecture/openai-compatible-provider.md).

Build with `pnpm run build`; built API starts via `pnpm --filter @el-dabboos/api start`. Build artifact needs workspace dependencies and Node SQLite support. Keep developer servers separate from disposable manual verification instances; choose a separate port and explicit web proxy if needed. Stop the disposable API before replacing its metadata DB.

Use [personas](../product/personas-and-roles.md) for IDs. Demo headers are x-demo-user-id and x-tenant-id; they are validated against the demo directory, not production authentication. Do not publish this demo identity mechanism as a customer login.
