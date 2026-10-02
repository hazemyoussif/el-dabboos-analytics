# Add an API route

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Choose cohesive routes module and keep buildApi as composition point.
2. Resolve request context, validate membership and route permission using shared API helpers.
3. Validate body/query with canonical business validators and authorize requested metrics/records.
4. Call an application service or domain port; keep Fastify/HTTP errors inside apps/api.
5. Use safe error mappings, audit boundary and tests for success, unauthorized, tenant/policy isolation and malformed input.

**File path starting points:** API app.ts; context.ts; errors.ts; routes/. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
