# Unified serving core

The runtime resolves a tenant through `mart.analytics_trusted_serving.revision_id`.
`analytics_serving_members` is the complete immutable manifest. Its key is tenant,
revision, month and family. `facts` retains the existing daily event and summary
snapshot bases; `receivables` references immutable exact customer snapshot evidence.
Historical/current describes provenance and coverage, not another serving authority.

A candidate copies unchanged members and replaces affected partitions. Operational
candidates retain source discovery, overlap, reconciliation, cursor and failure
transactions. Snapshot candidates share the tenant writer lock and parent check.
The trusted pointer changes in the same transaction as evidence and membership.
Failed reconciliation or a lost source lease rolls back the entire candidate.

Capabilities come from approved definitions and exact evidence attached to trusted
partitions. Late certificates do not expand an already trusted revision. Summary
aging does not certify customer grouping. Exact customer vectors supply the customer/month dimensions declared by the semantic
catalog, independently of company-summary baseline dimensions. Customer queries and
discovery read only those trusted customer vectors; company summaries cannot supply
customer rows. Snapshot month trends retain the governed calendar projection. Analyses are restricted to the approved capability and executor support.
Customer snapshots require independent
customer controls, exact customer-to-company totals, closed signed buckets and
month-end dates. Summary queries choose the latest eligible trusted snapshot;
customer queries select only customer evidence. At the same date, customer evidence
supersedes the summary grain rather than being summed with it.

## Migration 040

The SQL extension and adoption data step execute on the migration runner's same
connection and transaction, before ledger version 040 is recorded. The version-specific
`040_unified_serving.adoption.cjs` companion is a self-contained bundle of adoption
and its application dependencies, frozen before deployment. Version 040's SHA-256
fingerprints the SQL, companion filename and full companion bytes as a JSON object;
the runner executes those same loaded bytes. Other SQL migration fingerprints remain
unchanged. Runtime bootstrap code changes cannot alter applied adoption behavior.
Do not regenerate the companion after deployment; changes require a new migration.
The pre-deployment companion was generated from `operational/adoption.ts` using
esbuild 0.28.2 with `bundle: true`, `platform: node`, `format: cjs` and tree shaking.
Use the migration runner, not an isolated execution of the SQL file. No source
connection is opened. Adoption validates stored business and zero-tolerance
reconciliation certificates, imports existing canonical facts, verifies current
heads match trusted content, rebuilds exact aggregates and preserves operational
cursors. Historical event/aging members and existing published customer snapshots
are attached to the existing manifest model. FORCE RLS is restored within the
migration transaction, and constraints are checked under each tenant's scope.

Incompatible definition versions, currencies, source mappings or pending heads
that differ from trusted content abort adoption. Resolve those explicitly; do not
rewrite applied migrations or reread Odoo as an automatic workaround.

`analytics bootstrap --tenant ID` initializes directly from approved certified
mart datasets. Historical publication/activation and filesystem receipts are not
prerequisites. Existing `analytics sync --tenant ID` continues the incremental
candidate lifecycle. `scripts/integration/finance-snapshots.ts` now reads customer
and company controls from one retained source snapshot and promotes through the
same trusted pointer. `scripts/integration/historical-import.ts` extends an established manifest from
explicitly approved, exact certified whole-month datasets. Migration 041 adds
immutable import checkpoints and preserves narrower prior partition capabilities
on operational replacements. Complete daily tuple/count parity, aggregate/drill
proof and parent CAS precede atomic publication; no cursor or baseline mutation
is performed. Extraction remains the existing bounded monthly source lifecycle.
See [hosted parity](hosted-historical-parity.md) and [controlled rollout](staging-loading-rollout.md).

## Rollback and deferred removal

No legacy data tables are dropped. Old historical members/bindings, certificates,
publication receipts, Finance publications, anchor capability rows and immutable
serving revisions remain available for investigation and restore. Restore a
pre-migration database snapshot together with the previous application for a full
rollback; simply running the old application would miss newer unified snapshots.
A future cleanup migration may remove obsolete bindings/anchor/publication tables
and legacy operator commands once rollback retention is approved. The legacy
historical repository remains for explicit compatibility tests, not API serving.
