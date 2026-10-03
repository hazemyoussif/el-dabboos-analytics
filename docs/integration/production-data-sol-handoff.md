# Production Data Foundation — architecture-phase Sol handoff

Historical architecture-phase handoff retained below. The implementation continuation is documented in [PostgreSQL mart operations](postgres-mart-operations.md) and ADR 027; its target is PostgreSQL 18.6, superseding the original 17 references.

Architecture phase complete. **Continue with GPT-6.1 Sol, Medium reasoning.** Do not spend further Astra allowance on mechanical implementation. This is a handoff artifact; no new chat/model session has been launched.

## Checkout and scope

- Branch: `feat/production-data-foundation`
- Verified fetched base/main and current HEAD: `3c1752ab8312aeb8a911d33bbad2a0d5e34bfad1`
- Working tree: intentional uncommitted architecture changes; no commits created.
- Production access: NONE. No secrets requested/read, no live source probing, no connector chosen.
- Push: NOT PUSHED. Merge: NOT MERGED.
- Preserve all existing execution/security/planner/lifecycle contracts. Read AGENTS.md and [ADR 027](../architecture/adr/027-production-data-foundation.md) first.

## Architecture delivered

- Source boundary: generic bounded reader/request/batch/record contracts; physical source DTOs remain adapter-owned.
- Mart ownership: dedicated El Dabboos PostgreSQL; legacy databases/jobs untouched.
- Package placement: separate production domain module; migration/adapters under data; no new package.
- Envelope: exact decimal values, typed measure/dimensions, tenant/dataset, source/version, batch/freeze, status and currency lineage.
- Event identity: tenant/dataset/source/object/record/component/measure, stable across business-date changes.
- Snapshot identity: also entity/effective date; independent ownership guard prevents ambiguous same-date balances.
- Correction/delete: monotonic certified revisions, same-version replay/conflict checks, replacement/tombstone decisions; immutable history plus current heads designed.
- Batch/watermark: strict lineage/accounting validation and transactional commit design; no publication ahead of durable writes.
- Currency: mandatory native/converted evidence, NUMERIC(30,6), rate NUMERIC(24,12), no FX formula.
- Capabilities: per-release approval and intersection with catalog and mapped measure inputs; no semantic expansion.
- Migration: initial SQL plus ordered/checksummed/locked transactional runner design, runner not implemented.
- Reconciliation: frozen batch set and exact decimal/count comparison; pending tolerance stays reported.

## PostgreSQL design

[Initial SQL](../../packages/data/migrations/postgres/001_production_foundation.sql): mapping_releases, ingestion_batches, measure_definitions, fact_revisions, fact_heads, snapshot_owners, batch_facts, data_quality_rejects, reconciliation_evidence, reconciliation_batches, serving_bindings; canonical_facts view.

Keys include tenant/dataset, unique revision and opaque version per fact, snapshot ownership and composite batch/reconciliation scope FKs. Typed nullable categorical columns; tenant/measure/date, branch/date, snapshot/cutoff and source/time indexes. Separate SOURCE_READER, MART_INGESTOR, MART_RUNTIME and MART_MIGRATOR identities are designed. Role grants/RLS and migration bootstrap are not implemented. SQL has not been run on PostgreSQL.

## Compatibility

AnalyticsRepository, AnalyticsQuery, AnalyticsResult, AnalyticsFact, DashboardSpec v2 and application execution remain unchanged. Mock/SQLite repository and tenant/policy regression checks pass. No new API/web exposure, persistence lifecycle or authorization changes.

## Implemented files

- `packages/domain/src/production-data.ts` and export in `index.ts`: ingestion contracts, strict mapping/fact/batch validation, identities, revision transition, snapshot guard and reconciliation harness.
- `packages/domain/test/production-data.test.ts`: synthetic focused architecture invariants and SQL/catalog vocabulary alignment.
- `packages/data/migrations/postgres/001_production_foundation.sql`: authored initial schema, not deployed.
- ADR 027 and targeted additions to system-design, data-flow, current-assumptions, production-readiness, real-data-contract, reconciliation-plan and questions-for-malik.
- This handoff.

## Verification evidence

Passed:

```bash
pnpm exec tsc --noEmit
node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap packages/domain/test/production-data.test.ts packages/data/test/repository.contract.test.ts packages/data/test/security.test.ts
```

Node reported all three test files passing, zero failures. Focused coverage includes stable event/snapshot identities; tenant/dataset separation; replay, newer replacement, conflict/stale refusal; tombstones; invalid measure/date/numeric/identity/dimension; currency and approval; batch lineage/early watermark refusal; pending/approved reconciliation tolerance. This proves pure invariants, not database transaction behavior.

Not run: full lint/full application+web typecheck script, frozen install, full suite/build, PostgreSQL integration, CI, browser or visual QA. Root tsc passed; do not describe that as the full monorepo typecheck command. `git diff --check` flags four Markdown two-space line breaks in the source-choice list; resolve mechanically during Sol cleanup if desired.

## Deferred to Sol — exact next work

1. Implement the small migration runner per ADR: pinned local/CI PostgreSQL 17 container, administrative schema/version table, checksum verification, same-session lock, transactional application, safe failures. Test from empty, rerun, tamper and rollback before claiming SQL correctness.
2. Implement dedicated role provisioning/grants and forced tenant RLS/security-invoker serving views; test privileges, scoped pooled connections and cross-tenant writes/reads. Keep credentials as placeholders, no production setup.
3. Implement the validated transactional mart writer: immutable releases/history; dataset lock; stable identity derivation; ordered head replacement; snapshot ownership; replay batch links; rejects/counters; atomic completion and checkpoint; crash/rerun behavior. SQL constraints do not substitute for all domain invariants.
4. Persist full extraction scope, pagination completion/deletion evidence and checkpoints using the reader contract. Enforce bounds and approved tenant/company mapping. Add complete-scope diff support only with a proven frozen full enumeration; no delete-by-missing-in-page.
5. Implement synthetic mapper fixtures and canonical record/reject handling. Do not invent production mapping approval. Preserve fanout/component tombstones and snapshot date-change atomicity.
6. Implement frozen reconciliation persistence/reconstruction, group completeness and same-release/batch/report validation. Compare historical controls through batch_facts + fact_revisions, not current heads. Pending tolerances cannot auto-pass.
7. Implement PostgreSQL AnalyticsRepository behind the unchanged port: approved serving binding, registry/certification, strict tenant/policy predicates, NUMERIC aggregate pushdown, semantic snapshot/comparison/analysis parity, safe final JS-number conversion. Reject unsupported combinations and reporting/display currency mismatch.
8. Expand synthetic repository/engine parity and database failure/concurrency/security tests; add query bounds, pooling/timeouts and SQL execution evidence. Do not load tenant history into Node.
9. Wire local/CI migration checks and polish operational docs/CLI/lint. Run AGENTS.md's full frozen-install/lint/typecheck/test/build verification before any later push. No push or merge requested by this handoff.

No live source connector or all-source adapter implementation is authorized in this milestone. Keep operational integration disabled until required evidence and approvals exist.

## Pending decisions — not hidden or fabricated

Malik/source owner must approve integration boundary (dedicated direct Odoo, Engine with new read-only key, dedicated n8n endpoint, backend/Postgres interface or another source); authoritative business surface/report; tenant/company scope; stable identity/version and delete/freeze protocol; currency conversion/rounding; certified organizational dimension; pilot closed month and correction sample. Finance/business must approve values/count tolerances and mapping semantics. Identity/security/platform owners must approve production auth/policies, privacy/retention, source limits, backups/RPO/RTO and operational rollout.

First pilot: one tenant and approved sales basis; revenue/net_revenue/order_count; monthly plus one certified organizational dimension, branch only if supported; closed month + correction + second-tenant control. Current catalog does not permit revenue × warehouse: do not silently expand it based on source fields.
