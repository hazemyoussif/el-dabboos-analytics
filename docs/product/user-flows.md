# User flows

1. A user selects tenant, locale, and date range and opens a saved DashboardSpec. Validation runs before any query. The renderer uses canonical results and localized labels.
2. A user describes a dashboard. The planner returns only DashboardSpec; schema and semantic validation run before execution. Unsupported requests produce a clear error rather than guessed metrics.
3. A user asks to edit a dashboard. The planner returns DashboardPatch, which is validated and applied to the current spec. The resulting spec is validated again.
4. A user switches locale. Canonical IDs stay constant; labels, number/date presentation, layout direction, charts, and tables change with locale.
