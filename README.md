# El-Dabbous AI Analytics

Foundation for a bilingual, tenant-scoped analytics product. The deterministic domain and repository layers run without an LLM or React. A dashboard planner and renderer can be added against the published contracts.

## Requirements and commands

Node.js 24 and npm 11. `node:sqlite` is used for the local adapter.

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run check
npm run seed -- demo.db demo
```

`packages/domain` owns canonical IDs, the semantic catalog, query/result interfaces, and DashboardSpec v1. `packages/data` owns the canonical fact model, deterministic calculations, SQLite schema/adapter, seed generator, and mock adapter. Both repositories pass the same contract suite.

## Current scope

The first pass intentionally has no API, LLM integration, or React application. SQLite currently stores normalized metric facts, not the future source system's operational schema. The deterministic seed spans October 2024 through September 2026, six branches, and 24 metrics. It is a representative fixture, not the full target scale or validated business accounting. See [current assumptions](docs/architecture/current-assumptions.md) and [integration questions](docs/integration/questions-for-malik.md).

## Architecture

DashboardSpec is a strict, versioned, language-independent contract. Validation rejects unknown fields and metric/dimension pairs outside the catalog. Every repository call requires a tenant context. SQL is confined to the SQLite adapter; consumers request canonical analytics queries. See [architecture overview](docs/architecture/overview.md), [diagrams](docs/architecture/diagrams.md), and [ADRs](docs/architecture/adr/).
