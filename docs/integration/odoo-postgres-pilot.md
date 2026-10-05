# Odoo PostgreSQL September comparison pilot

The user approved company `1` → tenant `el-dabboos-iq`, source `el-dabboos-odoo18-pg`, September 2026, and a combined comparison mapping with separately governed order and invoice measures. [ADR 029](../architecture/adr/029-ingestion-certification-lifecycle.md) owns the lifecycle. This is an adapter to the existing mart, not a second ETL system. No live source connection, live pilot load, approval or serving binding has been performed during implementation. The [implementation handoff](odoo-pilot-handoff.md) records verification.

## Certification and extraction

Register an immutable `pending` mapping → ingest candidate pages → complete both logical extractions → reconcile exact mapping/version and all pages → capture authoritative Invoice Analysis evidence → approve certification metadata → request explicit serving authorization. Changes to mapping contents require a new dataset release and new reconciliation. Old revisions and reconciliation cases remain immutable.

One logical run owns one source object, company scope, mapping release, business period and certified source freeze. Each atomic write has at most 1,000 source records. Keyset pagination uses `(effective write timestamp, id)` with microsecond precision; no offsets. The effective timestamp includes joined dimension updates so a rename creates a new immutable revision while stable IDs remain unchanged. The reader fetches one extra row to detect a terminal page; it never writes that extra row in the current page. The page transaction commits revisions, links and checkpoint together. Retry the same manifest to resume from the last committed cursor. Do not change its source freeze or scope. A final empty page is valid. Incomplete runs cannot reconcile or serve, including through runtime access to underlying revision/batch tables. During incomplete corrections the last completed revision remains visible.

Completion evidence persists source/company, mapping ID/version, period/objects, initial/final cursor, pages/rows, source-as-of, frozen revision, certified freeze reference and completion time. Per-page ingestion evidence retains accepted/rejected rows, revision counters and timestamps. The source freeze must be an externally certified immutable replica/snapshot that survives restarts. A moving replica plus a write-date upper bound does not prove repeatable extraction. The application does not create source snapshots or tunnels.

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

Required source keys: `ODOO_SOURCE_HOST`, `ODOO_SOURCE_PORT`, `ODOO_SOURCE_DATABASE`, `ODOO_SOURCE_USER`, `ODOO_SOURCE_PASSWORD`, `ODOO_SOURCE_COMPANY_IDS`. Bounds: `ODOO_SOURCE_CONNECT_TIMEOUT_MS` (default 5000), `ODOO_SOURCE_STATEMENT_TIMEOUT_MS` (15000), `ODOO_SOURCE_BATCH_SIZE` (500, maximum 1000). Company IDs must be exactly `1` for this pilot.

Use separately provisioned `MART_MIGRATOR_URL` for migrations/candidate registration and `MART_INGESTOR_URL` for ingestion/reconciliation/status. Runtime continues to use its own `MART_RUNTIME_URL` and existing runtime bounds. None of these credentials belong in the manifest, command line or Git. Mart roles/migrations are administered separately using [mart operations](postgres-mart-operations.md); never run them against Odoo.

The source identity must be a dedicated SELECT-only service role, with no superuser/BYPASSRLS/role/database/schema creation or source-table write rights. The application verifies these privileges and uses read-only transactions. It does not provision that role. Do not use the Odoo application identity.

## Manifest and commands

Keep an operator manifest outside Git, containing exactly `mapping` and `run`. Supply real owner/certification references locally; the placeholders below are not evidence. Create two manifests with the same mapping identity and frozen snapshot, separate extraction IDs and source objects (`sale_order`, `account_move`).

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
  "run": {
    "tenantId": "el-dabboos-iq",
    "sourceId": "el-dabboos-odoo18-pg",
    "companyIds": ["1"],
    "datasetId": "operator-chosen-immutable-comparison-release",
    "mappingId": "operator-chosen-mapping-id",
    "mappingVersion": "operator-chosen-version",
    "extractionId": "operator-chosen-september-orders-run",
    "sourceObjects": ["sale_order"],
    "from": "2026-09-01",
    "to": "2026-09-30",
    "sourceAsOf": "REPLACE_WITH_CERTIFIED_UTC_ISO_TIMESTAMP",
    "frozenRevision": "REPLACE_WITH_IMMUTABLE_SNAPSHOT_REVISION",
    "freezeReference": "REPLACE_WITH_OPERATOR_CERTIFICATION_REFERENCE",
    "completeness": "complete_scope"
  }
}
```

From repository root, register once, then ingest/resume and reconcile each completed object:

```bash
pnpm odoo:pilot register /path/outside-git/orders-manifest.json
pnpm odoo:pilot ingest /path/outside-git/orders-manifest.json
pnpm odoo:pilot status /path/outside-git/orders-manifest.json
pnpm odoo:pilot reconcile-db /path/outside-git/orders-manifest.json
pnpm odoo:pilot ingest /path/outside-git/invoices-manifest.json
pnpm odoo:pilot reconcile-db /path/outside-git/invoices-manifest.json
```

The DB control reader independently aggregates governed source headers overall/by Business Line/by salesperson. The existing frozen reconciliation harness evaluates completed-run mart revisions against these controls with exact equality. The command outputs safe checkpoint/result metadata, never credentials/customer labels. Failure prints a generic message and leaves the durable checkpoint for status/resume. These commands contain no approval, binding, source migration or arbitrary SQL operation.

## Remaining release gates

Live extraction is blocked until local source/mart configuration and the immutable snapshot reference/source-as-of are supplied. Confirm the live schema/custom geography and owner before registering the actual candidate. Compare the live mart to independently derived DB controls; known candidate numbers belong only to fixtures/control evidence.

Then capture Odoo Invoice Analysis company/date/filters/measure/invoice-refund/tax basis and overall, Business Line and salesperson totals. Store case IDs against the exact candidate and completed invoice extraction. A difference requires investigation, never editing the mapped total. This document records no authoritative reconciliation result. Mapping approval uses explicit passing evidence and updates certification metadata only. **Do not create or activate a production serving binding until authoritative reconciliation passes and the user explicitly approves serving.** Browser/product QA with real served data belongs to that later step.
