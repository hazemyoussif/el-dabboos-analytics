# ADR 019: Dashboard records and explicit save lifecycle

Status: accepted for the synthetic prototype.

DashboardSpec v2 remains the portable, validated dashboard definition. A DashboardRecord wraps a spec with a separate record ID, tenant, owner, scope, version, creator/updater, and timestamps. Immutable system templates are not records. The domain defines DashboardRepository; the application service validates specs and authorizes access; SQLite implements persistence without Fastify or analytics-source dependencies. The API composition root configures `DASHBOARD_DB_PATH` independently of `ANALYTICS_PROVIDER`.

Create requires `dashboard:create`; listing and reading require `dashboard:view` plus tenant and private-owner visibility. Update requires `dashboard:edit`, record ownership, and an expected version. The repository checks the version atomically and reports a conflict for stale writes. Unknown or invisible records return 404; denied actions return 403. A stored spec remains subject to current metric authorization when accessed. The demo identity headers remain a local simulation, not authentication.

The web models immutable template view, unsaved draft, and saved record with an editable working copy. Manual and AI changes may execute analytics for preview but persist only on explicit Save. Save As creates a new record; Discard restores the saved version or abandons a new draft. Saved records have an addressable route. Browser storage contains only UI locale and last tenant preference; on startup the chosen tenant is checked against server membership. UI locale changes never mutate DashboardSpec. Builder undo/redo stays in memory for the current editing session.
