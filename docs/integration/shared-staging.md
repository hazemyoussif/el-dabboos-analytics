# Shared staging deployment and governed bootstrap

This milestone packages the production API and React artifacts, provisions two separate staging databases, and reserves governed business objects. The default deployment keeps authentication disabled. A [local identity foundation](../security/local-authentication.md) now supports governed credentials and cookie sessions; employee access still requires reviewed HTTPS configuration and explicit activation. No ingestion worker or continuous sync is installed. Bootstrap never approves a mapping or activates serving.

## Topology and artifacts

Use PostgreSQL 18.6 as a separately managed service. Local simulation reuses the persistent server described in [local mart](local-analytics-mart.md) alongside developer databases; it never replaces its volume. Shared deployment may use an approved managed PostgreSQL endpoint supporting the role/schema model, or a separately hosted server. This repository does not deploy to an external server.

```text
Company network → HTTPS load balancer → static web → internal API
                                                 ├─ control_staging
                                                 └─ analytics_staging
Future worker → control source metadata + secret resolver → read-only Odoo
              └─ mart ingestor → candidate/reconciliation/serving lifecycle
```

Terminate TLS at an approved reverse proxy/load balancer. Restrict the internal API port to the proxy and private network. Application images contain no PostgreSQL server. The example Compose exposes only loopback web port 8088; replace its ingress deliberately for shared infrastructure. PostgreSQL backups and lifecycle remain independent of `docker compose down` for the application.

- `infra/staging/Dockerfile.api` runs the compiled Fastify server with workspace domain/application/data modules and Node TypeScript support, as an unprivileged user. It runs no migrations or demo seed.
- `infra/staging/Dockerfile.web` serves compiled Vite assets through unprivileged Nginx; no development server.
- `infra/staging/nginx.conf` serves static files and proxies `/api/` and `/health` to the internal API. Default API target is same origin.
- `.dockerignore` uses a source allowlist and excludes env files, databases, tests, local artifacts, dependencies and Git. Never pass credentials as build arguments.
- `infra/staging/compose.yml` separates API, web and an explicit operations profile, using an external PostgreSQL network. Runtime containers use read-only filesystems and temporary `/tmp` mounts.

Build from a reviewed checkout with the frozen lockfile. Tag app images by commit SHA and record resulting image digests; promote those same artifacts. Deploy immutable digest references through `STAGING_API_IMAGE` and `STAGING_WEB_IMAGE`. Local default tags are a simulation convenience. Base-image updates require a reviewed rebuild; shared release manifests should pin the reviewed base-image digests as well.

## Configuration and secrets

Review `infra/staging/runtime.env.example` and `operator.env.example`. Their values are placeholders, never usable credentials. Keep real env files outside the build context, mode 0600, or use deployment secrets. Do not commit, print, paste into command arguments, or include credentials in backup names. For external PostgreSQL use the platform's verified TLS configuration and trusted CA. A secret manager can replace environment resolution later without domain/application changes.

| Variable | Scope / requirement |
| --- | --- |
| `ENVIRONMENT=staging` | API shared-mode safety and safe operational logs |
| `API_HOST=0.0.0.0`, `PORT=3001` | Private container listener; local synthetic mode requires loopback |
| `ACCESS_IDENTITY_MODE=disabled` | Safe bootstrap default; `local` requires reviewed HTTPS origin/secret and provisioning; staging synthetic fails startup |
| `CONTROL_PROVIDER=postgres`, `CONTROL_DATABASE_URL` | Control app login, database `el_dabboos_control_staging` |
| `ANALYTICS_PROVIDER=postgres`, `MART_RUNTIME_URL` | Read-only runtime login, database `el_dabboos_analytics_staging` |
| `CONTROL_MIGRATOR_URL`, `MART_MIGRATOR_URL` | Explicit operations only; never API secrets |
| `MART_INGESTOR_URL` | Reserved worker/ingestion identity; never API secrets |
| `STAGING_ADMIN_URL` | Provisioning only, `/postgres`, same approved endpoint as five staging URLs; omit after provisioning |
| `CORS_ORIGINS` | Required comma-separated exact approved HTTPS origins, no wildcard/credentials/path; HTTP only for loopback simulation |
| `VITE_API_BASE_URL` | Web build-time only: empty same origin, explicit HTTPS origin, or safe path prefix (e.g. `/analytics`); proxy must route that prefix |
| `DASHBOARD_PLANNER` | `disabled` for bootstrap/smoke; `structured` plus existing `LLM_BASE_URL`, `LLM_MODEL_ID`, `LLM_API_KEY` when approved |
| `STAGING_RUNTIME_ENV_FILE`, `STAGING_OPERATOR_ENV_FILE` | Compose paths to protected secret files; separate runtime and operator environments |
| `STAGING_DATABASE_NETWORK` | Existing local PostgreSQL Docker network (not a new DB lifecycle) |
| `STAGING_WEB_PORT`, `STAGING_API_IMAGE`, `STAGING_WEB_IMAGE` | Local loopback port / reviewed image tags or immutable digests |

Existing pool/statement timeout, maximum groups/date span, execution concurrency and LLM limits retain the defaults/validation in `apps/api/src/startup-config.ts`. The runtime env contains only control app, mart runtime and optional LLM credentials. Source secret resolution remains `connectionRef=odoo-staging-main` through the existing Odoo configuration boundary; it belongs to a future worker's approved external secret environment. Neither the web nor API needs an SSH tunnel or Odoo credentials to start or serve mart queries. Do not run live extraction as a deployment smoke test.

Local/shared session mode omits `x-demo-user-id`; that header is sent only after the API explicitly reports development synthetic mode. The server never accepts synthetic identity in staging, including on loopback; documented local-only demo mode is `ENVIRONMENT=development`, loopback API and existing SQLite synthetic seed. Arbitrary employee headers and email alone confer no identity. Local authentication now resolves verified session subject through the current binding and returns its trusted `IdentityBinding.id`; other providers remain future work.

## Roles and isolation

| Login | Classification | Database / privileges |
| --- | --- | --- |
| `staging_control_migrator_login` | `control_migrator` | Owns control staging database, explicit migrations |
| `staging_control_app_login` | `control_app` | Control staging DML, immutable audit/receipt guards, read-only schema ledger |
| `staging_mart_migrator_login` | `dabboos_migrator` | Owns analytics staging database, explicit migrations |
| `staging_mart_ingestor_login` | `dabboos_ingestor` | Candidate ingestion privileges in analytics staging |
| `staging_mart_runtime_login` | `dabboos_runtime` | Read-only mart plus exact schema ledger; tenant and certified serving RLS |

Each login has a distinct password, no superuser/BYPASSRLS/CREATEDB/CREATEROLE/replication attributes. Canonical role groups are NOLOGIN. Staging memberships are **NOINHERIT, SET FALSE**: classification membership cannot inherit access or switch to developer roles. The migration command mirrors canonical table/sequence/function grants only in the named staging database, and explicitly includes staging runtime in all six restrictive serving policies. Database CONNECT is restricted to its associated staging logins; existing developer role grants are untouched. Existing role or DB ownership conflicts fail closed; provision never silently rotates passwords. Use an explicit approved rotation procedure later.

## Provision and migrate

Provision an approved server and generate five strong distinct secrets through your deployment mechanism. Supply all five URLs to the operator even for verification/bootstrap; they must use the named logins/databases on one endpoint. Supply the administrator URL only for provision. Commands never load developer `.env` files themselves.

From the checkout, with operator variables already injected:

```bash
pnpm staging provision
pnpm staging migrate
pnpm staging bootstrap infra/staging/bootstrap.example.json
pnpm staging verify
```

Provision creates role groups/logins first, then the two databases. It only targets `el_dabboos_control_staging` and `el_dabboos_analytics_staging`. Explicit migrate applies control versions 001–007 and mart versions 001–008, verifies immutable histories/checksums and installs scoped login grants. Runtime startup never repairs or migrates a schema. The existing developer mart was deliberately left on its prior version 007; running this updated API against that developer database requires the separately authorized explicit `pnpm mart:migrate` to apply 008 first. Staging simulation already uses 008 and never changes developer pilot data. A partially completed explicit migration remains safe to rerun; never start API until `verify` succeeds. For managed services where the administrator cannot create these roles/databases, an authorized DBA must provide equivalent reviewed isolation and grants before migration. Do not weaken runtime checks to accommodate elevated credentials.

## Governed bootstrap

Review the JSON manifest before execution. Exact field validation rejects unknown fields, connection strings, credentials in identifiers, invalid tenant configuration, company scopes, duplicate identities/roles/sources and missing tenant admin. Fields include bootstrap ID, customer, tenant configuration, disabled provider/subject placeholders, existing tenant roles and non-secret source references. Tenant config is IQ / IQD / Asia/Baghdad / iq / ar. The source is `el-dabboos-odoo18-pg`, tenant `el-dabboos-iq`, company `["1"]`, connection reference `odoo-staging-main`.

The fresh bootstrap uses one advisory-locked transaction for protected roles, customer, provisioning tenant, invited users, disabled `pending-idp` identities, suspended platform/tenant memberships, source, immutable receipt and audit. No dashboard, seed facts, mapping or binding is created. The receipt compares a key-sorted JSON representation (array order remains meaningful). Identical repeat returns `already_provisioned`; changed payload or another bootstrap ID on a governed DB fails. Existing legacy SQLite ownership import protections remain unchanged.

Placeholders reserve explicit non-authenticating provider/subject IDs. For local credentials use the reviewed offline [provisioning procedure](../security/local-authentication.md), followed by separate governed membership activation; changing the bootstrap manifest cannot activate users or overwrite configuration. Existing admin/analyst/viewer roles cover QA personas. The bootstrap audit records the declared inactive operator as an offline provisioning reference, not an authenticated session.

## Local staging simulation

Keep the existing persistent server running on port 55437. Do **not** run `down -v`, replace its volume, reset databases, or import the incomplete legacy metadata. For host CLI operator URLs use `127.0.0.1:55437`; for Compose secrets use the existing Docker network alias `postgres:5432`. All URLs within each operator env use the same endpoint.

```bash
# Secret file paths are operator-provided, outside the checkout.
export STAGING_RUNTIME_ENV_FILE=/secure/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/secure/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
# Runtime CORS_ORIGINS=http://localhost:8088 for this loopback simulation.
docker compose -f infra/staging/compose.yml build
# Administrator secret present for provision only; remove it afterward.
docker compose -f infra/staging/compose.yml run --rm operator provision
docker compose -f infra/staging/compose.yml run --rm operator migrate
docker compose -f infra/staging/compose.yml run --rm operator bootstrap /workspace/bootstrap.json
docker compose -f infra/staging/compose.yml run --rm operator verify
docker compose -f infra/staging/compose.yml up -d api web
curl --fail http://localhost:8088/health/live
curl --fail http://localhost:8088/health/ready
```

Replace the read-only manifest mount with an explicitly reviewed custom manifest if necessary. Bootstrap can also run with the host CLI and injected host operator environment. The optional operator profile never starts with `up api web`; migrations remain explicit. Shared deployment follows the same ordered provisioning, migration, bootstrap, API, web sequence behind TLS.

## Verify and operate

`/health` and `/health/live` are liveness aliases: they do not query databases or Odoo. `/health/ready` checks reachable/current exact control and mart schema histories and safe runtime identities, bounded by the existing probe timeout. Failures return generic 503 checks without driver details. Readiness does not mean trusted login, source connectivity, certified data or serving activation is ready. Those remain independent release gates. Restarting with an unmigrated schema fails safely.

Every response returns `x-request-id`. Incoming IDs must be 1–64 characters, start alphanumeric and contain only alphanumeric/dot/underscore/hyphen; invalid or multiple values generate a UUID. Operational logs include component, event, bounded ID, registered route template, method, status and elapsed time. Raw URLs/query strings, bodies, headers, user/tenant identity, source records and tokens are excluded. Startup/configuration errors contain safe field names, never supplied values. Keep LLM diagnostics off unless deliberately enabled in a protected operator environment.

Verify schema counts/checksums using `pnpm staging verify`; inspect safe metadata through a DBA session scoped to control staging. Expect customer/tenant/source present, four disabled identities, three suspended tenant memberships, suspended platform assignment, zero source mappings and zero dashboard records. The fresh mart has zero serving bindings and no imported pilot facts. Requests with demo headers must receive 401. Verify origin allowlisting and correlation with a harmless `/health/ready` request; external origins receive no CORS permission.

## Backup and restore

Use PostgreSQL 18 native tools and a protected `PGPASSFILE`/service configuration; never put passwords in shell arguments. Backups contain governed identities/metadata and potentially sensitive analytics: restrict access, encrypt using approved storage, record retention and test restores. Freeze control writes and ingestion for a coordinated two-database recovery point; independent `pg_dump` snapshots alone do not give cross-database transaction consistency. Record release image digests, migration versions and backup checksums together.

```bash
umask 077
# PGSERVICE definitions select the approved endpoint, DB and authorized backup role.
PGSERVICE=control_staging_backup pg_dump --format=custom --file=/secure/backups/control.dump
PGSERVICE=analytics_staging_backup pg_dump --format=custom --file=/secure/backups/analytics.dump
# Approved disposable environment only; create NEW restore targets through DBA tooling.
PGSERVICE=control_restore pg_restore --exit-on-error --no-owner --no-acl /secure/backups/control.dump
PGSERVICE=analytics_restore pg_restore --exit-on-error --no-owner --no-acl /secure/backups/analytics.dump
```

Never restore over developer, shared or production databases without explicit environment approval and a recovery plan. A DBA/admin backup identity is needed to capture complete FORCE-RLS mart data; runtime dumps are not authoritative. Production-shaped restore must reassign ownership to the corresponding migrator, recreate restricted CONNECT privileges, replay reviewed staging login grants/function privileges and restrictive policies, then verify ledger checksums, schema/role checks and row counts before any traffic. `--no-owner --no-acl` is suitable for a disposable verification target; it is not a complete production-role restoration procedure. Cluster role secrets are provisioned independently and are not contained in these database backups.

## Rollback and remaining shared-deployment gates

Application rollback selects previously reviewed API/web image digests and matching configuration. It can proceed only when those artifacts support the current immutable DB history; exact-version readiness deliberately rejects old code against newer ledgers. Otherwise use a reviewed forward compatibility fix or an approved coordinated restore into new databases and switch connections. Never edit released migration SQL/checksums, delete history, or silently reverse database migrations. Preserve backups of the prior state and account for writes after the recovery point.

Before external shared staging: select and verify the trusted employee IdP adapter and controlled binding/activation procedure; approve external infrastructure/network/TLS/secret injection; provision staging PostgreSQL roles; supply reviewed immutable release digests; test backups/restore under operational policy; and approve any LLM configuration. Business certification remains separately pending. Mapping v1 remains pending, serving bindings remain zero, sync and authentication remain unimplemented. No external deployment, push or merge is part of this milestone.

### Ask Business local provider timing

The Nginx Ask Business prefix uses a 300-second read timeout so an approved slow
local provider can finish within the 240-second acceptance provider deadline,
with room for bounded analytics and persistence. Keep the proxy deadline aligned
with the operator-selected provider deadline; the API accepts other configured
timeouts, so 300 seconds is not a universal upper bound. Other API prefixes retain
their existing behavior. A longer proxy timeout is transport protection, not a
latency improvement.

Preserve the existing tested local provider profile when copying protected
runtime configuration, including optional `LLM_REASONING_BUDGET_TOKENS` and
`LLM_SEED` when supported and explicitly configured. In the October 9 acceptance,
omitting the existing 512-token thinking budget and seed 42 caused generation
to dominate 58–69 second requests. Restoring that profile reduced matched warm
requests to 19–21 seconds without changing their prompt or schema. This is local
Bonsai evidence, not a provider-neutral default or business-quality acceptance.
Do not add credentials, endpoint addresses or model settings to domain contracts.
See the [acceptance/performance evidence](../qa/ask-business-staging-2026-10-09.md).
