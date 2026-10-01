# Add a dimension

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Approve meaning, stable IDs, event/snapshot assignment and tenant/policy semantics.
2. Extend domain DimensionId/schema enums, metric supported dimensions and validators.
3. Add adapter canonical dimension mapping and DimensionValueRepository behavior; apply enforced filters.
4. Expose authorized builder values/labels and grouping choices, with market profile labels if needed.
5. Test unsupported combinations, snapshots that move dimensions, tenant isolation and UI/planner vocabulary.

**File path starting points:** domain/contracts.ts; domain/validation.ts; data/facts.ts; API routes/metadata.ts. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
