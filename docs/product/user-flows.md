# User flows

1. A user selects tenant, locale, and date range and opens a saved DashboardSpec. Validation runs before any query. The renderer uses canonical results and localized labels.
2. A user describes a dashboard. The planner returns only DashboardSpec; schema and semantic validation run before execution. Unsupported requests produce a clear error rather than guessed metrics.
3. A user asks to edit a dashboard. The planner returns DashboardPatch, which is validated and applied to the current spec. The resulting spec is validated again.
4. A user switches locale. Canonical IDs stay constant; labels, number/date presentation, layout direction, charts, and tables change with locale.

## Editing custom dashboards with AI

A valid unsaved or saved working dashboard with `ai:edit` permission exposes
**Edit with AI**, including while the manual builder is active. Switching modes
keeps the latest synchronized working DashboardSpec; neither switch invokes Save.
The AI panel appears between title/actions and metadata, before the canvas.
**Edit** returns to the manual builder using the AI-modified working spec.

Structured editing accepts custom widget/series IDs and portable explicit layout.
Semantic replace/remove/add patches retain, remove or deterministically place the
corresponding layout item through the existing domain patch implementation.
`set_layout` is the explicit operation for replacing layout. The provider is told
not to reconstruct layout for semantic edits; canonical validation and
server authorization remain authoritative.

The mock planner remains bounded to predefined edit examples. Unsupported custom
edits return `UNSUPPORTED_DEMO_INTENT` with a safe message explaining that a
structured provider is required for general AI editing. Unsupported edits leave
the working spec intact and do not save it.
