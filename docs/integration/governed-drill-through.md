# Governed mart drill-through

Implemented 8 October 2026; runtime composition enables the detail port in PostgreSQL mode. No source connection, SQL from the browser, runtime model, export or source verification is involved. Existing working-tree changes to operational UX and dimension discovery are preserved.

## Entry and context

KPI cards reserve a visible footer for View details; intrinsic reading height preserves long labels and values at narrow widths. Event requests require a concrete resolved date range; the endpoint never manufactures a total for a null all-time summary. Table numeric cells retain numeric typography and offer an understated keyboard-accessible detail action. Admitted bar marks and line points support pointer, Enter and Space activation with business-label accessible names and focus indicators; every chart exposes the same actions through its precise-value table. Unsupported metrics, categorical dimensions outside the initial governed drill scope, or transformed values have no drill action. Comparison, running total, moving average and percentage-contribution outputs are deliberately excluded rather than reinterpreted as additive facts. Ratios in scope show separately named numerator and denominator facts.

The frontend captures the execution's resolved viewer dates and complete business filters, the actual clicked identity (never its display label), successful series release and source-as-of timestamp. Time points narrow the date range within the viewer selection. Business filters and clicked filters are ANDed, including repeated dimensions. Closing the native detail dialog preserves the parent report and unsaved viewer state. Execution, tenant, identity or locale changes remount the viewer and discard the old detail session.

The global Metric Catalog uses the shared information icon beside available business metric labels: hover/focus shows the short definition, click/tap opens the full definition. Canonical IDs are absent from catalog rows. Planned entries remain labelled planned until canonical definitions exist. The detail search input and Apply search share an aligned, responsive row in both directions. Closing a chart detail restores focus to the corresponding mark even when React has replaced its SVG node.

## HTTP and authorization

`POST /api/analytics/drill-through` accepts a strict semantic request:

```json
{
  "query": {
    "metric": "net_invoiced_revenue",
    "dateRange": { "from": "2026-09-01", "to": "2026-09-30" },
    "filters": [{ "dimension": "salesperson", "values": ["internal-governed-identity"] }]
  },
  "release": "originating-series-metadata.release.datasetId",
  "sourceAsOf": "2026-10-08T00:00:00.000Z",
  "clicked": { "dimension": "business_line", "values": ["internal-governed-identity"] },
  "limit": 50,
  "sort": { "field": "date", "direction": "desc" }
}
```

Optional `cursor` and `search` are bounded to 2,000 and 100 characters. Limit defaults to 50 and cannot exceed 100. Safe sort fields are date, amount, customer and salesperson in either direction. Search is a literal customer-name substring; references are unavailable in existing facts. No table/column/SQL/where-clause input exists.

The route resolves current membership and data readiness, requires dashboard:view and analytics:query, then the application service checks metric-domain authorization on every request/page. The repository validates the semantic query against certified capabilities, ANDs viewer/clicked filters with server policy filters, and executes through the read-only tenant transaction with forced RLS. Unsupported Finance scope dimensions fail closed. This uses the same metric/data permission boundary as the existing semantic query endpoint; it does not grant access to a saved dashboard record.

The response contains bounded business rows, `hasMore`, optional opaque `nextCursor`, `release`, `grain`, optional `snapshotAsOf`, exact decimal `bases` and `value`. It does not return fact keys, source IDs, component IDs or source record IDs. Governed names use the shared neutral fallback for absent/unsafe labels.

## Event reconciliation and consistency

Supported event metrics: Order Revenue, Order Count, Posted Invoice Value (invoiced_revenue), Refund Value, Net Invoiced Revenue, Invoice Count and Refund Count. Existing Average Confirmed Order Value and Average Invoice Value expose their supporting operands.

Migration 035 retains partition → immutable canonical fact-revision membership and an exact, immutable readiness record. Publication locks freeze that membership and require exact measure/date/dimension totals and counts matching the daily aggregates, including signed values. Partial refresh copies only verified unaffected fact membership; otherwise it rebuilds the month. Rows come from those canonical revisions, not serving aggregate rows or mutable fact heads.

Both release and originating source-as-of must still match the current trusted state inside one repeatable-read transaction. Even an unchanged synchronization that advances the source cutoff invalidates an old detail context. A mismatch returns `409 DRILL_RELEASE_CHANGED`: close details and Refresh View. One page cannot mix releases; subsequent pages fail instead of silently switching. Dates use the same published coverage intersection as summary serving; missing monthly membership fails closed. No summary-null period is presented as a complete zero result.

Existing partitions are linked by migration only if current canonical heads reproduce their complete exact aggregates. Incompatible old partitions remain unavailable; they are never reconstructed by guessing historical revisions. The new migration must be applied offline by the publication operator before runtime startup; the local staging mart has applied 035–037 with checksum/readiness verification; no external database was migrated.

Detail business fields are recognition date, Customer, Salesperson, Business Line, document type, status, supporting measure, contribution and reporting currency where stored. Count facts need not carry currency. Business document references are not present in TransactionEvidence, so no internal ID is substituted. Refunds retain their own issue-date recognition. Exact decimal sums reconcile per measure; ratios use total numerator / total denominator, never averages of row-level ratios.

## Finance snapshot semantics

Receivables uses immutable published `finance_snapshot_customers.actual_values` at the originating effective snapshot: latest trusted snapshot at or before the selected end date. Customer filters and policy intersection apply before returning rows and totals. Bucket metrics select their signed balance column. A balance is never accumulated across snapshots. A September 30 snapshot selected by an October 8 end date displays As of September 30.

Finance trend metadata now includes `drillReleases` per point, so an earlier month drills to that month's publication rather than the latest trend snapshot. A pinned, immutable published Finance snapshot remains usable if another publication appears; source-as-of changes do not mutate that snapshot.

Current published Finance evidence retains customer vectors, not document/accounting-line components. The UI explicitly describes customer snapshot grain and the absence of retained document detail. Accounting date, due date, document reference and individual signed residual cannot be invented. Source reconstruction during a request is excluded. Accounting-line drill-through requires a separately governed component snapshot publication in a future task.

## Pagination and operations

Keyset continuation uses the governed sort value plus an internal unique fact/customer-measure key under deterministic binary collation. The key is authenticated and encrypted; its identity binds tenant, policy scope, locale, release, source cutoff, metric, dates, filters, clicked context, search and sort. Tokens expire on API-process restart. Tampering/context changes fail closed. There is no row cache or COUNT(*) requirement. SQL computes full-context aggregate bases while returning only limit+1 rows; React loads further rows only on explicit user action. Search narrows displayed records while the summary/bases continue to describe the full drilled context.

Migration 036 indexes `(tenant_id,fact_key,revision_id)` on immutable membership for the reverse lookup required by revision RLS. Live local staging acceptance exposed a statement timeout without this index; 035 remains unchanged. Primary keys support partition membership. Local synthetic benchmark evidence and visual/interaction checks are in the [acceptance report](../qa/drill-through-2026-10-08.md). Synthetic timings are not production p95 or a live customer-data benchmark. See the [local staging acceptance](../qa/drill-through-local-staging-2026-10-08.md) for migration, refresh transport and authenticated runtime evidence.

## Event drill performance

Migration 037 adds stored generated measure/date projections to immutable fact revisions and a `(tenant_id,measure_id,business_date,fact_key,revision_id)` index. The payload remains authoritative; no policy, grant or history mutation is changed. Business dates retain the validated canonical ISO representation. After migration, the operator runs `ANALYZE mart.analytics_fact_revisions` before runtime acceptance so the planner has range statistics.

The event query scans the indexed measure/date range, then probes exact revision membership in the pinned release's selected monthly partitions. The partition array is an uncorrelated PostgreSQL initplan within the same repeatable-read snapshot. `OFFSET 0` keeps the membership check correlated so the optimizer cannot drive the query from all published facts. Both revision and membership reads still enforce their existing forced RLS. Readiness checks still require every covered month and its exact lineage evidence; release/source cutoff mismatch still fails closed.

One materialized eligible projection now supplies both exact full-context supporting bases and the bounded ordered page in one SQL statement. Search and continuation affect only page rows. Decimal strings, ratio/null behavior, encrypted context-bound cursors, safe sort choices and Finance snapshot grain are unchanged. JIT is disabled only for the drill transaction to avoid compilation overhead; statement deadlines remain unchanged and pooled settings reset at transaction end. No row cache, source request, count query or elevated runtime privilege is introduced.

Real local staging timings and plan evidence are recorded in [event drill performance acceptance](../qa/drill-through-performance-2026-10-08.md). These are sequential local observations, not production p95 or sustained concurrent-load guarantees.
