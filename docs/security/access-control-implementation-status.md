# Customer/Tenant Access Control implementation — 2026-10-04

The original architecture commit `d84b577355412513b1bcfd352ab7528738b535e0` is preserved on `feat/access-control-admin`, based on `fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368`. Implementation is in the normal checkout; no new worktree, reset, rebase, merge or production access. Push and exact-HEAD CI evidence are reported in the delivery chat.

## Approved correction and architecture

The reviewed profile defect is corrected: `TenantProfile.exampleBranchIds` remains required and is now a readonly zero-or-more array. `[]` explicitly means no trusted presentation/planner examples available, never unrestricted branches or source certification. Demo Iraq/Egypt examples remain unchanged. The mock planner guards the empty list; the AI panel supports zero/one/many supplied labels without fallback branch IDs. Tests prove actual analytics remains limited to the membership's branch AND salesperson policy even with empty examples.

No broader ADR 028 authorization architecture was reopened. Source-independent repository ports gained cohesive binding-status reads and tenant-local operational candidate discovery. Audit vocabulary includes candidate provisioning so that no event claims a membership or email was created by that operation. AnalyticsQuery/Result/Context/Repository, RequestContext, portable DashboardSpec and mart migrations/RLS/semantics are unchanged.

## Metadata and administration

- Immutable physical SQL migrations 001 baseline, 002 administration, 003 sharing, 004 tenant-local assignment candidates. Contiguous numbered SHA-256 history, BEGIN IMMEDIATE locking, all-upgrade rollback, foreign-key and runtime version/table readiness checks. Explicit migration CLI; no runtime/constructor upgrades. Legacy adapters refuse the versioned store.
- Known legacy saved dashboard/library records preserve IDs, spec JSON, ownership, private/tenant scopes, versions, timestamps, folders, favorites and deep links. Unknown schema or unreconciled foreign tenant/user references fail without data loss. Analytics and metadata paths must differ; no analytics facts are copied.
- Customer, dynamic tenant profile/lifecycle, global user, issuer/subject binding, roles, multiple-role memberships, scopes, separate platform assignments, dashboard grants, operational candidates and bounded audit persist independently of analytics.
- Sensitive mutations reload actor/target inside serialized transactions; capability/current-next scope delegation, protected/assigned roles, CAS, unscoped recovery administrator continuity and audit rollback are enforced. Separate bounded identifier-only memory audit holds denied/error attempts; successful audit is durable in the mutation transaction. Production durable denied-event retention remains pending.
- One-use offline operational bootstrap separates user/binding/platform assignment. Initial tenant admin provisioning explicitly activates a provisioning workspace and cannot bypass recovery for an already active tenant. Candidates are explicitly tenant-local; guessed global user IDs cannot create memberships. No tenant endpoint binds identities or assigns platform roles.
- Existing six demo users/seven membership IDs retain existing analytics domains, scopes and actions. Protected Tenant Admin additionally carries the administration actions mandated by the API/page contract; other legacy roles retain exact permission/domain behavior. Synthetic Platform Admin, Agent Manager (sales/CRM only), individual scoped Agent, custom-role user and a separate Egypt recovery admin are seeded only by explicit demo reconciliation.
- Fresh persisted requests apply lifecycle/role/scope changes immediately. Already-running execution retains its request snapshot. Global user, identity and tenant membership statuses remain distinct.

## Saved dashboards, profiles and UI

Private/tenant compatibility and restricted role/membership view grants are fully wired. Grant eligibility does not bypass current metrics/actions/scopes. List/get/library/deep links/saved execution use governed policy; public lists use bounded pages, scan limits and same-tenant cursors with no hidden totals. Spec and audience share one version; concurrent writes conflict. Foreign/suspended new audiences fail, existing suspended audiences remain dormant. Ownership and authorized Save As remain intact; copied records are private with no audience.

Dynamic profiles carry persisted approved market/currency/timezone/locale and actual tenant display names. Without trusted source organization data, branch labels/examples are empty. Source readiness is independent of lifecycle; DATA_NOT_READY happens before planner/executor work while metadata administration stays available. PostgreSQL resolves trusted reporting currency freshly while retaining mapping/serving approval, certification and RLS. Latest snapshot selection still precedes policy filtering.

Strict API schemas reject unknown fields, wrong planes/selected tenants, illegal role/domain/scope vocabularies, foreign references, illegal lifecycle transitions and stale versions. Platform Customers/Tenants/Users and tenant Users/Roles/Data Access/Dashboard Access/Tenant pages use separated permission-gated navigation and explicit versioned Save. User statuses are distinct; role edits contain capabilities/domains, scope edits use governed values, grants prefer roles and show membership exceptions. No IAM action is exposed to the LLM.

The project UI skill was applied through code/SSR checks: native forms/controls, explicit conflict/empty/error states, semantic tables with intentional overflow, existing tokens, both locales and guarded controls. No browser, manual keyboard, responsive, RTL visual or Light/Dark inspection was performed; these remain the requested Sol Low follow-up.

## Final local verification

- Frozen install: passed with unchanged lockfile; sandbox registry DNS failed first, authorized retry reused all 274 locked packages with no downloads.
- Lint: passed.
- Root and web typecheck: passed.
- Full monorepo: **555 passed**, zero failures, cancellations or skips. Initial sandbox run could not run two subprocess/socket test files; focused authorized rerun passed 18 tests and final full authorized run passed. These overlapping runs are not added together.
- PostgreSQL: **63 passed**, zero failures/cancellations/skips, in a disposable PostgreSQL 18.6 foundation_test container using synthetic credentials/data only. Includes compound OR/AND scopes, moved snapshot and dynamic trusted currency readiness/mismatch tests.
- Metadata migrations: **9 focused cases** included in the monorepo, covering baseline preservation, checksums/gaps/future versions, rollback, worker concurrency, old adapter refusal and incomplete readiness.
- Persistence/application administration: **13 focused cases**, including two-connection CAS, concurrent last-admin removal, audit rollback, fresh lifecycle, role/scope delegation, bootstrap and operational candidates.
- Governed administration API: **5 focused cases**, including the access matrix, shared spec/grant CAS, direct saved execute denial, cross-tenant/plane denial, dynamic profiles/readiness and hidden-record pagination.
- Planner/profile examples: **5 focused cases**; existing planner/security suites also pass. Changed AI panel and admin navigation have bilingual SSR coverage. SSR does not prove interactive/visual acceptance.
- API/web build: passed; the existing large main-bundle warning remains.
- Diff whitespace and changed owning-doc relative links: passed.

## Operational limits and pending production gates

[Local operations](administration-operations.md) documents explicit migration, backup/legacy reconciliation, bootstrap, candidate provisioning and source-readiness behavior. No production IdP, password/session/token validation, MFA/revocation SLA, invitation email, source connectors, production support impersonation, authoritative organization hierarchy or metadata hosting/backup/durable audit policy is implemented. These remain production gates. Local successful audit is not a claim of production retention readiness. Browser/manual product verification remains deferred.
