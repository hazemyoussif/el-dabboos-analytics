# Add a visualization

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Decide new WidgetType vs a variant of an existing type; update domain/contracts.ts only for a true type.
2. Update canonical schemas and semantic visualization validation, including grouping/series/unit/null bounds.
3. Update builder vocabulary/selection and type-specific layout presets.
4. Update metric-drop compatible targets and conversion behavior without arbitrary chart expressions.
5. Add focused renderer behind web rendering layer; keep Recharts props/types out of domain.
6. Update structured planner supported vocabulary and authorized template metadata if needed.
7. Test domain/schema, builder/drop, SSR renderer, chart presentation, AR/RTL and all themes; update documented type reference.

**File path starting points:** domain/visualization.ts; web/builder/visualizations.ts; web/rendering/; application/structured-planner.ts. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
