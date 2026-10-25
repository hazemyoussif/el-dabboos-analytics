# Tenant source preparation — 25 October 2026

Status: verified feature branch `codex/tenant-source-settings`, based on
`origin/main` at `ee78f57`, prepared for the authorized push. All local gates passed. No live
migration, source connection, ingestion, activation, deployment or merge is part
of this delivery. Existing unrelated work in the shared checkout is preserved.

## Delivered behavior

Administration → Source settings lets an unscoped tenant administrator prepare
one source configuration draft per tenant. Save is explicit and optimistic-version
checked. PostgreSQL control migration 010 and SQLite metadata migration 007 add
only draft storage and the source.settings_drafted audit action; no accepted
migration is edited. Settings and their successful audit commit or roll back in
one transaction with fresh actor authorization.

The draft holds a source ID, opaque connection reference, company IDs, bounded
Odoo 18 PostgreSQL parameters and header/Business Line physical field bindings.
Passwords, SQL, expressions and active state are rejected. Connection destinations
and secret references remain operator-owned. Exact tenant/source/reference/company
checks precede source access. No draft is consulted by current ingestion or serving.

Check saved draft operates on an exact persisted version, performs read-only
schema/version/company metadata inspection and rechecks actor access and draft
version after network work. Edits clear earlier results; unsaved values cannot be
checked or exported. Exports contain only a saved, explicitly labeled draft.
Physical compatibility is not semantic certification or source identity approval.
There is no activation endpoint. Existing source release governance remains the
activation boundary; custom draft mappings are not executable runtime mappings.

## Safety review

Dependency direction remains domain contracts → application operations / data
repositories and inspector → API composition → web HTTP client. The source
inspector uses fixed SQL and parameterized metadata queries, not interpolated
field names. The browser receives no connection host, username, credential or
record samples. Failures return bounded diagnostics. Source checks run one at a
time per API process; statements are capped at two seconds, lock waits at one
second and connection waits at ten seconds. Failed rollback discards the connection.

The legacy SourceConnectionResolver, Odoo transaction SQL, operational source,
canonical mappings, Finance recipes, cursor/promotion and published serving paths
are unchanged by this feature. No SSH access or real Odoo calls are used in tests.
Explicit metadata migrations against approved backups are required before release;
this task does not apply them to any existing local/shared deployment.

## Verification

All acceptance commands run locally on the isolated branch based on `ee78f57`.
No GitHub Actions were added, enabled or dispatched.

- Frozen dependency install passed.
- Focused unit/API/UI/migration/documentation regressions: 26 passed, zero failures/skips.
- Full unit/API/web/engineering suite: 1,002 passed, zero failures/skips.
- Lint, typecheck, architecture, baseline-aware quality and diff gates passed;
  architecture/quality/diff reported zero diagnostics.
- API/web production build passed with the existing Vite chunk-size warning.
- Full disposable PostgreSQL suite: 429 passed, zero failures/skips (985.5 seconds).
  The suite used PostgreSQL 18 in the task-owned disposable Compose project
  `dabboos-tenant-source-test`, with synthetic fixtures only. No real Odoo or model
  services were required.

The shared checkout was not used for final acceptance: it contained unrelated
untracked work with a broken documentation link. The feature was isolated onto
current `origin/main` instead of modifying that unrelated work. An interrupted
isolated unit invocation is superseded by the complete successful run above.
Earlier migration-head fixture failures were corrected to exercise future
versions/gaps beyond the new heads.

## Manual evidence — synthetic only

An isolated in-memory SQLite/API and mocked source inspector served the actual
web application. Developer environment loading was disabled. Browser navigation
reached Source settings under the synthetic Iraq administrator in Arabic. Selecting
a registered synthetic connection filled the source identity; explicit Save
created version 1; Check returned a labeled missing-field failure for that saved
version. Editing the mapping cleared the result and disabled Check and Export.
Export and mapping/limits disclosure controls were exercised. Browser review
covered Arabic Light and English Dark, the mobile drawer and 390px, 1024px and
1440px child viewport widths. Native Tab moved focus from source identity to
company scope, with visible focus treatment. Desktop screenshots were constrained
by the host browser width; they do not constitute a full-width screenshot audit.
The synthetic preview used the shared checkout implementation; isolated-branch
SSR assertions separately cover bilingual rendered controls. No blocker or high
severity presentation finding was observed. This is focused manual evidence, not
a comprehensive accessibility certification. The temporary preview and viewport
harness were removed after review.

## Remaining boundary

This prepares source configuration safely. It does not install missing Odoo
modules, repair the ERP schema, turn custom physical bindings into an operational
adapter, or certify/publish changed source semantics. Apply a reviewed source
release through the existing controlled pipeline when ready. Runtime source
activation and broader connector support are separate integration work.
