# ADR 028: Customer, tenant and access-control administration

Status: architecture accepted; implementation uses the separate versioned metadata store. Production IAM readiness remains pending. [Operations](../../security/administration-operations.md).

Scope: pure contracts, authorization rules and synthetic invariant tests. This phase does not enable persistent administration, restricted sharing routes, admin UI, email or authentication. The existing demo API remains on ADR 018 until the atomic cutover below. [Implementation contract](../../security/administration-contract.md), [metadata design](../../security/administration-storage.md), [Sol handoff](../../security/access-control-sol-handoff.md).

## Distinct entities and authorization planes

CustomerAccount is commercial ownership (id/name/status/timestamps/version). One customer owns **many** ManagedTenants; each tenant has one immutable customerId. ProductUser is a human profile, independent of IdentityBinding (configured provider/issuer + opaque subject). A user can have several bindings and memberships in tenants of different customers. Email/loginHint is display/contact metadata, never a linking or authorization key. Provider subject uniqueness includes issuer/realm. No automatic email-based account linking or tenant membership creation.

ManagedMembership is unique by tenant/user and contains multiple roleIds, lifecycle, dataScopes and version. Suspension/reinstatement preserves the same membership ID and audit history. Role is a reusable bundle of actions and analytics domains, never geographic scope. Customer and role persistence objects never enter AnalyticsQuery, AnalyticsContext or AnalyticsRepository.

PlatformAccessRole and PlatformContext form a separate control plane. Platform capabilities use `platform:*` names and cannot enter the tenant Permission vocabulary or RequestContext. Platform Admin can manage customer/tenant metadata without a tenant selection or membership. It cannot query analytics or open a dashboard. Support Admin initially has metadata read capabilities only. Any later support data access needs explicit, audited, expiring tenant membership/access approval; no implicit superuser or impersonation flow is defined here.

TenantAccessRole is either a global protected system template or a tenant-owned custom role. All actual assignments are to a tenant membership. System templates have stable IDs, never labels as identifiers. Existing demo IDs `admin`, `manager`, `analyst`, `sales-analyst` are retained at cutover; add `agent-manager`, `viewer` and platform IDs `platform-admin`, `support-admin`. systemKey expresses protected template meaning, not user-supplied metadata. Name/description localize independently. All system templates are immutable through admin APIs; upgrading them is an audited deployment migration.

## Three independent checks

1. Action permissions and metric domains come from the **union of roles on exactly the selected membership**.
2. Resource eligibility comes from owner/visibility/explicit view grants, checked against the selected membership's role IDs and membership ID.
3. Data scope compiles to existing enforced AnalyticsFilter values and intersects business filters at execution/discovery.

`resolveTenantAccess` takes a freshly loaded trusted snapshot, authenticated binding ID, selected tenant ID and locale. It checks binding/user/customer/tenant/membership states, relationship identities and every assigned role. Unknown/foreign/platform roles fail closed. Its RequestContext retains the established shape; request-local ResolvedTenantAccess keeps role IDs alongside it solely for resource policy. Roles and customer objects are not sent downstream to analytics. `resolvePlatformAccess` cannot produce a tenant context.

Snapshot reload occurs on **every new request**, and again under the write transaction for security mutations. No session-cached permissions or fallback-to-demo behavior after a persistence error. Changes apply to subsequent requests; already-running analytics may complete using its original snapshot. Cross-request revocation of external tokens, distributed caches and cancellation latency are separate production integration gates. Tenant selection never unions memberships. Customer suspension also disables normal tenant sessions under all its tenants, while platform metadata administration remains possible.

## Role capability migration

Move metricDomains to roles. The legacy User/Role/TenantMembership types and DemoIdentityProvider remain the compatibility adapter in this phase; Managed* contracts are the settled next model, not a second permanent IAM system. Sol cuts over composition, then removes the legacy membership-domain field after parity evidence.

Seed admin/analyst/manager with their existing domains, sales-analyst with sales+CRM. Preserve all current six demo users, seven membership IDs and Baghdad policy. Agent Manager gets only dashboard:view, analytics:query and sales+CRM. Collections is a finance domain in the current catalog: **do not silently include finance** to approximate collections-only authorization. Finance/collections expansion is a deliberate separate role/domain product decision. A Baghdad Agent can reuse the viewer template with a tenant custom sales capability role or a tenant custom sales viewer role; its data scope selects one salesperson. Avoid geography-named role templates.

For non-demo imported memberships, migration must compute the exact prior permission/domain result and preserve it. Never drop legacy domain restrictions just because assigned roles are broader. Refuse/flag mismatches for reviewed tenant-local role bundles preserving the previous result; no union with old membership domains and no automatic capability expansion. The current repo has no persisted IAM rows, so this is a future import safeguard, not a hidden existing-data migration.

## Bounded data scopes

Only region, branch and salesperson are approved scope dimensions in V1. Same-dimension values are OR; dimensions are AND. One filter per dimension, nonempty unique canonical values, at most 1,000 values per dimension. Missing dimension means unrestricted; an empty array is invalid. Database rows group into filters before compilation. Scope labels never substitute for IDs. No boolean policy language, sales_team, inferred organization hierarchy or new source IDs.

Values are obtained from policy-scoped governed discovery and validated at mutation time. Future authoritative organization adapters may add hierarchical resolution into the same concrete values contract. Missing/stale source IDs remain restrictive and visible for admin review; they are never removed automatically. Unknown dimensions or malformed stored scopes deny resolution. A missing source value yields no matching facts; missing required source attribution also cannot match a filter.

Keep latest snapshot selection **before** user/policy filtering in every adapter. The new mock/SQLite tests use composed branch+salesperson filters and moved snapshots. PostgreSQL SQL/RLS and source contracts are unchanged; Sol repeats its existing suite and adds compiled-scope parity there before delivery.

## Resource access and editing

AccessControlledDashboardRecord is the staged additive record contract: private / tenant / restricted. It does not change DashboardSpec v2. Existing DashboardRecord and its SQLite/API contract deliberately remain private/tenant until the grant-aware adapter is available. Widening the old type alone would leave its SQL unable to fetch authorized restricted records and its owner predicate insufficient for grants. Sol must replace repository/service/composition together.

Private is owner only. Tenant is same-tenant membership eligibility. Restricted is owner plus explicit role/membership grants. Ownership provides resource eligibility, **never** action, metric or data-scope bypass. Grants are view-only, tenant-bound, stable-ID subjects; no role-name checks or implicit Tenant Admin grant. A template role audience means holders of that template **in this tenant**, not its holders everywhere. Suspended membership grants are dormant and cannot be newly created; reactivation restores the same membership's still-present grants, visible to the administrator. Deleting a role is refused while any grant/reference exists.

Every list/get/execute path checks tenant, resource, dashboard:view, analytics:query and the **current canonical spec's** metrics; then execution uses current scopes. Inaccessible records do not appear with titles/counts as accessible. Lists and deep links use `authorizeDashboardResource`; list orchestration catches only expected denial codes and propagates storage/validation faults. Generic draft execution has no saved-resource lookup but still validates all metrics/actions/scopes; knowing a saved ID cannot fetch its content. Resource privacy does not prohibit users querying independently authorized metrics in their own drafts.

Restricted grants never confer edit. Non-owner uses Save As to create a new private record with a new ID and no copied grants. Owner updates still require dashboard:edit plus validation, metric checks and version CAS. Resource/view authorization is rechecked before owner updates. Existing private/tenant sharing behavior is preserved. An owner may change spec to domains other grantees cannot access; on next listing/open those grantees are denied. Security metadata lives outside planner/spec/patch; the LLM has no admin mutation tools.

Dashboard spec edits and access replacement increment the **same record version**. Access/spec must be read in one consistent snapshot and have matching versions. Any mismatch denies/retries internally, never authorizes stale audience. An access edit races safely with a spec edit via expectedVersion. Grant replacement and visibility change are one transaction. Switching to private/tenant clears grants, so old audiences cannot silently reappear on a later switch to restricted.

## Delegation and recovery

Tenant Admin has tenant administration actions, but cannot mutate another tenant or global user/identity state. Tenant user suspension means membership suspension; global user/identity disable is platform-only and affects all memberships. Tenant admin can manage tenant-local display metadata; immutable customer/market/currency/timezone fields are not editable there.

Custom roles may contain only the tenant allowlist **and a subset of the actor's current effective actions/domains**. Both current and next role capabilities are checked on update. users:manage alone cannot assign/elevate roles; assignment requires roles:manage too. Scope changes require data_scopes:manage. Membership create/role change checks actor authority over current and proposed target scope and capabilities. A delegated administrator cannot take over a broader target by narrowing it first. Global role-definition edits are forbidden to row-scoped admins in V1 because they affect multiple assignees; unscoped admins still cannot delegate capabilities they lack. Tenant metadata mutation also requires an unscoped administrator.

Only a currently resource-authorized administrator with dashboard_access:manage and dashboard:share can change that dashboard's access. This avoids turning access administration into implicit access to every private/restricted dashboard. Initial creator chooses restricted scope under dashboard:share; initial access remains owner-only until grants are saved. Governance/recovery of abandoned owners requires explicit audited transfer in a future milestone, not an implicit Tenant Admin override.

Refuse a mutation leaving no active recoverable protected tenant_admin membership for a tenant. Count distinct active users with an enabled identity and active membership, not role rows; check user/identity suspension across every affected tenant. Keep at least one **unscoped** tenant administrator so recovery can cover the tenant. Custom roles with similar permissions do not count as the protected recovery role. Tenant/customer suspension preserves these recovery relationships even though normal sessions are disabled. Initial provisioning transaction creates the first explicit tenant-admin membership before activation; a platform account still obtains no implicit membership.

Serialize validation and mutation in one metadata unit of work, with optimistic versions and an atomic identifier-only audit event. SQLite BEGIN IMMEDIATE serializes writers; production adapters provide equivalent serializable locks. Concurrent last-admin removals cannot both commit. The pure continuity rule is tested; concurrent adapter enforcement belongs to Sol. Custom role deletion requires unprotected, unassigned (including suspended memberships, invitations and grants) and correct version. No customer/tenant/user/identity/membership hard-delete endpoint.

Platform recovery similarly refuses loss of the last active protected platform_admin identity assignment. Initial production bootstrap is a one-time offline operational command taking a trusted configured issuer+subject and audit reference, binding an already verified external identity; no password/default secret/public bootstrap endpoint. Persist completion marker atomically, refuse normal replay, and require a separately approved audited recovery procedure. Demo bootstrap remains synthetic and explicitly enabled only in demo mode.

## Lifecycle and readiness

Approved implementation correction: `TenantProfile.exampleBranchIds` is a required readonly zero-or-more list. `[]` means no trusted presentation/planner examples are available; it never means unrestricted branches or source certification. Demo examples remain unchanged. Planner/presentation consumers omit branch examples when empty. Authorization scopes remain independent.

Customer: active/suspended. Tenant: provisioning/active/suspended. User: invited/active/suspended. Membership and platform assignment: active/suspended. Identity binding: active/disabled. Invited does not imply an email was sent. Invitations are optional one-use hashed-secret records with tenant, target, roles/scopes, inviter, expiry and status; acceptance must revalidate current inviter authority, target binding and tenant status atomically. No secret is logged or persisted in plaintext, and resending revokes the old token.

Tenant IDs are data-driven strings now; the known demo registry retains typed demo keys for compatibility. Validated IQ/EG configurations remain closed; no arbitrary country/currency/timezone strings. TenantProfileProvider bridges persisted configuration and source-owned labels. Branch labels and example branches are legacy presentation scaffolding and must be supplied by discovery/profile adapter, never persisted as tenant-security configuration. Tenant existence/activation does not create an analytics serving binding. An active tenant with no certified source can administer metadata; analytics reports DATA_NOT_READY with no fabricated results. Changing market/timezone/currency after activation is refused in V1; a future audited migration must reconcile serving configuration/history first.

## Persistence, API and handoff boundary

Use source-independent cohesive ports in administration-repository.ts and a dedicated metadata SQLite file (the existing dashboard/library metadata store extended through versioned migrations). No IAM tables in mart.* and no reuse of the PostgreSQL mart migration runner. Local migrations/import/cutover, adapters, app CRUD, routes and UI are specified in linked contracts and deferred to Sol.

Audit contains actor, customer/tenant where relevant, target ID, closed action, timestamp and result. No tokens, login contents, raw rows or full before/after payloads. Successful mutation and outbox/audit append commit together; denied/error audit uses a separate safe sink. Durable audit retention/hosting remains a production decision.

No production IdP/SSO, token/session validation, MFA/password policy, revocation infrastructure, email delivery, customer onboarding, source organization ownership or production metadata hosting is approved by this ADR. No production access or Odoo/Engine/n8n connector work is included.
