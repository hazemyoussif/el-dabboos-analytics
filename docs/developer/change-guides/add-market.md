# Add a market

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Approve controlled tenant profile currency/timezone/locale/branch labels and fiscal/calendar conventions.
2. Extend domain tenants/profile vocabulary; keep templates and semantic metric IDs market-neutral.
3. Add market-specific conversational examples while normal Arabic labels remain MSA.
4. Map approved source tenant/company identity and currency policy; never infer FX from display currency.
5. Test profile validation, planner context, formatting/RTL, template matrix, identity membership and tenant isolation.

**File path starting points:** domain/tenants.ts; web/i18n.ts; application templates/planners; data fixtures. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
