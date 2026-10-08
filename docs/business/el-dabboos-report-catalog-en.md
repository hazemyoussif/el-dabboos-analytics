# El-Dabboos Enterprise Report Catalog

Business definition pack v1 · Company 1 · Iraq · IQD · Prepared October 6, 2026.

**Approval preparation only.** Documentation does not approve, certify or publish a metric. Existing published metrics remain governed by their exact release. The standing Finance decision is recorded below; certification and publication still require exact technical evidence.

Discovery evidence: 170 candidates, 28 dimensions, 13 domains, 893 physical tables and 269 relevant models. This pack adds explicit business proposals; its 204 entries are definition records, not 204 executable metrics. Counts below describe each definition once, including separately versioned net and gross receivable policies.

| Lifecycle | Definitions |
| --- | --- |
| Certified | 21 |
| Reconciled · Awaiting Business Approval | 6 |
| Defined · Awaiting Reconciliation | 95 |
| Discovered | 50 |
| Unavailable / Insufficient Source Data | 32 |

Certified means an explicitly published exact definition, period and grouping. September event summaries retain their Business Line/Salesperson pairs. Signed aging is published only at September 30 with the Customer pairs listed per metric; gross components and credits are summary-only. Candidate dimensions are not permissions. Defined means a proposal; discovery establishes source ingredients only.

Lifecycle: Discovered → Defined → Reconciled → exact-version business approval → certification → explicit publication. Unavailable identifies insufficient capture or source evidence. A generic canonical ID does not certify its Odoo mapping or a grouping.

Existing decisions, retained without reopening:

- Executive Revenue means Net Invoiced Revenue; Order Revenue is separate.

- Refunds recognized on each credit note’s own issue date.

- Business Line is official; Company 1 is Phase 1 Iraq; reporting currency IQD.

## Finance standing metric-design approval

Finance · 2026-10-07 · standing metric-design approval

Financially correct and technically reconciled Finance metrics. Finance adopts analytics definitions where financially correct.

- Unresolved policy choices still require explicit Finance confirmation.

- Accounting correctness must be demonstrated.

- Exact technical reconciliation remains mandatory.

- Gross profit/margin, inventory valuation, FX, purchase spend and cost allocation are not automatically approved.

A metric is not product-ready until its business definition, formula/date semantics, EN/AR localization and metric-help metadata are complete. Certification requires separate exact technical evidence. Material semantic changes require a new definition version.

An event contributes once within a period: Order Revenue/Count use the order date in Asia/Baghdad; invoices use invoice issue date; each refund uses its own issue date. A snapshot describes the position at one cutoff: receivables, stock and inventory value. Sum positions at the same cutoff; never sum daily snapshots into monthly revenue. Reporting period, snapshot cutoff and source extraction timestamp are different. September sales freshness is October 5 at 14:54:58.149 UTC; the receivable control freshness is October 6 at 12:53:16.128 UTC.

## Executive Sales & Invoicing (executive-sales-invoicing)

| Item | Business description |
| --- | --- |
| Purpose | Compare approved invoicing and order performance. |
| Users | Management / Finance / Sales |
| Questions | How much was invoiced, credited and ordered, and what is average confirmed order value? |
| Metrics | Net Invoiced Revenue (`net_invoiced_revenue`); Posted Invoice Value (`invoiced_revenue`); Refund Value (`refund_value`); Order Revenue (`order_revenue`); Order Count (`order_count`); Average Confirmed Order Value (`average_confirmed_order_value`) |
| Dimensions | Summary / metadata |
| Date basis | Invoice issue date; each credit note uses its own issue date. September 2026. / Order date in Asia/Baghdad; September 1–30, 2026. |
| Current period | September 1–30, 2026; sourceAsOf October 5, 2026, 14:54:58.149 UTC. |
| State | Executable · Certified exact series |
| Limitations | No published trend/ranking/YoY. Business Line has one General group; Salesperson has 39 groups. |
| Approval / next reconciliation | No new approval needed for these exact published series; retain release and scope. |

Executive has six KPI cards. Each grouped report has a three-series invoice/refund bar, an Order Revenue bar and a six-metric detail table. No new report is executed by this documentation.

## Business Line Performance (business-line-performance)

| Item | Business description |
| --- | --- |
| Purpose | Compare approved invoicing and order performance. |
| Users | Management / Finance / Sales |
| Questions | How much was invoiced, credited and ordered, and what is average confirmed order value? |
| Metrics | Net Invoiced Revenue (`net_invoiced_revenue`); Posted Invoice Value (`invoiced_revenue`); Refund Value (`refund_value`); Order Revenue (`order_revenue`); Order Count (`order_count`); Average Confirmed Order Value (`average_confirmed_order_value`) |
| Dimensions | business_line |
| Date basis | Invoice issue date; each credit note uses its own issue date. September 2026. / Order date in Asia/Baghdad; September 1–30, 2026. |
| Current period | September 1–30, 2026; sourceAsOf October 5, 2026, 14:54:58.149 UTC. |
| State | Executable · Certified exact series |
| Limitations | No published trend/ranking/YoY. Business Line has one General group; Salesperson has 39 groups. |
| Approval / next reconciliation | No new approval needed for these exact published series; retain release and scope. |

Executive has six KPI cards. Each grouped report has a three-series invoice/refund bar, an Order Revenue bar and a six-metric detail table. No new report is executed by this documentation.

## Salesperson Performance (salesperson-performance)

| Item | Business description |
| --- | --- |
| Purpose | Compare approved invoicing and order performance. |
| Users | Management / Finance / Sales |
| Questions | How much was invoiced, credited and ordered, and what is average confirmed order value? |
| Metrics | Net Invoiced Revenue (`net_invoiced_revenue`); Posted Invoice Value (`invoiced_revenue`); Refund Value (`refund_value`); Order Revenue (`order_revenue`); Order Count (`order_count`); Average Confirmed Order Value (`average_confirmed_order_value`) |
| Dimensions | salesperson |
| Date basis | Invoice issue date; each credit note uses its own issue date. September 2026. / Order date in Asia/Baghdad; September 1–30, 2026. |
| Current period | September 1–30, 2026; sourceAsOf October 5, 2026, 14:54:58.149 UTC. |
| State | Executable · Certified exact series |
| Limitations | No published trend/ranking/YoY. Business Line has one General group; Salesperson has 39 groups. |
| Approval / next reconciliation | No new approval needed for these exact published series; retain release and scope. |

Executive has six KPI cards. Each grouped report has a three-series invoice/refund bar, an Order Revenue bar and a six-metric detail table. No new report is executed by this documentation.

## Customer Performance (customer-performance)

| Item | Business description |
| --- | --- |
| Purpose | Understand customer contribution and purchasing behavior. |
| Users | Management / Finance / Sales |
| Questions | Which stable customers drive sales, returns and concentration? |
| Metrics | Net Invoiced Revenue (`net_invoiced_revenue`); Posted Invoice Value (`invoiced_revenue`); Refund Value (`refund_value`); Order Revenue (`order_revenue`); Order Count (`order_count`); Average Confirmed Order Value (`average_confirmed_order_value`); Ordering Customers (`ordering_customers`); Customer Revenue Contribution (`customer_revenue_contribution_percentage`); Top Customer Concentration Candidate (`top_customer_concentration`) |
| Dimensions | customer |
| Date basis | Invoice issue date; each credit note uses its own issue date. September 2026. / Order date in Asia/Baghdad; September 1–30, 2026. / Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Current period | No published Customer period; September candidate controls preserved. |
| State | Unavailable · grouped publication pending |
| Limitations | Wave 1 source/mart comparisons for existing inputs include customer controls, but no customer pair was admitted to the release. Customer identities are not names; no is_company filter. New cohort/concentration definitions remain proposals. |
| Approval / next reconciliation | When approved tunnel is available, validate provenance/completeness of preserved exact September customer controls, link immutable input cases and distinct/ratio outputs, obtain required output approval, promote exact customer pairs and verify runtime isolation. Do not infer publication from an exact aggregate. |

## Receivables & Aging (finance-receivables)

| Item | Business description |
| --- | --- |
| Purpose | Confirm historical customer debt and signed credits. |
| Users | Finance |
| Questions | What was owed at cutoff, when was it due, and what policy explains credits/missing dates? |
| Metrics | Net Aged Receivable (`net_aged_receivable`); At-Date Receivable (`aged_at_date`); 1–30 Overdue (`aged_1_30`); 31–60 Overdue (`aged_31_60`); 61–90 Overdue (`aged_61_90`); 91–120 Overdue (`aged_91_120`); Older than 120 (`aged_over_120`); Total Overdue (`total_overdue_net`); Overdue % (`overdue_net_percentage`); Gross Open Receivable Components (`receivables_gross_outstanding_amount`); Credit Balances (`credit_balances`) |
| Dimensions | customer |
| Date basis | Snapshot cutoff September 30, 2026; current residual observations are October snapshots, not September close. Collections use an approved settlement/cash date still to be selected. |
| Current period | Cutoff September 30, 2026; control sourceAsOf October 6, 2026, 12:53:16.128 UTC. |
| State | Executable · Certified exact series |
| Limitations | Eleven certified summary metrics; complete Customer Aging for seven source buckets/total. Nine exact Customer metric pairs also admit Total Overdue and Overdue %. Gross and Credits are summary-only. Fixed cutoff; no other date, trend or grouping. |
| Approval / next reconciliation | Published via exact reconciliation, existing release certification, derived-output controls, promotion and serving-binding compare-and-swap. Finance standing approval recorded October 7, 2026. |

Eleven KPI cards and one seven-metric Customer Aging table with all 2,217 identities. The four earlier reports remain executable.

## Data & Certification Status (data-status)

| Item | Business description |
| --- | --- |
| Purpose | Show period, company, currency and provenance. |
| Users | Management / Finance / Sales |
| Questions | Where did this number come from, and what can execute? |
| Metrics | — |
| Dimensions | Summary / metadata |
| Date basis | Published metadata |
| Current period | Same published September release. |
| State | Available information surface |
| Limitations | Information surface; no financial metric or independent certification. |
| Approval / next reconciliation | No new approval; preserve actual runtime metadata and exact published inventory. |

## Product Performance (product-performance)

| Item | Business description |
| --- | --- |
| Purpose | Prepare product performance with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Net Invoiced Revenue by Product (`product_revenue`); Order Revenue by Product (`product_order_revenue`); Net Units Sold (`units_sold`); Product Average Selling Price (`product_average_selling_price`); Product Revenue Contribution (`product_revenue_contribution`); Refund Value by Product (`product_refund_value`); Refund Quantity (`refund_quantity`) |
| Dimensions | product, product_category |
| Date basis | Invoice issue date; order date only for explicitly named order-product measures. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Reconcile eligible posted invoice product lines to invoice/refund headers, including rounding/downpayment/display/service cases; validate 6,838 mixed-UOM order lines with category/factor/rounding controls; freeze product/UOM input identities and date attribution, approve explicit untaxed order-product naming, then certify each exact product pair. |

## Order Margin (order-margin)

| Item | Business description |
| --- | --- |
| Purpose | Prepare order margin with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Order Margin (`order_margin`); Order Margin Percentage (`order_margin_percentage`) |
| Dimensions | business_line, salesperson, customer, product |
| Date basis | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Source-only September stored margin is 697,384,876.180 IQD and header/line margin comparisons had zero mismatches; this is not source-to-mart reconciliation because frozen facts contain neither margin nor untaxed denominator. Approve Order Margin and weighted margin/untaxed-order-value formula, perform new bounded input extraction on restored tunnel, reconcile summary and each requested grouping, record exact-version approval and publish. |

## Inventory Overview (inventory-overview)

| Item | Business description |
| --- | --- |
| Purpose | Prepare inventory overview with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Stock On Hand (`stock_on_hand`); Reserved Stock (`reserved_quantity`); Unreserved Available Stock (`available_quantity`); Stock by Product (`product_inventory_quantity`); Stock by Warehouse (`warehouse_inventory_quantity`) |
| Dimensions | product, warehouse, location |
| Date basis | Exact snapshot observation timestamp; historical September stock is not established. Movement events use actual completion date. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Approve internal/ownership/consignment/negative-stock and reservation rules, validate location-to-warehouse ancestors and compatible UOM, establish current snapshot timestamp/position identity/completeness, then extract and reconcile product/warehouse counts and quantities. No retrospective September stock from current quants. |

## Expiry Risk (expiry-risk)

| Item | Business description |
| --- | --- |
| Purpose | Prepare expiry risk with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Expired Quantity (`expired_quantity`); Near-expiry Quantity Candidate (`near_expiry_quantity`); Quantity Expiring within 7 Days (`expiring_quantity_7_days`); Quantity Expiring within 30 Days (`expiring_quantity_30_days`); Quantity Expiring within 60 Days (`expiring_quantity_60_days`); Quantity Expiring within 90 Days (`expiring_quantity_90_days`); Near-expiry Percentage Candidate (`near_expiry_percentage`); Expiry Risk Value Candidate (`near_expiry_value`) |
| Dimensions | product, lot, warehouse |
| Date basis | Snapshot observation date/time plus approved expiry-day boundary; not a September event total. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Approve cutoff timezone/day inclusion and horizons; validate positive internal quant→lot linkage and missing-expiry exceptions (33 of 1,109 observed positions); reconcile compatible quantity snapshots and distinct product counts separately. Quantity windows overlap and must not be summed. Value remains blocked until attributable lot cost is proved. |

## Procurement & Vendor Overview (procurement-overview)

| Item | Business description |
| --- | --- |
| Purpose | Prepare procurement & vendor overview with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Purchase Order Count (`purchase_order_count`); Purchase Commitments Candidate (`purchase_spend`); Ordered Purchase Quantity (`purchase_ordered_quantity`); Received Purchase Quantity (`purchase_received_quantity`); Open Purchase Quantity (`open_purchase_quantity`); Vendor Purchase Commitments Candidate (`vendor_spend`) |
| Dimensions | vendor, product, warehouse |
| Date basis | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Approve commitments versus posted spend, tax and order/confirmation date. Validate amount_total_cc rate/date semantics across IQD/USD/EUR/RUB, UOM and receipt/return lineage. Freeze bounded candidate orders/lines, reconcile counts, normalized commitments and quantities/vendor pairs before approval/publication. Supplier SLA and price variance stay future. |

## Accounting Profitability (accounting-profit)

| Item | Business description |
| --- | --- |
| Purpose | Prepare accounting profitability with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Accounting Gross Profit (`accounting_gross_profit`); Accounting Gross Margin Percentage (`accounting_gross_margin`); Analytically Allocated Profit Candidate (`analytic_profit`) |
| Dimensions | product, business_line |
| Date basis | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Finance approves COGS account scope, valuation-to-ledger attribution, recognition and analytic allocation; validate exact revenue/cost period lineage. Do not substitute stored sale margin or net valuation movement. |

## Customer Behavior & Retention Candidates (customer-behavior)

| Item | Business description |
| --- | --- |
| Purpose | Prepare customer behavior & retention candidates with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Ordering Customers (`ordering_customers`); Active Customers Candidate (`active_customers`); New Customers Candidate (`new_customers`); Returning Customers Candidate (`returning_customers`); Orders per Ordering Customer (`orders_per_customer`); Customer Recency (`customer_recency`); Customer Lifetime Invoiced Revenue (`customer_lifetime_revenue`); Inactive Customer Candidates (`inactive_customers`) |
| Dimensions | customer |
| Date basis | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Approve active/new/returning and inactivity cohorts and complete history scope; reconcile stable distinct customer identities and intervals. No invented churn threshold or lifetime claim from partial history. |

## Delivery & Fulfilment (delivery-overview)

| Item | Business description |
| --- | --- |
| Purpose | Prepare delivery & fulfilment with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Delivered Orders Candidate (`delivered_orders`); Open Outbound Deliveries (`open_deliveries`); Fulfilment Completion Rate Candidate (`fulfilment_completion_rate`); On-time Delivery Percentage Candidate (`on_time_delivery_percentage`) |
| Dimensions | warehouse, salesperson |
| Date basis | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Approve order versus picking grain, partial/return completion and promised-date meaning; reconcile order-line→stock-move→picking lineage. Driver analytics need captured driver assignments (only 1/3,095 sampled orders had a driver). |

## CRM Pipeline (crm-pipeline)

| Item | Business description |
| --- | --- |
| Purpose | Prepare crm pipeline with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Opportunity Count (`opportunity_count`); Pipeline Value (`pipeline_value`); Opportunity Win Rate (`win_rate`) |
| Dimensions | salesperson, customer |
| Date basis | Approved opened/closed dates, not an unspecified global date. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | CRM adoption and credible active/closed stages are required; one inactive opportunity is insufficient source capture, not unfinished chart implementation. |

## Marketing Performance (marketing-performance)

| Item | Business description |
| --- | --- |
| Purpose | Prepare marketing performance with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Campaign Order Revenue (`campaign_revenue`); Acquisition Source Revenue (`source_revenue`); Marketing Return on Investment Candidate (`marketing_roi`) |
| Dimensions | campaign, source, medium |
| Date basis | Attributed order date; external spend needs its own aligned approved accounting period. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Capture trustworthy order attribution and external campaign spend with approved cost/ROI semantics; all historical attribution was empty. |

## Routes & Field Sales (field-sales)

| Item | Business description |
| --- | --- |
| Purpose | Prepare routes & field sales with exact approved definitions and evidence. |
| Users | Management / Finance / Sales |
| Questions | Which values and operational drivers can be trusted at this grain? |
| Metrics | Actual Visit Count Candidate (`visit_count`); Route Coverage Candidate (`route_coverage`); Route Order Revenue (`route_revenue`); Visit-to-Order Conversion Candidate (`visit_order_conversion`) |
| Dimensions | route, salesperson, customer |
| Date basis | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Current period | No currently published period for this report; September transactional observations or current snapshot discovery are not serving coverage. |
| State | Planned specification · unpublished |
| Limitations | Specification only; no executable template or metric publication added. Candidate groupings are not runtime permissions. |
| Approval / next reconciliation | Approve actual visit lifecycle, authoritative historic outlet-route linkage and direct visit-order relation; 17/1,939 sampled outlets had authoritative route membership and visit route IDs were null. Never use stock procurement routes as field-sales routes. |

## Invoice & Refund Operations (invoice-refund-operations)

| Item | Business description |
| --- | --- |
| Purpose | Monitor posted invoice and credit-note volumes, invoice size and salesperson detail. |
| Users | Finance / Sales Operations |
| Questions | How many invoices and credit notes were issued, what is average invoice value, and how do volumes and values differ by salesperson? |
| Metrics | Invoice Count (`invoice_count`); Refund Count (`refund_count`); Average Invoice Value (`average_invoice_value`); Posted Invoice Value (`invoiced_revenue`); Refund Value (`refund_value`); Net Invoiced Revenue (`net_invoiced_revenue`) |
| Dimensions | salesperson |
| Date basis | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Current period | September 1–30, 2026; sourceAsOf October 5, 2026, 14:54:58.149 UTC. |
| State | Executable · Certified exact series |
| Limitations | Uses only existing certified summary/Salesperson pairs. Average Invoice Value excludes refunds and is a ratio of totals. Refund Count counts credit-note documents, not original invoices or customers refunded. No new percentages, trends, Top-N or Customer/Product grouping. |
| Approval / next reconciliation | Available under existing publication; no new approval or certification event. |

Six KPI cards for document counts, average invoice value and monetary totals; a six-metric Salesperson detail table. All values come from the analytics runtime.

## Signed receivable cutoff — exact Finance publication

**CERTIFIED AND LOCALLY PUBLISHED.** Finance standing approval October 7, 2026; cutoff September 30, 2026, IQD. All 15,519 source-ID cases are exact across 2,217 customers; zero ambiguous, unmatched, unexpected or mismatched cases. Existing release certification and explicit publication govern this scope.

`el-dabboos-finance-202609-v6` · `finance-standing-20261007-receivables-v1`

| Exact cutoff output | IQD |
| --- | --- |
| Gross Open Receivable Components | 1532751636.39 |
| Credit Balances | -173290543.78 |
| Net Aged Receivable | 1359461092.61 |
| At-Date Receivable | 759020481.15 |
| 1–30 Overdue | 218464001.82 |
| 31–60 Overdue | 69135500.55 |
| 61–90 Overdue | 25871000.18 |
| 91–120 Overdue | 33782500.14 |
| Older than 120 | 253187608.77 |
| Total Overdue | 600440611.46 |

Historical residual includes only settlements effective through cutoff; later payments do not erase history. Maturity date falls back to accounting date when missing; due on cutoff belongs in At Date. Signed credits remain in their own buckets with no allocation. Total Overdue sums the five overdue buckets; Overdue % divides aggregate overdue by aggregate net, with null for zero denominator.

Gross-positive aging v1 with a separate missing-maturity bucket remains an alternative unpublished policy. Its summary gross total is supported, but its alternate buckets and any arbitrary credit allocation are not admitted. Installed metadata inspection does not establish general custom-Python equivalence. Other dates/dimensions still need exact evidence and any unresolved policy needs explicit Finance confirmation.

## Evidence and operating references

- [Discovery catalog](../integration/odoo-analytics-capability-catalog.json) · [Discovery report](../integration/odoo-analytics-capability-discovery.md)

- [Wave 1 exact controls](../integration/odoo-certification-wave-one.json) · [Wave 2 requirements](../integration/finance-product-wave-two-catalog.json)

- [Gross aging v1](../integration/receivables-aging-v1.md) · [Net Odoo control](../integration/odoo-aged-receivable-control.md)

- [Current local reports](../integration/local-management-reports-v1.md) · [Luna QA handoff](../qa/local-management-pack-luna-handoff.md)

- [Versioned definition source](enterprise-metrics-v1.json) · [Finance publication and metric-help delivery](../integration/finance-metric-definitions-delivery.md)

Private workbook and customer extracts remain outside Git. Documents contain aggregate examples only. Finance publication reuses exact frozen evidence through the existing local lifecycle; no new source writes or extraction. Authentication and AI/manual publication guards remain unchanged. Visual/browser QA is deferred to Luna; no visual pass claimed.

## Historical wave 1: October 2025–September 2026

The independently reconciled and approved local historical collection adds Historical Executive Trend, Sales vs Invoicing Trend, Business Line Trend, Salesperson Historical Analysis and Customer Historical Analysis. Monthly event totals use each document's own approved business date. Existing date-range and identity filters apply; contribution tables retain the complete underlying population. The unfiltered customer/salesperson monthly line shows the combined population, with a filter selecting an individual. Stable source IDs remain grouping keys; labels use the latest authorized source observation within the selected range.

Company 1/IQD event summaries and Business Line, Salesperson and Customer pairs have exact monthly controls. Month-end receivables have separately certified company summaries; historical customer aging is deferred (Phase B). A snapshot summary returns the latest certified cutoff, never a sum across months. September's existing release and five original reports retain their own binding.

MoM uses adjacent complete months: absolute change = current − prior; percentage = (current − prior) / abs(prior) × 100. Missing operands produce null changes; zero prior produces a null percentage. Three/six-month moving averages reuse the governed mean of present values, including partial prefix windows; entirely missing windows remain null. The metric-help popup explains executed transformations in EN/AR. YoY requires comparable earlier certified coverage and remains unavailable in this wave.

See [operator commands and recovery](../integration/historical-ingestion.md) and [monthly acceptance ledger](../qa/historical-wave-one-ledger.json). These additions do not approve the other definitions in this catalog.
