# Customer/Tenant Access Control — Sol 6.1 Medium implementation handoff

Architecture phase complete, 2026-10-04. This is a bounded implementation handoff, not production IAM readiness or completed administration functionality.

Implementation continuation: the reviewed empty-example correction and persistent cutover are implemented; see [implementation status](access-control-implementation-status.md) and [local operations](administration-operations.md). The architecture work is now committed at `d84b577355412513b1bcfd352ab7528738b535e0`; the original uncommitted-state notes below describe the architecture phase, not the continuation checkout.

## Repository state

- Branch: `feat/access-control-admin`.
- Fetched base: `fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368` (Merge production data foundation), matching the requested expected main.
- HEAD: same base; architecture changes intentionally remain uncommitted in this worktree.
- Working tree: started clean; now modified/new architecture, tests and owning docs only.
- User-supplied baseline CI: 37147980063 GREEN; not independently revalidated and does not cover this working tree.
- Push: not performed. Merge: NOT MERGED. Production access: NONE.

## Implemented architecture

- [ADR 028](../architecture/adr/028-customer-tenant-access-control.md): settled model, permission planes, scope and resource policy, recovery/lifecycle, migration boundaries.
- [Domain access-control contracts](../../packages/domain/src/access-control.ts): CustomerAccount, ManagedTenant, ProductUser, IdentityBinding, tenant/platform AccessRole, ManagedMembership, scopes, platform assignment/context, dashboard audience, invitations and safe admin audit. Role/configuration/scope validation and scope delegation rules are executable.
- [Administration repository ports](../../packages/domain/src/administration-repository.ts): access snapshots, dynamic profiles, cohesive metadata repositories, grant-aware saved records, transactional audit and unit of work.
- [Application access-control rules](../../packages/application/src/access-control.ts): separate resolvers; selected-membership role/domain union; delegation ceilings; custom-role protection; recovery guards; current-spec resource authorization; grant subject validation.
- [Application invariant tests](../../packages/application/test/access-control.test.ts), [synthetic fixtures](../../packages/application/test/fixtures/access-control.ts), [data scope tests](../../packages/data/test/access-control.test.ts).
- Tenant-only Permission vocabulary has owning planned operations; platform vocabulary is separate. TenantProfile ID accepts strings; existing demo registry keeps known typed keys. Synthetic fact seeding explicitly rejects unknown profiles rather than assuming a dynamic tenant is a demo profile.
- Owning security/request-context/personas/change-guide/QA/system-design docs link to the staged architecture.

The `Managed*` names are the explicit migration seam. Do not permanently maintain competing runtime IAM models. Current HTTP composition remains DemoIdentityProvider + old private/tenant DashboardRepository until the cutover is ready. Existing User/Role/TenantMembership and membership metricDomains are unchanged in that adapter. Restricted records are **not accepted by the current HTTP route or SQLite CHECK**; the separate additive record contract is deliberate, preventing a half-enabled sharing feature.

## Settled core model

Customer is commercial ownership, tenant is isolated workspace/security boundary. User profile is separate from immutable external identity binding. Membership is user/tenant plus multiple roles and concrete data scope. Roles own action permissions and metric domains; custom roles are tenant-owned and bounded by actor capabilities. Protected platform roles administer metadata without analytics membership.

Effective permissions and metric domains are selected-membership role unions. Filters compile from region/branch/salesperson scopes: OR within dimension, AND across dimensions. Resource access uses private owner / tenant / restricted owner-or-explicit-role-or-membership view grants. Every open/list/execute still needs view/query actions and current metric authorization; current policy scope applies at execution. Grants do not add metrics, edit rights or data visibility. RequestContext, AnalyticsContext, AnalyticsRepository and DashboardSpec keep their established shape. PostgreSQL mart/schema/RLS/semantics are untouched.

Platform pages: Customers, Tenants, Users/Access metadata. Tenant pages: Users, Roles, Data Access, Dashboard Access, Tenant. System roles are immutable; referenced custom roles cannot be deleted. At least one active, identity-enabled, unscoped protected tenant administrator must remain; platform recovery similarly retains a protected platform admin. Suspension preserves records and takes effect on the next freshly resolved request. In-flight queries use their existing snapshot; production revocation latency is still an integration gate.

## Implementation order — Sol 6.1 Medium

1. Read the [API/page contract](administration-contract.md), [storage/migration design](administration-storage.md), ADR and pure rules. Preserve source data foundation and planner invariants. Inspect current branch/worktree; do not overwrite these uncommitted changes or assume main has not moved.
2. Implement metadata-only numbered migration runner and explicit CLI/readiness version checks, including known legacy baseline recognition, schema rebuild preserving records/preferences, checksums, rollback and locking. Extend the existing separate dashboard/library metadata store; keep mart migration tooling independent. Do not connect to production sources.
3. Implement AccessDirectory and cohesive repositories under AdministrationUnitOfWork. Enforce tenant/object scope, immutable fields, references, CAS, active-admin checks and transactional safe audit. Add bootstrap-only binding/assignment capability; do not expose global identity rebinding or platform-role assignment through tenant/admin HTTP.
4. Seed protected templates using stable current demo IDs and preserve all six current demo users/seven memberships. Add explicitly synthetic Platform Admin, Baghdad Agent Manager, individual Baghdad Agent/custom-role scenarios. Preserve legacy permission/domain results exactly; do not union legacy domains into role capabilities. New Agent Manager is sales/CRM, no automatic finance/collections.
5. Implement deterministic admin use cases and strict HTTP schemas/permission checks/error mapping from the API table. Re-resolve actor under the transaction and evaluate current as well as target capability/scope before modifications. Scope discovery uses only approved canonical values. Suspended global user/identity checks recovery in all affected tenants and platform. Add endpoint/invariant/concurrent mutation tests before UI.
6. Replace saved-record repository/service wiring atomically with grant-aware policy. Unify list/get/library/deep-link/execute eligibility; lists filter current metric access before returning counts/records. Preserve ownership + Save As. Shared single-version CAS covers spec and grant edits. Only then accept restricted HTTP scope. Test old saved records and deep links plus stale grants/new metrics, role/membership audiences and conflicting access/spec edits.
7. Replace static tenant resolution in API context/identity discovery with TenantProfileProvider over managed tenant configuration. Preserve demo adapters explicitly. No existence => source-ready inference; an active workspace can have DATA_NOT_READY analytics. Dynamic trusted reporting-currency lookup must feed existing PostgreSQL composition without weakening release/currency checks; no mart redesign. Do not invent branch labels/example IDs for new profiles: presentation provider uses approved discovery and handles empty data with safe non-planner readiness state.
8. Implement permission-gated pages/forms/navigation in apps/web using the documented operations. Identity/global user status versus membership status must be visibly distinct. No per-user permission checkbox matrix, arbitrary IDs in scope UI, implicit saves or client authority. Apply project dashboard quality skill for the UI phase.
9. Implement invitations only as a clearly separate optional integration: no fake email delivery. Until then use explicit synthetic/operationally provisioned candidates, not a global email lookup. No passwords or new auth protocol.
10. Run targeted tests, then frozen install/lint/typecheck/full monorepo tests/build and the existing 62+ PostgreSQL tests before any push. Add PostgreSQL compound-scope/moved-snapshot acceptance using compiled scopes. No automatic merge. Make the working tree a reviewed coherent commit/PR only under the user's continuation scope.

Architecture requirements still needing adapter/application enforcement are **not** satisfied merely by calling a pure guard outside a transaction: last-admin concurrency, current/next delegation, role reference deletion, audit rollback, same-version audience reads and immediate subsequent-request re-resolution are mandatory.

## Deferred to Sol Low / manual QA

After implementation, verify platform/tenant navigation and direct URL denials; own/foreign/private/tenant/restricted dashboard flows; scoped Agent Manager/Agent catalogs and queries; Users/Roles/Data Access/Dashboard Access/Tenant editing; protected/assigned role errors; stale scope, suspension, conflict and empty/not-ready states. Exercise keyboard/focus, bilingual EN/AR/RTL, Light/Dark/System, narrow/tablet/desktop layouts, table readability and explicit Save/Save As. Record manual evidence separately from unit/SSR/API tests. No browser, styling, responsive, RTL or visual QA was performed in this phase.

## Focused verification evidence

- Frozen dependency installation passed; lockfile unchanged. The first sandboxed auto-install hit DNS restrictions, then an authorized install succeeded from the locked package cache.
- Targeted architecture/security + existing API saved/library/template + seed compatibility run: **52 tests passed**, zero failures (before one additional handcrafted-query test was added).
- Final architecture/security rerun: **30 tests passed**, zero failures, including that additional test. These counts overlap and must not be summed as unique coverage.
- Root and web TypeScript checks passed; targeted lint passed. Final checks were rerun after guard changes.
- Node 24.21.0, `--experimental-transform-types --disable-warning=ExperimentalWarning --test --test-isolation=none` used to report individual tests in this sandbox.
- No developer env, live customer/model services or production data used. Full monorepo suite/build, PostgreSQL suite, CI and browser QA deliberately not run for the architecture stop boundary.

Commands (from repository root):

```bash
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json
node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-isolation=none \
  packages/application/test/access-control.test.ts packages/application/test/security.test.ts \
  packages/data/test/access-control.test.ts packages/data/test/security.test.ts
```

The 52-test compatibility run additionally included packages/data/test/seed.test.ts and apps/api/test/{api,saved-dashboards,saved-route,dashboard-library,template-matrix}.test.ts. Targeted lint covered the changed TypeScript files; broad verification belongs to the implementation phase.

## Architecture checkpoint

Every answer below is YES at the contract/pure-rule level; persistent routes and UI remain the implementation work listed above.

| Question | Answer / evidence |
| --- | --- |
| One customer owns multiple tenants? | YES — nonunique tenant.customerId, validated ownership, multi-workspace test |
| One user spans several customers? | YES — separate memberships, no customer attached to global user |
| One membership holds multiple roles? | YES — roleIds and union tests |
| Roles reusable across Baghdad/Basra? | YES — scopes live on memberships, reuse test |
| Agent Manager Baghdad-only? | YES — branch enforced filter, mock/SQLite execution tests |
| Also selected agents only? | YES — salesperson OR plus branch AND tests |
| Finance and Agent dashboards independently granted? | YES — per-record audience independent of metric domains |
| Grants fail closed after metric changes? | YES — current-spec policy test rejects inventory/finance without domain |
| Platform Admin manages tenants without analytics? | YES — distinct plane/context, no tenant fallback test |
| Tenant Admin creates custom roles without escalation? | YES — tenant vocabulary/ownership and actor capability ceiling guards/tests |
| Suspended membership immediately loses access? | YES — next-request fresh resolution denies; already-running request boundary explicit |
| Tenant suspension preserves history? | YES — status change only, no delete port, recovery membership retained |
| Existing demos keep working? | YES — existing composition preserved and targeted API/security/seed tests passed |
| Future Odoo/Entra/Keycloak auth resolves same RequestContext? | YES — trusted provider binding and AccessDirectory snapshot boundary |
| AnalyticsRepository stays unaware of IAM entities? | YES — unchanged AnalyticsContext/Repository contracts and tests |

## Pending production decisions

Approved IdP/SSO, token/session validation, MFA/password policy and identity ownership; distributed revocation latency; invitation/email provider and delivery; commercial onboarding; audited support access; authoritative canonical organization IDs and missing-entity review ownership; production metadata DB/hosting, backup/restore and durable audit retention. These are integration/platform gates, not unresolved choices about the domain authorization model. No source connector, source credentials, Odoo/Engine API/n8n work or real customer data was used.
