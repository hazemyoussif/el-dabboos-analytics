# ADR 013: Demo dashboard orchestration

Status: Accepted for the deterministic vertical slice (2026-09-30).

## Decision

Keep planning, execution, and presentation separate. A bounded MockDashboardPlanner translates supported English/Arabic sales requests and edits into DashboardSpec/Patch v1. DashboardExecutor validates the spec, creates one canonical query per widget, and returns per-widget success or error with execution metadata. Manual specs and planner specs follow the same execution path. The Fastify API is the composition layer; the React app consumes only API results and catalog labels.

The API accepts only the fake `demo` tenant header until real identity integration is designed. The server defaults to SQLite seeded at the repository-root `demo.db`, while a mock adapter can be selected for local development. Unsupported planner intents return a structured 422 error. No arbitrary SQL, expression language, provider adapter, or generated UI code is accepted.

## Consequences

The UI can show partial dashboards without hiding healthy widgets, and future planners can be substituted behind the provider-neutral port. This demo cannot establish user identity or answer arbitrary prompts. Specs and edits are not persisted. Business formulas and source mapping still require Malik's validation.
