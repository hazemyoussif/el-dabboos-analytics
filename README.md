# El-Dabbous AI Analytics

Foundation for a bilingual, tenant-scoped analytics product. The deterministic domain and repository layers run without an LLM, API, or React application.

## Requirements and commands

Node.js 24 and pnpm 12.6.0. `node:sqlite` is used for the local adapter. pnpm is the only supported package manager; CI installs from the frozen pnpm lockfile.

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run check
pnpm run seed demo.db demo
```

`packages/domain` owns canonical metric IDs, explicit aggregation recipes, the semantic catalog, bounded analysis contracts, and DashboardSpec and DashboardPatch v1 schemas. `packages/data` owns canonical source measures, deterministic calculations, SQLite schema/adapter, seed generator, and mock adapter. Both repositories pass the same contract suite.

## Metric and analysis rules

Additive measures are summed by default and may explicitly request count, average, min, or max. Ratio and duration metrics divide aggregated source measures, so they cannot be aggregated as independent metric facts. Sales growth derives from a revenue comparison and returns a percentage value; query revenue with comparison to inspect baseline amounts. Stock and other balances select the latest observation per entity on or before the period end; a missing denominator or unavailable snapshot returns `null`.

Analysis is a bounded combination of comparison, moving average, running total, contribution, ranking, and top/bottom N. Comparisons require a date range. Moving average and running total require an ordered time dimension. A grouped monthly or quarterly comparison aligns each bucket to its matching prior calendar bucket. Calendar shifts clamp leap days and preserve full month ends.

Every repository result includes source ID, execution time, optional source freshness time, metric type/unit, and aggregation semantics. The LLM port requests JSON Schema constrained structured output, which remains untrusted until validated.

## Current scope

Use a fresh database path when seeding; databases from the earlier fact schema are not migrated. SQLite stores normalized source measures, not the future source system's operational schema. The small deterministic seed spans October 2024 through September 2026 and six branches. It is a fixture, not the full target scale or validated business accounting. See [current assumptions](docs/architecture/current-assumptions.md) and [integration questions](docs/integration/questions-for-malik.md).

SQL is confined to the SQLite adapter; no repository API accepts arbitrary SQL or omits tenant context. See [architecture overview](docs/architecture/overview.md), [diagrams](docs/architecture/diagrams.md), and [ADRs](docs/architecture/adr/).
