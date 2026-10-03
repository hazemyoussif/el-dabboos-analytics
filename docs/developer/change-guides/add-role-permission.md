# Add a role or permission

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Define the domain permission and approved membership/domain/enforced-filter meaning.
2. Update AuthorizationPolicy/application role composition; demo fixtures are not production identity.
3. Protect API entry points and post-planner output; update authorized capabilities/catalog/template metadata.
4. Update UI controls as presentation only, never the authority.
5. Test direct handcrafted requests, saved/shared/private records, tenant isolation and policy filter intersection; audit expected outcomes.

**File path starting points:** domain/security.ts; application/security.ts; API context.ts. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.

For persistent administration, use [ADR 028](../../architecture/adr/028-customer-tenant-access-control.md) and its [API contract](../../security/administration-contract.md): tenant and platform vocabularies stay disjoint, domains belong to role capability, scopes to membership. Add an owning use case before a permission; enforce actor delegation ceilings, tenant-bound assignments and protected/last-admin rules. Do not merely append to the old demo arrays or widen DashboardScope before the grant-aware adapter cutover.
