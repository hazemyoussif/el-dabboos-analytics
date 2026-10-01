# ADR 020: Dashboard editor customization and replaceable grid adapter

Status: Accepted (2026-10-01).

## Decision

Retain React Grid Layout v2 behind `apps/web/src/builder/DashboardGrid.tsx` and
`grid-map.ts`. Domain/application contracts remain DashboardSpec v2 and portable
DashboardLayout / DashboardGridItem: twelve columns, x/y/w/h/minW/minH. Canonical
validation continues rejecting overlaps, missing items and out-of-bounds geometry.
No chart/grid library types cross into domain/application packages.

The editor uses explicit placement without automatic vertical compaction. This
keeps inspector Y positions and deliberate gaps stable. Auto arrange packs current
sizes in deterministic row-major order; Reset layout uses domain default sizes and
placement (honoring larger persisted minima). Both are layout-only history entries.
Drag/resize commit on stop, inspector controls commit validated changes, and all
layout operations edit the working spec without analytics or persistence. Explicit
Save updates the DashboardRecord with the existing version check. Undo/Redo retain
the existing bounded session history. Semantic duplication/deletion still refreshes
preview analytics and remains unsaved.

Provide east/south/west and four corner handles in desktop edit mode. Omit the
standalone north handle: moving the top edge combines size and Y changes, overlaps
with the controls, and adds another small target without a meaningful benefit over
north corners and inspector Y/Height controls. Corner resizing remains available.
Editor minimum sizes are UI constraints, honoring persisted minima and legacy small
widgets; no new domain concepts. The drag handle alone accepts arrow movement and
Shift+arrow resizing while focused. Inputs/charts retain their normal key behavior.
No position lock is added: it is optional and unnecessary for the current workflow.

RGL 2.2.4 external drop uses the same adapter and native draggable palette buttons.
A snapped placeholder selects dimensions by widget type. The empty target has a stable minimum height. Collision prevention can leave the
RGL placeholder at its previous location, so the web adapter snaps the final native
drop coordinates using its grid metrics. Drop inserts a canonically
validated widget, selects it and opens properties; colliding neighbors receive
stable free placement. Click-to-add remains the keyboard-accessible alternative.
Empty canvas dropping is supported without making an empty draft executable.
Narrow screens derive a stacked presentation and disable direct grid manipulation;
only the canonical desktop layout is persisted. Full mobile authoring is deferred.

## Alternatives / GridStack evaluation

[RGL v2](https://github.com/react-grid-layout/react-grid-layout) fits the existing
React 19 controlled state/history and already supplies directional resizing and
external drops. Its compaction/drop configuration stays entirely in the renderer.
We must validate the final snapped layout, rather than treating library state as
canonical data. Native HTML dragging is primarily a desktop experience; accessible
click-to-add remains required. Pixel sizing is an adapter concern.

[GridStack](https://gridstackjs.com/) is a future candidate for nested grids,
advanced external sidebar drops, inter-grid dragging, rich mobile editing and more
advanced composition. Its imperative DOM/widget lifecycle would need a React
adapter with careful reconciliation to our controlled draft/history. Migration
adds no required capability for this pass; do not add the dependency. Keep the
portable model and grid mapping replaceable so a future adapter can reuse the
same validation, persistence and application behavior.

## Metric palette extension

Available, authorized registry entries support native metric dragging and clickable
keyboard-accessible buttons. Web-only BuilderDragItem distinguishes widget-type
and metric payloads under `application/x-el-dabbous-builder`; a prefixed text
fallback is accepted. Parsing is size bounded, rejects unknown/extra identifiers,
and rechecks both the available registry and authorized semantic catalog at drop.
Planned entries remain nondraggable. Browser payloads never contain patches or SQL.

Free canvas metric drops use the RGL snapped KPI-sized placeholder and open a
compact chooser near that position. Each offered type has a canonically valid
widget: Line prefers month/date/quarter/year, Bar/Table prefer supported category
dimensions. The chosen width clamps X to the twelve-column boundary and existing
deterministic collision handling places neighbors. Empty drafts use add-first.

Existing-widget overlays show explicit Replace metric (KPI), Add series or Replace
primary actions. Both current shared-dimension/unit compatibility and final widget
validation are required. Replacing primary retains its ID and compatible analysis;
only incompatible analysis operations are removed. Adding/replacing series never
changes layout. Widget drop handlers consume even rejected metric drops, preventing
an additional canvas command. RGL drag-over rejects widget targets and clears its
external placeholder there. Native copy effects and valid/rejected target styling
are transient; drop, dragend, Escape, preview busy state and errors clear drag state.

Pure web helpers produce bounded BuilderCommands with collision-free metric-derived
series IDs. Every successful semantic drop participates in normal history and
preview execution, while persistence remains explicit Save with existing version
checks. Click-to-use opens the same creation/action chooser; the normal metric
select controls remain available. Desktop HTML5 DnD is the fast path; stacked/mobile
presentation uses the click/keyboard fallback. No domain/library/browser boundary
changes or additional DnD dependency are introduced.

## Governed visualization expansion

The v2 contract accepts Area, Pie, Treemap and Combo plus bounded widget presentation and Combo series marks. Both canonical schemas retain backward compatibility; provider projection and authorization are unchanged. Domain visualization suitability is centralized; web options and recommendations reuse canonical validation. Renderer dispatch maps governed types to focused Recharts components. Presentation-only changes reuse existing analytics results and participate in explicit Save and history.

See [visualization capabilities](../visualization-capabilities.md) for rules, defaults, compatibility, warnings and deferred chart contracts. Generic stacking is prohibited because matching metric units do not imply disjoint business components.
