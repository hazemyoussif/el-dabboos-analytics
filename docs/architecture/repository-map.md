# Repository map

Follow [system design](system-design.md) for the dependency rule; this map routes changes.

## apps/web/src

**Purpose:** Browser composition and feature state.
**Allowed dependencies:** React + portable domain contracts, application result/template types and pure date preset helper; HTTP client.
**Typical files:** App.tsx, hooks/, api/client.ts, product/, library/, builder/, rendering/, presentation/, shell/, styles/.
**Common modifications:** Product flow, drag/drop adapter, chart presentation, navigation, preferences.
**Does NOT belong here:** SQL, provider credentials, enforced policy ownership.

## apps/api/src

**Purpose:** HTTP boundary and composition.
**Allowed dependencies:** Fastify, application/domain/data adapters.
**Typical files:** server.ts, app.ts, context.ts, errors.ts, routes/, providers/, startup-config.ts.
**Common modifications:** Route extraction, request validation, config, dependency wiring, transport.
**Does NOT belong here:** Chart rendering, source formula definitions, process.env in application.

## packages/domain/src

**Purpose:** Business contracts and invariants.
**Allowed dependencies:** Portable TypeScript and AJV; no framework/DB imports.
**Typical files:** contracts.ts, catalog.ts, metric-registry.ts, security.ts, validation.ts, schemas.ts, visualization.ts, layout.ts.
**Common modifications:** Closed IDs, semantic formulas, supported dimensions, canonical schemas and ports.
**Does NOT belong here:** React, Fastify, SQL adapter logic, Recharts, HTTP calls.

## packages/application/src

**Purpose:** Use-case orchestration.
**Allowed dependencies:** Domain ports and contracts.
**Typical files:** executor.ts, query-execution.ts, structured-planner.ts, provider-schema.ts, security.ts, templates.ts, saved-dashboards.ts, dashboard-library.ts.
**Common modifications:** Request-scoped scheduling, authorized planner context, persistence/library services.
**Does NOT belong here:** Environment reads, HTTP handlers, operational source SQL.

## packages/data/src

**Purpose:** Canonical facts and source adapters.
**Allowed dependencies:** Domain contracts, Node SQLite; shared deterministic engine.
**Typical files:** facts.ts, engine.ts, calendar.ts, sqlite.ts, mock.ts, schema.sql, dashboard-sqlite.ts, library-sqlite.ts, seed.ts.
**Common modifications:** Measure mapping, adapter behavior, snapshot/calendar rules, metadata storage.
**Does NOT belong here:** Planner prompts, React state, tenant identity selection.

## packages/*/test and apps/*/test

**Purpose:** Executable contracts and integration evidence.
**Allowed dependencies:** Node test runner, same-layer code and fake dependencies.
**Typical files:** *.test.ts; API inject/fake HTTP and web SSR.
**Common modifications:** Regression cases at smallest owning layer.
**Does NOT belong here:** Customer fixtures, developer env loading, mandatory live model servers.

## docs

**Purpose:** Current docs and proposed integration contracts.
**Allowed dependencies:** Relative links to owning docs and implementation.
**Typical files:** product/, qa/, architecture/adr/, developer/, agents/, integration/, security/.
**Common modifications:** Correct stale prose, maintain traceability and status labels.
**Does NOT belong here:** Duplicated competing truth or claims of unimplemented production features.

## .github/workflows

**Purpose:** CI verification gates.
**Allowed dependencies:** Node24 and pnpm12.6.0 commands.
**Typical files:** ci.yml.
**Common modifications:** Frozen install/lint/typecheck/test/build gates.
**Does NOT belong here:** Production secrets or real customer/model dependency.

Administration operations are grouped under `packages/application/src/administration/`, typed HTTP resources under `apps/api/src/routes/administration/`, and concrete admin pages under `apps/web/src/admin/`. SQLite metadata transaction-bound repositories live beside the connection owner under `packages/data/src/metadata/administration/`. Trusted provisioning composition is `apps/api/src/administration-cli.ts`; the metadata bootstrap command remains unchanged.
