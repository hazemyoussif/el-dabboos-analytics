# Runtime and deployment

## Current

Node 24 runs Fastify; React/Vite serves the browser in development. pnpm 12.6.0 is the package manager. `apps/api/src/server.ts` parses configuration once before opening databases/listening, initializes idempotent demo schemas, selects analytics/planner adapters and injects persistence, concurrency and readiness into `buildApi(deps)`. Fastify remains inside apps/api. Built API uses external workspace packages; deploy the workspace/package dependencies as well as dist/server.mjs, not that file alone. Web build produces apps/web/dist.

Analytics defaults to SQLite at repository demo.db; dashboard metadata defaults to repository dashboards.db. Explicit relative paths use the API process cwd. Mock analytics still requires dashboard persistence. Separate repository instances remain separate concerns even when databases share infrastructure. Mount metadata storage persistently if saved records must survive redeployment. [Configuration](../developer/configuration.md) owns exact variables and precedence.

## Health

- GET `/health`: compatibility alias, `{status:"ok"}`, process responsiveness.
- GET `/health/live`: same liveness; no source or model calls.
- GET `/health/ready`: 200 ready or 503 not_ready, safe named persistence/analytics checks. Required dashboard/library table probes must succeed. Analytics probe is optional (`not_checked` for custom composition); root mock marks available and root SQLite probes analytics_facts structure with SELECT 1 / LIMIT 0. No business aggregation, customer rows or LLM request is made.
- Configuration validity is guaranteed before root startup; invalid config never listens. Model availability is deliberately independent from analytics readiness.

Readiness callbacks have a two-second async deadline. A synchronous blocked SQLite call cannot be interrupted by it; real source adapters need cancellation/timeouts. Injected buildApi without required persistence probe reports not_ready. Readiness checks availability/shape only, not business reconciliation, model suitability or ingestion freshness.

## Proposed production topology

Static web behind TLS/reverse proxy → API replicas → approved source adapter (likely company-owned PostgreSQL analytics mart, pending confirmation) + durable dashboard metadata DB. Use approved IdP, secret manager, least-privilege DB roles, backups and migration job ownership. Decide source vs metadata DB deployment and schema owners independently. Current development loopback CORS allowlist is not a production policy.

## Proposed observability (design only)

Generate/accept validated request ID and trace ID at API edge, propagate through application execution and adapter/provider spans. Structured fields: requestId, traceId, tenantId, route template, HTTP status, total latency, repository latency, analytics execution duration, configured provider/model identifier, LLM latency and failed-series count. Tenant IDs are access-controlled log metadata, not a reason to log rows. Sanitize route IDs and provider errors; avoid high-cardinality raw query text. Persistent audit needs an owned retention/storage contract; current AuditSink is in-memory.

Default logs must exclude API keys, authorization credentials/headers, complete HTTP requests, raw customer result rows and raw prompts. Structured diagnostics are opt-in development tools with bounded/redacted previews, not permission for unrestricted production logging. Privacy policy must approve any contextual identifiers. [Privacy boundary](source-integration.md#llm-privacy-boundary), [production gates](../integration/production-readiness.md), [migration boundary](database-migrations.md).
