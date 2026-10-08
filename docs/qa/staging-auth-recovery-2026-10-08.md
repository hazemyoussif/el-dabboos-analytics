# Local staging authentication recovery — October 8, 2026

## Cause and applied fix

The actual HTTPS `GET /api/auth/state` returned **502**. The API container was
restarting with `Control database identity/schema check failed`; the persistent
`dabboos-analytics-mart-postgres-1` container had exited cleanly and was stopped.
Its restart policy was `no`, while the application used `unless-stopped`.
This was a missing control database service, not an Odoo/Teleport login dependency.

Started the existing PostgreSQL container and restarted the API. Preserved the
existing database volume, users, permissions, migration history and sessions.
Applied `unless-stopped` to the running PostgreSQL container and its owning
`infra/postgres/compose.mart.yml`; updated the local mart and private operations
runbooks. Deliberately stopped containers still require an explicit start.

## Deployed verification

- All seven protected runtime settings matched the protected env file:
  environment, identity mode, auth base URL, CORS origins, auth secret and both
  control/mart runtime connection URLs. Secret values were not printed.
- Local identity mode and Better Auth base URL/trusted origins remain exactly
  `https://localhost:8443`. Secure cookies, framework CSRF/origin protections,
  disabled cookie caching and disabled session refresh remain configured.
- The deployed control migration manifest passed exact name/version/checksum
  comparison; the least-privilege control app role check passed. Auth tables were
  readable through the framework pool. Mart runtime readiness/role checks passed.
  No migration or credential reprovisioning was needed.
- HTTPS checks used the retained local CA, without disabling TLS verification.
  Auth state returned **200** with local mode; readiness returned **200** with
  persistence and analytics available. API container became healthy.
- Unsafe login without Origin returned **403**; unauthenticated `/api/auth/me`
  returned **401**. Fresh user-entered login requests returned **200**, as did
  logout, authenticated identity and report instantiation requests.
- The existing web image and rebuilt API worked together. Executive Sales &
  Invoicing displayed populated trusted report widgets in English and Arabic.
  Source remained unavailable and synchronization disabled throughout; trusted
  report retrieval continued. No source service was started for this fix.

## Automated checks and limits

Six targeted test files passed with no failures/skips: API local auth config,
staging config, health, source availability; web authentication UI and request
transport. Authentication UI tests exercise labelled credential forms in both
languages. Architecture, quality and diff gates each reported zero diagnostics.

Manual evidence is separate: successful credential submission was performed by
the user, confirmed through sanitized API request logs; report rendering in both
languages was inspected in the browser. Full build/test/PostgreSQL suites were
not rerun for the infrastructure restart-policy change. No push or merge.
