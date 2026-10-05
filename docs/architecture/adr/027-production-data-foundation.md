# ADR 027 — Owned production data foundation

Status: accepted offline architecture; production source, business mappings and operational deployment **not approved**. No production access. Five migrations, writer, reconciliation and SQL repository are executed/tested on disposable PostgreSQL 18.6 using synthetic data. Existing serving defaults to SQLite; PostgreSQL is opt-in. [Operations](../../integration/postgres-mart-operations.md).

Update, 5 October 2026: [ADR 029](029-ingestion-certification-lifecycle.md) supersedes the pre-ingestion approval boundary, single-write extraction limit and separate-basis release restriction for the approved comparison pilot. Immutable candidate releases, completed paged extraction evidence and metadata-only approval now govern that lifecycle. Production serving remains separately gated.

## Decision and package boundaries

El Dabboos owns a canonical PostgreSQL analytics mart. A future approved read-only source → `SourceBatchReader<T>` → deterministic mapper → validated `ProductionFact` → transactional mart writer → PostgreSQL `AnalyticsRepository` is the integration path. Legacy Supabase databases and old sync jobs remain untouched, read-only source candidates, never the new platform's store. n8n, if approved, is a transport adapter, not the semantic authority.

`packages/domain/src/production-data.ts` owns source-independent ingestion contracts and pure invariants in a separate module. Source DTOs stay in their concrete adapters; generics do not describe Odoo fields in the domain. SQL, connectors, writer and future repository belong in packages/data; ingestion orchestration can use domain ports from application. No extra package or connector factory is justified. API composition selects the serving adapter. No React, Fastify, LLM, DashboardSpec or AnalyticsQuery enters the source reader port.

`AnalyticsRepository.execute(query, context)`, AnalyticsQuery, AnalyticsResult, AnalyticsFact and DashboardSpec v2 remain unchanged. ProductionFact is a distinct envelope, not a silent extension of demo facts. Explicit PostgreSQL composition is available; no production connector, source credentials or approved business mapping is supplied.

## Basis, mapping approval and capabilities

A tenant-scoped immutable **dataset release** binds one source, business basis, mapping ID/version and reporting currency. `mapping_releases` stores the reviewable mapping specification, owner, approval and per-measure rules. Approval is not inferred from a schema passing validation. Pending mappings are inspectable but cannot ingest. Revoke serving eligibility explicitly if approval is withdrawn; do not rewrite historical approval evidence.

Mapping changes to eligible states, recognition, tax, currency or dimensions create a new dataset release. Backfill it, reconcile it and atomically switch the server-owned `serving_bindings` only after approval. Never sum releases or combine order and invoice bases. The initial binding is one release per tenant, deliberately restrictive. Supporting simultaneous business surfaces would require an explicit product/domain decision; adding a source selector to queries is outside this milestone. A dataset may certify several input measures and derived metrics only when all required inputs are present and compatible.

Evidence supplied for this milestone describes two distinct candidates, neither approved here:

- Sales Command Center: sale.order, sale/done, amount_total, tax inclusive, date_order, Asia/Baghdad. Debt uses receivable ledger and collections payment semantics.
- Product Analytics: account.invoice.report, invoice_date, untaxed analytical amount with credit notes negative. Branch/warehouse attribution is not inherent. Order warehouse attribution is a different basis.

Canonical catalog dimensions ∩ source measure mappings ∩ explicit metric certification is the production capability. No certification can expand the catalog. In particular current canonical revenue does not support warehouse; source evidence alone cannot enable it. Categorical mapped dimensions are required on each accepted fact; missing attribution is rejected until an approved explicit unknown-ID rule exists. Filters, policy filters, grouping and dimension discovery must all honor the same certified capability. Unsupported policy dimensions fail closed, never get dropped. Catalog executable/planned status and authorization remain additional gates.

## Identity, ordering and correction

Event identity is the tuple `(tenant, dataset, source, sourceObject, sourceRecordId, componentId, measure)`. Component IDs must be stable source-owned subgrain identifiers, not array offsets. Business date and source version are not event identity: a backdated correction replaces the same event.

Snapshots append `(entityId, effectiveDate)` to identity. A separate unique ownership constraint on `(tenant, dataset, measure, entity, effectiveDate)` prevents different source records from claiming the same balance. Ownership survives tombstones. Changing a snapshot's effective date requires tombstoning the old identity and writing the new one in the same transaction. Stable canonical entity identity includes every stock/ledger position component required by the approved grain; it is not simply a customer ID when multiple balances exist.

Opaque `sourceVersion` is retained verbatim. `sourceRevision` is an unsigned monotonic adapter-certified ordinal within an identity. Adapters must prove ordering using the source revision mechanism or a serialized, frozen extraction protocol. Never compare opaque tokens lexically, use wall-clock arrival as ordering, or assume source_updated_at breaks ties. Unorderable or same-marker/conflicting content is quarantined until the source protocol resolves it.

Pure `factTransition` specifies insert, equal-content replay, newer replacement and rejection of stale/conflicting versions. Tombstones use the same full envelope, retaining prior value/currency/dimensions for audit; they do not contribute to the serving view. A newer approved resurrection can replace a tombstone. Explicit negative reversal events use distinct stable identities under the mapping's sign rule; do not also delete the original unless that is the approved source semantics.

`fact_revisions` is immutable canonical history; `fact_heads` points to one current revision. Every accepted/replayed fact links to its ingestion batch via `batch_facts`. Replays retain original revision provenance and add extraction evidence without double counting. History is essential to reproduce controls after corrections; current rows alone are insufficient.

Upsert is not reconciliation. Sources without tombstones require an approved **complete scoped extraction**, stable freeze and all-page completion before diffing stored identities and generating tombstones. A missing row in an incremental page, failed pagination, changed filter or partial export never proves deletion. The exact scope/company set and freeze must be durably recorded with the batch. Payload fanout changes must explicitly tombstone disappeared components. Retention windows cannot discard deletion/version evidence needed to prevent stale resurrection.

## Source read and batch protocol

The small reader port carries source/tenant/company scope, limit, cursor/watermark, frozen source revision, sourceAsOf and deletion/completeness evidence. Concrete adapters enforce approved company scope, limit 1..1000, bounded deadlines/retries and cursor scope binding. A mutable source must provide a consistent extraction protocol or disclose that a frozen control cannot yet be certified. No connector is selected or implemented.

The future writer serializes per tenant/dataset extraction using a transactional advisory lock (or an equivalent row lock), then locks affected identities in deterministic order. It validates mapping approval and immutable version, company/tenant authorization, envelope, batch lineage and snapshot ownership before publication. Within one transaction it writes revision history, head changes, replay links, bounded rejects and final counters. Only then can it mark the batch committed and publish watermark/sourceAsOf; rollback leaves no partial serving update. Running/failed audit entries can exist outside that transaction, but cannot advertise a watermark. Crash recovery retries with stable batch identity; do not append another completed batch blindly.

`rowsRead = rowsAccepted + rowsRejected` counts source records, with a declared all-or-reject mapping unit for each record. Facts counters are separate because a row can produce several measures/components. Empty successful extractions still carry true freshness. Rejects are enum reason/category, opaque/HMAC source reference and timestamps, not arbitrary exceptions or raw payloads. Bounded retention/access and HMAC key policy remain operational approval items. No raw landing zone is required; adding one needs separate privacy and retention approval.

## Money and time

Values are normalized exact decimal **strings** with six fractional digits, ≤24 integral digits: PostgreSQL `NUMERIC(30,6)`. Rates use twelve fractional and ≤12 integral digits: `NUMERIC(24,12)`. These are technical envelope bounds, not approved financial rounding policy. Reject excess precision/overflow instead of letting PostgreSQL round; adapters must not first parse money as JS Number. Non-finite values and negative zero are rejected. Monetary classification comes from canonical input semantics, not tenant display settings.

Each monetary fact proves transaction amount/currency, optional source base currency, reporting currency and approved currency policy reference. Native values must equal transaction values in the same currency. Converted values require positive rate, rate date and rate identity. Validation proves lineage completeness, **not** the correctness or business approval of a conversion formula. No FX formula is implemented; reconciliation and approved mapping code must prove the resulting number. Serving binds one reporting currency matching the trusted tenant display configuration; mismatch must fail closed until presentation/tenant configuration is approved.

Aggregate in SQL NUMERIC. Convert only final outputs at the existing JS-number boundary with explicit range/precision checks and an approved rounding/error policy. Do not promise arbitrary precision in AnalyticsResult; values unsafe for the agreed number boundary must fail, not silently lose money. Implementing that boundary is a Sol task, approval of its financial tolerance is a business gate.

Business/effective date is distinct from source_updated_at, extraction `sourceAsOf`, ingested_at and batch timestamps. `executedAt` is the query clock. `dataThrough` remains latest authorized relevant business coverage, independent of requested window. Freshness comes from complete committed extraction evidence, including empty batches; never MAX(business_date). Multi-input freshness uses the oldest complete required input coverage, not the newest partial feed.

## Physical schema

`packages/data/migrations/postgres/001_production_foundation.sql` defines mapping_releases, measure_definitions, ingestion_batches, fact_revisions, fact_heads, snapshot_owners, batch_facts, data_quality_rejects, reconciliation_evidence, reconciliation_batches, serving_bindings and the canonical_facts view.

Customer, branch, region, salesperson, product, product_category, warehouse, equipment, equipment_category and technician are typed nullable text columns. Dates are SQL DATE, lineage timestamps TIMESTAMPTZ. Typed dimensions support pushdown, indexes and constraints; closed vocabulary changes use migrations. No JSONB-only facts, EAV dimension system, partitions, materialized aggregates or pgvector. JSONB is limited to versioned mapping specifications and small reconciliation specifications, validated at the writer boundary.

Indexes cover tenant/dataset/measure/date, branch/date as the likely first organizational slice, snapshot entity/cutoff and source/batch freshness. Identity/version primary and unique keys cover replay. Other dimension indexes wait for measured workloads; branch is not certified just because an index exists. SQL constraints complement strict domain validation; SQL does not independently execute the mapping approval/capability/content-equivalence rules. The writer is the only fact mutator and must enforce them transactionally. Validate every direct writer entry point; no generic raw-SQL ingestion endpoint.

## Migration and local/CI design

Use plain immutable numbered SQL migrations and a small PostgreSQL runner in packages/data, no ORM. **Runner implemented and database-tested.** Bootstrap `mart_schema_migrations(version integer primary key, name text not null, sha256 text not null, applied_at timestamptz not null)` in a migrator-owned administrative schema. Acquire a session advisory lock before reading history; reject changed checksums, gaps, duplicate versions and databases newer than this binary. Apply each migration and its history insert in one transaction. On error rollback and fail; do not mark applied. Hold the lock on the same connection and release in finally. No CREATE TABLE IF NOT EXISTS as schema evolution and no runtime auto-migration.

Pin `postgres:18.6` for disposable local/CI databases. Integration tests prove migration from empty, rerun, tamper refusal, failure rollback and concurrent serialization. The previously unapplied 001 migration needed the intended explicit `(measure_id, kind, monetary)` referenced column list. No global PostgreSQL installation, production credentials or live source probing. SQLite/demo initialization remains unchanged and is separate from mart migrations.

## Identities and tenant protection

| Identity | Authority |
| --- | --- |
| SOURCE_READER | Dedicated read-only approved source/company/models; no mart schema authority |
| MART_INGESTOR | INSERT revisions/batch links/rejects/evidence; controlled UPDATE heads/batches; no DDL, no release approval/binding administration, no UPDATE/DELETE history |
| MART_RUNTIME | SELECT approved serving views/config only, no source credentials or writes |
| MART_MIGRATOR | DDL/schema ownership; separate from runtime and ingestion; controlled mapping/binding deployment |

Use separate dedicated identities, never legacy Supabase service_role or product-sync keys. Administrator-only NOLOGIN group provisioning lives in infra/postgres/roles.sql; migrations 002/005 enforce exact grants, forced tenant RLS and security-invoker serving. Runtime dependencies also require an active approved release through restrictive RLS policies. Schema/tables grant nothing to PUBLIC. The implementation enforces tenant RLS on tenant tables (FORCE ROW LEVEL SECURITY for non-bypass roles), transaction-local trusted tenant context, and security-invoker views or a carefully scoped equivalent. Pooled connections must not retain tenant settings. RLS supplements explicit tenant + dataset predicates and existing policy intersection; it does not replace membership/authorization. Runtime should receive only necessary serving metadata, not quarantine or reconciliation payloads. Integration tests must attempt cross-tenant SELECT/INSERT/UPDATE, role escalation, history mutation and source credential absence.

## Serving and parity proof

PostgresAnalyticsRepository validates existing queries/context, resolves the approved serving release internally, checks catalog/registry/certification and pushes tenant, measure, date and policy work into PostgreSQL using allowlisted identifiers and parameterized values. Never load tenant history into Node to call executeFacts. Ratio inputs aggregate before dividing; snapshots select latest entity at cutoff **before** dimension/policy filtering to avoid resurrecting old assignments. Calendar and analysis pipeline semantics match engine.ts, including additive zero, snapshot/ratio nulls, comparison periods, deterministic tie ordering, Top-N, ranking, moving average, running total and percentage contribution.

Disposable migrated database tests pair synthetic engine and SQL outputs across all executable semantic families and the analysis pipeline. Check moved snapshots, missing dates, leap/month ends, denominators, category ties, second tenant and contradictory policy filters. SQL aggregates/limited grouped rows may enter Node for bounded presentation analysis; no full fact history. EXPLAIN evidence, grouping/date bounds, timeout recovery and pooled tenant isolation are tested; this is synthetic functional evidence, not production-scale or restore evidence.

## Reconciliation and pilot

`ReconciliationCase` freezes tenant, dataset/mapping version, input measure, report reference, source revision, exact committed batch IDs, date/group scope, expected/actual decimal values and counts. Reconstruct each identity's highest included source revision from batch_facts + immutable history, exclude tombstones **after** revision selection; never evaluate historical controls against current heads. Persist safe evidence with verified same-dataset batch links. Frozen completeness requires the exact baseline plus deltas (or an approved full extraction); a single incremental batch is not the full ledger. Validate report currency and binding from the release.

Pending tolerance always produces `reported`, even for exact equality. The small pure harness supports explicitly approved absolute value/count tolerances using BigInt, not floating-point epsilon. Relative tolerances and exception approval workflow are deferred until requested/approved. Passing a numeric comparison is evidence, not business sign-off of source authority. Group completeness and missing-group detection belong in the full harness.

First pilot remains one approved tenant/basis; revenue, net_revenue and order_count; monthly grouping plus one certified organizational dimension (branch only if supported); one closed month, correction/backfill and second-tenant control. Source choice/report, business owner, currency, tenant/company mapping, dimensions, deletion protocol, tolerance and production identity/privacy/operations approvals are pending.

## Architecture checkpoint / stop boundary

Engine API, direct Odoo and backend/Postgres can implement the generic source reader without domain source DTO changes. Distinct bases have distinct releases; rows retain source/mapping/version/batch evidence; history, heads and tombstones support idempotent historical restatement and frozen reconciliation. Currency lineage is mandatory. Runtime reads the owned mart with separate credentials. Tenant is present in every identity and relationship. These are designed boundaries plus focused pure contract tests, not a completed ingestion service.

The original architecture phase stopped at focused contracts/documentation. Its implementation continuation adds runner/writer/reconciliation/SQL repository, PostgreSQL 18.6 local/CI services and full verification. No architecture redesign, live connector, browser/visual QA or merge is part of implementation. Production gates remain open.


## Implementation safeguards

The writer takes trusted authorized company IDs separately from source data, admits bounded complete extraction units, and owns final counters/time/watermark. Each source record is all-or-reject; removed fanout components and corrected snapshot dates require explicit tombstones in the same transaction. Absence-based diff is refused until a future approved complete enumeration adapter can supply its evidence. A repeated committed batch ID must match its request fingerprint; exact replay returns its original completion. Mapping releases are immutable, including synthetic test-only approvals.

The six-decimal output boundary refuses aggregates outside safe scaled-integer range or that cannot round-trip at six decimals. SQL sums/counts are converted only after reduction; ratios, average and bounded analysis preserve the existing number contract. No financial tolerance or FX formula is introduced. Defaults (1,000 groups, 3,660-day explicit date span, 15-second statement timeout, eight pool connections) are provisional technical safeguards.

Reconciliation requires an explicit complete baseline, frozen terminal revision, equal company/object scope and continuous batch watermarks. Expected groups are supplied as a complete control set; missing and unexpected groups prevent an approved pass. Pending tolerances always remain reported. The current writer bounds a committed extraction to 1,000 source records/10,000 canonical facts; multi-page transport/orchestration and approved source-protocol certification remain future connector work.
