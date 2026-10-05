# Odoo PostgreSQL September comparison pilot

The user approved company `1` → tenant `el-dabboos-iq`, source `el-dabboos-odoo18-pg`, September 2026, and a combined comparison mapping with separately governed order and invoice measures. [ADR 029](../architecture/adr/029-ingestion-certification-lifecycle.md) owns the lifecycle. This is an adapter to the existing mart, not a second ETL system. No live source connection, live pilot load, approval or serving binding has been performed during implementation. The [implementation handoff](odoo-pilot-handoff.md) records verification.

## Certification and extraction

Register an immutable `pending` mapping → ingest candidate pages → complete both logical extractions → reconcile exact mapping/version and all pages → capture authoritative Invoice Analysis evidence → approve certification metadata → request explicit serving authorization. Changes to mapping contents require a new dataset release and new reconciliation. Old revisions and reconciliation cases remain immutable.

One logical pilot run owns both source objects, company scope, mapping release, business period and a retained PostgreSQL snapshot. Each atomic write has at most 1,000 source records. Keyset pagination uses `(effective write timestamp, id)` with microsecond precision; no offsets. The effective timestamp includes joined dimension updates so a rename creates a new immutable revision while stable IDs remain unchanged. The reader fetches one extra row to detect a terminal page; it never writes that extra row in the current page. The page transaction commits revisions, links and checkpoint together. The service can resume the last committed cursor only under the same still-alive lease. The CLI closes its lease on any failure; a new CLI invocation requires a new extraction ID. Do not change the scope of an existing run. A final empty page is valid. Incomplete runs cannot reconcile or serve, including through runtime access to underlying revision/batch tables. During incomplete corrections the last completed revision remains visible.

Completion evidence persists source/company, mapping ID/version, period/objects, initial/final cursor, pages/rows, source-as-of, frozen revision, certified freeze reference and completion time. Per-page ingestion evidence retains accepted/rejected rows, revision counters and timestamps. The source owner holds a dedicated `REPEATABLE READ READ ONLY` transaction through all source pages and DB controls. Every page/control transaction imports the runtime-only PostgreSQL export token before source queries and verifies `pg_current_snapshot()`. `sourceAsOf` comes from PostgreSQL transaction time; `frozenRevision` fingerprints the actual descriptor under source identity. The descriptor is returned as durable completion evidence. The token is private and never persisted. Lease loss/expiry makes resume impossible; leave the old run incomplete and use a new extraction ID/snapshot. No descriptive string, write-date cutoff or persisted export token certifies repeatability.

Order pages remain incomplete while accounting pages and source controls are read. Final-page facts, terminal checkpoint and DB reconciliation evidence commit together in one bounded mart transaction; certification failure rolls all three back. Partial pages remain ineligible. Owner cleanup always rolls back/releases the transaction. It is never retained for Invoice Analysis, mapping approval or serving authorization.

## Source semantics

| Metric | Source eligibility | Date/value basis |
| --- | --- | --- |
| Order Revenue / Order Count | `sale_order.state = sale` | Local order date / total amount / one header |
| Cancelled Orders | `sale_order.state = cancel` | Local order date / one header |
| Net Invoiced Revenue | Posted `account_move`, customer invoice/refund | Invoice issue date / signed untaxed amount |
| Invoiced Revenue / Invoice Count | Posted customer invoice | Invoice issue date / positive untaxed amount / one header |
| Refund Value / Refund Count | Posted customer refund | Refund issue date / positive magnitude / one header |
| Average Confirmed Order Value | Governed Order Revenue / Order Count | Ratio after aggregation |
| Average Invoice Value | Governed Invoiced Revenue / Invoice Count | Ratio after aggregation |
| Customers Served | Eligible order customer IDs | Distinct identifiable outlets after policy/date filtering |

Refunds remain in their issue period. Order and invoice totals need not agree. Draft/done orders and draft/cancelled accounting moves explicitly tombstone their ineligible contributions. Incremental adapter reads scan changed company records across dates to tombstone transactions that moved outside the run's period; absence never implies deletion. The initial operator command deliberately permits only September complete-scope backfills; incremental reader/writer behavior is separately tested.

Amounts remain exact decimal text through mapping and numeric SQL reconciliation. Untaxed/tax/total, state, payment state and order/invoice-line bridge identities are retained as canonical evidence. Native currency must match the candidate's reporting currency; no implicit FX or zero-tax assumption is introduced. IDs use configured source identities; Business Line also includes company scope. Null salesperson remains Unassigned and contributes to company totals. Customer identity uses transaction partner, with no `is_company` filter. Source creator is never salesperson.

City/state support initial grouping. Area and optional stored latitude/longitude/shop GPS are retained without geocoding. The adapter reads optional JSON projections of stored partner fields (`latitude`/`partner_latitude`, `longitude`/`partner_longitude`, `gps_shop_location`/`shop_gps_location`); unavailable fields become null. Exact custom field names, source schema compatibility and stored values must be verified against the live replica before claiming complete geography coverage. Route relations/maps/collections are outside this slice.

Trusted tenant profile metadata can carry `preferredMetrics: { revenue: 'net_invoiced_revenue', average_order_value: 'average_confirmed_order_value' }`. The metadata provider preserves and validates these bounded preferences, and generation applies them before deterministic compilation. Saved canonical specs and demo semantics remain unchanged. No live profile is provisioned here, and the current administration HTTP configuration form does not expose these optional preferences; apply them through trusted metadata composition when the separately authorized serving tenant is provisioned. Explicit transaction metrics already appear in the shared bilingual catalog.

## Local operator configuration

`pnpm odoo:pilot` loads shell → repository-root `.env.local` → `.env`. `.env.example` documents placeholders. Tests load temporary synthetic config only. The externally managed SSH tunnel must expose localhost/127.0.0.1/::1; the application contains no SSH credentials or orchestration.

Required source keys: `ODOO_SOURCE_HOST`, `ODOO_SOURCE_PORT`, `ODOO_SOURCE_DATABASE`, `ODOO_SOURCE_USER`, `ODOO_SOURCE_PASSWORD`, `ODOO_SOURCE_COMPANY_IDS`. Bounds: `ODOO_SOURCE_CONNECT_TIMEOUT_MS` (default 5000), `ODOO_SOURCE_STATEMENT_TIMEOUT_MS` (15000), `ODOO_SOURCE_BATCH_SIZE` (500, maximum 1000), `ODOO_SOURCE_SNAPSHOT_MAX_DURATION_MS` (120000, maximum 600000). Two source connections are bounded separately to one owner and one worker; no SSH management is included. Company IDs must be exactly `1` for this pilot.

Use separately provisioned `MART_MIGRATOR_URL` for migrations/candidate registration and `MART_INGESTOR_URL` for ingestion/reconciliation/status. Runtime continues to use its own `MART_RUNTIME_URL` and existing runtime bounds. None of these credentials belong in the manifest, command line or Git. Mart roles/migrations are administered separately using [mart operations](postgres-mart-operations.md); never run them against Odoo.

The source identity must be a dedicated SELECT-only service role, with no superuser/BYPASSRLS/role/database/schema creation or source-table write rights. The application verifies these privileges and uses read-only transactions. It does not provision that role. Do not use the Odoo application identity.

## Manifest and commands

Keep an operator manifest outside Git, containing exactly `mapping` and `extractionId`. Supply the confirmed business owner and immutable candidate identity locally. Snapshot evidence and September/company bounds are derived by composition; no manifest snapshot strings or credentials are accepted.

```json
{
  "mapping": {
    "tenantId": "el-dabboos-iq",
    "sourceId": "el-dabboos-odoo18-pg",
    "datasetId": "operator-chosen-immutable-comparison-release",
    "mappingId": "operator-chosen-mapping-id",
    "mappingVersion": "operator-chosen-version",
    "businessOwner": "REPLACE_WITH_CONFIRMED_OWNER",
    "reportingCurrency": "IQD",
    "timeZone": "Asia/Baghdad"
  },
  "extractionId": "operator-chosen-new-september-pilot-run"
}
```

Register the candidate once, then execute both source objects and DB reconciliation in one retained-snapshot operation:

```bash
pnpm odoo:pilot register /path/outside-git/pilot-manifest.json
pnpm odoo:pilot run /path/outside-git/pilot-manifest.json
pnpm odoo:pilot status /path/outside-git/pilot-manifest.json
```

`run` owns snapshot opening, paged order extraction, posted customer invoice/refund extraction, same-snapshot source controls, atomic terminal-page/candidate reconciliation and finally cleanup. Independent `ingest` and `reconcile-db` commands are refused. A failed CLI run leaves incomplete history; create a new extraction ID for the next invocation. Only in-process service retries can resume with the original live lease.

The DB control reader independently aggregates governed source headers overall/by Business Line/by salesperson. The existing frozen reconciliation harness evaluates completed-run mart revisions against these controls with exact equality. The command outputs safe checkpoint/result metadata, never credentials/customer labels. Failure prints a generic message and leaves the durable checkpoint for status and diagnosis. These commands contain no approval, binding, source migration or arbitrary SQL operation.

## Remaining release gates

Live extraction is blocked until local source/mart configuration is supplied. Confirm the live schema/custom geography and business owner before registering the actual candidate; the application obtains actual PostgreSQL snapshot evidence when running it. Compare the live mart to independently derived DB controls; known candidate numbers belong only to fixtures/control evidence.

Then capture Odoo Invoice Analysis company/date/filters/measure/invoice-refund/tax basis and overall, Business Line and salesperson totals. Store case IDs against the exact candidate and completed invoice extraction. A difference requires investigation, never editing the mapped total. This document records no authoritative reconciliation result. Mapping approval uses explicit passing evidence and updates certification metadata only. **Do not create or activate a production serving binding until authoritative reconciliation passes and the user explicitly approves serving.** Browser/product QA with real served data belongs to that later step.
