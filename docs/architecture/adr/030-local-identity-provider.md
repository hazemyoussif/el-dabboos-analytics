# ADR 030 — Local identity provider and fresh product authorization

Status: accepted implementation foundation; employee deployment gated.

Authentication is separate from sources and authorization. A provider adapter proves `{ provider, stable subject }`; application resolution maps it to the current IdentityBinding and active ProductUser. Existing memberships, roles, scopes and platform assignments retain authority. Session state contains no tenant authorization claims.

Use pinned Better Auth 1.7.7 for local credentials and revocable database sessions in `auth.*` inside the control database. Domain/application expose provider-neutral ports, data owns PostgreSQL identity/provision/audit adapters, and API owns framework composition/configuration and the narrow HTTP bridge. React uses HttpOnly cookies and translated login/logout/expiry UI. Email is a login identifier, never an identity-linking key. Public signup and automatic linking are disabled.

Initial setup is an explicit migrator-only offline operation for an existing version-checked ProductUser with protected stdin credentials. Activation flags are explicit; memberships and bootstrap remain inactive by default. Framework scrypt remains unchanged. Secure shared cookies, fixed eight-hour expiry, no cookie cache, fresh authorization and approved-Origin mutations form the boundary. Bounded process-local pre-hash controls support one-instance rollout, with shared-limiter/proxy review before larger deployment.

Future OIDC/Odoo/LDAP identity adapters and MFA/passkeys/recovery must preserve this boundary. Invitations remain governed by the application. See [framework review, operations, limitations and launch gates](../../security/local-authentication.md).
