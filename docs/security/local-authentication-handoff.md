# Local identity foundation handoff — 2026-10-06

Branch: `codex/production-pilot-lifecycle`. Base: `135eb74a010abc178bdd63ac39f8362dd594661f`. Delivery commit: `Implement governed local identity and revocable sessions` (final SHA supplied in the review response). No push, merge or external deployment; CI was not dispatched.

## Delivered scope

Pinned Better Auth 1.7.7 behind provider-neutral domain ports and application identity resolution; PostgreSQL auth/control adapters; narrow Fastify login/me/logout/self-revoke routes; secure shared configuration; offline version-checked initial provisioning; bounded pre-hash abuse controls; immutable safe audit; English/Arabic login/account/expiry UI. Migration 007 adds auth-owned schema and audit without replacing ProductUser, IdentityBinding, membership/roles/scopes or source ownership. See [ADR 030](../architecture/adr/030-local-identity-provider.md) and [framework review/security runbook](local-authentication.md).

No signup, automatic email linking, source-driven permission, localStorage token, custom password cryptography, runtime migration or implicit membership activation. Existing dirty Odoo work, `.env.example` and `.archify/` were preserved outside the delivery commit.

## Automated evidence

Frozen install passed; lint, architecture, baseline-aware quality, typecheck, API build, web build and diff gates passed. Unit suite: **600 passed**, no skips. Full isolated PostgreSQL 18.6 suite: **103 passed**, no skips. Tests do not load developer env files or use real model/customer services. PostgreSQL fixtures coordinate cluster-role setup through the common test database after a concurrent role-update race was observed and fixed.

Coverage includes real framework hash verification/login and persistent sessions, safe wrong/unknown/disabled failures, active ProductUser/binding checks, current membership/roles/scopes, cross-tenant refusal, logout/expiry/self-revocation, unexposed signup/reset/linking routes, ignored identity headers, exact Origin checks, HTTPS cookie attributes, bounded account/hash attempts, safe security audit and atomic provisioning collision rollback. Migration coverage includes 007 schema/grant/audit rollback, safe rerun, immutable checksum/version checks and app/mart role separation.

The existing Vite chunk-size warning remains; no baseline was raised. This is not a penetration test, third-party security certification or production load/retention validation.

## Manual production-build evidence

Compiled API plus compiled React static assets through a loopback proxy were tested at port 8089 using **disposable synthetic PostgreSQL databases and a local credential provider**. This uses actual credential hashes and server sessions rather than synthetic identity headers. The sole QA ProductUser/platform assignment exists only in that disposable fixture; no employee bootstrap identity was activated.

Passed: governed stdin provisioning; invalid credential feedback; valid login and actual ProductUser name without demo selection; logout; all-session revoke; manually expired fixture session returning to Arabic login after a protected request; English/Arabic language controls; System/Light/Dark behavior; visible keyboard focus in light and dark; phone 390px, tablet 1024px and desktop layout. DOM width checks showed no page horizontal overflow on changed auth views. Arabic email remains LTR while text/layout remain RTL. Screenshots were inspected; Arabic expiry evidence saved outside Git.

Dashboard-quality skill applied as pre-flight and AFTER review. Findings:

1. **Medium, fixed:** returning from a workspace language change could leave the login document language/direction stale. AuthenticationGate now follows the current document language on logout/expiry and sets login document semantics when unauthenticated. Rechecked production EN login/logout and AR expiry, including `html.lang`/`dir`.
2. **Medium, fixed:** adding account logic directly to App increased its historical complexity. Extracted cohesive AccountControls/AuthenticationNotice; baseline-aware quality returned zero diagnostics without changing the baseline.

No remaining auth UI blocker was observed. This focused review did not redesign or re-audit all pre-existing dashboard surfaces. Disposable smoke credentials/processes/databases were cleaned up after verification.

## Persistent local state and safety

Explicit local control migration applied versions 006/007; shared staging control is now 007, mart remains 008. Developer pilot mart remains 007. Staging privilege mirrors include auth schema for its control app login; other database boundaries stay enforced. Bootstrap repeated as `already_provisioned`, preserving invited users, disabled placeholder identities and suspended assignments/memberships. Local staging API/web images were rebuilt and refreshed with auth still disabled. Live readiness and identity refusal were verified separately from credential smoke.

A read-only before/after fingerprint of all 12 September pilot base tables, mapping lifecycle and serving bindings matched exactly. Mapping v1 remains pending; serving bindings remain zero. No source extraction, Odoo data mutation, mapping approval, serving activation or synchronization occurred.

## Limits and next review

Employee-access staging remains blocked on approved HTTPS ingress/origins and secrets, credential custody/handoff, explicit ProductUser/binding plus separately governed membership activation, audit privacy/retention/monitoring, protected auth backups/restore review, upstream dependency/configuration review and agreed administrator MFA/recovery policy. The process-local limiter supports a single API instance; shared limits and trusted proxy/client-IP policy require review before scale. Invitations, MFA/passkeys and verified recovery are documented extension points, not enabled capabilities.

Odoo authentication is not implemented. Email invitations are not delivered. MFA is not enabled. Sync is not implemented. External staging deployment, push and merge were not performed. Next smallest safe step: review the auth change and runbook, then separately authorize employee credential provisioning and access activation after the deployment/security gates are met.
