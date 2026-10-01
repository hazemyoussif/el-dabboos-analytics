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
