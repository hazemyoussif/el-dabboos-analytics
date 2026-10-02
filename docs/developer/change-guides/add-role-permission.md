# Add a role or permission

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Define the domain permission and approved membership/domain/enforced-filter meaning.
2. Update AuthorizationPolicy/application role composition; demo fixtures are not production identity.
3. Protect API entry points and post-planner output; update authorized capabilities/catalog/template metadata.
4. Update UI controls as presentation only, never the authority.
5. Test direct handcrafted requests, saved/shared/private records, tenant isolation and policy filter intersection; audit expected outcomes.

**File path starting points:** domain/security.ts; application/security.ts; API context.ts. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
