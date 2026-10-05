# Persistent local mart handoff — 5 October 2026

Branch: `codex/production-pilot-lifecycle`. Starting HEAD: `ec6bc8635290bb8f3557e2247f755d5fa2c3cd66`. Final local review commit is reported in the task response. No push or merge. Existing `.archify/` checksums were preserved.

## Infrastructure and credentials

Added `infra/postgres/compose.mart.yml`: PostgreSQL 18.6, database `el_dabboos_analytics`, loopback port 55437, health check and persistent named volume `dabboos_analytics_data`. The existing disposable Compose file, tmpfs, foundation credentials, port 55436, role definitions and published migration SQL remain unchanged.

The local bootstrap administrator is `mart_bootstrap`. Generated local-only secrets and the three application connection URLs were appended to ignored root `.env.local`, preserving existing settings and restricting permissions to 0600. No credential values were printed or committed. `.env.example` documents placeholders and existing runtime bounds. The runtime provider was not switched from its previous configuration.

Dedicated LOGIN identities are `mart_migrator_login` → `dabboos_migrator`, `mart_ingestor_login` → `dabboos_ingestor`, and `mart_runtime_login` → `dabboos_runtime`. Each belongs exclusively to its matching role and has no superuser/BYPASSRLS/create-role/create-database/replication attribute. Source reader remains a local inert NOLOGIN group, not an Odoo credential.

The infrastructure-specific helper reuses `roles.sql` and the existing runtime verifier. Bootstrap is transactional, uses server-side identifier/literal quoting for supplied passwords, and refuses unsafe existing memberships. Read-only verification compares all ledger versions/names/checksums with the same manifest used by migrations. The manifest extraction resolves three historical short-name debt entries; no baseline allowances were added.

Root local-mart and migration commands explicitly use the existing Node environment loader: shell → root `.env.local` → `.env`. Driver/Compose errors are redacted. The [operator workflow](local-analytics-mart.md) covers startup, provisioning, verification, restart, volume-preserving down/up and separately explicit destructive reset. No reset was run.

## Manual local evidence

- Container healthy; actual server version 18.6; dedicated local group/login provisioning succeeded.
- Migrations 001–007 applied; repeated bootstrap/migration completed without changes to history.
- Verification succeeded after stop/start and container/network down/up without volume removal.
- All seven immutable ledger records/checksums and 30 seeded measure definitions remained present; no mapping, fact or serving binding was created.
- Runtime SELECT read all 30 persisted seeded measure definitions after restart; actual runtime UPDATE was denied with insufficient privilege. Actual ingestor mapping UPDATE and CREATE TABLE were denied. A separate temporary verification database on the persistent instance received one synthetic fact through the existing candidate writer using only the ingestor login. Its exact value survived container restart. Only that self-created scratch database was removed afterward; the actual pilot mart remains empty. No synthetic mapping approval or serving binding occurred.
- A temporarily overlapping ingestor/runtime grant was refused and restored in cleanup. Automated provisioning tests additionally refuse unrelated `pg_monitor` membership and authenticate generated passwords containing SQL punctuation.

The persistent mart is left running. Only the disposable test environment is removed after verification. Remote Odoo, SSH, live ingestion, mapping approval, serving, scheduling, multi-source configuration, legacy/production systems and provider selection are untouched.

## Verification and next step

Frozen install, lint, typecheck, build, architecture, baseline-aware quality and diff gates passed. Unit tests: 586 passed; PostgreSQL tests: 82 passed, with no failures or skips. The initial PostgreSQL run exposed an overly strict implicit database-owner membership check; the corrected full rerun passed. Tests use synthetic temporary configuration and the isolated `foundation_test` environment, never developer environment files or remote services. Existing Vite chunk-size warning remains. This local review commit has no remote CI run because it was not pushed.

The next operator prerequisite is the externally managed tunnel and confirmed dedicated read-only Odoo configuration. After that, perform the separately scoped live preflight/pilot. Authoritative Invoice Analysis, mapping approval and explicit serving authorization remain later gates. No work beyond this infrastructure task was started.
