# Administration application, API and page contract

Implemented deterministic services and strict endpoints; see [local operations](administration-operations.md) and [verification status](access-control-implementation-status.md). [ADR 028](../architecture/adr/028-customer-tenant-access-control.md) and [storage design](administration-storage.md) are normative. React displays server decisions; no permission or scope in a request body establishes actor authority. No security mutations are exposed to the LLM.

## Request and mutation protocol

Platform routes use a trusted binding -> PlatformContext, without any tenant membership fallback. Tenant routes use binding + selected tenant -> ResolvedTenantAccess, then require selected tenant equals path target. Never authorize a body tenantId over the route. Actor, target and mutation are separate application arguments. HTTP unknown keys, protected/identity fields, illegal enum values, empty scope values, duplicate assignments and malformed versions are rejected before service calls. GET lists are bounded and permissions are checked even when empty.

All edit/delete requests carry expectedVersion; create requests cannot choose server ID/status/systemKey/protected/version/timestamps unless an explicit trusted bootstrap operation owns those fields. A successful mutation returns the new record/version and identifier-only audit evidence; conflict never auto-overwrites. Mutations re-resolve actor authority in the serialized metadata transaction, validate referenced objects in the same tenant, apply the mutation, check last-admin preservation and append audit. Denied/error events use a safe separate sink. End-user error messages never contain raw SQL, credentials or foreign metadata.

| Outcome | HTTP and code | UI behavior |
| --- | --- | --- |
| No authenticated binding | 401 IDENTITY_REQUIRED | Sign-in/demo selection; do not invent membership |
| Wrong plane/permission/tenant or inactive session | 403 ACCESS_DENIED | Permission/suspension state, hide forbidden actions |
| Foreign/private/ungranted dashboard or target hidden by ownership | 404 NOT_FOUND | Generic unavailable, no title/resource existence leak |
| Invalid schema/scope/permission/subject | 400 INVALID_ADMIN_INPUT | Field-local safe error |
| Stale expectedVersion | 409 VERSION_CONFLICT | Reload and review; never silently retry mutation |
| Protected role / in-use role / last administrator | 409 PROTECTED_ROLE / ROLE_IN_USE / LAST_ADMIN | Explain constraint; retain draft |
| Stale canonical organization ID | 409 STALE_DATA_SCOPE | Retain restriction, require reviewed replacement |
| Missing certified source | 503 DATA_NOT_READY | Metadata administration still available |
| Metadata storage/audit unavailable | 503 ADMIN_UNAVAILABLE | No partial write, no demo fallback |

Map pure AccessControlError and existing AuthorizationError deliberately; malformed stored metadata is a safe storage fault, not a silently empty successful list. Only expected metric/resource denials may hide dashboard candidates. Full canonical validation remains required before create/update/execute and post-planner output.

## Platform operations and pages

`P` below means `/api/platform`. Required permissions are exact platform vocabulary; manage does not imply view unless both are in the assigned role. V1 system Platform Admin has all six platform permissions; Support Admin has three view permissions. Tenant roles cannot grant either.

| Page and GET permission | Read data | Explicit mutations and required permission |
| --- | --- | --- |
| Platform > Customers; GET P/customers and P/customers/:id, platform:customers:view | Customer ID/name/status/version, tenant count, timestamps; no analytics | POST P/customers, PUT P/customers/:id, platform:customers:manage; name/status only; suspend blocks all member sessions under customer; no hard delete |
| Platform > Tenants; GET P/customers/:customerId/tenants and P/tenants/:id, platform:tenants:view | Customer, tenant ID/name/status, approved market configuration, readiness flag distinct from lifecycle | POST P/customers/:customerId/tenants, PUT P/tenants/:id, POST P/tenants/:id/suspend, platform:tenants:manage; provision, rename, suspend/reactivate. Customer association immutable. Market configuration creation validated; active market/currency/timezone change refused |
| Platform > Users / Access; GET P/users and P/users/:id, platform:users:view | Minimal global user/profile/binding status and assignment summary; no tokens, raw provider claims or customer analytics | PUT P/users/:id, POST P/users/:id/suspend and P/identities/:id/disable, platform:users:manage; recovery checks across all tenants and platform. Platform role provisioning/recovery stays operational, no online assign-platform-admin endpoint |

Tenant creation creates provisioning metadata only. Activation requires an explicitly selected active user with trusted identity and protected tenant_admin membership, assigned in an audited bootstrap unit of work. Platform administrators can choose that initial administrator as part of authorized tenant provisioning; this does not make themselves a member. For existing active tenants, no generic platform membership-edit API or recovery bypass; support access is pending separately. Suspended/provisioning metadata remains manageable by authorized platform users.

## Tenant operations and pages

`T` means `/api/tenants/:tenantId/admin`. Every operation checks active selected membership/tenant/customer, the exact permission below, and same-tenant targets. Suspended tenant normal admin UI is unavailable; platform can reactivate its metadata without reading analytics.

| Page / entry permission | Display | Mutation operations and rules |
| --- | --- | --- |
| Administration > Users; GET T/memberships, T/memberships/:id; users:view | Name, local contact/identity hint where authorized, user and membership status separately, roles, data-access summary, version. Do not enumerate arbitrary global users | POST T/memberships and PUT T/memberships/:id/roles require users:manage + roles:manage and capability/scope ceilings. Initial nonempty scopes also require data_scopes:manage. POST T/memberships/:id/suspend requires users:manage and authority over current capabilities/scope; last-admin check. Tenant action cannot suspend global user or rebind identity |
| Administration > Roles; GET T/roles; roles:view | Name, description, system/custom, assignment count (including suspended), action/domain summaries; no geography fields | POST T/roles, PUT T/roles/:id, DELETE T/roles/:id require roles:manage, unscoped actor, grantable action/domain subset and same-tenant ownership. Validate old and new capabilities. Protected roles read-only; referenced custom roles cannot be deleted |
| Administration > Data Access; GET T/membership-scopes; data_scopes:view | Membership display, roles, concrete scope labels/IDs, stale warnings/version; explicitly explain role vs data visibility | PUT T/memberships/:id/scopes requires data_scopes:manage; current and next scope within actor ceiling. Cannot change role/profile in this endpoint. All values from governed discovery, no free-text IDs |
| Administration > Dashboard Access; GET T/dashboard-access; dashboard_access:view | Only currently resource- and metric-authorized records; visibility, owner, role audiences, membership exceptions/version | PUT T/dashboards/:id/access requires dashboard_access:manage + dashboard:share and current dashboard eligibility. Body scope+grants+expectedVersion replaces atomically. Subject IDs must be tenant roles or active memberships. Grant is view only; private/tenant require empty grants |
| Administration > Tenant; GET T/tenant; tenant:view | Tenant/customer display name, locale, market/currency/timezone, status, source-readiness separately, version | PUT T/tenant requires tenant:manage and unscoped actor; name/defaultLocale only. No customer transfer, source binding, market change or tenant suspension through member plane |

A `users:manage`-only actor cannot smuggle roles/scopes through an update. Membership role endpoint does not accept scope changes; scope endpoint does not accept roles. For existing targets, evaluate current roles and scope before any narrowing/deactivation to prevent a delegated actor taking over higher-privilege users. Grant administration cannot modify ownership or spec. API computes assignment/audience summaries; UI never unions users' memberships across tenants.

Scope-value discovery: GET T/scope-values/:dimension requires data_scopes:view and uses the actor's resolved analytics filters plus governed dimension allowlist. Metadata pages may show safely localized labels from a trusted organization adapter if analytics is not data-ready; until that adapter exists, scope editing is unavailable when discovery is unavailable. Return known values only; never fabricate IDs. Existing stale entries remain visible/restrictive with an explicit review action. The same canonical value has localized labels without changing the persisted ID.

User assignment takes a previously authorized tenant-local invitation/assignment candidate, never a searchable global email-to-user directory. Invitations (optional follow-up) POST T/invitations requires users:invite + users:manage + roles:manage, and data_scopes:manage for nonempty scopes. GET candidates requires users:view and exposes only tenant-local invitations/known memberships. Acceptance binds the verified identity to intended user, revalidates inviter authority/role/domain/scope/expiry and consumes one-use digest atomically. No endpoint claims email delivery until provider integration is complete. Until invitations are implemented, direct assignment candidates come from explicit operational provisioning; no guessed user ID may discover or commandeer a global profile.

Page reads may return role names/scope summaries attached to authorized membership views without granting role/scope editing. Detailed permission-editor choices require roles:view; scope value picker requires data_scopes:view. UI links missing read permissions stay hidden; direct requests still deny. Default Tenant Admin carries every tenant vocabulary permission, while other built-ins preserve current behavior or explicit view/query capability.

## Saved dashboards and AI

Keep current saved list/get/create/update routes and Save As UX. Enable restricted scope only after new repository/service composition passes migration and security tests. POST create with tenant/restricted requires dashboard:share; initial grants are empty and subsequent access edit is explicit. All updates require ownership, dashboard:edit, current resource/metric eligibility, canonical validation and record expectedVersion. View grants do not permit update. Save As copies portable content only and defaults to private.

List/get/library/deep-link/execute use the same current-spec resource predicate. Listing requires dashboard:view + analytics:query and excludes metrics the actor cannot execute. Listing does not count hidden records. If a grant or scope changes during a page session, the next API call re-resolves and denies/restricts; the UI clears stale content on authorization failure. AI generate/edit retains application-owned compact plans, full validation and post-planner authorization. IAM objects, admin actions and policy filters are not planner tools or portable dashboard content.

## Completion acceptance for Sol

Application use cases must be callable without Fastify or React using trusted actor identity, target and validated mutation. Add strict endpoint schemas, safe error mapping, transaction orchestration, audit and concurrency tests before page wiring. Verify cross-tenant URL/body substitution, wrong-plane calls, action-specific escalation, concurrent last-admin removals, stale versions, source-scope staleness, protected role deletion and grant-vs-current-metrics. Use the project UI skill for actual implementation and AFTER review; this architecture-only phase performs no UI quality or browser audit.

## Workspace password-user creation

Workspace **Users → Create user** collects display name, email, initial password,
preferred locale and workspace roles in one form. `POST /api/tenants/:tenantId/admin/users`
requires the selected workspace to match the path and current `users:manage` and
`roles:manage` authority. Role delegation and data-scope ceilings apply unchanged.
The runtime authorizes before password hashing and the administration transaction
revalidates the actor and selected roles after hashing, under the existing writer lock.

Product user, local credential, identity binding, active workspace membership and
audits commit together. Failure rolls back all of them. No assignment candidate,
platform role, invitation, OTP or email delivery is created. Duplicate email fails
without linking an existing identity. The response contains no password or hash.

The workspace Users page also retains **Assign existing user** for previously
provisioned candidates and versioned role editing for existing members. The global
Users / Access page manages account lifecycle and directs new creation to workspace
Users; its legacy selection action only makes an existing account available for
workspace assignment. Roles continues to define reusable workspace roles separately.
