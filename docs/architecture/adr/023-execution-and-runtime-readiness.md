# ADR 023 — Bounded request execution and runtime readiness

Status: Accepted for prototype hardening; production source/migration/tracing designs remain proposed.

## Context

A valid multi-series spec can issue many duplicate queries. Unbounded repository calls are unsuitable for source integration, while tenant/policy semantics and per-series failure isolation must remain unchanged. Root environment parsing also needs safe bounds and operational health must not depend on optional model availability.

## Decision

Normalize queries and deduplicate only within a DashboardExecutor execution. Include metric, effective aggregation, grouping, dates, normalized filters, analyses, tenant/locale/enforced context in identity. Schedule unique queries with a small internal limiter; default 8, injectable 1..64 at composition. Clone shared results per dependent series; preserve order, alignment and top-N anchor failures. No global cache or new domain port.

Parse bounded configuration at API composition before DB initialization. Reject invalid enums/ranges/URL/path/required structured endpoint settings with safe field-only errors. Preserve shell > .env.local > .env > defaults; tests never load env files.

Keep /health compatible; add liveness and readiness. Readiness requires persistence structure probes, optional analytics probe, no business aggregation and no model dependency. Root supplies mock or SQLite structure checks. Async readiness deadline is two seconds; synchronous DB work cannot be interrupted.

## Consequences

Fewer repository calls with predictable per-execution fanout. Across requests there is no cache or global concurrency budget. SQLite remains synchronous and reads relevant facts into memory. Source cancellation, connection pools, process-wide capacity, persistent telemetry and versioned migrations require approved integration work. [System design](../system-design.md), [configuration](../../developer/configuration.md), [migration boundary](../database-migrations.md).
