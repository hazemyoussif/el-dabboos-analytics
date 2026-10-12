# Employee provisioning acceptance — 2026-10-12

Scope: reuse PR #10 on current main, with existing local credentials and governed membership workflows. First-login mandatory password change remains deferred.

Automated synthetic PostgreSQL evidence covers atomic product user/credential/identity/security event/audit creation, login, duplicate-email rollback, safe credential persistence, authorization before expensive hashing, fresh transaction authorization after concurrent platform-role revocation, candidate idempotency, separate membership/role/scope assignment, viewer denial, suspension and session denial. API tests preserve 403/429/409 and keep unknown failures generic. Provisioning is process-bounded to four concurrent hash operations and eight attempts per actor per minute; this is not shared multi-instance abuse infrastructure.

Browser evidence used the actual PlatformUsersPage against an isolated disposable PostgreSQL 18.6 control/auth fixture and the same-origin proxy routing used in staging. It used no developer env files, real employees, customer sources or model services. English and Arabic employee creation succeeded; the saved records appeared with active local identities. Add to current workspace succeeded. Duplicate email showed actionable localized feedback and retained the reviewable form; Cancel worked. The explicitly approved synthetic suspension saved version 2 and removed the workspace candidate action. Automated tests separately verified denied login after suspension.

AFTER quality review inspected Light/Dark and English/Arabic. At 390px, document scroll width was 375px and the form/input widths were 327px/306px. At 1024px, document scroll width was 1009px and the form was 961px. Normal desktop was also inspected. Table overflow remains inside its existing scrolling surface. Keyboard Tab moved from display name to email; focus outline was solid in the inspected light theme. Native form labels, password input and loading/saved/error states were retained. No new chart/theme/domain semantics were introduced.

Numbered findings addressed within scope:

1. Workspace candidate action was offered without tenants:manage and for suspended users. It now requires both platform permissions, an active user and an active identity.
2. Initial-password helper text described implementation scheduling. It now explains secure sharing and separate workspace access in both languages.
3. Duplicate provisioning errors fell through to generic reload advice. Known duplicate/limit codes now have actionable bilingual copy without exposing backend details.

An initial cross-origin QA harness could not submit PUT under the existing CORS defaults. The harness was aligned with staging's same-origin reverse proxy; no unrelated CORS change was introduced. A RAM-backed staging backup restore failure is unrelated to this local UI fixture and is recorded in the staging rollout handoff.

Hosted employee activation, live credentials and real-user permission grants were not performed. Browser fixture files and synthetic services are temporary verification artifacts, not shipped application entry points.
