# Products & Warehouses

Updated: 25 October 2026. The owner subsequently authorized verification, push and
deployment. Initial local gates passed (1,005 unit and 451 PostgreSQL tests, zero
skips). The first company browser check exposed a default-date mismatch with
existing published coverage; a regression test now protects coverage-based defaults.
See the QA handoff for exact release verification. The original six-table report
is deployed at `2316d6677a8d4c7432a97fb7c4ea4303e8029faf`. The availability
extension below is a local candidate; migration 097 and its source observation have
not been applied to the company mart. See [extension verification](../qa/inventory-availability-2026-10-25.md).

## Published-mart readiness correction — 26 October

A successful result from an accepted mart revision with its existing publication reference is usable even when the optional coverage field is omitted. Explicit partial/unavailable coverage, source errors and missing publication evidence still remain unproven. The report's metrics, dates, filters and permissions are unchanged. This removes the redundant report-status condition that left valid mart rows labelled unproven.

## Independent dashboard

`/reports/products-warehouses` is a separate management-report destination with its
own navigation entry, bilingual copy and filters. It is not part of Sales Command
Center. `POST /api/reports/products-warehouses` validates its closed input and uses
the application-owned `ProductsWarehousesReport` composition. Ordinary portable
DashboardSpec v2, AI plans and explicit Save/version semantics are unchanged.

The reference repository `hazemyoussif/dabboos-product-dashboard-local` remains at
`7e40ff15169190eb2a049e488832a104a97f900f`. Its warehouse page and migrations 070/071
use current on-hand minus reserved, not forecasted stock. Its category caption is
"agency", but the source field is product category. This implementation retains
Product Category and Product Brand under their governed meanings.

The source connection is restored. Read-only checks on 25 October found current
partner owner/state, actual tags and their relation, quant/reservation/cost, and
forecast-move fields. This supersedes the historical source-refusal note in the
initial handoff. Field availability does not certify the entire live database
against the previously accepted analytics baseline. Source timers remain owned by
the separate operational workflow; this extension changes none of them.

## Implemented code scope

| Section | Existing canonical metric | Meaning |
| --- | --- | --- |
| Inventory | `internal_stock_quantity` | Current company-owned internal on-hand by product, negative positions retained |
| Inventory candidate | `reserved_stock_quantity` | Current company-owned internal reservations |
| Inventory candidate | `free_stock_quantity` | On-hand minus reserved, clamped once after product/warehouse reduction |
| Inventory candidate | `free_stock_value` | Free quantities times current company standard cost |
| Inventory | `expired_stock_quantity` | Positive stock with known expired lot date |
| Inventory | `near_expiry_stock_quantity` | Positive stock expiring within two calendar months, not a fixed 60-day interval |
| Inventory | `unknown_expiry_stock_quantity` | Positive stock with missing expiry evidence |
| Invoice sales | `invoiced_product_quantity` | Posted invoice quantities minus credit notes, in product base UOM |
| Invoice sales | `period_net_sales` | Signed posted product invoice subtotals, excluding tax |

Every reading is an independent canonical product table. No incompatible product
units are added into a headline total. Quantity and money remain separate tables.
The existing renderer supplies value formatting, definitions, result-window search
and paging, drill-through and Excel export of loaded rows. Paging, search and metric
definitions were exercised in the synthetic browser fixture; manual Excel download
and full keyboard traversal remain separate pending checks.

Product, product-category and brand filters apply to both sections. Warehouse
selection applies only to inventory. Customer, invoice salesperson and invoice
governorate filters apply only to invoice sales; the UI explicitly distinguishes
them from current customer-owner/address attribution. Unsupported user or enforced
policy dimensions never disappear from a query to make it executable.

The preferred sales period is tenant-local month-to-date. When that is not
published, the default is the latest available published month or partial month,
shown explicitly in the date controls. Explicit user dates are never silently
clipped. Each stock metric independently defaults to its latest published cutoff
at or before tenant-local today; a new availability observation cannot move an
older on-hand/expiry recipe's date. `metadata.stockRequestedAsOf` retains today's
requested ceiling; each reading retains its effective period. Changing
sales dates never claims to recreate historical inventory. Each table retains its
own actual snapshot/source-as-of/data-through and Finance-review evidence. An old
inventory cutoff is called out. Refresh rereads accepted analytics only.

## Serving and authorization

Composition reuses the existing repository and `consistentAnalyticsExecution`,
with one pinned initial revision, one shared read budget and whole-response retry
on a revision change. Canonical validation, actor metric authorization and exact
published metric/group/period/filter checks precede each initial read. Tenant
profile and publication ownership are checked. Enforced filters are preserved.
Generic table continuation uses the existing authorized result-window endpoint.

The inventory extension adds three canonical snapshot operands in migration 097
and a versioned `business_stock_availability_v1` source recipe. Existing Business
and Sales Command definition fingerprints and accepted rules remain unchanged.
The additive mapping requires an accepted extended Business member; it never
initializes unrelated Command recipes or rewrites the original Business mapping.

The explicit protected operator is `pnpm analytics observe-inventory --tenant TENANT
--month YYYY-MM`. It accepts the current source month only and uses the configured
read-only source lease, existing Business identity discovery/replacement, exact
controls, prepared datasets and immutable publication. Complete observations remove
disappeared positions. Unrelated recipes retain their accepted data and observation
clocks. Ordinary report refresh and timers never invoke this operator.

Warehouse attribution uses a unique company-scoped ancestor; unknown/ambiguous
warehouses remain unassigned. Other companies, consigned owners and non-internal
locations are excluded. Negative positions participate before reduction; null
quantity/reservation and negative reservations fail validation. Free quantity is
clamped after combining all quant positions per product and warehouse, then summed
within compatible product units. Valuation uses the company JSON cost, then its
company/global field default and Odoo's Float zero default; unresolved user-specific
fallback is rejected. A zero free quantity has zero value without inventing a cost.
The restored source has no configured cost defaults; 13 stocked products lacked an
explicit company JSON entry during inspection. See [Odoo 18 field behavior](https://github.com/odoo/odoo/blob/18.0/odoo/fields.py).

No runtime source request, raw-history fallback, new serving architecture or
scheduler is introduced. New metrics remain unavailable until their own prepared
capabilities are published. Synthetic mode remains explicitly a demo.

## Customer product coverage

The independent report includes a separate prepared customer/product section with
calendar year, current customer salesperson, current governorate, actual Odoo tag,
customer and All / Sold / Unsold filters. Product/category/brand selections also
apply when coverage filters are applied. Warehouse and invoice date/attribution
controls keep their existing scope; coverage uses all company warehouses and a
calendar year through its own frozen source business day.

Eligibility is **forecasted quantity > 0**, with configured display-category roots
and their descendants excluded. Forecast uses company-owned stock, pending move
incoming/outgoing, final destination and product UOM rounding. Signed posted
invoice/credit quantities are converted to each product's base UOM before classifying
each customer/product. Positive net is sold; zero, negative, fully returned and
never-purchased pairs are unsold. Customers require posted product lines in the
selected year, including customers whose purchases are all outside eligibility.
Purchased products outside the eligible list are counted separately for review.
Actual tag membership is an EXISTS predicate, never a multiplicative sales join.
Computed Class A and source segments are not substitutes for actual tags.

[ADR 045](../architecture/adr/045-prepared-population-completion.md) extends the
existing prepared lifecycle with bounded population completion. Source inputs stay
sparse; zero pairs are created and independently checked in background chunks.
A revision cannot seal until all required population definitions have sealed
bindings. Runtime reads only those prepared pairs and prepared attribute dictionaries,
with forced tenant RLS, application metric-domain authorization, every enforced
predicate and revision/filter-bound pagination. Unsupported policy dimensions fail
closed. Neither source access nor Cartesian expansion occurs in a report request.

## Standard API compatibility and operator sequence

The verified API branch's deployed migrations 095/096 are preserved. This feature
uses 097 for inventory measures, 098 for sparse coverage inputs and canonical
dimensions, and 099–101 for completion storage/build/proof guards. No existing
migration is rewritten on the company server. Shared semantic definitions live in
mart_admin; all tenant content has forced RLS and immutable accepted publication.

The standard API projection adds reserved_quantity, standard_price,
location_final_id and restrict_partner_id. Standard price is read in the authorized
company-1 context after Odoo resolves company-dependent defaults. API recipes do
not query ir_default or ir_model_fields. Explicit zero cost remains zero; absent
API cost for positive free stock rejects certification. The direct-source recipe
retains its original controlled default semantics. Source mode remains
odoo-orm-observed; no direct ERP database fallback is introduced.

After local verification and schema/role deployment, capture one compatible API
input through the existing stage:capture operator. Previously accepted input schemas
and serving publications remain immutable. Do not replay completed Business,
review, Finance or core updates. Publish only the genuinely new stock recipe with
`analytics observe-inventory --tenant ID --month YYYY-MM`; then use
`analytics capture-coverage --tenant ID --month YYYY-MM --basis-file /protected/basis.json`.
The basis contains version 1, explicit years, source-resolved display category IDs,
and forecast "positive". The existing Command background worker resumes sealed
capture pages, ordinary preparation, completed-pair chunks and publication. It does
not require a live source during replay. Existing finite bounds remain unchanged.

Keep the shared job locks for deployment/capture, preserve active timer configuration,
and retain PostgreSQL's original volume plus the tablespace override/mount. Five-minute
sync consumes the latest daily API capture; this is not five-minute live Odoo polling.
New coverage retains its own source receipt and business day, independently of old
stock, sales, Finance and other report cutoffs. A successful code rollout alone is
not acceptance: verify complete prepared coverage, real filters, locale behavior,
existing reports and subsequent ordinary scheduled sync.

Current verification and deployment status is recorded in
[coverage QA](../qa/customer-product-coverage-2026-10-26.md).
