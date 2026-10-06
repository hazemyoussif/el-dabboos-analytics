# El-Dabboos Odoo analytics capability discovery

Discovery completed on 2026-10-06. This document describes source evidence and future candidates. It does not approve a definition, reconcile a new combination, change mapping v1 or publish a capability. The structured [catalog](odoo-analytics-capability-catalog.json) is an integration artifact, not the canonical registry or a runtime allowlist.

## Scope and workspace

Branch `codex/production-pilot-lifecycle`; HEAD `0874648ecb18159d3c740c28b1aa3507798bc84e`, unchanged. The preceding capability-aware template task was stopped with uncommitted work. That work, the earlier Odoo changes and `.archify/` were preserved. This discovery adds only this report, its catalog and two scripts under `scripts/integration/`; it makes no application changes and creates no commit.

Actual source: database `accounting`, company **1**, company currency **IQD**, Odoo **18.0.1.3** (installed `base` metadata), PostgreSQL **16.15**. Access used the existing externally managed tunnel. No tunnel, source role or source configuration was changed.

Both schema and profiling executions use `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, verify `transaction_read_only=on`, and end with `ROLLBACK`, including on failure. Each phase has its own snapshot; these are not one atomic snapshot across phases. Source observations and exact timestamps are in the catalog. The connection account's broader privileges do not replace this explicit transaction restriction.

September means `[2026-09-01, 2026-10-01)` in **Asia/Baghdad**. Odoo UTC timestamp columns are filtered using `[2026-08-31 21:00:00, 2026-09-30 21:00:00)`; date columns use September dates directly. An initial UTC-calendar probe returned 2,893 confirmed orders; correcting the scope produces the certified **2,895**. This was a clock-boundary difference, not a source mutation or a revision of the approved definition.

## Method and limits

Inspected the physical public-table inventory, relevant columns, primary/foreign keys, relation tables and indexes alongside `ir_model`, `ir_model_fields`, installed modules and field external-ID ownership. There are **893 physical public tables**, **269 relevant model metadata entries**, and **6,426 relevant field metadata entries** in the inspected scope. Schema `reltuples` estimates were used only for planning, never presented as exact populations.

Profiling uses aggregates, bounded periods for transactional samples, company-scoped joins, and EXPLAIN without ANALYZE before every profile query. Per-statement timeout is 15 seconds, lock timeout 1 second. Current stock/lots and historical attribution scans have explicit company scope. Distribution queries return at most 20 groups; they are not exhaustive where more groups exist. Complete row/null/distinct counts are separate. Top entity frequencies are anonymous aggregates; raw customer names, contacts, coordinates and route geometry were not extracted. Mutable labels are display sources, not identity keys.

The catalog records **170 metric candidates**, **28 dimensions**, all **13 requested domains**, field-quality profiles, aggregate evidence, module ownership and six recommended waves. Each metric records physical fields, grain, candidate date, aggregation, classification, candidate dimensions, and backfill/snapshot/currency/UOM/approval/reconciliation flags. Candidate dimensions are possible future joins, not evidence that every pairing is valid.

| Classification | Meaning | Candidates |
| --- | --- | ---: |
| A | Directly source-supported | 29 |
| B | Derivable from supported measures | 58 |
| C | Business definition required | 29 |
| D | Source/join validation required | 24 |
| E | Weak or empty population | 28 |
| F | Not available or not identified in inspected scope | 2 |

A/B means source ingredients exist, not that a canonical definition or capability is approved. Existing certified concepts still require their existing immutable event and exact reconciliation cases. New proposals require business approval and additional exact evidence. F is a scoped discovery result; an integration owner must confirm unidentified external representations before an absolute absence claim.

## Coverage matrix

| Domain | Actual source richness | Main business/technical decisions | Next certification prospects |
| --- | --- | --- | --- |
| Sales | High: orders, lines, prices, margin, owner/team/warehouse | Order value versus invoice revenue; weighted ratios; delivery state/date | Strong for counts/value and approved ratios |
| Invoicing | High: posted headers and product lines | Refund signs; tax basis; line/header reconciliation | Strong for counts and existing monetary definitions |
| Receivables/collections | High: residuals, ledger, payments, partial/full reconciliation | Current versus historical AR; credits/openings; cash versus settlement | Current invoice residual first; cash collections deferred |
| Customers/outlets | High ordering/history/geography; weak free text | Outlet hierarchy, active/new/lifetime/inactivity meanings | Customer contribution/frequency; lifetime/churn deferred |
| Products | High line grain, category and UOM; partial brand | Units conversion, changing category/brand, refund cohorts | Product/category revenue and compatible quantities |
| Profitability | Rich stored order margin; unproven accounting attribution | Order margin versus accounting COGS/profit; analytic allocation | Separately defined order margin; accounting profit deferred |
| Inventory | High current quants, movements and valuation layers | Snapshot ownership, location hierarchy, negative stock, costing | Current quantity snapshots first |
| Expiry/lots | Expiration actually populated | Unknown tracking, cutoff policy, exact lot valuation | Quantity risk first; expiry value deferred |
| Purchasing/vendors | Moderate complete orders/lines, multiple currencies | Commitment versus booked spend; currency and receipts | PO counts, commitments and normalized quantities |
| CRM/pipeline | One inactive opportunity | Actual CRM adoption and closed/won meaning | Insufficient usage |
| Marketing attribution | All historical order attribution empty | Capture process and external spend/attribution | Blocked |
| Delivery/fulfilment | Rich stock movements, picking statuses; sparse driver/promise | Order/picking grain, partials/returns, promised date | Status/count controls; SLA/driver metrics deferred |
| Routes/field sales | Many scheduled visits; sparse authoritative outlet routes | Actual visit definition, historical route assignment, direct conversion linkage | Define visits first; route and conversion blocked |

## Transactional evidence and definitions

### Sales and invoicing

Company-1 sales history has **68,471** orders, from 2024-08-03 through the observation day. September has **2,895 confirmed** and **200 cancelled** orders, all in IQD. Confirmed tax-inclusive and untaxed order value are both **1,461,335,500**; tax is zero in this sample. This supports a separately named order-value definition. It must not silently become generic `revenue` or the approved net invoice definition.

September has **2,890 posted customer invoices** and **120 posted customer refunds**. Source controls reproduce the approved values:

| Existing concept | September IQD |
| --- | ---: |
| Posted Invoice Value: posted invoice untaxed signed amount | 1,465,712,000 |
| Refund Value: positive magnitude of posted refund untaxed signed amount | 18,545,500 |
| Net Invoiced Revenue: invoice value minus refund value | 1,447,166,500 |
| Order Count: confirmed orders in Baghdad September | 2,895 |

These are source observations, not a new approval. The existing **308 exact reconciliation cases** remain intact. Refund source amounts are negative; display refund magnitude is positive. Invoice tax is zero here, so this sample cannot establish universal equality of gross and untaxed revenue.

The invoice/order bridge `sale_order_line_invoice_rel(order_line_id, invoice_line_id)` contains **35,374 links**, **3,010 distinct sampled invoices/refunds**, and **2,912 orders**, with no cross-company links in the sample. It is many-to-many: header amounts must never be repeated once per line/order. Product revenue needs signed product-line controls against invoice headers and explicit treatment of downpayments/display lines/rounding. Order-to-invoice timing requires a first/last/complete invoice decision.

Prior-year September has **2,802 posted invoices/refunds** in source, versus **3,010** in September 2026. This establishes comparative data presence, not complete current-year/prior-year reconciliation or serving coverage. Year-over-year execution still requires approved dates, eligible periods and backfill.

### Receivables and collections

Current residuals are useful but mutable. September-posted invoice residual totals **730,430,731.080 IQD** and refund residual totals **-192,750 IQD** at discovery time; these are **October observation snapshots**, not September closing receivables. All-history company receivable lines include opening/journal entries and some document-currency USD lines; company-currency balance/residual and document-currency residual must remain distinct.

There are **6,379 September partial-reconciliation links**, all between company-1 receivable lines, with **4,799** having a payment-linked side. The remainder can include credit notes, offsets or adjustments. There are **3,739 September payment records**, including cancelled and outbound records; **18 have no journal move**. These populations cannot be summed into cash collections without state/direction/cohort and payment-to-reconciliation validation. Full reconciliation must be scoped through company-owned lines/partial links because its table has no company key.

`partner_balance_before` and `partner_balance_after` are physical columns but Odoo metadata marks them **non-stored**, and all **3,010** sampled posted invoice/refund values are null. They are unusable as historical balance evidence. Aging needs due-date unknown buckets, credit/opening treatment and an as-of date. DSO needs approved credit-sales and average/closing AR semantics plus historical controls; no formula was implemented.

### Products, costs and profit

Confirmed September sales have **35,437 product lines**, with **6,838** using a UOM different from the product base unit. No sampled UOM-category mismatch was found. That makes conversion plausible, not optional: apply Odoo category/factor/rounding semantics and reconcile per product/UOM before aggregation. Never sum incompatible units or average unweighted prices/margin percentages.

The **400 sold products** have **36 categories** with complete category assignment, **118 brands** with **99 products missing brand (24.75%)**, and **38 base UOMs**. Brand reports need an explicit unknown bucket. September percentage/fixed discount event counts are zero; custom fixed-discount stacking and price baseline cannot be proven using this sample alone.

Stored `sale_margin` yields confirmed September order margin **697,384,876.180 IQD**. It is an available source-specific measure; neither its name nor its existence establishes accounting gross profit. Approved gross margin should be a ratio of matching totals, not an average of `margin_percent`.

September has **36,746 valuation layers**, all linked to a stock move, but **all lack account_move_id, account_move_line_id and lot_id**. There are **351 posted direct-cost-account product lines across 74 moves**, so cost data exists. Their attribution, chart-of-accounts scope and recognition timing have not been proved to match invoiced revenue. The net sum of September valuation movements is neither COGS nor on-hand inventory value. Accounting profit and analytic-distribution allocation remain D until finance semantics and exact joins are validated.

## Current stock, expiry and purchasing

Company-1 current quants contain **6,800 positions** across location usages, with **1,361 negative positions**. These counts are not a summed stock quantity. Internal-location, ownership/consignment, reservation and product-base-UOM policies must be explicit. Warehouse attribution requires checking location ancestors; direct `stock_location.warehouse_id` is not automatically a complete hierarchy mapping. No historical stock snapshots were created.

Company-1 has **2,739 lots**, all with expiration, use, removal and alert dates. Expiration is actually used: **389 of 400 sold products** have expiration enabled. Among **1,109 positive internal stock positions**, **33 have missing expiry**. Quantity near/after expiry is feasible using the lot bridge and an approved cutoff, while reporting unknown coverage. These are current snapshots; they must not be summed across observation dates. All lot stored-price columns are null in this profile, and September valuation-layer lot references are absent. Exact near-expiry/expired value is therefore unproven; product-average-cost estimates would be a separately approved approximate definition.

Purchasing has **316 historical POs**, **313 confirmed/done** and **3 cancelled**, across **36 vendors**; history begins 2024-06-05. Confirmed lines total **4,591**, with ordered/received/billed quantity fields available. Receipt status is full for sampled historical confirmed POs; open-purchase analytics still need eligible-state and return controls. Confirmed document currencies include **IQD, USD, EUR and RUB**. Cancelled documents additionally use JPY and another yen-labeled currency. Company-normalized `amount_total_cc` and rates are populated, but their date/rate/tax semantics need controls before combining currencies. PO commitment is not booked vendor-bill spend. Supplier timing requires validated PO-line→stock-move→receipt lineage and approved first/last/complete-receipt dates.

## Customer, route, CRM and custom evidence

The sampled September order-customer cohort (confirmed and cancelled) has **1,939 outlets**, with **1,884 valid nonzero coordinate pairs (97.16%)**. Range checks do not verify accuracy. Structured customer city is missing for **1,085 (55.96%)**; invoice city is missing for **1,714 of 3,010 (56.94%)**. Invoice state is missing on **5 (0.17%)**. `area` is entirely null. Free-text city has 199 distinct values and should not silently substitute for the governed city ID. Customer discount/payment-preference/product-desire strings are sparse, often roughly 79% missing, and have no proven governed categories.

Relevant custom modules include `business_line_account_reports`, `dabbos_reports`, `dabbos_restapi_only`, `dabbos_api_auth_core`, `dabbos_api_hr`, `visits_and_tracking`, `customer_performance_dabbos`, `customer_payment_fifo_reconcile`, `product_brand`, `employee_locations`, customer/salesperson/product assignment/report modules and `periodic_inventory_profit_loss`. The catalog records installed-module versions and field ownership. Module presence is not evidence that every module's analytical data is usable.

Important differences:

- Stored margin/cost fields belong to `sale_margin`; `business_line_id` belongs to `business_line_account_reports`.
- Driver and fixed discount fields belong to `dabbos_reports`. Driver is a **res.partner relation**, not a user ID; only **1 of 3,095 September orders** has it populated.
- `total_product_api` and `total_quantity_api` belong to `dabbos_restapi_only`, but are entirely null in the sampled orders. Use validated line measures instead.
- `res_partner.route_id` has a physical populated legacy column but metadata `store=false`; it is not authoritative. Stored `route_ids` uses `visits_partner_route_rel(partner_id, route_id)`.
- Product `route_ids` describes stock/procurement routes, not field-sales routes. These identities must stay separate.

There are **10 company routes**, **40 authoritative partner-route links**, **241 user-route links** via `res_users_sales_route_rel`, and **16 route/business-line links** via `sales_route_business_line_rel`. Only **17 of the 1,939 order-cohort outlets** have authoritative route membership; the legacy non-stored column is populated on **1,524**. That discrepancy requires owner investigation. Both company route plans and their lines have **zero records**.

September has **10,574 scheduled visit records**: stage `completed` **5,416**, stage `Not visited` **5,158**. All visit route IDs are null; 5,158 lack end time and 142 lack start time. Stage labels suggest activity semantics but are not business approval. Counts must distinguish scheduled/completed/not-visited. No direct visit↔order FK was found. Matching customer/user/date is approximate attribution, not exact visit conversion. No explicitly named Maidan table/model was identified; the integration owner must identify its event lineage or external source before claiming conversion support.

CRM has **one company-1 opportunity**, inactive with zero probability. All **68,471 historical orders** have null campaign/source/medium/opportunity IDs, and sampled invoice attribution is also entirely null. CRM/pipeline and acquisition-attribution metrics are not meaningful in the current population despite installed standard models.

## Dimension matrix

Population contexts matter: order columns cover 3,095 September orders including cancellations; invoice columns cover 3,010 posted invoices/refunds; customer attributes cover 1,939 order-cohort outlets; product attributes cover 400 confirmed-order products. A populated order dimension does not prove invoice-line or stock attribution.

| Candidate | Stable source key | Observed population / ambiguity |
| --- | --- | --- |
| Salesperson | res_users.id through order.user_id / invoice.invoice_user_id | 40 order / 39 invoice owners; complete sampled attribution; current customer owner differs |
| Sales team | crm_team.id | 5, complete sampled order/invoice attribution |
| Business line | business_line.id | Complete sampled order/invoice attribution; custom company-scoped concept, not branch |
| Warehouse | stock_warehouse.id | 3 sampled order warehouses; current stock hierarchy still D |
| Customer | res_partner.id | 1,939 order cohort; freeze outlet attributes |
| Commercial customer | res_partner.id via commercial_partner_id | Complete invoice hierarchy; select outlet versus legal/commercial customer |
| Product | product_product.id | 400 sold products; preserve variant identity |
| Product category | product_category.id | 36; complete product coverage, mutable assignments |
| Brand | product_brand.id | 118; 24.75% of products missing |
| City | res_city.id | Invoice 56.94% missing; customer 55.96% missing; text differs |
| State | res_country_state.id | Invoice 0.17% missing; region naming needs policy |
| Area | no governed ID | Entirely null text |
| Route | sales_route.id with authoritative M2M | 17/1,939 cohort outlets mapped; all visit route IDs null |
| Geography | res_partner.id + coordinates | 97.16% valid nonzero pairs; accuracy/geofences/privacy unresolved |
| Customer rank | source numeric value | Not a revenue ranking or approved segmentation |
| Campaign/source/medium | utm_campaign / utm_source / utm_medium IDs | Historical order attribution 100% missing |
| Opportunity/stage | crm_lead / crm_stage IDs | No order linkage; one inactive opportunity; visit stages are separate |
| Driver | res_partner.id via driver_id | 1/3,095 sampled orders populated |
| Vendor | res_partner.id via purchase_order.partner_id | 36; customer and supplier ranks may overlap |
| Location/lot | stock_location.id / stock_lot.id | Current snapshots; ownership/hierarchy/unknown-lot rules |
| Currency/UOM | res_currency.id / uom_uom.id | Currency/date policy and compatible category/factor/rounding rules |
| Time | approved source event date + business calendar | Timestamp/DATE distinction; month/quarter/year are calendar groupings |
| Branch | no source branch identity identified | No branch table identified in inventory; warehouse/business line cannot be automatic aliases |

The JSON includes per-field row/null/distinct counts, selected categorical top values, anonymous top entity frequencies, source field/module ownership and historical-stability notes. Mutable display names must never become stable identifiers. Exact ID/FK metadata establishes structural relations; only selected operational join populations were tested. Missing top-value/coverage checks for other candidate relations remain explicit validation work, not assumed evidence.

## Recommended certification waves

1. **Invoice/order header measures and ratios:** invoice/refund counts, existing values under their approved definitions, order value/count and approved AOV/refund/average-invoice ratios. Validate signs, local dates, eligible states, zero/partial/null behavior and each proposed metric×dimension/filter/grain/transform combination.
2. **Product/customer contributions and separate order margin:** invoice-line product/category revenue, compatible units, customer/salesperson/business-line analyses, unknown brand bucket, then explicitly named order margin. Require line/header reconciliation, no fanout, UOM conversions and historic dimension controls. Generic accounting profit stays blocked.
3. **Current AR and inventory/expiry quantity snapshots:** approve as-of semantics, credit/opening/due policies, owner/location/expiry rules and complete snapshot ownership. Historic AR, cash collection and exact expiry valuation remain separate work.
4. **Purchasing and operational status/visits:** normalize currencies/UOMs, separate PO commitments from spend, validate receipt joins and visit-state definitions. Delivery SLA requires approved promised dates.
5. **Accounting profit, historic AR, routes/drivers/conversion:** resolve COGS/valuation attribution, opening history, route/driver capture and direct visit/order event lineage. These are conditional waves, not near-term green capabilities.
6. **CRM and marketing:** wait for actual CRM/attribution capture and meaningful population. ROI also needs external campaign-spend data.

No Cartesian capability expansion is recommended. An exact case can certify only its approved definition and scope; the existing 308 September cases do not certify newly discovered measures or arbitrary new pairings.

## Sales Performance answer and missing sources

**Yes, the source can supply the ingredients for a majority of the distinct Sales Performance business measures after approval and reconciliation. It cannot currently justify the entire unchanged template.** Order count, an explicitly chosen revenue definition, matching AOV and current outstanding amount have source support. The nine-widget template has eleven series: six have plausible source ingredients (revenue KPI, AOV, order count, monthly revenue, customer revenue, outstanding), with additional semantic, snapshot and period controls. This is discovery feasibility, not six certified/executable series.

Generic `gross_profit` and `gross_margin` remain blocked until finance chooses accounting COGS semantics or explicitly approves a separately named order-margin definition. Branch grouping lacks an identified branch identity. Year-over-year revenue has prior-year records but needs full requested-period backfill/reconciliation and serving coverage. The current-year template period is not satisfied by the existing September certification alone. Do not rename warehouse/business line to branch or substitute stored order margin to turn this template green.

Major missing inputs are usable marketing attribution/ad-platform spend (and impressions/clicks for marketing efficiency), meaningful CRM activity, authoritative historical route membership/visit→order lineage, reliable driver assignment and approved delivery promises. Some require improved Odoo capture, others an external integration. Lifetime customer metrics and historical AR/stock need complete history/opening or governed snapshots; their absence from the current certified mart is not proof that all historical source events are absent. Exact lot-cost and invoice-COGS attribution need validated source relationships or additional accounting/cost lineage. Forecast/stockout risk additionally needs approved demand/assortment/targets. No new source integration was implemented.

## Reproduction, verification and handoff

Run the operator-only scripts from the repository root with an existing approved environment file; never commit that file or expose credentials:

```bash
node scripts/integration/odoo-discovery.mjs schema /path/to/operator.env /tmp/odoo-discovery-schema.json
node scripts/integration/odoo-discovery.mjs profile /path/to/operator.env /tmp/odoo-discovery-profile.json
```

They refuse a database other than `accounting` or company list other than `1`, use one source connection, fixed SELECT queries, explicit read-only transaction/safe rollback, query-local savepoints and sanitized failure codes. Failures are recorded and cause a nonzero exit. Outputs are mode 0600. This CLI is not exposed by API routes and does not offer arbitrary SQL to the product. It reads source credentials only in the operator process. Aggregate observations are time-dependent; rerunning does not approve or mutate anything.

Validation: successful live schema/profile transactions verified read-only, all final profile queries completed with no failures, all catalog metric physical fields checked against discovered columns, unique candidate names/counts and all classification/flag/evidence references checked, JSON parses and both scripts pass `node --check`. Architecture, quality and diff gates each passed with zero diagnostics; the documentation sanity test passed (1 test). No application UI, source adapter or runtime behavior was changed by this task; no browser or full application suite was claimed as discovery coverage. CI was not run because nothing was pushed.

A fresh read-only mart inspection exactly matches the prior pilot/staging mapping metadata, extraction/ingestion/fact/snapshot/reconciliation fingerprints and tenant serving binding. The existing certification event and all 308 links remain untouched. Existing mapping specification fingerprint remains `d5b9efe036d50c6cc4a39c22037b9592` and reconciliation-evidence fingerprint remains `0df7ee1485f135c234f725ef6766018d`.

Business owner follow-up: approve proposed revenue/AOV/customer/margin/AR/expiry meanings. Finance follow-up: validate COGS chart/timing, cash settlement and historical openings. Operations follow-up: define actual visit, promises, route/driver/warehouse ownership. Integration follow-up: identify Maidan/campaign lineage and missing capture. No follow-up action is authorized or executed by this discovery alone.

Odoo mutated = **no**; source schema changed = **no**; existing certification changed = **no**; existing serving binding changed = **no**; authentication changed = **no**; sync implemented = **no**; external deployment = **no**; push = **no**; merge = **no**.
