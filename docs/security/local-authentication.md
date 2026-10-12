# Local authentication foundation

Better Auth **1.7.7** is pinned in the API and frozen lockfile. This is a local password/session foundation, not an employee-access launch. The shared staging bootstrap still creates invited users, disabled `pending-idp` bindings and suspended memberships/assignments. Its running configuration remains `ACCESS_IDENTITY_MODE=disabled` until reviewed activation and HTTPS deployment.

## Framework review

Reviewed against the installed 1.7.7 APIs: [Fastify integration](https://better-auth.com/docs/integrations/fastify), [PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql), [security](https://better-auth.com/docs/reference/security), [sessions](https://better-auth.com/docs/concepts/session-management), [options](https://better-auth.com/docs/reference/options) and [account linking](https://better-auth.com/docs/concepts/users-accounts). Better Auth provides local credentials, persisted revocable sessions, React-compatible HTTP and future OIDC/MFA/passkey extensions without imposing tenant authorization. Fastify bridges only approved application endpoints to its Web Request handler; the generic framework router is deliberately not mounted.

[Auth.js credentials](https://authjs.dev/getting-started/authentication/credentials) does not persist credential accounts by default; [Passport sessions](https://www.passportjs.org/concepts/authentication/sessions/) would require assembling credential/session storage and associated lifecycle machinery. Better Auth fits the required slice with less application-owned authentication machinery. This focused compatibility review does not constitute a security audit or guarantee against future advisories. Review upstream advisories and dependency updates before deployment and at each upgrade; schema/plugin upgrades require reviewed explicit migrations.

The [1.7.7 release](https://better-auth.com/changelog) and published [advisories](https://github.com/better-auth/better-auth/security/advisories) were also checked. 1.7.7 includes the September 30 Magic Link/OAuth Proxy fixes; those flows are not enabled or exposed here. The [PostgreSQL rate-limit advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf) is patched in 1.7.7; this implementation uses its own synchronous pre-hash process-local gate instead of database-backed framework counters. Future plugins need a fresh configuration-specific security review.

The framework's built-in **scrypt** password mechanism is used unchanged, including its salt/verification and unknown-user handling. Argon2id was preferred in the brief, but replacing the supported default with application callbacks would add crypto integration responsibility; no custom hashing/verification is introduced here. Passwords accept 8–1024 characters and long passphrases, with no invented composition rules.

## Identity and storage

`ExternalAuthenticationProvider` yields only `{ provider, subject }`. The application resolves that pair through the current `IdentityBinding` and `ProductUser`, requiring both active. Local subjects are opaque random UUIDs independent of email; email is only the normalized login identifier. No email-based linking, public signup or auth-library organizations/teams/roles exist. SourceDefinition, Odoo source credentials and analytics adapters confer no identity or permission.

Control migration **007** creates a separate `auth` schema (`user`, `account`, `session`, `verification`) matching the installed core schema and an immutable `control.authentication_security_events` table. Runtime has DML privileges, never schema ownership; migrations are explicit and ledger/checksum guarded. Framework SQL uses a separate pool with `search_path=auth,pg_catalog`. Product authorization stays in `control.*`; no auth state goes into the mart. `auth.user.name` is the opaque subject, not a second product profile. Verification storage reserves framework compatibility; no mail/verification workflow is enabled.

## Governed offline provisioning

An authorized operator first creates/reviews the existing ProductUser through current administration. Provision with the **control migrator** identity, not runtime credentials. Supply a reviewed manifest outside the checkout:

```json
{
  "userId": "reviewed-existing-product-user",
  "expectedUserVersion": 1,
  "email": "reviewed-login@example.test",
  "operatorReference": "approved-ticket-reference",
  "activateUser": false,
  "enableIdentity": false
}
```

Explicit `true` flags require operator authority to activate that user/binding. Provisioning never activates a membership, platform assignment, tenant or serving binding. Existing `pending-idp` placeholders remain disabled. Duplicate local identities, email collisions and stale user versions fail atomically; email collisions never link users. The offline transaction serializes with metadata writes and audits the operator reference. This is initial setup only, not password rotation/recovery.

Inject `CONTROL_MIGRATOR_URL` through a protected operator environment (no automatic developer env loading), and pipe password-manager output through stdin:

```bash
# The approved secret tool writes the credential directly to stdout, without echo/logging.
# Never place a password in argv, shell history, an env variable or a JSON manifest.
approved-secret-tool read approved-credential | pnpm auth:local provision /secure/reviewed-local-user.json
```

The placeholder secret command must be replaced by the operator's approved mechanism. A terminal stdin is refused. Output contains only stable subject/binding IDs; failures contain no secret values. Never commit credentials or protected files. Initial password handoff to the actual employee remains an operational gate; the smoke test uses disposable synthetic credentials only.

## Runtime and sessions

Configure `ACCESS_IDENTITY_MODE=local`, `CONTROL_PROVIDER=postgres`, `AUTH_BASE_URL` as the exact browser origin in `CORS_ORIGINS`, and a strong independent `AUTH_SECRET` (32–512 non-whitespace characters) in the runtime secret store. Shared staging/production local auth **requires HTTPS**, even for loopback. HTTP is supported only in development loopback smoke tests. Synthetic shared authentication continues to fail startup. Keep same-origin proxy ingress; the application must remain private behind it. Runtime never auto-migrates.

The public adapter exposes only `/api/auth/login`, `/me`, `/logout`, `/revoke-sessions` and non-sensitive `/state`. Tokens/raw framework user records never appear in login or me JSON. Only framework cookies authenticate; caller ProductUser/demo headers and bearer headers have no authority. Cookies are HttpOnly, SameSite=Lax, host-only, path=/, Secure in shared environments, and expire after eight hours without sliding refresh. Database sessions persist across API restarts and can be revoked. Cookie caching is disabled. Logout deletes the current session and clears its cookie; explicit revoke deletes all sessions for the authenticated local subject. The browser stores no auth token in localStorage and returns to translated login after 401, focus recheck or a one-minute session recheck.

Every unsafe HTTP request in local mode requires an exact approved Origin, including logout and other product mutations. CORS allows credentials only for exact configured origins. Forwarded host/IP headers do not choose issuer/origin or identity. Cookie secrets must stay stable across approved restarts; rotation requires an explicit session invalidation/re-authentication plan.

Each protected operation reloads current ProductUser/binding and existing membership/role/scope state through the existing authorization boundary. Successful login gives no tenant authority. Suspension, disabled identity, revoked session, removed role and changed scope affect the next protected request. Authorization is never frozen in session claims.

## Abuse, audit and limits

A pre-hash login gate bounds each 60-second window to eight attempts per normalized account, 30 per immediate remote IP and 200 globally; four concurrent hashes maximum, with no queue. Its bounded map holds at most 2,000 hashed keys and clears expired entries. Responses are generic 401 for unknown/wrong/disabled identities and generic 429 on limits. Account names/IPs are not persisted or logged. Limits are process-local and reset on restart: one API instance is the supported boundary; multi-instance employee deployment needs a reviewed shared limiter. Behind the supplied proxy, immediate-IP limits conservatively aggregate proxy traffic; trusted proxy/address policy needs deployment review before employee load. No forwarded IP is trusted implicitly.

Immutable safe events cover login success/failure, logout, all-session revoke and local provision, with ProductUser ID when safely available and an offline provision reference. No email, password, hash, cookie, token, IP or user agent is stored in security events. Framework logging/telemetry is disabled; runtime errors retain the existing sanitized boundary. Existing identity status changes continue through versioned administration audit. Password reset/change events are future work. Retention/export policy and monitoring need approval before employees use staging.

## Future governed flows and launch gates

Invitations remain application-owned: an expiring, revocable single-use digest, verified email, proposed roles/scopes and audit must bind an explicitly authorized ProductUser/IdentityBinding before activating membership. Acceptance must revalidate the inviter's current authority and proposed scope; no parallel library invitation model or email-only linking. No mail provider or delivery exists yet.

MFA/passkeys belong behind the provider adapter and in auth-owned storage: TOTP enrollment/verification plus hashed recovery codes; multiple WebAuthn authenticators with revocation; verified step-up assurance for sensitive operations. Application policy must require MFA for platform/tenant admins and evaluate tenant policy for analysts. No MFA assurance is claimed today; adding a plugin alone does not enforce this policy.

Recovery requires verified one-use expiring proof, digest storage, audited password change/reset and invalidation of existing sessions. MFA recovery and administrator-assisted recovery need separate proof/approval and safe audit. No email reset endpoint is exposed until approved real delivery exists.

Before employee staging: reviewed HTTPS ingress/origins, secrets and session rotation, approved initial credential setup/handoff, explicit user/binding and separately reviewed membership activation, privacy/audit retention/monitoring, backup/restore protection for credential state, distributed limit/trusted proxy review if needed, and security review of framework dependencies and required admin MFA/recovery policy. Odoo identity architecture remains unconfirmed and independent. No employee identity was provisioned by this implementation.

## Workspace creation with an initial password

The workspace Users form creates an active local login and its selected workspace
roles in one save, using the framework password hash and the existing control
transaction. Tenant administrators do not need platform-wide authority to create
users in their own workspace. The role/scope delegation ceiling, active actor checks,
creation abuse guard and transaction-time authorization remain mandatory. A new
user can sign in and enter that workspace immediately after a successful save.
Initial passwords are set by the administrator; invitations, OTP and password
recovery remain separate future work. Implementation tests use synthetic accounts;
this change does not itself deploy or create employees on staging.
