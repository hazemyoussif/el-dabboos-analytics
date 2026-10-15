# Testing guide

Current runner is Node test with TypeScript transform, not a browser E2E framework. Tests never load developer .env files or require a live model server/customer source.

| Layer | Coverage and limits |
| --- | --- |
| Domain unit | Canonical schemas/patches, semantic compatibility, calendar-related query rules, visualization/layout invariants |
| Data contracts | Mock/SQLite equivalence, additive/ratio/snapshot engine, dates, source metadata and tenant/policy isolation |
| Application | Templates/evals, planner unknown-output repair and diagnostics, query dedup/concurrency/partial alignment, authorization |
| API integration | Fastify inject, in-memory metadata SQLite, safe auth/error/lifecycle/library responses, fake HTTP model transport, configuration and health |
| Web SSR/model | Renderer markup, presentation, builder/drop/layout, lifecycle/product flow/library/preferences; does not prove pointer/browser behavior |
| Human QA | Real browser interactions, responsive/RTL/readability, drag/resize, explicit lifecycle and operator fault rehearsals |
| Future source contracts | Adapter canonical fixture equivalence including isolation, currency decisions and watermarks |
| Future reconciliation | Agreed real report/source totals and approved tolerances; synthetic tests do not certify source accuracy |

## Targeted during implementation

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test packages/application/test/query-execution.test.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test apps/api/test/runtime-config.test.ts apps/api/test/health.test.ts apps/api/test/api.test.ts apps/api/test/template-matrix.test.ts packages/domain/test/contracts.test.ts
```

Use the smallest relevant files while debugging. Fake HTTP transport tests open loopback sockets and may require an execution environment that permits them. Do not mistake sandbox socket denial for a product failure. Add regression tests at the invariant owner; do not mirror implementation details with brittle tests.

## Before push

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

Full verification catches cross-package schema/authorization/rendering drift and builds both API/web. CI runs the same gates on pull requests and pushes to `main`. Feature-branch pushes do not duplicate the pull-request run; newer runs cancel superseded runs for the same PR or branch. Finish local verification before one consolidated push, especially when CI usage is constrained. Also run [smoke tests](../qa/smoke-tests.md) and record manual evidence honestly: automated fake faults are not human browser fault coverage. Lightweight docs sanity is part of tests and checks local links, stable story/case fields and supported widget vocabulary.
