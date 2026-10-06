# PostgreSQL mart operations — synthetic foundation

The approved comparison pilot now extends this foundation through [ADR 029](../architecture/adr/029-ingestion-certification-lifecycle.md), appended migrations 006–007 and the [Odoo operator procedure](odoo-postgres-pilot.md). Candidate mappings are immutable before ingestion. One retained PostgreSQL source snapshot covers both source objects, pages and DB controls; final-page completion and reconciliation are atomic. Only completed logical runs are reconciled, and only approved reconciled mappings can bind serving. The 1,000-source-record write limit remains. No live source or production binding has been used in implementation verification.

Implemented foundation, not production-source readiness. The approved adapter is implemented; live credentials, authoritative report evidence and production deployment readiness remain outstanding. PostgreSQL target and local/CI image: **postgres:18.6**. SQLite/mock remain available; SQLite is the default. Legacy systems are untouched.

## Persistent local development mart

Use the separate [local mart workflow](local-analytics-mart.md) and `infra/postgres/compose.mart.yml` for persistent development/pilot storage on port 55437. Its three dedicated logins inherit the existing group roles. The disposable environment below remains unchanged.

## Disposable integration environment

```bash
docker compose -p dabboos-foundation -f infra/postgres/compose.yml up -d --wait
PG_TEST_ADMIN_URL=postgres://foundation_test:foundation_test_only@127.0.0.1:55436/foundation_test pnpm run test:postgres
docker compose -p dabboos-foundation -f infra/postgres/compose.yml down
```

These committed credentials are throwaway tests only. Storage uses tmpfs, no persisted volume. Tests require the exact 18.6 server, allow only local/test hostnames and foundation_test administrator database, create disposable uniquely named databases, and close pools/drop those databases after use. No developer env files or source/model services are loaded. The PostgreSQL suite is separate from normal unit tests; without PG_TEST_ADMIN_URL its tests explicitly skip. CI sets the URL and runs both suites.

## Identities and migrations

An administrator provisions the NOLOGIN groups using infra/postgres/roles.sql once per cluster/database. Dedicated LOGIN identities obtain only the matching group; passwords/TLS/secrets are managed outside Git. The source-reader group is an inert placeholder with no mart grants. The Odoo adapter uses an externally provisioned dedicated SELECT-only source identity, independently verified before extraction.

MART_MIGRATOR_URL belongs only to the separate migration process:

```bash
pnpm run mart:migrate
```

Migrations run as the dedicated migrator. The runner discovers contiguous immutable SQL files, acquires a session advisory lock on the same checked-out connection, verifies ledger filename/SHA-256/history, and applies each SQL file and ledger row atomically. Empty/rerun, concurrency, changed checksums, failed SQL rollback, gaps and a database newer than the binary are tested. Never edit published migration files; add the next migration. Neither runtime startup nor ingestor runs migrations.

Migrations 001–005 implement base schema; roles/forced RLS/invoker view; durable extraction fingerprint/scope and immutable mapping releases; reconciliation group completeness; restrictive runtime binding RLS. Mapping deployment and binding changes are controlled migrator operations under explicit trusted tenant context; no public/admin HTTP endpoint exists. Mapping content changes require a new immutable candidate release and new reconciliation. Approval updates certification metadata only after selected complete evidence covers every mapped input; serving then requires its separately authorized binding switch. Withdraw serving by removing its binding. Application-facing canonical contracts remain unchanged.

MART_INGESTOR can insert immutable history, batch links, safe rejects, ownership and reconciliation evidence; it can update heads, running batches and extraction checkpoints. It cannot alter schema, approve releases or mutate historical facts. MART_RUNTIME selects only serving dependencies and metadata, and cannot write/alter/migrate or read rejects/reconciliation/ledger. RLS is forced on every tenant table. Runtime's dependencies additionally restrict dataset access to the active approved binding. Application predicates still enforce tenant, dataset, certification and policy intersection. Trusted tenant state uses transaction-local set_config and resets on commit/rollback; tests reuse a one-connection pool across tenants and after statement timeout.

## Writer and extraction

PostgresMartWriter receives a trusted tenant-to-company allowlist and uses the exact persisted immutable SourceMapping, including unapproved candidates. Source records map all-or-reject into bounded units, including explicit removed-component/date tombstones. The writer locks a tenant/dataset, validates scope/lineage, applies pure domain factTransition rules, inserts immutable revisions/current heads/ownership/batch links/rejects, and publishes internally computed counters, completion and watermark in one transaction. Snapshot ownership survives deletion. Conflicts or failures roll back the whole batch, including its checkpoint. Stable batch ID plus SHA-256 request fingerprint makes crash/retry deterministic; reusing the ID for a different request is refused.

SourceAsOf and freeze/object/company/request scope are persisted even for empty successful extractions. An incomplete logical extraction cannot reconcile or serve; its atomic pages may be committed internally. The current commit interface is bounded to 1,000 source records, 64 facts per mapped unit and 10,000 facts per transaction. The logical extraction owns bounded pages and advances its completion watermark only with the terminal committed page. Complete-scope deletion by absence is explicitly refused until an approved enumeration/diff adapter exists. Explicit tombstones are supported and tested; no missing-row guess creates a deletion.

Rejects persist only an allowlisted category/reason, opaque/HMAC reference and canonical timestamp, never raw payloads or exceptions. Production HMAC/retention/access policies remain pending. Synthetic fixtures include signed credits, corrections/deletion, fanout/date moves and malformed numeric/date/currency/identity/dimension cases. Synthetic test approvals identify themselves as TEST ONLY and are created only inside disposable databases; no approved production mapping is registered.

## Runtime and bounds

Set ANALYTICS_PROVIDER=postgres and MART_RUNTIME_URL to the dedicated read-only mart connection. An absent/malformed URL, missing explicit login identity or out-of-bound setting fails configuration without echoing values. Startup also refuses credentials belonging to migrator/ingestor or superuser/BYPASSRLS identities; runtime must belong only to its read-only group. Runtime never receives migration/ingestion/source credentials. Trusted reporting currency comes from existing tenant profiles; unknown tenants or mismatched bindings fail closed. Production profiles/authentication remain a separate approval gate.

| Setting | Default | Technical bounds |
| --- | --- | --- |
| MART_POOL_MAX | 8 | 1–64 |
| MART_STATEMENT_TIMEOUT_MS | 15000 | 1–120000 |
| MART_MAX_GROUPS | 1000 | 1–5000 |
| MART_MAX_DATE_SPAN_DAYS | 3660 | 1–36600 |

Connection checkout times out after five seconds; idle sessions retire after 30 seconds. Each query runs in a read-only repeatable-read tenant transaction with PostgreSQL-native statement_timeout. Rollback and release occur on failure. Shutdown closes the pool. These are provisional technical safeguards, not approved business limits or capacity targets.

SQL pushes tenant/dataset/measure, policies/business filters, date predicates, grouping, exact NUMERIC aggregates and latest snapshot selection into the database. It never loads source fact history into Node or calls executeFacts. Snapshot selection precedes dimension/policy filtering. Only bounded grouped/aggregate rows enter Node for number conversion, ratios, comparisons and fixed analysis ordering (moving average, running total, contribution, ranking, Top-N). Top-N therefore ranks the authorized, filtered aggregate set. EXPLAIN tests confirm aggregate/date/tenant pushdown; production workload tuning remains unmeasured.

NUMERIC(30,6) values and NUMERIC(24,12) rates/lineage stay exact in storage and reconciliation. Aggregates must round-trip at six decimals with scaled units within Number.MAX_SAFE_INTEGER (about 9 billion whole units), or execution fails. Ratios/average and analysis use the existing JS-number output contract after SQL reduction. There is no FX calculation or approved financial rounding/error tolerance. dataThrough reflects authorized business coverage independently of the selected window; sourceAsOf reflects complete committed extraction evidence and uses the oldest latest coverage across required source objects, including empty batches.

## Frozen reconciliation

PostgresReconciliation takes a complete expected control set and explicit report currency. It validates same tenant/release/measure/report/freeze/date/group/tolerance, committed batch linkage, company/object scope, a complete baseline and continuous watermark lineage. The Odoo pilot requires an operator-certified immutable source snapshot that reproduces its declared freeze across restarts. Historical facts are reconstructed from batch_facts/fact_revisions by highest included revision, with tombstones excluded only after revision selection. Current heads and later batches do not rewrite a recorded control.

Totals/counts are SQL NUMERIC/integer text; the domain harness compares decimals through BigInt. Latest eligible entity snapshots replace historical summation. Group completeness is persisted with missing/unexpected keys; an approved control cannot pass with incomplete groups. Pending tolerance always reports, even with exact equality. Immutable evidence includes the actual values and exact batch links. No production tolerance or report authority is invented.

## Remaining approvals and limits

Source owner: integration boundary, dedicated credential mechanism, company scope, stable version/delete/freeze protocol, limits and freshness. Finance/business: authoritative revenue surface/states/tax/refunds, mapping/currency/rounding/tolerances, organizational dimension, pilot tenant/month and correction case. Security: production identity/membership/revocation/policy ownership, privacy/LLM sharing and retention. Platform: hosting/TLS/networking/secret manager, capacity/pool sizing, backups, RPO/RTO/restore drill and deployment ownership.

All tests are synthetic. No live production data, live LLM, legacy writes, browser/visual QA, backup drill or production-scale benchmark is claimed. See [readiness](production-readiness.md), [source contract](real-data-contract.md), [questions](questions-for-malik.md) and [ADR 027](../architecture/adr/027-production-data-foundation.md).

## Explicit certified publication

Migration 009 adds append-only authorized-business/external-report certification and immutable promotion receipts. See [ADR 031](../architecture/adr/031-certified-release-promotion.md) and [publication operations](certified-release-publication.md). Both evidence paths require exact completed technical reconciliation; only an approved business-certified release can be promoted, and serving binding remains separate. Original migration files are never edited.
