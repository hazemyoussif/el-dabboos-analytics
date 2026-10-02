# Current user flows

## Enter workspace

API resolves the selected demo identity and tenant membership, returns profile and authorized metadata. Web restores supported UI locale/theme and last tenant preference, but server membership remains authoritative. Switching market after confirmed abandonment clears the prior editing history. UI language is separate from DashboardSpec.locale and does not dirty a dashboard.

## Create and edit

New dashboard → choose AI, blank or template. Opening a template is a preview; Use template creates an unsaved draft. Blank enters manual builder. AI generation returns validated spec + execution, not a saved record. Manual ↔ AI operates on the working spec. Semantic edits execute previews; layout-only edits and theme changes do not. All edits remain unsaved until explicit Save.

## Save lifecycle

First Save → bilingual naming dialog → private record v1. Save updates an owned record using expectedVersion. Rename changes draft titles; Save persists them. Save As creates a new record. Discard restores loaded saved state or abandons a new draft. Conflicts preserve working edits and require a deliberate reload/reconciliation; no silent overwrite. Deep links resolve accessible record IDs, not untrusted embedded specs.

## Library

All / Favorites / My dashboards / Shared are accessible-record views. Shared means tenant-shared and not owned by current identity. Client-side title search and deterministic sorting affect presentation. Flat personal folders and favorites update separate tenant/user preferences. Deleting a folder clears its associations, not dashboard records. Sharing management and record deletion are not implemented UI flows.

## Governance and failure

Full schema + semantic validation precedes execution. Membership, permissions, available metrics and enforced filters constrain manual and AI paths. Partial series preserve usable values and nulls. A failed required top-N anchor cannot produce an unrestricted result union. Public AI errors are safe and generic. [Stories](user-stories.md), [criteria](acceptance-criteria.md) and [diagrams](../architecture/diagrams.md) provide traceable details.

## Choose a widget palette

Select an existing chart in Edit and choose Palette (لوحة الألوان). The preview updates immediately, without changing the metric, grouping, filters or analysis. Undo/Redo restores earlier choices. A new widget keeps its chosen palette when applied. Save is explicit; reopening the saved dashboard restores the choice. AI instructions such as “Make the branch chart blue” and manual Blue selection have the same effect. Light/Dark uses the same choice with theme-appropriate colors.
