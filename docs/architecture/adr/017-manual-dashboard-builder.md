# ADR 017: Manual Dashboard Builder and portable grid layout

Status: Accepted for the prototype (2026-09-30).

## Decision

Ready-made templates, the manual builder, and the bounded demo planner all produce the same DashboardSpec v2. Each executable spec passes the same JSON Schema and semantic validation before DashboardExecutor creates tenant-scoped AnalyticsQuery objects. The builder never accesses physical source tables or chart-library configuration.

DashboardSpec v2 gains an optional portable `layout.items` collection. Explicit items use a canonical 12-column desktop grid, each referencing exactly one widget with bounded coordinates and size; duplicate, missing, unknown, or overlapping placements fail validation. Older v2 specs with only `layout.columns` remain valid and receive deterministic default positions. DashboardPatch v2 gains `set_layout`; add/remove widget operations maintain explicit layout items. This is backward compatible and does not require v3. The application contract contains no React-Grid-Layout types.

The web adapter maps portable items to React-Grid-Layout v2 and back at drag/resize completion. Its logical coordinates remain left-to-right under Arabic RTL presentation. Smaller screens derive a stacked view from the desktop order. Grid movement changes only `DashboardSpec.layout` and local session history; it does not execute analytics. A completed semantic edit to widgets or requested filters validates through DashboardPatch and calls the existing dashboard execution API. Widget rendering is shared between view and edit modes.

An empty new dashboard and an incomplete widget form are BuilderDraft state, not executable DashboardSpec. The first valid widget creates an executable v2 spec. The builder keeps at most 40 undo states in browser memory; undo/redo of semantic changes re-executes analytics, while layout-only history does not. Persistence, ownership, and dashboard version storage are deferred.

Filter options are discovered through a tenant-scoped repository port and a bounded API endpoint for branch, region, salesperson, product category, and warehouse. IDs remain canonical and branch labels come from TenantProfile. DashboardSpec filters are user-requested filters; future policy-enforced filters must be applied outside the spec. Switching tenant discards the current builder history and reloads the active system template for the selected tenant, so market-specific filter IDs cannot silently carry over. The UI warns that edits are session-only.

## Consequences

Template and planner paths remain usable without entering the builder. The UI checks shared metric dimensions, chart type/unit, and bounded analysis compatibility before applying edits, while domain validation remains authoritative. KPI widgets keep one series; charts/tables may have several; only the first series may carry top/bottom N selection. The builder is intentionally simpler than a general BI authoring tool and does not include persistence, formulas, custom SQL, saved responsive layouts, or authorization.
