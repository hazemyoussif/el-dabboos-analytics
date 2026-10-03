# Administration metadata storage and migration contract

Implemented in the separate versioned SQLite metadata adapter; see [local operations](administration-operations.md) for migrations/bootstrap and [verification status](access-control-implementation-status.md). [ADR 028](../architecture/adr/028-customer-tenant-access-control.md) governs the security semantics. Ports: [administration-repository.ts](../../packages/domain/src/administration-repository.ts).

## Store and transaction boundaries

Extend the **existing dashboard/library metadata SQLite database**, separate from the SQLite analytics/demo file and PostgreSQL mart. Current server composition already opens separate analytics and dashboard handles with distinct default paths. Sol must preserve that boundary, reject accidentally equal paths and provide an explicit legacy copy procedure only if an operator previously colocated the stores. Never silently copy analytics facts or delete the old file. Production metadata database/hosting is undecided; ports do not require SQLite.

Domain-specific repositories separate customer/tenant ownership, user/identity binding, tenant roles/memberships and dashboard audience. AccessDirectory loads a coherent snapshot; it does not establish authentication. AdministrationUnitOfWork supplies those repositories over the **same connection and transaction**. No global CRUD endpoint or one repository per join table.

Every admin write executes BEGIN IMMEDIATE, reloads authenticated actor and selected tenant, validates target ownership/delegation/current version, performs mutation, verifies recovery invariants and appends safe audit/outbox, then commits. Roll back on any failure. Database checks supplement application authorization; repositories never accept actor permissions from clients. Reads bind tenant IDs explicitly, use parameters and bounded pagination (limit 1–100, opaque cursor tied to tenant/filter/order). Never hold a SQLite transaction across model/network/email calls.

Role/membership/tenant/customer/user updates use expectedVersion (positive integer); server increments by exactly one, owns timestamps and IDs. Immutable fields cannot be overwritten. Dashboard grant changes use the dashboard record's version, not a separate independently racing grant version. Return typed saved/not_found/conflict outcomes. No last-writer-wins writes.

## Schema design (logical DDL requirements)

All IDs are opaque immutable text with length bounds; versions INTEGER >= 1, timestamps canonical UTC ISO text. Define named columns, never rely on INSERT column order. Enable foreign_keys on every connection. Status/permission/domain/scope enums have CHECK constraints plus application validation. Physical SQL files must be generated from this design during Sol implementation and reviewed before runner wiring.

| Table | Keys, required fields and relationships |
| --- | --- |
| customers | PK id; name, status(active/suspended), version, created_at, updated_at |
| tenants | PK id; customer_id NOT NULL FK customers; name, status(provisioning/active/suspended), country_code, default_locale, arabic_dialect, reporting_currency, time_zone, version/timestamps; index(customer_id,id); customer_id immutable |
| users | PK id; display_name, preferred_locale, status(invited/active/suspended), version/timestamps |
| identities | PK id; user_id FK users; provider, provider_subject, optional login_hint, status(active/disabled); UNIQUE(provider,provider_subject); index(user_id); binding identity immutable, no password/token column |
| roles | PK id; name, description, scope(platform/tenant), nullable tenant_id FK tenants, protected boolean, nullable system_key, version/timestamps. CHECK platform => protected + no tenant; custom => tenant scope + tenant_id + no system_key; protected => no tenant_id + allowed system_key. UNIQUE(scope,system_key) for protected templates |
| role_permissions | PK(role_id,permission), FK role; closed family checks via write validator/trigger against roles.scope; no platform permission on tenant role |
| role_metric_domains | PK(role_id,domain), FK role; only tenant roles, closed domain vocabulary |
| memberships | PK id; tenant_id FK tenants, user_id FK users, status, version/timestamps; UNIQUE(tenant_id,user_id), UNIQUE(tenant_id,id) |
| membership_roles | PK(membership_id,role_id); tenant_id; composite FK(tenant_id,membership_id); role FK. Validate/trigger role is tenant template or custom of same tenant |
| membership_scopes | PK(membership_id,dimension,value); tenant_id; composite membership FK; dimension CHECK region/branch/salesperson; nonempty bounded value. No rows for a dimension means unrestricted, never a stored empty sentinel |
| platform_assignments | PK user_id FK users; active/suspended status, version/timestamps |
| platform_assignment_roles | PK(user_id,role_id); FKs assignment/role; role scope must be platform |
| dashboard_records | Keep existing id/spec_json/owner/audit/version/timestamps; add restricted to scope CHECK; UNIQUE(tenant_id,id); no IAM in spec_json |
| dashboard_grants | PK(tenant_id,dashboard_id,subject_type,subject_id), access CHECK view. Use typed nullable role_id/membership_id columns plus CHECK exactly one matches subject_id/type, to enforce actual FKs without a polymorphic-FK hole. Composite dashboard and membership tenant FKs; role FK plus same-tenant/template validator/trigger |
| dashboard_folders / dashboard_library_preferences | Preserve current personal tenant/user identity and records; add safe FKs only after legacy reconciliation. No metadata or preferences returned without saved-resource authorization |
| admin_audit_events | immutable PK event_id, actor_user_id, nullable tenant_id/customer_id, target_id, closed action/result, occurred_at; no mutation payload/secret; optional outbox delivery marker separate from immutable event |
| bootstrap_state | one operational completion marker/reference; no credentials or unverified user headers |

Invitation persistence may be deferred entirely. When enabled: invitations(id, tenant_id, target_login, token_digest UNIQUE, expires_at, invited_by, status, version/timestamps), invitation_roles and invitation_scopes with the same tenant/scope rules. Token random high entropy; hash at rest; one-use acceptance via status CAS. Persist requested roles/scopes, revalidate all authority at acceptance; issuer suspension, stale scope or role loss blocks acceptance. No fake email success.

Role references from memberships (including suspended), pending invitations and dashboard grants refuse custom role deletion. FK RESTRICT by default, no cascade deleting security history. Tenant/customer/user hard deletion is unavailable. Disable identity in place; role definitions and assignments never trust mutable labels. Index grants by tenant/subject type/subject ID/dashboard, membership roles by role/member and identities by user. Read joins must apply tenant predicates even where IDs are globally unique.

## Migration sequence

Use immutable numbered metadata-only migrations with `metadata_schema_migrations(version PRIMARY KEY,name,sha256,applied_at)`. Separate CLI/entrypoint from analytics mart. Runtime startup checks version/readiness and refuses incompatible state; no automatic upgrade as a side effect of opening a dashboard repository.

Runner holds an exclusive migration/write lock on one connection, checks contiguous history/checksums/known maximum, applies each migration and history row in the same transaction, validates foreign_key_check, and commits. Failure rolls back; rerun is idempotent. Refuse changed checksums, gaps, duplicate versions and a database newer than the binary. SQLite foreign-key pragma transitions required for table rebuilding must be explicit outside the transaction; restore on all paths and verify before commit. Prefer rebuilding dependent tables in the same documented migration rather than dangling references. Do not run two adapters with inconsistent schema versions.

1. **Baseline recognition:** empty store creates current metadata baseline; existing unversioned store must match the known dashboard/folder/preference shape before recording baseline. Unknown variants fail with actionable schema error. Never mark an arbitrary existing DB migrated based only on table names.
2. **IAM schema:** create customer/tenant/user/identity/roles/assignments/membership/scope/audit tables and constraints. Explicit demo seed in demo mode only, preserving known IDs, permissions, domains and filters. Foreign tenant/owner IDs in legacy dashboard records must be reconciled to approved metadata or migration fails without data loss; no invented customer ownership or new identity bindings to make FKs pass.
3. **Sharing rebuild:** transactionally create dashboard_records_new with private/tenant/restricted CHECK; copy every existing value/spec/version/timestamp verbatim; verify row counts/IDs/content, recreate indexes and restore dependent FKs using SQLite's table-rebuild procedure. Add dashboard_grants empty. Existing private/tenant rows keep the exact values and no grants. Preserve folders, favorites and deep links.
4. **Operational candidates:** explicit tenant-local assignment eligibility is stored separately from invitations. No global directory, email delivery or automatic membership.
5. **Cutover:** version check + capability-gated composition enables GovernedDashboardRepository and its application policy before HTTP accepts restricted. Retire CREATE IF NOT EXISTS initialization for versioned stores. Old binary must refuse new schema. Keep backups for operational rollback; never downgrade by erasing restricted audiences.

## Required adapter tests for Sol

Empty migration, known legacy upgrade, unknown schema refusal, checksum tamper, gap/newer version refusal, rollback and concurrent migration serialization. Verify every dashboard ID/spec/version/owner/scope and preference survives; old binary refusal; no analytics tables copied. Test every cross-tenant FK/role/grant reference, immutable binding/caller-owned ID rejection, CAS conflict and audit rollback. Concurrent last-admin suspension, role removal, global user disable and identity disable must leave recovery possible across affected tenants and platform. Two simultaneous role edits/deletes must not detach a reference inserted concurrently. Grant edit racing with spec edit must conflict; read a single consistent spec/access snapshot.

Candidate dashboard reads are internal only. Application resource+metric filtering must happen **before** returning results/counts/cursors; iterate candidate pages until enough authorized records or scan bound is reached, with an opaque continuation and no inaccessible total. Library folder/favorite operations reuse that authorization. AccessDirectory failures are 503, never fallback authorization. Tenant IDs in all queries are parameters, not identifiers.
