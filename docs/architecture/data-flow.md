# Current data flow

1. Browser sends spec or bounded query over HTTP with selected demo identity and tenant. No browser-to-database path exists.
2. API resolves membership and permissions. Canonical validators reject invalid schema, dimension/analysis/chart/layout combinations. Metric availability and authorization are enforced.
3. DashboardExecutor constructs normalized queries, shares identical queries only in this execution and schedules unique calls with bounded concurrency. Effective tenant/locale/policy are part of identity; equivalent additive default/sum and filter value order normalize. Different analyses or scopes do not share results.
4. AnalyticsRepository maps required measures, applies tenant scope and uses canonical facts. Mock and SQLite share deterministic engine semantics. SQLite currently loads relevant tenant measures, so source-scale pushdown remains future adapter work.
5. Engine intersects enforced/user filters; event totals derive additive/ratio metrics; snapshot selection chooses latest entity/measure at cutoff before dimension filtering. Calendar comparison aligns complete monthly/quarterly/yearly periods; nulls, ranking and bounded analysis are preserved.
6. AnalyticsResult carries source identifier, execution time, latest business coverage and optional known synchronization time. dataThrough is based on authorized relevant source measures, not automatically restricted to the requested report window; sourceAsOf is never inferred from event dates.
7. Series results align deterministically. The first-series top-N anchor controls selected keys; if its required selection fails no union escapes the selection rule. Each aligned series retains comparison changes and rank; missing keys/failed values remain null.
8. Renderer uses centralized presentation and tenant currency. UI theme does not change spec/query. Saved records and library preferences use separate metadata repositories, independent of analytics provider.

[Contracts and formulas](../developer/data-model.md), [execution ADR](adr/023-execution-and-runtime-readiness.md), [proposed source flow](source-integration.md).

## Planner and manual intent paths

- Generation: natural language → compact summary/grouped DashboardGenerationPlan → plan validation → deterministic compiler → canonical DashboardSpec validation → authorization → execution.
- AI edit: instruction + current spec → sparse DashboardEditPlan → plan validation → deterministic compiler → canonical DashboardPatch v2 → applied canonical DashboardSpec → validation/authorization → preview.
- Manual edit: builder → bounded BuilderCommand/canonical DashboardPatch → same working DashboardSpec and validation/history. Palette-only edits reuse analytics results.
- Presentation: AI/manual governed palette token → centralized web theme → actual Light/Dark renderer colors. Only explicit Save persists the draft.

## Provider reference context

Generation attaches explicitly requested governed presentation to the exact described widget; the compiler preserves emitted values without reading raw natural language to infer omissions. Before edit invocation, canonical validation and allowed-metric checks precede a compact widget identity index, sent before the full current spec and instruction. The provider resolves descriptors to existing widgetId/seriesId; sparse compilation and canonical patch/spec validation remain the mutation path. The index contains no analytics rows, customer filter values or security data and is never persisted.

requestedPresentation is optional as a whole; every emitted type-specific presentation requires a governed palette token, with default for an explicit type without color. The compiler does not parse or reconstruct palette intent. The edit index includes bilingual canonical metric/dimension labels and existing explicit widget titles only; it invents no titles. User-facing “gross profit” maps to gross_profit and “branch” to branch through provider-selected canonical references, with no application-side fuzzy matching or selector language. Full current-spec context is retained.
