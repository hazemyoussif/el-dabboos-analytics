# Persistent local Analytics mart

This development/pilot mart is separate from Odoo and from the disposable `foundation_test` environment. It uses PostgreSQL 18.6, database `el_dabboos_analytics`, loopback `127.0.0.1:55437`, Compose project `dabboos-analytics-mart` and named volume `dabboos_analytics_data`. PostgreSQL 18 storage mounts at `/var/lib/postgresql`. The existing test Compose file retains tmpfs and port 55436. This is not a production deployment, backup or recovery contract.

## Local configuration

Root `pnpm mart:local` and `pnpm mart:migrate` explicitly use Node's existing environment-file support: exported shell values override root `.env.local`, which overrides `.env`. Run these commands from the repository root. No additional environment parser is used. `.env.local` must remain ignored, with local permissions restricted to its owner. `.env.example` contains placeholders only.

Configure four distinct generated secrets of at least 24 characters locally:

- `MART_LOCAL_ADMIN_PASSWORD`: container bootstrap identity `mart_bootstrap`; infrastructure only.
- `MART_LOCAL_MIGRATOR_PASSWORD`: `mart_migrator_login`.
- `MART_LOCAL_INGESTOR_PASSWORD`: `mart_ingestor_login`.
- `MART_LOCAL_RUNTIME_PASSWORD`: `mart_runtime_login`.

Configure `MART_MIGRATOR_URL`, `MART_INGESTOR_URL` and `MART_RUNTIME_URL` with their matching login/password at `127.0.0.1:55437/el_dabboos_analytics`. URL-encode passwords when constructing URLs. Bootstrap validates that the supplied URLs match the separately supplied login passwords. No application receives the bootstrap administrator connection. Do not use test credentials or point these URLs at Odoo. The local helper rejects different endpoints, database names and overlapping identities. Runtime pool/query bounds retain their existing settings.

Changing a password in `.env.local` does not reset an existing PostgreSQL administrator's password. `POSTGRES_PASSWORD` initializes a fresh volume only. For login-password rotation, bootstrap reruns update the three login passwords transactionally; existing unsafe role memberships are refused. Administrator rotation is a separate operator action. Do not delete the volume to work around configuration errors.

## Fresh-machine workflow

Install Docker with Compose and the repository's configured Node/pnpm versions; fill local configuration, then:

```bash
pnpm mart:local up
pnpm mart:local bootstrap
pnpm mart:migrate
pnpm mart:local verify
```

`up` runs `docker compose -f infra/postgres/compose.mart.yml up -d --wait`. Bootstrap reuses `infra/postgres/roles.sql` for existing NOLOGIN groups and provisions dedicated logins with only their corresponding membership. Repeated bootstrap and migrations are supported. The migrator applies the existing immutable migration files; no mart schema, RLS or ingestion lifecycle is redesigned. Schema verification compares the complete ledger to local filenames and SHA-256 checksums without applying migrations.

| Login | Group | Responsibility |
| --- | --- | --- |
| mart_migrator_login | dabboos_migrator | Schema migrations and later separately controlled certification/binding operations |
| mart_ingestor_login | dabboos_ingestor | Candidate page writes and reconciliation; no schema/approval/binding writes |
| mart_runtime_login | dabboos_runtime | Read-only queries; existing runtime role verification remains required |

All three are nonsuperusers without BYPASSRLS, role/database creation or replication attributes. Verification checks correct/nonoverlapping group memberships, current schema, ingestor write grants and absence of schema/approval/binding grants, and runtime read-only privileges using the existing runtime verifier. Results contain safe names/status only. Driver and Docker errors are not echoed. `dabboos_source_reader` remains a local inert group, not the remote Odoo login.

## Persistence and stopping

```bash
pnpm mart:local stop
pnpm mart:local start
pnpm mart:local verify
```

Or remove the container/network while retaining the database volume:

```bash
pnpm mart:local down
pnpm mart:local up
pnpm mart:local verify
```

Normal commands never delete the named volume. Keep local credentials available across restarts. The persistent mart can remain running while the disposable PostgreSQL suite uses port 55436.

The persistent server uses `restart: unless-stopped`, matching the local staging
application. It resumes after a Docker daemon restart unless deliberately stopped;
after an explicit stop, use `pnpm mart:local start`. This server also hosts the
local staging control/authentication database. A stopped server can therefore
cause API startup to fail its control identity/schema check and the HTTPS auth
bootstrap request to return 502. Check the container and its logs before changing
auth settings or applying migrations. Odoo/Teleport availability is separate from
control authentication and trusted mart serving.

## Explicit destructive developer reset

Only when the operator intentionally wants to erase **all local mart data**, use:

```bash
# DESTRUCTIVE: deletes dabboos_analytics_data and all its mart data.
docker compose --env-file .env.local -f infra/postgres/compose.mart.yml down -v
```

This is never invoked by startup/bootstrap/tests or the normal helper commands. Supply exported `MART_LOCAL_ADMIN_PASSWORD` if using shell configuration instead of `.env.local`.

## Next gate

The local mart is ready for configuration of a separately managed read-only Odoo source and the later approved September snapshot pilot. This infrastructure workflow does not connect to Odoo, ingest facts, approve a mapping, create a serving binding, provision a live tenant or change runtime provider selection. Authoritative Invoice Analysis and explicit serving authorization remain required by ADR 029.
