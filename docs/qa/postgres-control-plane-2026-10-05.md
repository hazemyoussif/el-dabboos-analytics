# PostgreSQL control-plane implementation evidence — 5 October 2026

Branch: `codex/production-pilot-lifecycle`. Starting HEAD: `961e8f746f3f7826167f216634e3f7a007fa84b0` (`Provision a separate persistent local Analytics mart`). Recent preceding work retained the PostgreSQL pilot snapshot and candidate certification lifecycle. The implementation is a local commit on this branch; the final commit identity is reported in the chat handoff. No push, merge, shared staging deployment or live source extraction occurred.

Existing uncommitted Odoo staging-credential/pilot changes were preserved and excluded from the control implementation commit. Existing `.archify/` artifacts were preserved. A separate local target-topology diagram was generated for this handoff, with automated schema/artifact/browser validation; no perceptual visual review is claimed.

## Implemented boundary

`PostgresAdministrationStore` implements the existing domain administration unit of work; both SQLite and PostgreSQL use the shared async transaction-bound repository implementations. Customer/tenant/user/identity/role/membership/scope/dashboard/grant persistence, protected role bootstrap, tenant profiles and personal library/folder/preferences are supported. PostgreSQL writes serialize fresh actor/target/recovery decisions; record/access CAS and successful administration audit roll back together. Personal library writes use the same write lock and transaction owner. Trusted identity remains a future adapter; stable issuer/provider plus subject bindings are preserved.

`CONTROL_PROVIDER=postgres` selects the PostgreSQL store exclusively and never opens `dashboards.db`. `CONTROL_DATABASE_URL` and `CONTROL_POOL_MAX` configure runtime; `CONTROL_MIGRATOR_URL` configures operator commands. Local bootstrap uses distinct `CONTROL_LOCAL_MIGRATOR_PASSWORD` and `CONTROL_LOCAL_APP_PASSWORD`. Credentials were generated in ignored `.env.local`; its provider remains SQLite, so the local API has not silently cut over. PostgreSQL control mode requires disabled synthetic authentication.

Five independent immutable control migrations exist: metadata, governance/grants, sources/mapping authoring, frozen candidate configuration, and immutable mapping lifecycle audit. Migration/schema verification protects filenames/order/checksums/history; explicit migrations have advisory locking and transactional rollback. Runtime cannot migrate. Operator identity checks reject mart/app/elevated or overlapping credentials.

Control NOLOGIN groups are `control_migrator` and `control_app`; dedicated local logins are `control_migrator_login` and `control_app_login`. Neither login is superuser, BYPASSRLS, database creator or role creator. The app lacks DDL and migration-history writes; audit rows/lifecycle events are immutable. Mart roles cannot become control app or operate its tables. Control application tenant access remains governed by the existing application policy and explicit repository predicates; control-plane RLS is not introduced.

## Local database evidence

Read-only local verification confirmed PostgreSQL `18.6 (Debian 18.6-1.pgdg13+2)` at `127.0.0.1:55437`, both `el_dabboos_control` and retained `el_dabboos_analytics`, five current control migrations and the dedicated application login/role restrictions. Bootstrap rerun succeeded, migration rerun applied nothing, and schema verification succeeded. Existing persistent Docker server/volume and mart identities/migrations were retained; no disposable test configuration was edited.

The local root `dashboards.db` has only the three legacy dashboard/library tables and no administration migration history. Its read-only dry-run import failed closed. It was not upgraded/repaired/imported. The new local control product tables are empty until an approved reconciled backup or explicit trusted bootstrap is provided. No assumption of a production IdP or invented tenant/user ownership was made.

## Migration and source model evidence

The one-shot importer opens SQLite read-only, retains a consistent source snapshot, requires current exact known source schema/FKs and current target schema, and inserts/verifies all 19 metadata tables in a single PostgreSQL transaction. It preserves every column, IDs, versions, timestamps, exact dashboard JSON text, grants, audits and membership/role/scope semantics. Dry-run exercises the same path then rolls back. Populated targets, unknown schema, orphan metadata and invalid dashboard specs fail; there is no dual-write replication.

Synthetic representative migration evidence includes per-table row counts and primary-key column verification, exact row equivalence, noncanonical-whitespace bilingual dashboard JSON, version 7 preservation, audit row identity, granted access, folder/preference detachment, FK checks and unchanged source file bytes. SQLite/PostgreSQL contract parity verifies fresh authorization, recovery, scopes, roles, profiles and library behavior. Concurrent dashboard CAS produces one saved update and one conflict; failed cross-tenant grants and failed audit insertion roll back state.

`SourceDefinition` stores governed type, tenant/source ownership, enabled flag, opaque `connectionRef` and explicit company scope. Multiple sources per tenant and multiple tenants are integration-tested. The staging identity/scope `el-dabboos-iq` / `el-dabboos-odoo18-pg` / company `1` / `odoo-staging-main` is representable after governed tenant provisioning. Unknown/disabled references, duplicate IDs/scope, missing tenants, credentials/unknown fields and arbitrary mapping instructions fail closed.

`SourceConnectionResolver` receives a typed connection registry; API local composition resolves external shell/`.env.local` credentials and database-owned scope. The Odoo adapter receives typed PostgreSQL config and does not read `process.env`. SSH remains external. In PostgreSQL control mode, the offline extraction composition loads database-backed source definitions. No serving query uses source discovery.

Control mapping definitions select the closed `odoo-comparison-v1` adapter recipe, canonical measures and stable dimension attribution; source objects/grain/recognition/state/amount/sign/currency rules stay governed by that versioned recipe. Mapping definitions/child configuration and lifecycle evidence are persisted separately from immutable mart releases. Control metadata supports explicit draft/candidate/reconciled/approved/published states with references and database actor/time audit. App cannot approve/publish or forge lifecycle audit. The certified cross-database publication use case remains future work; no control status is treated as mart certification.

## Automated verification

Frozen lockfile install, lint, architecture, baseline-aware quality, typecheck, standard tests, PostgreSQL integration suite, API/web build and diff gates passed. Standard tests: 590 passed, zero failed/skipped. PostgreSQL suite: 93 passed, zero failed/skipped, including 10 focused control tests. Architecture/quality/diff each reported zero diagnostics. Build retains the existing large web chunk warning.

Tests use synthetic fixtures and the existing disposable PostgreSQL 18.6 configuration at port 55436, with explicit `PG_TEST_ADMIN_URL`; they do not load developer environment files or require Odoo/customer/model services. Local PostgreSQL evidence above is separate from automated tests. Tests exercised the combined working tree, including the preserved pre-existing Odoo changes; no isolated commit-only verification is claimed. The final control migration suite also passed all 10 tests after the whitespace-only manifest correction. CI was not run remotely because nothing was pushed.

## Existing pilot unchanged

Before/after read-only repeatable-read snapshots used the explicit `el-dabboos-iq` tenant RLS scope. Counts and deterministic aggregate row fingerprints matched for all 12 mart base tables. This includes 24 ingestion batches, four extraction runs, 24,335 fact heads/revisions, 41,120 batch-fact links, 308 reconciliation cases and 4,312 reconciliation-batch links. Zero rejects remain. Mapping release v1 remains `pending`; serving bindings remain `0`. Source Odoo was not connected to or modified, and the September live pilot was not rerun.

## Before shared staging

Approve/reconcile a metadata backup and cutover; choose/implement trusted employee IdP; record Odoo Invoice Analysis gross/refund/filter certification; implement explicit certified mapping publication/recovery; configure staging-only secrets, TLS/origins/session policy, backup/restore drills, resource sizing and observability. Staging will use `el_dabboos_control_staging` and `el_dabboos_analytics_staging`; production later uses separate production resources. Scheduled sync/backfill/delete reconciliation, real serving activation, Odoo authentication, production modifications and deployment remain outside this task.

See [control operations and architecture](../integration/postgres-control-plane.md) for commands, migration descriptions, SQLite policy and topology.
