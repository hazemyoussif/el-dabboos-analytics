# Access Control Administration — Manual/Product QA Report

Date: 2026-10-04 (Africa/Cairo). This is a browser/product QA report, separate from unit/SSR coverage. No merge was performed.

## Repository

- Branch: `feat/access-control-admin`
- Starting SHA: `e9dc15bfce630f8f7d5f5b641f18bc806a9f9b36`, clean, exact reviewed state.
- Final SHA, final remote state and exact-head CI: supplied in the delivery message after this report commit is created.
- Starting ahead/behind origin/main: 14/0. Reviewed Medium decomposition preserved; no reset/rebase/merge.
- No production services, credentials, customer facts or IdP were accessed.

## Commits created during QA

| SHA | Message | Purpose |
| --- | --- | --- |
| `57ecf3c24c3bdfd83dd8c204a1c642bfc55c6989` | fix(admin): localize lifecycle labels and recovery feedback | Localize lifecycle/visibility, tenant setting keys and safe error recovery; clarify OR/AND scopes. |
| `5f3689de0c1e7e365d8e5d003bc673301ebf6315` | fix(admin): keep collapsed administration navigation usable | Use existing Lucide/label/sidebar conventions to prevent clipped tablet navigation. |
| Report commit (see delivery SHA) | docs(qa): record administration browser and authorization evidence | Preserve this evidence and selected synthetic screenshots. |

## Environment and evidence boundaries

Node 24.21.0, pnpm 12.6.0; mock analytics/planner; explicitly migrated synthetic SQLite `/tmp/el-dabboos-access-qa.db`; localhost API 3001 and Vite 5173. A temporary localhost relay on 3002 and separate Vite 5174 delayed selected responses by four seconds. No repository runtime configuration or developer env file was used. PostgreSQL 18.6 ran using the documented disposable tmpfs container.

The stock Agent Manager has only dashboard/query authority. User-approved disposable setup added users:view/manage, roles:view/manage and data_scopes:view/manage with no added metric domains, retaining branch=baghdad. User separately approved disabling only synthetic:demo-custom-user. Both permissions were requested after automatic approval review rejected their first attempted setup; rejected commands did not execute. These fixture changes exist only in the temporary database.

## Manual QA matrix

| Persona | Customer / Tenant | Page / resource | Action | Expected | Observed | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Platform Admin | demo-customer / platform | Customers | Edit at version 1; independent HTTP write advances version to 2; stale Save | Conflict; newer name retained | Conflict shown; draft retained; Reload and review shows version 2 | PASS |
| Platform Admin | demo-customer / platform | Tenants | Inspect IQ editor and switch to QA customer | Immutable approved market; rows belong to selected customer | IQ/IQD/Asia/Baghdad disabled on active tenant; QA customer shows its no-data tenant | PASS |
| Platform Admin | platform | Users / Access | Edit custom user preferred locale to Arabic | Explicit Save refreshes persisted metadata | Version advanced to 2; global Active and identity Disabled later remain distinct | PASS |
| Platform Admin | platform | Users / Access | Inspect platform assignment and approved identity disable | Platform role separate; disabled binding loses authority | platform-admin Active displayed; disabled user next request 403; global user still active | PASS |
| Iraq Admin | demo-customer / demo-iq | Roles | Create QA Sales Review; rename QA Sales Reviewed | Persisted bounded sales role and version refresh | Created version 1, edited version 2; permission/domain selections preserved | PASS |
| Iraq Admin | demo-customer / demo-iq | Roles | Create and delete QA unused role; inspect assigned and protected roles | Unused deletion works; assigned/protected deletion unavailable | Deleted row absent; assigned Delete disabled; protected rows have no edit/delete | PASS |
| Iraq Admin | demo-customer / demo-iq | Users | Assign additional QA role to iq-custom | Multiple roles belong to one membership | Sales Viewer + QA Sales Reviewed shown at version 2 | PASS |
| Iraq Admin | demo-customer / demo-iq | Users | Inspect no-candidate state | Explain operational prerequisite | No Create; candidate/invitation-not-configured explanation | PASS |
| Iraq Admin | demo-customer / demo-iq | Data Access | Add Basra to iq-agent while retaining salesperson_1; restore via HTTP | Same dimension OR; different dimensions AND | Version 2 retained both branches and salesperson; restored version 3; query outside enforced scope returns no rows | PASS |
| Approved scoped Agent Manager | demo-customer / demo-iq | Data Access | Open iq-agent scope editor; uncheck Baghdad and Save | Governed picker bounded; removal cannot broaden beyond actor | Only Baghdad branch offered; broader request denied; safe error and reload shown | PASS |
| Iraq Admin | demo-customer / demo-iq | Dashboard Access | Save Agent Manager role audience in Arabic | Explicit Save advances access/spec shared version | Restricted row displays role: agent-manager at version 8 | PASS |
| Egypt Admin | QA empty customer / disposable EG tenant | Tenant + Data Access | Open active tenant without analytics source | Active metadata does not imply data readiness | Arabic not-ready shown; no branch inventions; scope Edit disabled | PASS |
| Egypt Admin | demo-customer / demo-eg | Roles + Users | Inspect Arabic roles and membership pages | Arabic labels; correct EG tenant rows | System/protected counts, user/auth/membership distinctions and no candidates shown | PASS |
| Iraq Admin | demo-customer / demo-iq | Tenant | Arabic stale version 1 Save after HTTP update to version 2; reload then save | Localized conflict, draft retained, reviewed retry uses fresh version | Arabic conflict; newer Iraq QA reviewed retained; reviewed Save gives Iraq QA final reviewed version 3 | PASS |
| Iraq Admin | demo-customer / demo-iq | Roles -> Tenant | Delay role response four seconds; navigate immediately | Earlier page response cannot overwrite Tenant | Tenant remains with correct IQ settings after delayed completion window | PASS |
| Platform Admin | demo-customer / platform | Tenants -> Users / Access | Delay customer tenant response four seconds; navigate immediately | Old rows/errors/loading cannot replace current Users page | Users page remains with identities and no tenants table after delay window | PASS |
| Iraq Admin | demo-customer / demo-iq | Data Access | Local API interruption; Reload and review | Safe localized recoverable error | Generic Arabic request error with reload; recovery loads data | PASS |
| Iraq Admin | demo-customer / demo-iq | Navigation + forms | 390px RTL Dark: Tab, Enter, Shift+Tab, Escape | Reachable controls; focus wrap and visible indicator | Save Tab reaches Cancel; 2px focus outline; Enter cancels; nav wraps to Theme and Escape returns to trigger | PASS |
| Iraq/Egypt Admin + Platform Admin | synthetic tenants / platform | Eight administration pages | Inspect EN/AR, Light/Dark, wide/laptop/tablet/mobile | Readable localized layout and actions | Raw labels/errors corrected; clipped tablet nav fixed; table overflow contained; technical tokens intentionally retained | PASS |
| Iraq Admin | demo-customer / demo-iq | Theme | Set app Theme to System; manually exercise light and dark `prefers-color-scheme` states | System follows each preference without refresh | Administration followed both preference states without refresh and remained usable in both | PASS |

All eight top-level pages were visited in English and Arabic. Persisted synthetic role names, descriptions, permission/domain identifiers and fixture titles remain in their authored language; they are not untranslated UI copy. Private/tenant/restricted and member/user/identity lifecycle labels are localized while serialized enum values remain unchanged.

## Direct HTTP authorization and workflow matrix

Each following row is an actual localhost HTTP request against the disposable persisted API, not Fastify inject or SSR. Expected is the HTTP status; observed contains status and safe error code. Customer is demo-customer unless the row concerns the QA customer/dynamic tenant or platform metadata. A valid same-tenant request may still be denied by current metric authority.

| Persona | Tenant | Action | Resource | Expected | Observed | Result |
| --- | --- | --- | --- | --- | --- | --- |
| demo-iq-admin | demo-iq | tenant cannot read platform | `/api/platform/customers` | 403 | 403 ACCESS_DENIED | PASS |
| demo-platform-admin | demo-iq | platform-only cannot query | `/api/analytics/query` | 403 | 403 ACCESS_DENIED | PASS |
| demo-iq-analyst | demo-iq | analyst cannot manage roles | `/api/tenants/demo-iq/admin/roles` | 403 | 403 ACCESS_DENIED | PASS |
| demo-iq-admin | demo-iq | selected tenant cannot change plane | `/api/tenants/demo-eg/admin/roles` | 403 | 403 ACCESS_DENIED | PASS |
| demo-iq-admin | demo-iq | cross-tenant membership target | `/api/tenants/demo-iq/admin/memberships/eg-analyst` | 404 | 404 NOT_FOUND | PASS |
| demo-iq-admin | demo-iq | protected role deletion | `/api/tenants/demo-iq/admin/roles/admin` | 409 | 409 PROTECTED_ROLE | PASS |
| demo-iq-admin | demo-iq | assigned role deletion | `/api/tenants/demo-iq/admin/roles/demo-sales-viewer` | 409 | 409 ROLE_IN_USE | PASS |
| demo-iq-admin | demo-iq | last tenant administrator | `/api/tenants/demo-iq/admin/memberships/iq-admin/suspend` | 409 | 409 LAST_ADMIN | PASS |
| demo-iq-admin | demo-iq | invalid admin schema | `/api/tenants/demo-iq/admin/roles` | 400 | 400 INVALID_ADMIN_INPUT | PASS |
| demo-iq-admin | demo-iq | restore scope | `/api/tenants/demo-iq/admin/memberships/iq-agent/scopes` | 200 | 200  | PASS |
| demo-agent | demo-iq | agent enforced branch | `/api/analytics/query` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | manager finance denied | `/api/analytics/query` | 403 | 403 METRIC_FORBIDDEN | PASS |
| demo-iq-admin | demo-iq | create private | `/api/saved-dashboards` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | create tenant | `/api/saved-dashboards` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | create restricted | `/api/saved-dashboards` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | private nonowner | `/api/saved-dashboards/6d3fcf1f-271b-4fb7-be3c-f89c41167d9a` | 404 | 404 DASHBOARD_NOT_FOUND | PASS |
| demo-agent-manager | demo-iq | tenant eligible member | `/api/saved-dashboards/d410eadf-6d07-4e05-b670-5e991ef6d0e4` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | restricted no grant | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 404 | 404 DASHBOARD_NOT_FOUND | PASS |
| demo-eg-admin | demo-eg | cross tenant dashboard | `/api/saved-dashboards/d410eadf-6d07-4e05-b670-5e991ef6d0e4` | 404 | 404 DASHBOARD_NOT_FOUND | PASS |
| demo-iq-admin | demo-iq | cross-tenant grant subject | `/api/tenants/demo-iq/admin/dashboards/8c695921-62d4-467f-96fb-f1787012abf2/access` | 404 | 404 NOT_FOUND | PASS |
| demo-iq-admin | demo-iq | role view grant | `/api/tenants/demo-iq/admin/dashboards/8c695921-62d4-467f-96fb-f1787012abf2/access` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | granted role current metric | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | owner metric cutover | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | old grant new metric denied | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 403 | 403 METRIC_FORBIDDEN | PASS |
| demo-iq-admin | demo-iq | owner restore sales | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 200 | 200  | PASS |
| demo-iq-analyst | demo-iq | nonowner edit denied | `/api/saved-dashboards/d410eadf-6d07-4e05-b670-5e991ef6d0e4` | 404 | 404 DASHBOARD_NOT_FOUND | PASS |
| demo-iq-analyst | demo-iq | Save As private copy | `/api/saved-dashboards` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | membership exception grant | `/api/tenants/demo-iq/admin/dashboards/8c695921-62d4-467f-96fb-f1787012abf2/access` | 200 | 200  | PASS |
| demo-iq-analyst | demo-iq | exception access | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | membership suspension | `/api/tenants/demo-iq/admin/memberships/iq-analyst/suspend` | 200 | 200  | PASS |
| demo-iq-analyst | demo-iq | fresh suspended request | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 403 | 403 ACCESS_DENIED | PASS |
| demo-iq-admin | demo-iq | retain dormant exception | `/api/tenants/demo-iq/admin/dashboards/8c695921-62d4-467f-96fb-f1787012abf2/access` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | membership reactivation | `/api/tenants/demo-iq/admin/memberships/iq-analyst/suspend` | 200 | 200  | PASS |
| demo-iq-analyst | demo-iq | reactivated exception | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | remove grants | `/api/tenants/demo-iq/admin/dashboards/8c695921-62d4-467f-96fb-f1787012abf2/access` | 200 | 200  | PASS |
| demo-iq-analyst | demo-iq | removed exception denied | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 404 | 404 DASHBOARD_NOT_FOUND | PASS |
| demo-platform-admin | demo-iq | empty customer creation | `/api/platform/customers` | 200 | 200  | PASS |
| demo-platform-admin | demo-iq | empty customer tenant list | `/api/platform/customers/45421b65-c2a7-479b-a97a-6c732ff5d6ed/tenants` | 200 | 200  | PASS |
| demo-platform-admin | demo-iq | provisioning tenant creation | `/api/platform/customers/45421b65-c2a7-479b-a97a-6c732ff5d6ed/tenants` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | create scoped-management test role | `/api/tenants/demo-iq/admin/roles` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | assign delegated management to scoped actor | `/api/tenants/demo-iq/admin/memberships/iq-agent-manager/roles` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | scoped branch discovery | `/api/tenants/demo-iq/admin/scope-values/branch` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | cannot broaden scoped target | `/api/tenants/demo-iq/admin/memberships/iq-agent/scopes` | 403 | 403 ACCESS_DENIED | PASS |
| demo-agent-manager | demo-iq | cannot narrow broader target | `/api/tenants/demo-iq/admin/memberships/iq-custom/scopes` | 403 | 403 ACCESS_DENIED | PASS |
| demo-agent-manager | demo-iq | cannot grant finance role | `/api/tenants/demo-iq/admin/memberships/iq-agent/roles` | 403 | 403 ACCESS_DENIED | PASS |
| demo-agent-manager | demo-iq | scoped actor cannot create escalation role | `/api/tenants/demo-iq/admin/roles` | 403 | 403 ACCESS_DENIED | PASS |
| demo-agent-manager | demo-iq | scoped actor cannot edit role | `/api/tenants/demo-iq/admin/roles/demo-sales-viewer` | 403 | 403 ACCESS_DENIED | PASS |
| demo-agent-manager | demo-iq | within-ceiling scope update | `/api/tenants/demo-iq/admin/memberships/iq-agent/scopes` | 200 | 200  | PASS |
| demo-eg-admin | 7145a460-5402-4f6e-b195-f66e2ef18a1c | dynamic metadata usable | `/api/tenants/7145a460-5402-4f6e-b195-f66e2ef18a1c/admin/tenant` | 200 | 200  | PASS |
| demo-eg-admin | 7145a460-5402-4f6e-b195-f66e2ef18a1c | dynamic profile no invented dimensions | `/api/tenant-profile` | 200 | 200  | PASS |
| demo-eg-admin | 7145a460-5402-4f6e-b195-f66e2ef18a1c | dynamic analytics not ready | `/api/analytics/query` | 503 | 503 DATA_NOT_READY | PASS |
| demo-eg-admin | 7145a460-5402-4f6e-b195-f66e2ef18a1c | dynamic scope discovery not ready | `/api/tenants/7145a460-5402-4f6e-b195-f66e2ef18a1c/admin/scope-values/branch` | 503 | 503 DATA_NOT_READY | PASS |
| demo-eg-admin | demo-eg | other tenant still active | `/api/tenants/demo-eg/admin/tenant` | 200 | 200  | PASS |
| demo-platform-admin | demo-iq | disable approved disposable identity | `/api/platform/identities/synthetic%3Ademo-custom-user/disable` | 200 | 200  | PASS |
| demo-custom-user | demo-iq | disabled identity fresh request | `/api/saved-dashboards` | 403 | 403 ACCESS_DENIED | PASS |
| demo-platform-admin | demo-iq | global user remains active | `/api/platform/users/demo-custom-user` | 200 | 200  | PASS |
| demo-platform-admin | demo-iq | final platform metadata | `/api/platform/customers` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | final tenant metadata | `/api/tenants/demo-iq/admin/tenant` | 200 | 200  | PASS |
| demo-agent-manager | demo-iq | final scoped picker | `/api/tenants/demo-iq/admin/scope-values/branch` | 200 | 200  | PASS |
| demo-iq-admin | demo-iq | final tenant platform denial | `/api/platform/users` | 403 | 403 ACCESS_DENIED | PASS |
| demo-eg-admin | demo-eg | final cross-tenant role | `/api/tenants/demo-eg/admin/roles/demo-sales-viewer` | 404 | 404 NOT_FOUND | PASS |
| demo-agent-manager | demo-iq | final restricted dashboard role eligibility | `/api/saved-dashboards/8c695921-62d4-467f-96fb-f1787012abf2` | 200 | 200  | PASS |
| demo-custom-user | demo-iq | final disabled identity | `/api/tenants/demo-iq/admin/tenant` | 403 | 403 ACCESS_DENIED | PASS |
| unknown-synthetic | demo-iq | unknown identity | `/api/platform/customers` | 401 | 401 IDENTITY_REQUIRED | PASS |
| demo-agent-manager | demo-iq | final scoped finance denial | `/api/analytics/query` | 403 | 403 METRIC_FORBIDDEN | PASS |

The first final-smoke harness attempt used an unsupported GET role-detail route and mishandled Fastify's string error field. This was a harness error, not authorization evidence. It was corrected to the supported PUT role operation: the foreign tenant-owned role returned 404 NOT_FOUND. No production code was changed for it.

## Authorization coverage

- Platform Admin: metadata pages usable, assignment visible, tenant analytics without membership returns 403.
- Tenant Admin: memberships, roles, scopes, dashboard audiences and tenant settings exercised. Last-admin suspension returns 409.
- Scoped Manager: only Baghdad discovered; scope broadening and narrowing a broader existing target denied; unauthorized finance role/domain and role editing denied; within-ceiling mutation succeeds. Browser removal of the branch constraint also denied.
- Unauthorized User: analyst role management denied, unknown identity 401, disabled binding 403. Stock non-admin navigation hides administration.
- Cross-Tenant: wrong selected route 403; foreign membership/role/dashboard/grant subjects 404. EG metadata remains accessible independently.
- Direct API bypass attempts: tested separately from hidden UI; see request matrix.
- Resource grants: private nonowner and restricted ungranted 404; eligible tenant/role/member audience succeeds; nonowner edit 404; suspended audience loses access; retained dormant audience succeeds; removed grant denies; Save As is private with distinct ID. Owner metric cutover to finance makes a previous sales role grant fail 403 METRIC_FORBIDDEN. No grant increases data scope.

## Concurrency

Customer `demo-customer`: initial version 1, browser draft held version 1; direct HTTP write advanced to 2. Stale browser Save returned conflict, kept the draft and did not overwrite the concurrent name. Reload and review showed the current version 2.

Final Arabic smoke used tenant `demo-iq`: version 1 draft, HTTP rename -> version 2, stale browser Save -> localized conflict with draft `مسودة قديمة` preserved. Reload showed `Iraq QA reviewed`; a reviewed new Save persisted `Iraq QA final reviewed`, version 3. No silent retry or last-write-wins.

## Request ownership

The temporary relay collected the upstream response then held delivery for four seconds. Roles -> Tenant and customer Tenants -> Platform Users were switched during that window. After the delayed completion window the current page/data remained correct, without an old error/loading state replacing it. This tests two concrete races; it is not proof of every possible race. Customer switching to QA customer showed only its tenant. Multiple rapid customer reselections while a load clears the selector could not be conclusively exercised.

## Browser/UI coverage

- English and Arabic: all eight pages visited; representative editors, successful saves, error and CAS messages exercised.
- RTL: Arabic settings, memberships, roles, scope editor, dashboard audience form, mobile navigation and mixed identifiers inspected. Settings technical values use bidi isolation.
- Light: platform and tenant tables/forms inspected.
- Dark: memberships, data access/error, dashboard audience and 390px RTL inspected; visible focus verified.
- System: manually tested in both light and dark `prefers-color-scheme` states; administration followed each preference without refresh and remained usable in both states.
- Viewports: default ~1187x900, 1440x900, 1024x768 and 390x844. The narrow page and table container widths were checked through DOM measurements; 390px page scrollWidth=390, 1024px page scrollWidth=1009 (scrollbar). Actions remain in the table scroll/reflow area. Temporary viewport override reset before delivery.

## Accessibility and quality-skill AFTER review

1. **High, fixed:** collapsed admin text clipped/wrapped in the 72px sidebar at 1024px; now icon controls retain explicit accessible names/titles, current location and full expanded labels.
2. **Medium, fixed:** Arabic raw lifecycle/settings/error copy; now localized labels and recovery instructions retain machine values.
3. **Medium, fixed:** data scope combination semantics lacked explicit explanation; bilingual OR/AND text now states the established policy.

Keyboard native buttons/selects/checkboxes and details are reachable; Tab/Enter operated form controls, with Cancel reached from Save. Mobile dialog wraps Shift+Tab to Theme; Escape closes and restores the trigger. Focus outline was measured as a visible 2px solid outline in Dark. Inputs and selects expose names in DOM snapshots; the browser locator's label lookup was inconsistent for one wrapped select, but role/name lookup and the actual accessibility tree both exposed its name. Semantics use native buttons, fieldsets, legends, tables and details. Loading/success use role=status and errors role=alert. Light/Dark visual contrast had no obvious failure. This is practical QA, not a screen-reader session or complete WCAG audit.

No decorative redesign, new chart/theme tokens, generic admin framework, domain/API/persistence/authorization changes, baseline allowances or suppressions were introduced. Consequential user/tenant edits remain explicit Save forms; role deletion is disabled while referenced; last-admin controls are enforced by HTTP. Unrelated aesthetic polish was not added.

## Defects and regression coverage

| ID | Severity | Reproduction / root cause | Fix | Regression / retest | Commit |
| --- | --- | --- | --- | --- | --- |
| QA-01 | Medium | Arabic settings showed name/countryCode/timeZone and status active; shared mutation errors used server English messages. Presentation rendered canonical strings directly. | Finite administration label/error copy; bidi settings values; enum option values unchanged. | Two copy tests plus existing payload/version tests; Arabic settings, disabled identity and Arabic CAS/reload manually retested. | 57ecf3c |
| QA-02 | High | 1024px collapsed navigation wrapped Administration into letters and clipped actions. Admin buttons did not use established nav-label/icon pattern. | Approved Lucide icons, explicit names/titles, section-caption and collapsed alignment; Analytics return closes drawer. | EN/AR SSR nav-name/icon/label assertions; tablet screenshot, mobile dialog keyboard smoke. | 5f3689d |
| QA-03 | Medium | Scope picker did not explain how branch and salesperson selections combine. | One bilingual sentence explaining OR within dimension and AND between dimensions. | Existing scope serialization/authorization tests; browser picker/save and enforced branch query evidence. | 57ecf3c |

No known unresolved security/correctness defect was found. A missing manual coverage item remains a validation gap, not a claimed product defect.

## Automated verification

Final stable code verification:

| Check | Result |
| --- | --- |
| Frozen install | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Main | 571 passed, 0 failed |
| PostgreSQL 18.6 | 63 passed, 0 failed; genuinely executed |
| Skipped | 0 main, 0 PostgreSQL |
| Architecture diagnostics | 0 |
| Quality diagnostics | 0 |
| New feature baseline allowances | 0 |
| New suppressions | 0 |
| Diff check | 0 diagnostics |
| API build | PASS, 59.3kB |
| Web build | PASS |

The first sandboxed main-suite/gate run could not bind test sockets or spawn Git. It was rerun with approved execution permissions; the final counts above are from the passing run. Initial frozen install also needed permitted access to the existing pnpm store. No tests or gates were weakened.

Existing Vite >500kB chunk warning remains. Main JS moved from 990.15kB / 292.18kB gzip to 995.74kB / 293.99kB gzip (+0.56% raw, +1.81kB gzip); builder stays 104.22kB. This is a small copy/icon addition, not a new build failure.

## CI / push / merge

Exact final SHA, push result, CI URL and conclusion are reported in the delivery message; starting-HEAD CI is not substituted for final evidence. No merge or auto-merge is authorized or performed.

## Deferred items and limits

Deliberately deferred product/integration: production IdP/session integration, invitations/email, customer sources, support impersonation and unrelated historical debt. None was added here.

Unresolved defects: none known after narrow fixes. Remaining QA gaps: no-customer database, truly zero-membership tenant, stale governed source value, cursor pagination and backend fault-injected mutation rollback were not manually reproduced. Existing automated tests cover the applicable behaviors; these are not reported as manual passes. Assignment creation was not exercised because stock candidates were empty. OS/screen-reader audit was outside available controls.

## System-theme completion

Manual follow-up verified the System theme against both light and dark
`prefers-color-scheme` states. Administration pages followed the active
preference without refresh and remained usable in both states.

## Recommendation

READY TO MERGE

All required Access Control Administration acceptance checks are complete.
No known security, correctness, architecture, persistence, accessibility,
bilingual, RTL, responsive, or theme blocker remains.
