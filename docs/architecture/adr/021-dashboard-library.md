# ADR 021: Dashboard naming and personal library organization

## Decision

DashboardSpec.title is the only dashboard display name. DashboardRecord.id is persistence/deep-link identity; DashboardSpec.id is semantic spec identity. Neither changes on Rename. There is no record name, folder or favorite field and no organization in DashboardSpec.

First Save and Save As open a bilingual naming dialog prefilled from the working spec. Blank drafts default to Untitled Dashboard / لوحة بدون اسم. The primary locale is prominent; the secondary name is optional, and when blank the primary name is copied into both locales. No translation provider is called. Duplicate titles are allowed. Manual Rename and AI set_title both change only the working spec. Saved → Modified → explicit Save increments the record version; Discard restores the original title.

DashboardLibraryPreference stores tenantId, userId, dashboardId, favorite and optional folderId. DashboardFolder stores tenantId, ownerUserId, id, name and timestamps. Flat folders are personal inside a tenant. Organization persists immediately and never dirties or versions dashboard content. Shared dashboards can have different personal organization for each user.

The domain owns a DashboardLibraryRepository port. DashboardLibraryService derives the scope from authenticated RequestContext and checks accessible/authorized dashboard content through SavedDashboardService before storing preferences. SQLite is the initial adapter. Folder writes are scoped by tenant and user. Preference assignment checks folder ownership inside the same SQLite transaction; deleting a folder clears only that user's folder associations atomically and never deletes dashboard records.

## Persistence and migration

Composition initializes two new tables idempotently in the existing saved-dashboard SQLite database. Existing dashboard_records and spec JSON remain untouched; no data migration or DashboardSpec version change is needed. The preference table has a composite tenant/user/dashboard key, and folders a tenant/user/id key. Folder references are checked by the adapter and cleared transactionally; they are not dashboard content foreign keys. Deletion/archive of dashboards is outside this pass, so preference cleanup for those future lifecycles must be designed then. Back up the configured dashboard database as a unit.

GET /api/saved-dashboards keeps DashboardRecord[] semantics. GET /api/dashboard-library returns separate folders and accessible preferences; folder POST/PUT/DELETE and preference PUT are distinct routes. Future record pagination/search can evolve separately. Client search matches both title locales in the selected All/Favorites/My/Shared/folder view. Sorts use existing record timestamps or localized names, with stable ID tie-breaking. Personal navigation does not change /dashboards/:recordId.

Library state lives in useDashboardLibrary; naming orchestration remains with product flow. Async results are scoped to user/tenant and discarded after scope changes. Templates remain separate immutable definitions, filtered by existing domain/tags and metric authorization; no additional organization framework is introduced.

## Template expansion

The 10 core templates are retained and nine governed families added (19 total): Sales Trends & Growth, Profitability Overview, Regional Performance, Customer Receivables, Product Category Performance, Warehouse Inventory, Maintenance Reliability, Technician Performance and Equipment Performance. They use existing metrics and grouping dimensions only. Currency, percentages, durations and counts share a chart axis only when valid; mixed units use Table. Composition uses suitable additive/snapshot values. There are no aging buckets, targets, forecasts, fake health scores, stacking or dual axes. The existing planner automatically receives only authorized expanded template metadata.

## Deferred

Nested folders, arbitrary tags, dashboard deletion/trash, public/cross-tenant sharing, folder permissions, collaboration, manual library ordering and real Odoo integration remain outside this pass.
