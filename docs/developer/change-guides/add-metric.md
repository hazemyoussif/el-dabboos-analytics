# Add a metric

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Add executable MetricId in domain/contracts.ts only after approving business meaning. Planned concepts belong in registry until executable.
2. Define MetricSemantics and formula in domain/catalog.ts: additive vs ratio/snapshot/comparison/duration; specify denominator and scale/null behavior.
3. Map required canonical measures in data/facts.ts; do not store a derived output as an independently summable fact.
4. Declare supported dimensions and compatible filters/analyses.
5. Add ProductMetric registry entry with availability and authorization domain.
6. Add localized names and unit/type presentation; review mixed-unit visualization compatibility.
7. Add domain/engine/mock+SQLite contract and authorized/unauthorized tests.
8. Document source measure mapping, eligible states, dates, currency and snapshot identity; no Odoo-table assumptions.
9. Add template usage only if appropriate and authorized; run template matrix.
10. Check authorized catalog/planner capability exposure and metric-domain restrictions end to end.

**File path starting points:** domain/catalog.ts; domain/metric-registry.ts; data/facts.ts; data/engine.ts. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
