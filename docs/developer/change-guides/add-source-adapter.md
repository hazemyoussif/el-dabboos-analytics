# Add a source adapter

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Read real-data contract and resolve P0 source/currency/identity/definition/privacy gates first.
2. Implement AnalyticsRepository and DimensionValueRepository with tenant/policy enforcement; preserve domain contracts.
3. Map approved canonical inputs and event/snapshot identity; supply true sourceId/dataThrough/known sourceAsOf.
4. Add mock-equivalent contract tests: additive/ratio/snapshot/calendar/filter/null behavior, tenant and policy isolation.
5. Add timeout/cancellation, safe errors, optional readiness probe and composition wiring; do not make browser connect to DB.
6. Reconcile agreed source report by date/group/currency before enabling pilot; approve tolerances and correction rules.

**File path starting points:** domain repository ports; data adapter; API server.ts; integration contract. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
