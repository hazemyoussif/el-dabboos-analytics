# Operational analytics v1 — implementation status

This is an **incomplete implementation milestone**, not an operational release.
The preserved September binding/certificates and historical collection are still
serving. No source synchronization, presence sweep or aggregate promotion was
run against the local historical data during this change. No deployment, push,
merge, external scheduler or source mutation was performed.

## Historical queries

`HistoricalAnalyticsRepository` preserves the original certified anchor path.
Historical event collections now support event ratios as well as additive
metrics. Every member must independently certify the ratio output and both
operands, with compatible mapping semantics and policy dimensions. The query
sums exact PostgreSQL numerator and denominator bases before division; it never
averages monthly averages. The collection exposes only the intersection of
independently approved capabilities, and refuses ranges beyond coverage.

For snapshot summaries, the latest independently governed month-end cutoff at
or before the range end is selected. Explicit monthly trends sample each cutoff
once. Categorical snapshot queries retain their grouping and filters. Snapshot
results report `snapshotAsOf`; web rendering displays an English/Arabic as-of
label. A published historical coverage notice accompanies normal view filters.
The new `last_90_days` preset follows inclusive tenant-local calendar arithmetic,
through the same canonical spec, patch and query validation paths as other
presets. A preset extending beyond the available history fails instead of
silently clipping. History currently ends September 30, 2026: presets ending
in October are consequently not fully covered.

## Deterministic lifecycle foundation

`AnalyticsOperations` is an application use case with explicit source and
transaction ports. It orchestrates candidate ingestion, impact resolution,
reconciliation, affected refresh, trusted promotion, cursor write and audit.
A mismatch preserves the previous trusted release and durable cursor. A
transaction failure rolls back all writes, including a late cursor/audit failure.
Source closure happens before transaction commit so cleanup failure cannot
turn a committed sync into an apparently failed job. Zero-change runs skip
reconciliation and aggregate refresh. These behaviors are tested using an
isolated transactional synthetic adapter; they are **not yet wired to a
production PostgreSQL job adapter**.

The shared domain impact resolver compares both active revisions. It identifies
old/new business months and supported old/new dimension identities. The semantic
catalog discovers dependent metric outputs, including ratios. Materialized
moving-average windows, running totals, future YoY comparisons and contributions
have explicit invalidation footprints. A contribution denominator change
invalidates the whole period's contributions. Derived group outputs retain
their affected dimension identities.

A snapshot dependency callback is mandatory: an adapter must explicitly prove
which cutoffs remain dependent on a corrected invoice/payment/credit or entity
snapshot. There is no default that silently ignores snapshot propagation.
The concrete receivables dependency adapter remains outstanding.

A synthetic October source correction of a January invoice tests old/new
salespeople, January reconciliation and affected refresh before promotion. It
also tests preservation of the trusted release on mismatches and failures in
ingestion, reconciliation, refresh, promotion, cursor write and audit. This is
application-port evidence, not proof of actual Odoo-to-mart synchronization.

## Source cursor foundation

Odoo paging retains composite modification identity `(write_date, id)` and its
existing deterministic revisions, including lookup modification identity where
already governed. Source SQL now also applies the retained snapshot's explicit
upper cutoff. The scope supports a trusted modification lower bound; it never
uses a business date as a cursor. Incremental mode retains records whose business
dates moved outside the original backfill window, enabling full replacement and
tombstone mapping rather than leaving an old contribution active.

`odooIncrementalWindow` starts at the previous successful source cutoff minus a
configurable overlap (default 120 seconds), with ID zero at the lower timestamp
boundary. Page ties remain strictly ordered by modification time and record ID.
The overlap is inclusive discovery, not a durable cursor advancement. It is
intended to run under a bounded retained PostgreSQL read-only snapshot. Backward
cutoffs and invalid bounds are refused. The durable cursor must advance to the
bounded source cutoff only after the complete transactional lifecycle succeeds.

A fixed overlap is **not a proof against arbitrarily long source transactions**
whose write timestamps precede the overlap. Production wiring needs a validated
source transaction/watermark policy plus broader deterministic content sweeps;
a presence-only identity sweep cannot repair that condition. No exactly-once
source-discovery claim is made at this milestone.

## Stored reconciliation and status

Migration 026 adds append-only `mart.analytics_operation_runs` referencing the
existing `mart.reconciliation_evidence` case IDs. It stores tenant, actor,
trigger, timestamps, cutoff/revision, mapping/definition versions, changed and
partition counts, case/mismatch counts, evidence hash and serving identity.
It does not replace the existing reconciliation or certification system.

Database guards require a complete unique case set, exact approved zero-tolerance
controls, matching frozen source revision, matching batch cutoff, and a hash
computed from persisted case content. Old certificates are not updated.
`analytics_source_cursors` only accepts successful sync evidence with the exact
same cutoff; cutoffs cannot regress. These tables use forced tenant RLS. Runtime
credentials receive SELECT only. The evidence/cursor helpers take the job's
own `PoolClient`; they never open nested transactions.

After explicitly applying migrations with the existing mart migration process:

```bash
pnpm analytics status --tenant el-dabboos-iq
```

The command permits only a loopback PostgreSQL URL and verifies the dedicated
read-only runtime role. It reads stored latest evidence, the last successful sync,
source cursor, preserved certification binding and historical coverage. The API
provides the same read-only projection at `GET /api/analytics/status`, after
membership and analytics permission validation. It never contacts Odoo,
calculates reports or reconstructs a certification proof. Synthetic composition
without this adapter returns explicit unavailability; it does not invent status.
Freshness target is 600 seconds by default and configurable in the adapter/CLI.
The API composition currently uses that default. Age/trust-state calculation and
operational presentation remain outstanding.

## Work still required before operational release

1. Implement the concrete source/job/PostgreSQL transaction adapters, including
   durable failure and in-progress audits, overlap discovery, existing active
   revision comparison and idempotent candidate retries.
2. Introduce pinned trusted serving revisions and governed partition aggregates,
   maintaining the previous usable trusted state on failures. Do not write into
   the certified September datasets or invalidate their proof caches.
3. Implement affected/current, daily and deep reconciliation scopes against
   independently retained source controls using the existing certification path.
4. Implement receivables snapshot dependency propagation, settlement bounds,
   line/payment/credit discovery and affected snapshot reconstruction.
5. Implement complete-scope identity/content sweeps and governed tombstones;
   preserve immutable source/canonical revision history.
6. Wire admin-authorized Sync Now, Reconcile Now and Verify Against Source to
   those same jobs. Add actual privilege and tenant isolation regressions.
7. Implement governed canonical-mart detail pagination, trusted-release policy
   scopes, source comparison controls and bilingual operational trust details.
8. Remove ordinary-read certification reconstruction fallbacks through validated
   immutable stored proof projections. This milestone does not change those
   existing historical proof checks.
9. Collect actual September/6/12-month report timings, no-change/small-batch sync,
   affected reconciliation and aggregate refresh timings, plus EXPLAIN ANALYZE
   evidence. The small synthetic range test's timings are diagnostic only.
10. Separate logical local commits from the pre-existing uncommitted historical
    work and complete final full application/browser acceptance.

Only the status command is currently runnable. **No `analytics sync`,
`analytics reconcile` or `analytics sweep` command is implemented yet.** Do not
schedule nonexistent commands. Future cadence remains approximately five-minute
incremental/affected refresh, nightly strong reconciliation, daily presence
sweep, and periodic deep certification. n8n may trigger repository-owned jobs
or notifications only; formulas, mappings and cursor logic remain in this repo.

Runtime pipeline LLM dependency = zero in the new job/source/impact/evidence
foundation. The complete operational runtime pipeline is not delivered yet.
