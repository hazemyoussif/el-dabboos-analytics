# Local administration metadata operations

The control plane uses the separate dashboard/library SQLite metadata store; it never uses mart tables or the demo analytics file. ADR 028 governs authorization. No production IdP, session/token validation, email delivery, passwords, customer source integration or production hosting is implemented.

## Explicit migration

Back up the closed metadata database first, including SQLite WAL/SHM files if applicable. Stop writers before an operational upgrade. Run:

```sh
pnpm metadata:migrate /absolute/path/to/dashboards.db --demo
```

`--demo` explicitly reconciles the known synthetic identities/customer/workspaces while migration 002 runs. Omit it for a clean non-demo database. Foreign legacy tenants/owners or preferences need an approved reconciliation callback/operator procedure; migration refuses them rather than inventing ownership. Unknown legacy schemas are refused. If analytics and metadata were historically colocated, copy only the three approved dashboard/library tables and their indexes into a separate file under an operator-reviewed procedure; leave the original analytics file intact. The runtime rejects equal paths, including existing-file symlinks.

Versions: 001 exact legacy baseline; 002 administration metadata and constraints; 003 grant-aware dashboard rebuild; 004 explicit tenant-local assignment candidates. Physical SQL is immutable after release. History stores numbered names, SHA-256 and application time. BEGIN IMMEDIATE serializes migration writers; each complete upgrade and reconciliation runs in one transaction, checks foreign keys, and rolls back on failure. No constructor auto-upgrades. Startup/readiness requires the current version and tables, and refuses checksum/gap/newer/incomplete schema. Legacy dashboard adapters refuse a versioned store. Operational rollback restores a backup with a compatible binary; it never erases restricted audiences to downgrade.

## Bootstrap and first tenant administrator

One-time offline bootstrap requires an operator-verified configured issuer/subject and a bounded audit reference:

```sh
pnpm metadata:bootstrap /absolute/path/to/dashboards.db bootstrap /absolute/path/to/verified-binding.json verified-reference
```

The JSON contains only `displayName`, `preferredLocale` (`en`/`ar`), `provider` (configured issuer/realm key) and `providerSubject`. It contains no password, token or secret. External verification is the operator's prerequisite; this command does not authenticate the human or contact an IdP. It creates separate user, binding and protected platform assignment plus an audit event/completion marker atomically. Replay is refused. Recovery/rebinding after completion remains a separately approved operational procedure, with no online platform-assignment endpoint.

Platform customer/tenant API creation produces metadata only. A new workspace is provisioning, with no analytics readiness inference. A platform operator explicitly provisions its first already verified active user's protected, unscoped tenant-admin membership:

```sh
pnpm metadata:bootstrap /absolute/path/to/dashboards.db tenant-admin ACTOR_BINDING_ID TENANT_ID TARGET_BINDING_ID EXPECTED_VERSION
```

This transaction requires a current protected platform admin and a provisioning target. It creates the initial membership and activates the workspace, with CAS and audit. It does not automatically make the platform actor a tenant member and cannot bypass recovery for an already active tenant.

Normal tenant assignment accepts only a known tenant-local operational candidate:

```sh
pnpm metadata:bootstrap /absolute/path/to/dashboards.db candidate ACTOR_BINDING_ID TENANT_ID TARGET_BINDING_ID
```

The candidate record is not an invitation and no email is sent. Global email/user discovery and guessed IDs cannot create membership. Existing membership role, scope and lifecycle edits use deterministic tenant endpoints; global user suspension/identity disable remains platform-only. Metadata repositories expose binding status reads separately so the UI can distinguish global user, identity and membership lifecycle.

## Runtime and administration

`ACCESS_IDENTITY_MODE=synthetic` (prototype default) resolves selected demo headers through persisted synthetic bindings. Set `disabled` to refuse authentication while an approved production adapter is pending. A caller header is never a production binding. There is no demo fallback after metadata failures. Every new request loads current persisted authorization; sensitive writes load it again under the transaction. Already-running execution keeps its request snapshot.

Platform pages: Customers, Tenants, Users/Access metadata. Tenant pages: Users, Roles, Data Access, Dashboard Access, Tenant. Navigation checks read permissions; routes are authoritative. Forms use explicit Save and expectedVersion; conflicts retain the draft for reviewed reload. System roles are immutable; assigned/granted custom roles cannot be deleted. Permission/domain unions belong to one selected membership. Scope values use governed, policy-scoped discovery; missing source values remain restrictive and visible for review. Scope editing is unavailable without data discovery. Source readiness is separate from workspace lifecycle; an active metadata workspace can return DATA_NOT_READY before planner or analytics execution.

Private means owner; tenant means same-tenant eligible members; restricted means owner or explicit role/membership view grant. Every saved list/get/library/deep link/saved execution also checks current metrics/actions. Saved execution uses `/api/saved-dashboards/:id/execute`; draft execution independently checks authorized metrics and enforced filters. Grants never add domains, edit rights or policy scope. Spec and audience share one version. Visibility changes to private/tenant clear grants. Suspended membership audiences remain dormant and can be retained explicitly, but new suspended-membership grants are refused. Nonowners cannot update the original; Save As creates private content without grants when dashboard:create is granted.

SQLite metadata writers, readers and personal-library operations share a connection queue; independent connections to the same canonical file share a process queue and database write locks. Mutation, recovery verification and bounded identifier-only audit commit together. Audit failures roll back. PostgreSQL uses fresh trusted profile currency while retaining serving-binding approval, certification and mart RLS. No mart migrations or analytics contracts change.

## Verification boundary

Automated migration, repository/service, API, planner/profile, SSR navigation and PostgreSQL tests cover the implemented boundaries. Responsive, theme, RTL visual, keyboard/manual and browser acceptance remain the explicit Sol Low follow-up. Automated SSR is not visual or interactive browser QA. Production audit retention/backup hosting, IdP/session revocation, invitations/email and authoritative organization integration remain pending production gates.

The operational command is now composed in `apps/api/src/administration-cli.ts`. It calls named provisioning operations in `packages/application/src/administration/provisioning.ts`, using the metadata store's single unit of work. CLI arguments, verified-binding input, one-use bootstrap marker, protected-role values and audit/recovery behavior are preserved. No production identity or invitation delivery is introduced.
