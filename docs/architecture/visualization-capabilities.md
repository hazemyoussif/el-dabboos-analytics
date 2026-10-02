# Governed visualization capabilities

DashboardSpec v2 adds optional bounded presentation intent without migrating existing records. The domain and canonical Spec/Patch schemas govern vocabulary. Recharts is the web adapter; neither users nor configured model endpoints can supply library props, colors, formatters, SVG, axes, or arbitrary expressions.

| Visualization | Series | Dimension | Semantics | Presentation / limitations |
| --- | --- | --- | --- | --- |
| KPI | 1 | None | Any valid metric | Summary only |
| Line | 1–8 | Shared grouping; time preferred | Same type/unit | Straight/smooth; legend; existing categorical Line remains valid |
| Area | 1–8 | Date/month/quarter/year | Same type/unit | Straight/smooth; legend; unstacked; comparison drawn as dashed line |
| Bar | 1–8 | Shared grouping | Same type/unit | Vertical/horizontal; legend; no stacking |
| Pie / Donut | 1 | Non-time category | Additive or suitable snapshot; no ratio/duration/comparison-derived or comparison/moving average/running total/contribution analysis | Pie/donut; legend; labels; negative and zero-only results show a controlled warning |
| Treemap | 1 | Non-time category | Same composition rules as Pie | Labels; optional legend; small-cell labels suppressed, full values retained in accessible table |
| Combo | 2–4 | Shared grouping; time preferred | Same type/unit | Per-series bar/line marks; first bar, others line by default; one Y axis; legend and curve |
| Table | 1–8 | Shared grouping | Mixed type/unit allowed | Rank and change metadata retained |

TopN and ranking remain allowed for composition. A snapshot uses the engine's point-in-time semantics. Its result must form non-negative areas; the renderer never takes absolute values. Null/zero rows have no area, remain available in the chart-value table, and do not become invented slices. Donut total sums only the rendered positive single-series values; no unrelated percentages are inferred. Composition under TopN describes the explicitly selected categories, not an implied whole business population.

All chart values are available through a keyboard accessible “View chart values” control. Labels/tooltips use the UI locale and tenant formatting. RTL does not reverse time order or numeric axes. Large results are never silently sliced: composition warns about category count, and Bar retains all rows with label scrolling/expanded chart height when necessary. Labels may be elided in small Treemap cells, with complete names in the accessible values table.

## Creation and editing

One pure builder option helper and the domain visualization rules govern editor conversions and metric palette creation. Metric drops derive temporal/categorical defaults; the compact chooser also allows explicit dimension selection. Available options alone are offered. Gross margin never offers Pie/Donut/Treemap. A single metric never offers Combo; add compatible series to a Line or Table first. Combo series marks are editable.

Recommendations are deterministic defaults, never automatic rewrites of saved widgets: no grouping → KPI; time → Line; categorical TopN/ranking or known high cardinality → horizontal Bar; known small additive/snapshot composition → Donut; customer/product/category contribution → Treemap alternative. Unknown cardinality does not assume a small composition. A valid alternative remains selectable.

New Bar creation defaults to explicit vertical orientation. Old v2 Bars without presentation retain the historical horizontal rendering, avoiding changes to persisted dashboards. Default new sizes: KPI 4×2; Line/Area/Combo 8×4; Bar 6×4; Pie 5×4; Treemap 6×5; Table 12×5. Existing explicit sizes are retained on conversion and reload.

Changing only visualization/presentation preserves query intent, filters, metric IDs, series IDs and layout, marks the draft dirty, and does not execute another analytics query. Undo/Redo uses the same rule. Changes to grouping, series or analysis still execute semantic preview. Explicit Save remains the only persistence operation. Canonical schemas, semantic validation and authorization remain authoritative for AI generation and patch application; provider schema projection is unchanged.

## Stacking

Stacking is intentionally absent. Matching units do not establish disjoint components: Gross Profit is conceptually contained in Revenue, so stacking them would mislead. Future stacking requires explicitly disjoint components or semantic stackability metadata.

## Deferred product capabilities

- Scatter requires an explicit numeric X/Y model.
- Heatmap requires two grouping dimensions.
- Funnel requires ordered stage semantics.
- Gauge requires target/goal semantics.
- Radar requires comparable or normalized axes.
- Sankey requires relationship/flow data.

These require governed product contracts rather than renderer-only workarounds. Dual Y axes, arbitrary styling and stacked areas/bars are also outside this pass.


## Canonical widget type reference

<!-- widget-types: kpi,line,area,bar,pie,treemap,combo,table -->

Current WidgetType vocabulary: `kpi`, `line`, `area`, `bar`, `pie`, `treemap`, `combo`, `table`. Donut and horizontal bar are variants, not new domain types. Recharts remains behind web rendering. See [system design](system-design.md) and [add visualization](../developer/change-guides/add-visualization.md).

## Governed palette selection

All eight supported types accept the governed palette token (`default`, `blue`, `green`, `orange`, `purple`, `red`, `neutral`). Charts resolve it centrally; KPI/Table retain the intent without promising chart marks where none exist. Bar orientation, trend curve, composition labels/variant and legend remain type bounded.

The manual builder offers a native localized Palette / لوحة الألوان selector for the domain governed palette vocabulary. Existing widgets preview a palette change immediately through normal BuilderCommand/canonical replacement, without another analytics request. Metrics, dimension, analyses, filters, layout and unrelated presentation remain unchanged; pending editor settings are retained. Undo/Redo participates in normal bounded history. Changes remain unsaved until explicit Save and survive record reopening. A new widget retains its chosen palette in the editor until Apply adds it. Selecting Default writes `palette: "default"`; omission from older specs or unrequested AI intent resolves to the same default colors. No raw color picker is exposed.

Manual and sparse AI palette edits converge on `WidgetPresentation.palette`; generation can supply the same governed token. The centralized web ChartTheme resolves actual Light/Dark colors. Builder and provider plans never store resolved colors, CSS or chart-library options. Global theme/locale remain preferences outside saved content.

Generation uses the summary/grouped structural contract in [ADR-024](adr/024-compact-generation-plan.md). AI edits use sparse DashboardEditPlan in [ADR-025](adr/025-compact-dashboard-edit-plan.md), then canonical patch/spec validation and authorization.
