# Products & Warehouses — offline implementation draft

Date: 24 October 2026. Status: **code only, unverified, not deployed**.
The owner declined tests, static checks and builds for this increment. No source
connection, source job, preparation, publication, timer change or company deployment
was attempted. This is not acceptance evidence or a source-parity claim.

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

The separate Sales Command Center chat's latest record says the saved sync was
accepted with 225,370 exact checks and zero mismatches, all 95 missing preparation
bindings completed, source cutoff 24 October at 12:24 PM Cairo. Fresh source
connections are refused and all three timers are paused. This is quoted session
context, not a new server check. September Command publication remains separate.
The code base for this increment is `298f1e3`; its unrelated files are preserved.

## Implemented code scope

| Section | Existing canonical metric | Meaning |
| --- | --- | --- |
| Inventory | `internal_stock_quantity` | Current company-owned internal on-hand by product, negative positions retained |
| Inventory | `expired_stock_quantity` | Positive stock with known expired lot date |
| Inventory | `near_expiry_stock_quantity` | Positive stock expiring within two calendar months, not a fixed 60-day interval |
| Inventory | `unknown_expiry_stock_quantity` | Positive stock with missing expiry evidence |
| Invoice sales | `invoiced_product_quantity` | Posted invoice quantities minus credit notes, in product base UOM |
| Invoice sales | `period_net_sales` | Signed posted product invoice subtotals, excluding tax |

Every reading is an independent canonical product table. No incompatible product
units are added into a headline total. Quantity and money remain separate tables.
The existing renderer supplies value formatting, definitions, result-window search
and paging, drill-through and Excel export of loaded rows. These integrations have
not been exercised for this new report.

Product, product-category and brand filters apply to both sections. Warehouse
selection applies only to inventory. Customer, invoice salesperson and invoice
governorate filters apply only to invoice sales; the UI explicitly distinguishes
them from current customer-owner/address attribution. Unsupported user or enforced
policy dimensions never disappear from a query to make it executable.

The sales period defaults to tenant-local month-to-date and can be changed. Stock
requests the latest accepted snapshot at or before tenant-local today; changing
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

No source adapter, mapping fingerprint, canonical metric definition, migration,
prepared dataset, raw-history fallback, serving SQL or scheduler is changed.
Unavailable sections remain unavailable; synthetic mode remains explicitly a demo
and is not a fallback for missing certified data.

## Work pending source recovery and verification

The requested sold/unsold coverage is **not implemented** by these invoice tables.
It must not be derived from the first result page, a Top-N list, net revenue or
missing stock/sales results. The page explains this and exposes no inert status
selector.

1. Add separately versioned canonical reserved/free-quantity and free-stock-value
   recipes through the shared background preparation mechanism. Reconcile the
   reference's product/warehouse reduction and clamping point, company-specific
   product cost, negative positions, missing cost, product eligibility and UOMs.
   Preserve the existing on-hand definition and previously accepted prepared data.
   The handoff's forecasted-stock export is a different universe; it cannot silently
   replace the reference page's free-stock basis.
2. Publish current customer owner and governorate plus actual Odoo partner tags
   using stable IDs. Preserve existing invoice salesperson/governorate semantics.
   Use tag membership as a predicate, avoiding fact multiplication for multi-tag
   customers. Tag A, computed Class A and provisional customer segments differ.
3. Prepare a complete available-product universe at an explicit snapshot plus
   complete signed customer/product invoice quantities over a configurable period.
   Exclude governed display-stand products using approved IDs. Customer population
   follows qualifying posted lines, including returns; the handoff excludes
   customers with no lines. Treat `net_qty > 0` as sold and `net_qty <= 0` as unsold,
   including fully returned products. Absence becomes zero only after complete
   authorized population/period evidence. No cross-customer summation before
   deciding an individual customer's status. No Cartesian expansion in a dashboard
   request. Add All / Sold / Unsold and coverage counts only against that accepted
   prepared population, with bounded customer/product result windows.
4. Keep the handoff's legacy two-year sugar/non-sugar A/B/C formula separate from
   existing calendar-YTD classification. This increment does not change either.

After separate verification approval, exercise application/API input rejection,
cross-tenant and metric-domain denial, enforced unsupported-filter refusal,
publication-change retries, partial/empty/error coverage, snapshot dates and
filter scopes using synthetic fixtures. Then run the relevant engineering gates
and the dashboard quality skill's AFTER review in Arabic/English, Light/Dark and
phone/tablet/desktop. No such checks were run in this increment.

After source recovery, reconcile the exact prepared grains and source cutoffs
before enabling new metrics. Company acceptance and deployment remain separate.
