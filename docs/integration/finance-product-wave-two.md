# Finance and Product analytics — governed Wave 2 requirements

This is a requirements register, not a runtime metric registry, dashboard specification or Finance approval. Proposed IDs reserve terminology for review; existing domain IDs keep their current semantics. Existing `stock_on_hand` and `units_sold` identities are reused as requirements candidates with tenant-specific mapping/approval pending. Existing generic `outstanding_amount` is not silently narrowed to invoice-only AR; choose a separate precise ID if the approved scope differs. Arabic business labels are supplied only for `تكاليف الرسائل`; all other Arabic labels await business translation approval. The phrase's accounting meaning is unresolved.

Starting branch `codex/production-pilot-lifecycle`, HEAD `167e3d9` verified. The [Wave 1 report](odoo-certification-wave-one.md) is authoritative for Wave 1. The initial discovery had no approved aging definition. The subsequent [Receivables Aging v1 handoff](receivables-aging-v1.md) resolves the working implementation policy and prepares an independent source control for Finance confirmation. This is not formal Finance sign-off. No application, database, publication, dashboard or serving configuration changes are made.

The [structured register](finance-product-wave-two-catalog.json) contains every required metric field and an individually keyed canonical input contract for every operand, report mapping, per-metric reuse matrix, dimension register, source-input profiles and decision records. All business and technical statuses are separate. A `CERTIFIED` technical status on two reused base metrics applies only to their existing September summary/salesperson/Business Line scope, never the newly requested agency/customer/month/annual/classification scope.

## Coverage and consolidation

**47 requested report bullets**, **64 original canonical candidates**, **85 report-to-metric uses**, **21 repeated uses consolidated**, **16 dimensions** and **28 original decision records**. F01–F03 now have `IMPLEMENTATION_APPROVED_V1` working definitions; F04/F05 retain their broader pending status with aging-only resolutions. The other 25 broader decisions remain pending. Multiple outputs/alternatives are explicit where a report is ambiguous. Supplier classification is a dimension requirement, not a new numeric KPI.

Sales wording provisionally refers to `net_invoiced_revenue`, subject to the requested report’s approval: order-based business reports must keep `order_revenue` separately. Physical returns and financial credits remain separate. Gross invoice outstanding and net ledger balance remain separate. Ledger cash and available cash remain separate. Quantity and valuation outputs remain separate. Collection-period ratios and invoice-cohort rates remain separate. These are consolidation boundaries, not decisions made for Finance.

| Request | Business section / report | Canonical candidates | Required dimensions |
| --- | --- | --- | --- |
| R01 | Finance.Customers: receivables aging | `outstanding_amount`, `not_yet_due_amount`, `overdue_amount`, `overdue_1_30_amount`, `overdue_31_90_amount`, `overdue_over_90_amount`, `overdue_invoice_count` | customer |
| R02 | Finance.Customers: net customer balance / net sales ratio | `net_customer_balance`, `customer_balance_sales_ratio` | customer |
| R03 | Finance.Customers: invoice-to-collection days | `weighted_collection_days` | customer |
| R04 | Finance.Customers: collections compared with sales | `collected_amount`, `net_invoiced_revenue`, `customer_collection_ratio` | customer |
| R05 | Finance.Suppliers: payables due during the month | `supplier_payables_due_amount` | supplier |
| R06 | Finance.Suppliers: total supplier payables | `supplier_payables_amount` | supplier |
| R07 | Finance.Suppliers: Trade Supplier / General Supplier classification | `supplier_payables_amount` | supplier_type |
| R08 | Finance.Suppliers: supplier invoice-to-payment days | `weighted_supplier_payment_days` | supplier |
| R09 | Finance.Inventory: received goods not invoiced | `received_not_invoiced_quantity`, `received_not_invoiced_value` | agency, warehouse |
| R10 | Finance.Inventory: delivered goods not invoiced | `delivered_not_invoiced_quantity`, `delivered_not_invoiced_value` | agency, warehouse |
| R11 | Finance.Inventory: shipment/message costs relative to supplier invoices by agency | `shipment_message_cost_amount`, `supplier_invoice_value`, `shipment_message_cost_ratio` | agency |
| R12 | Finance.Inventory: returns by agency and warehouse | `refund_value`, `physical_return_quantity` | agency, warehouse |
| R13 | Finance.Inventory: returns ratio | `refund_value_percentage`, `physical_return_quantity_ratio` | agency, warehouse |
| R14 | Finance.Inventory: expired / expiring / damaged inventory | `expired_inventory_quantity`, `expiring_inventory_quantity`, `damaged_inventory_quantity` | agency, warehouse |
| R15 | Finance.CashFlow: expected collections | `expected_collection_amount` | customer |
| R16 | Finance.CashFlow: required payments | `required_payment_amount` | supplier |
| R17 | Finance.CashFlow: recurring monthly expenses | `recurring_monthly_expense_amount` | month |
| R18 | Finance.CashFlow: available bank/cash balances | `ledger_cash_bank_balance`, `available_cash_bank_balance` | month |
| R19 | Finance.CashFlow: actual vs planned expenses | `actual_expense_amount`, `planned_expense_amount`, `expense_plan_variance` | month |
| R20 | Finance.CashFlow: budget utilization | `budget_utilization` | month |
| R21 | Finance.Overall: monthly/yearly gross margin | `accounting_gross_profit`, `accounting_gross_margin` | month, year |
| R22 | Finance.Overall: monthly/yearly net profit | `accounting_net_profit` | month, year |
| R23 | Finance.Overall: monthly purchases | `monthly_purchase_value` | month |
| R24 | Finance.Overall: monthly COGS | `accounting_cogs` | month |
| R25 | Finance.Overall: customer/receivable vs monthly sales | `net_customer_balance`, `customer_balance_sales_ratio` | customer, month |
| R26 | Finance.Overall: monthly returns / sales | `refund_value_percentage` | month |
| R27 | Finance.Overall: branch contribution to revenue and expenses | `branch_revenue_contribution`, `branch_expense_contribution` | branch |
| R28 | Finance.Overall: accrued-liability movement | `accrued_liability_movement` | month |
| R29 | Finance.Overall: prepayment movement | `prepayment_movement` | month |
| R30 | Finance.Overall: discount / sales ratio | `discount_sales_ratio` | month |
| R31 | Finance.Overall: current liabilities / cash ratio | `current_liabilities_cash_ratio` | month |
| R32 | Product.Overview: annual/current-month sales by customer group and agency | `net_invoiced_revenue` | customer_group, agency, month, year |
| R33 | Product.Overview: inventory by agency with expiry indicators | `stock_on_hand`, `inventory_value`, `expired_inventory_quantity`, `expiring_inventory_quantity` | agency, expiry_bucket |
| R34 | Product.Overview: returns by agency/customer/classification | `refund_value`, `physical_return_quantity` | agency, customer, return_classification |
| R35 | Product.Overview: receivables by customer classification | `outstanding_amount`, `net_customer_balance` | customer_group |
| R36 | Product.Overview: customer collections compared with sales | `collected_amount`, `net_invoiced_revenue`, `customer_collection_ratio` | customer |
| R37 | Product.Overview: warehouse totals by location, agency and prior month | `stock_on_hand`, `inventory_value`, `inventory_prior_month_change` | warehouse, warehouse_location, agency, month |
| R38 | Product.Customers: new customers and transaction volume | `new_customer_count`, `new_customer_transaction_value` | customer_group |
| R39 | Product.Customers: one-order/non-repeat customers older than one month | `one_order_customer_count` | customer |
| R40 | Product.Customers: monthly collections / monthly sales | `customer_collection_ratio` | customer, month |
| R41 | Product.Customers: inactive customers for 3+ months | `inactive_customer_count` | customer |
| R42 | Product.Agencies: quantity sold relative to available stock | `units_sold`, `stock_on_hand`, `agency_sell_through` | agency |
| R43 | Product.Agencies: agency share of total sales | `agency_sales_share` | agency |
| R44 | Product.Warehouses: expiry by warehouse | `expired_inventory_quantity`, `expiring_inventory_quantity` | warehouse, expiry_bucket |
| R45 | Product.Warehouses: return quantity / sold quantity | `physical_return_quantity_ratio` | warehouse |
| R46 | Product.Warehouses: undelivered orders older than one day: count and value | `undelivered_order_count`, `undelivered_order_value` | warehouse |
| R47 | Product.Warehouses: internal transfers: count and value | `internal_transfer_count`, `internal_transfer_value` | warehouse |

## Metric register

Full formula, grain, temporal/currency contract, source evidence and reconciliation controls are in each structured entry. Below, decision IDs link to the business register; none is approved.

| Candidate | Meaning / formula | Type | Owner | Technical mapping | Approval / certification |
| --- | --- | --- | --- | --- | --- |
| `net_invoiced_revenue` — Net invoiced revenue | Posted invoice value minus positive refund value | additive | Finance | CERTIFIED | ESTABLISHED_BASE_ONLY; CERTIFIED_BASE_ONLY; F05, B01, B02, B07 |
| `outstanding_amount` — Outstanding invoice residual | Proposed positive posted invoice residual at approved cutoff; credit treatment pending | snapshot | Finance | SOURCE_VALIDATED | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04, F05, B02 |
| `not_yet_due_amount` — Not-yet-due residual | Eligible residual with maturity on/after cutoff date; unknown due separate | snapshot | Finance | SOURCE_VALIDATED | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04, F05 |
| `overdue_amount` — Overdue residual | Eligible residual with maturity strictly before cutoff date | snapshot | Finance | SOURCE_VALIDATED | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04, F05 |
| `overdue_1_30_amount` — Overdue 1–30 days residual | Proposed residual with approved due-age 1–30 days inclusive | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04, F05 |
| `overdue_31_90_amount` — Overdue 31–90 days residual | Proposed residual with approved due-age 31–90 days inclusive | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04, F05 |
| `overdue_over_90_amount` — Overdue over 90 days residual | Proposed residual with approved due-age >90 days | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04, F05 |
| `overdue_invoice_count` — Overdue invoice count | Distinct invoices with eligible positive overdue residual; not count of instalments | snapshot | Finance | SOURCE_VALIDATED | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F01, F02, F03, F04 |
| `net_customer_balance` — Net customer balance | Pending: approved signed net receivable ledger exposure including selected credits/advances/openings | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F02, F04, F05, B02 |
| `customer_balance_sales_ratio` — Customer balance / sales | Pending approved net balance at cutoff / approved period net invoice sales; zero denominator null | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F04, F05, F06 |
| `collected_amount` — Customer cash collected | Pending approved eligible cash receipts; payment vs settlement and unallocated scope explicit | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F07 |
| `customer_collection_ratio` — Customer collections / sales | Pending monthly cash collected / same-period net invoice sales; distinct from cohort rate | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F07, F08 |
| `weighted_collection_days` — Weighted invoice-to-collection days | Proposed sum(applied cash amount × elapsed invoice-to-payment days) / sum(applied cash amount); not DSO | duration | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F07, F09 |
| `supplier_payables_due_amount` — Supplier payables due during month | Pending eligible residual at cutoff with maturity inside approved calendar-month or rolling window | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F10, F11, F12 |
| `supplier_payables_amount` — Total supplier payables | Pending approved supplier exposure scope at cutoff | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F02, F05, F10, F12 |
| `weighted_supplier_payment_days` — Weighted supplier invoice-to-payment days | Proposed sum(applied supplier cash × elapsed days) / sum(applied supplier cash); start/end policy pending | duration | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F09, F10, F12 |
| `received_not_invoiced_quantity` — Received-not-invoiced quantity | Pending received quantities unmatched to eligible supplier bills at cutoff, per compatible product UOM | snapshot | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; F13, B01, B06 |
| `received_not_invoiced_value` — Received-not-invoiced value | Pending GRNI approved cost/accrual basis for unmatched receipts | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F13, B01 |
| `delivered_not_invoiced_quantity` — Delivered-not-invoiced quantity | Pending delivered quantities unmatched to eligible customer invoices at cutoff | snapshot | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; F13, B01, B06 |
| `delivered_not_invoiced_value` — Delivered-not-invoiced value | Pending sales-versus-cost value of unmatched deliveries | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F13, B01 |
| `shipment_message_cost_amount` — تكاليف الرسائل amount | Pending business meaning; no equivalence to landed costs or messaging assumed | additive | Finance | NEEDS_SOURCE_MAPPING | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F14, B01 |
| `supplier_invoice_value` — Supplier invoice value | Pending approved posted vendor bill/credit amount basis; tax and sign explicit | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F10, F20, B01 |
| `shipment_message_cost_ratio` — تكاليف الرسائل / supplier invoice value | Pending approved allocated cost / approved supplier invoice value; no default allocation | ratio | Finance | NEEDS_SOURCE_MAPPING | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F14, B01 |
| `physical_return_quantity` — Physical return quantity | Pending done physical return quantity with approved original-move direction and compatible UOM | additive | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; F15, B01, B05, B06 |
| `physical_return_quantity_ratio` — Return quantity / sold quantity | Pending physical returned units / approved sold units in matched product/UOM and period/cohort | ratio | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; F15, B05, B06 |
| `refund_value` — Refund value | Established positive untaxed posted credit-note value; product/agency attribution requires new line controls | additive | Finance | CERTIFIED | ESTABLISHED_BASE_ONLY; CERTIFIED_BASE_ONLY; F15, B01, B05 |
| `refund_value_percentage` — Refund value / posted invoice value % | Proposed positive refund_value / invoiced_revenue ×100; zero denominator null | ratio | Finance | SOURCE_VALIDATED | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F15, B01 |
| `expired_inventory_quantity` — Expired inventory quantity | Pending eligible owned stock with approved lot expiry before/on cutoff; unknown expiry separate | snapshot | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B05, B06 |
| `expiring_inventory_quantity` — Expiring inventory quantity | Pending eligible stock inside approved forward expiry bands | snapshot | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B05, B06 |
| `damaged_inventory_quantity` — Damaged inventory quantity | Pending owned stock classified damaged by approved reason/location; scrap alone insufficient | snapshot | Operations | NEEDS_SOURCE_MAPPING | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B05 |
| `expected_collection_amount` — Expected collections | Pending approved due contractual receipts or separately defined predictive forecast | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F02, F04, F05, F16 |
| `required_payment_amount` — Required payments | Pending eligible scheduled liabilities in approved horizon; supplier-only versus broader obligations explicit | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F10, F11, F16 |
| `recurring_monthly_expense_amount` — Recurring monthly expenses | Pending approved recurring schedule obligations, not inferred average historical GL | additive | Finance | NEEDS_SOURCE_MAPPING | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F17, B07 |
| `ledger_cash_bank_balance` — Ledger cash and bank balance | Pending signed approved cash/bank GL accounts at cutoff, including approved openings | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F02, F05, F18, B07 |
| `available_cash_bank_balance` — Available cash and bank balance | Pending ledger balance adjusted for approved restrictions/availability; not ledger alias | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F18, B07 |
| `actual_expense_amount` — Actual expense amount | Pending approved accrual/cash expense accounts, period and credits/reversals | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F17, F19, B01, B07 |
| `planned_expense_amount` — Planned expense amount | Pending approved immutable budget/version amount for explicit period | additive | Finance | NEEDS_SOURCE_MAPPING | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F17, B01, B07 |
| `expense_plan_variance` — Actual versus planned expense variance | Pending actual_expense_amount − planned_expense_amount on identical scope and version | comparison | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F17, B01, B07 |
| `budget_utilization` — Budget utilization % | Pending actual_expense_amount / planned_expense_amount ×100; zero denominator null | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F17, B01, B07 |
| `accounting_gross_profit` — Accounting gross profit | Pending approved accounting net revenue − accounting COGS; never order margin | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F19, B01, B07 |
| `accounting_gross_margin` — Accounting gross margin % | Pending accounting_gross_profit / accounting_net_revenue ×100; monthly/yearly weighted operands | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F19, B01, B07 |
| `accounting_net_profit` — Accounting net profit | Pending approved income/expense scope incl allocations, finance/tax and other items | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F19, B01, B07 |
| `monthly_purchase_value` — Monthly purchases | Pending approved posted purchase accounting, separate from PO commitments | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, F20, B01 |
| `accounting_cogs` — Accounting COGS | Pending approved accounting expense/valuation recognition; no inference from sale margin | additive | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F19, B01 |
| `branch_revenue_contribution` — Branch revenue contribution % | Pending branch approved revenue / total same-scope approved revenue; allocation pending | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F19, B07 |
| `branch_expense_contribution` — Branch expense contribution % | Pending branch allocated expense / total approved expense on same scope | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F17, F19, B07 |
| `accrued_liability_movement` — Accrued liability movement | Pending closing − opening with explicit accrual/release/reversal bridge | comparison | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F21, B07 |
| `prepayment_movement` — Prepayment movement | Pending closing − opening with explicit additions/amortization/reversal bridge | comparison | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F21, B07 |
| `discount_sales_ratio` — Discount / sales ratio | Pending approved discount amount / approved sales baseline; percent/fixed stacking explicit | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F20, B01 |
| `current_liabilities_cash_ratio` — Current liabilities / cash ratio | Pending approved current-liability scope / approved ledger or available cash at cutoff | ratio | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F18, B07 |
| `stock_on_hand` — On-hand inventory quantity | Pending owned internal on-hand stock at cutoff per compatible UOM; reservations and negatives explicit | snapshot | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B05, B06 |
| `inventory_value` — Inventory value | Pending approved valuation-layer/company cost basis at cutoff; exact lot value unproven | snapshot | Finance | NEEDS_MART_INPUTS | NEEDS_FINANCE_APPROVAL; NOT_CERTIFIED; F05, B01, B06 |
| `inventory_prior_month_change` — Inventory versus prior month | Pending current snapshot − approved comparable previous-month close, not sum of daily snapshots | comparison | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B06 |
| `new_customer_count` — New customer count | Pending distinct customers whose first approved qualifying event falls in window; not partner creation by default | additive | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B02, B03 |
| `new_customer_transaction_value` — New customer transaction value | Pending approved qualifying transaction value for governed new-customer cohort | additive | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B02, B03 |
| `one_order_customer_count` — One-order non-repeat customers older than one month | Pending lifetime exactly one qualifying order with first event older than approved month boundary | snapshot | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B02, B03 |
| `inactive_customer_count` — Customers inactive for 3+ months | Pending no qualifying event since approved 3-month cutoff, active/archive policy explicit | snapshot | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B02, B03 |
| `units_sold` — Sold quantity | Pending governed invoice or delivered sales quantity net/gross returns and compatible UOM | additive | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; F15, B01, B04 |
| `agency_sell_through` — Agency sell-through | Pending sold quantity / approved available-during-period stock; not blindly current stock | ratio | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B04 |
| `agency_sales_share` — Agency share of sales % | Pending agency attributed approved sales / same-scope total ×100; unknown attribution retained | ratio | Sales | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01 |
| `undelivered_order_count` — Undelivered orders older than one day count | Pending distinct eligible orders with remaining delivery and approved elapsed age >1 day | comparison | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B06 |
| `undelivered_order_value` — Undelivered orders older than one day value | Pending remaining vs original value for same qualifying delayed orders at cutoff | snapshot | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B06 |
| `internal_transfer_count` — Internal transfer count | Pending done approved internal transfer identity counted once across source/destination | additive | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; B01, B06 |
| `internal_transfer_value` — Internal transfer value | Pending done internal transferred compatible quantity × approved cost basis; count once | additive | Operations | NEEDS_MART_INPUTS | NEEDS_BUSINESS_APPROVAL; NOT_CERTIFIED; F05, B01, B06 |

## Wave 1 reuse and exact capability limits

The structured `waveOneReuse` entry for **every candidate** records certified operands, customer/month control applicability, 83 derived-group applicability, source validations, missing controls and decision IDs.

- Reused requested certified bases: **2**, `net_invoiced_revenue` and `refund_value`. Supporting certified bases include `invoiced_revenue`, order revenue/count, invoice/refund counts. The 10 published baseline metrics remain exactly as reported by Wave 1.
- Four requested snapshot candidates reuse Wave 1 current-source residual validation: outstanding, overdue, not-yet-due and overdue invoice count. Refund-value percentage reuses exact invoice/refund operands but still needs approved output semantics. Stored order-margin validation is retained background evidence, not accounting COGS or Gross Profit evidence.
- **9,846** customer/month base controls can seed a future governed release with their actual source observation. They cannot enlarge immutable v1 approval case IDs. Header controls cannot prove product/agency line allocation, customer categories, stock, payment allocations or accounting profit.
- The **83** average output groups / six certificates per mart approve only the two established averages for summary/salesperson/Business Line. No new requested KPI inherits those output certificates. No requested customer/month pair is exposed.
- The **308** original reconciliation rows, mapping identities/fingerprints and existing output attestations are untouched. New versions/evidence must append through the same lifecycle and single capability projection.

## Governed dimensions

| Canonical ID | Meaning / observed source | Stable identity and technical status | Approval |
| --- | --- | --- | --- |
| `customer` | Stable customer outlet/partner; commercial-parent choice explicit; res_partner.id via sale_order.partner_id/account_move.partner_id | res_partner.id; Wave 1 stable customer mapping; current technical controls | ESTABLISHED_MAPPING_ONLY |
| `customer_group` | Approved customer grouping/classification, not arbitrary multi-tags; res_partner.category + res_partner_res_partner_category_rel | category.id or approved governed group ID; 61 unclassified / 1,582 multi-tag among 1,936 scoped partners; selection/allocations unresolved | PENDING_B02 |
| `supplier` | Counterparty of eligible supplier ledger/purchase facts; res_partner.id via purchase_order.partner_id / payable line.partner_id | res_partner.id; Observed purchase/payable counterparties; customer/supplier ranks may overlap | PENDING_F10 |
| `supplier_type` | Trade/General Supplier exclusive business type; No dedicated supplier_type field observed; category candidate only | Owned approved taxonomy required; No proven exclusive mapping | PENDING_F12 |
| `agency` | Common business agency across sales, stock, returns and supplier costs; product_brand.id candidate; product_brand.partner_id empty for all 118 scoped brands | Approved common agency master required; Cannot equate brand/vendor/category/Business Line; supplier bridge absent | PENDING_B01 |
| `branch` | Actual business branch identity; No reliable source branch identity observed | None established; UNSUPPORTED until owned crosswalk; not warehouse/Business Line alias | PENDING_B07 |
| `warehouse` | Governed stock warehouse and location-tree attribution; stock_warehouse.id; sale_order.warehouse_id; stock_location hierarchy | stock_warehouse.id; 3 September order warehouses observed; inventory ancestry mapping pending | PENDING_B06 |
| `warehouse_location` | Governed internal location within warehouse hierarchy; stock_quant.location_id / stock_move.location_id, location_dest_id | stock_location.id; Observed; hierarchy, ownership, overlapping ancestor rules pending | PENDING_B06 |
| `product` | Product variant, not template identity; product_product.id via sales/invoice/stock lines | product_product.id; 400 sold products; UOM controls required | PENDING_MAPPING_APPROVAL |
| `product_category` | Approved product category at governed historical date; product_template.categ_id | product_category.id; 36 categories with complete sold-product assignment; mutable master | PENDING_MAPPING_APPROVAL |
| `return_classification` | Approved financial/physical return reason taxonomy; stock_move.origin_returned_move_id lineage; res_partner.product_returns is free text, not event reason | Approved reason ID required; No dedicated return_reason field in inspected relevant models; original move is not reason | PENDING_B05 |
| `expiry_bucket` | Approved derived expiry-risk bucket at observation; stock_lot expiration/use/removal/alert dates | Definition-version + bucket token; Expiry used; 33 positive positions missing expiry; thresholds pending | PENDING_B05 |
| `salesperson` | Governed order/invoice responsible user; sale_order.user_id / account_move.invoice_user_id | res_users.id; Existing certified exact metric pairs only | ESTABLISHED_BASE_SCOPE |
| `business_line` | Official General / No Sugar business reporting identity; company-scoped business_line_id | business_line.id namespaced by company; Existing certified pairs; September only General | ESTABLISHED_BASE_SCOPE |
| `month` | Metric-owned business month or snapshot cutoff month; Order date_order; invoice invoice_date; snapshot observation date | YYYY-MM + approved timezone; 9,846 customer/month controls are technical only, not publication | PENDING_NEW_RELEASE |
| `year` | Metric-owned business year; Same metric business date; approved historical scope | YYYY + approved timezone; Annual period requires bounded historical coverage; none published here | PENDING_HISTORICAL_COVERAGE |

Shared masters are read through company-1 facts and tenant namespaced IDs. Historical category/brand/customer/warehouse changes require event-effective or explicit snapshot/version evidence; current master attributes cannot silently restate older reports. The structured dimension register lists all requested metrics and separately lists supported metrics. Requested does not mean supported.

**Agency conflict:** brand is a plausible product-side ingredient, not a proven agency. All 118 scoped brands have no partner link. Supplier identity is partner-based. Business Line and product category are separate identities. An owned canonical agency master and explicit product/vendor/cost crosswalk are required; reject conflicting or many-to-many mappings unless an approved allocation rule prevents double counting. Preserve an explicit unknown bucket, including the 99 of 400 sold products missing brand in earlier discovery.

## Business decision register

These are actual accounting/business decisions, not requests for SQL, tables, joins or adapter design. Prioritize F01–F05 for aging, then B02 if customer classification is requested. Recommendations are proposals, not approved defaults. Approved definition and approval date are null for every row.

| ID | Requested report | Decision and effect | Recommended default | Owner | Status / approved definition / date |
| --- | --- | --- | --- | --- | --- |
| F01 | Receivables aging | Due-date aging; due today current; 1–30, 31–90, >90; missing maturity separate | [v1 working policy](receivables-aging-v1.md) | Finance | IMPLEMENTATION_APPROVED_V1 / user handoff / formal Finance approval unrecorded |
| F02 | Receivables aging | Inclusive end-of-date Baghdad cutoff; historical reconciliation reconstruction; extraction time separate | [v1 working policy](receivables-aging-v1.md) | Finance | IMPLEMENTATION_APPROVED_V1 / user handoff / formal Finance approval unrecorded |
| F03 | Receivables aging | Remaining residual per maturity component; no percentage rule; missing maturity separate | [v1 working policy](receivables-aging-v1.md) | Finance | IMPLEMENTATION_APPROVED_V1 / user handoff / formal Finance approval unrecorded |
| F04 | Receivables/balance | Aging-only gross positive posted ledger residual; unapplied credits/advances separate; net customer position still pending | [Scoped v1 resolution](receivables-aging-v1.md) | Finance | Broader PENDING; aging IMPLEMENTATION_APPROVED_V1 / formal Finance approval unrecorded |
| F05 | All monetary reports | Aging-only Company-1 IQD recognized ledger basis; transaction lineage retained; other monetary policies pending | [Scoped v1 resolution](receivables-aging-v1.md) | Finance | Broader PENDING; aging IMPLEMENTATION_APPROVED_V1 / formal Finance approval unrecorded |
| F06 | Balance / sales | Choose denominator window and sales basis. Snapshot and period sales must be aligned explicitly | Net invoiced revenue for an explicit month; null for zero denominator | Finance | PENDING / none / none |
| F07 | Collections | Define cash collections, dates, refunds and unallocated receipts. Settlement includes offsets and credits, not just cash | Posted inbound customer cash receipts; show applied and unallocated separately | Finance | PENDING / none / none |
| F08 | Collection ratio | Choose cash-period ratio versus invoice-cohort collection ratio. These ratios answer different questions | Separately name monthly cash / monthly net invoice sales; no cohort equivalence | Finance | PENDING / none / none |
| F09 | Collection/payment days | Choose invoice start, payment end, partial weights and unsettled handling. Cash application and payment date can differ | Amount-weighted applied cash days; partial allocations weighted; unpaid excluded and disclosed | Finance | PENDING / none / none |
| F10 | Supplier payables | Define gross/net payable scope, credits and advances. Net supplier exposure differs from unpaid bills | Separate gross vendor-bill residual from credits/advances and ledger net | Finance | PENDING / none / none |
| F11 | Payables due | Choose calendar month or rolling 30 days and missing due treatment. Missing due dates cannot enter a due bucket reliably | Calendar month due maturities; unknown due separately | Finance | PENDING / none / none |
| F12 | Supplier classification | Define Trade/General Supplier membership and changes. Rank and multi-valued tags are not exclusive supplier types | Owned exclusive supplier taxonomy with explicit unknown and effective dates | Finance | PENDING / none / none |
| F13 | GRNI / delivered not invoiced | Approve invoice-match timing, taxes and valuation bases. Goods quantity differs from financial accrual and sales value | Separate received-not-billed cost/accrual and delivered-not-billed approved sales or cost value | Finance | PENDING / none / none |
| F14 | تكاليف الرسائل | Define what the cost means and allocation to agency/invoice. Shipment, messaging and correspondence costs are different expenses | No default meaning; business must supply examples and allocation rule | Finance | PENDING / none / none |
| F15 | Return percentages | Choose financial credits versus physical returns and denominator cohort. Returns can cross periods and stock/credit events need not coincide | Separate credit-value percentage from physical returned/sold units per compatible UOM | Finance | PENDING / none / none |
| F16 | Expected collections / required payments | Choose contractual schedule or forecast and included liabilities. Forecast probabilities and committed liabilities produce different cash outlooks | Contractual due schedules first; predictive forecast separately named | Finance | PENDING / none / none |
| F17 | Recurring / actual planned expenses | Approve expense scope, recurring source, plan version and accrual/cash basis. No authoritative budget rows observed; recurrence cannot be inferred | Approved external/imported budget version; explicit expense recognition and recurrence schedule | Finance | PENDING / none / none |
| F18 | Cash / liquidity | Approve ledger versus available balances, restricted cash and liability horizon. Ledger cash is not necessarily spendable cash | Separate ledger cash from approved available cash; disclose restrictions | Finance | PENDING / none / none |
| F19 | Gross/net profit and COGS | Approve account mapping, recognition, inventory method and allocations. Order margin cannot establish accounting profit | Reconcile approved P&L and COGS to GL/Trial Balance by period | Finance | PENDING / none / none |
| F20 | Purchases / discounts | Approve PO commitment versus posted purchase accounting and discount baseline. Tax, credits, discount stacking and recognition alter ratios | Separate posted net purchases from PO commitments; approved undiscounted baseline | Finance | PENDING / none / none |
| F21 | Accruals / prepayments | Approve accounts and opening/additions/releases/reversals bridge. Net movement alone hides different activity classes | Explicit opening + increases − releases + corrections = closing | Finance | PENDING / none / none |
| B01 | Agency across all reports | Identify agency and one cross-domain mapping. Brand has no supplier bridge; per-domain aliases would conflict | Owned canonical agency master plus explicit product/vendor allocation; unknown bucket | Sales | PENDING / none / none |
| B02 | Customer groups / classifications | Choose taxonomy, exclusivity and historical handling. Most scoped partners have several tags | Owned customer-group classification with effective dates; explicit multi-membership allocation if desired | Sales | PENDING / none / none |
| B03 | New / one-order / inactive customers | Define first event, qualifying orders, age and inactivity cutoff. Partner creation is not necessarily first business and September is insufficient history | First qualifying sale event; one qualifying order lifetime; inactivity since last qualifying event; exact cutoffs approved | Sales | PENDING / none / none |
| B04 | Sell-through | Approve numerator, stock denominator, replenishment and time window. Sold / current stock differs from sold / available during period | Explicit period sold units / opening available plus receipts; approved UOM and negative-stock policy | Sales | PENDING / none / none |
| B05 | Returns / damage / expiry | Define reasons, stock ownership, expiry thresholds and damage classification. Scrap is not automatically damage; missing expiry must stay unknown | Owned return reasons; explicit expiry bands and unknown; damage only approved reason/location | Operations | PENDING / none / none |
| B06 | Warehouse / transfers / undelivered | Approve warehouse hierarchy, order age, partials and transfer value. Warehouse is not branch; original and remaining order value differ | Remaining undelivered quantity/value from approved clock; internal transfers counted once; approved cost basis | Operations | PENDING / none / none |
| B07 | Branch contribution | Identify actual branch and attribution/allocation policy. No stable branch observed; warehouse and Business Line are different | Owned branch mapping; explicit shared-revenue/expense allocation | Finance | PENDING / none / none |

## Source feasibility and new evidence

Reuse the [discovery catalog](odoo-analytics-capability-catalog.json) and Wave 1 evidence; do not rerun established totals. Source-input profiles in the structured register identify observed model/fields, eligibility, business date, company scope, stable identity, correction/reversal behavior, joins, customization distinction, extraction bounds and authoritative control for each new input family. Operand names are proposed canonical measures, not executable formulas; approved mappings remain future work.

### invoice

**Observed source:** account.move / account.move.line; fields: id, move_type, state, invoice_date, amount_untaxed_signed, partner_id, invoice_user_id, business_line_id, product_id, price_subtotal. **Eligibility/date:** company 1; posted out_invoice/out_refund; invoice product lines only for attribution; invoice_date; accounting date distinct. **Identity/joins:** company + move.id; line.id for product attribution; line.move_id → move.id; product → template/category/brand; no header fanout. **Provenance:** Standard accounting with observed business_line/fixed_discount customizations. **Control:** Approved invoice register, credit-note register and GL; exact header/line totals and every group. Evidence: Wave 1 report, discovery:invoice_controls, discovery:invoice_lineage.

### orders

**Observed source:** sale.order / sale.order.line; fields: id, state, date_order, amount_total, margin, margin_percent, product_id, product_uom_qty, qty_delivered, qty_invoiced, price_subtotal, warehouse_id. **Eligibility/date:** company 1; confirmed sale; exclude draft/cancel; product lines only; date_order in Asia/Baghdad; delivery event distinct. **Identity/joins:** company + order.id; line.id; line.order_id → order.id; product/UOM; stock sale_line_id for delivery. **Provenance:** Standard sale/sale_margin with observed custom fixed discounts and delivery fields. **Control:** Sales register; header/line exact controls; approved line/header/UOM and delivery quantities. Evidence: Wave 1 report, discovery:sales_values, discovery:sales_line_values, discovery:uom_quality.

### receivable

**Observed source:** account.move.line / account.move / account.account; fields: id, partner_id, balance, amount_residual, amount_residual_currency, date, date_maturity, account_id, move_id, invoice_date_due. **Eligibility/date:** company 1 posted asset_receivable lines; invoice-only proposal differs from net ledger scope; explicit sourceAsOf/cutoff; line maturity vs header due policy pending. **Identity/joins:** company + receivable line.id + observation; move.id for distinct invoice count; line.move_id → move; account_type via account; partial/full reconciliation for historical reconstruction. **Provenance:** Standard ledger plus observed customer FIFO/performance custom modules; validate allocation overrides. **Control:** Finance-approved Aged Receivable by maturity/customer plus GL/Trial Balance; full scope ownership, residuals and bucket sum. Evidence: Wave 1 current receivables, discovery:receivable_current, discovery:reconciliation_sides.

### payment

**Observed source:** account.payment / account.partial.reconcile / account.move.line; fields: id, date, state, payment_type, partner_type, move_id, amount_company_currency_signed, amount, debit_move_id, credit_move_id, max_date. **Eligibility/date:** company 1; approved posted cash population/direction; exclude offsets/exchange/credit-only settlement; state policy pending; payment.date vs applied reconciliation max_date; explicit cohort. **Identity/joins:** company + payment.id; partial.id for allocation, avoid double cash count; payment.move_id ↔ payment ledger line ↔ partial debit/credit ↔ invoice ledger line; scope every side. **Provenance:** Standard payment/reconcile with observed customer_payment_fifo_reconcile customization; actual module override not proven. **Control:** Cash/bank receipt/payment register + GL + allocation bridge; applied + unallocated = eligible cash; weighted numerator/denominator separately. Evidence: discovery:payments, discovery:payment_linkage, discovery:reconciliation_sides.

### payable

**Observed source:** account.move.line / account.move / account.account; fields: id, partner_id, balance, amount_residual, date_maturity, date, account_id, move_id. **Eligibility/date:** company 1; posted liability_payable; bill/refund/advance policies pending; current observation; due maturity; posting date for movement. **Identity/joins:** company + payable line.id + observation; line → move/account/partner; scoped partial links for supplier duration. **Provenance:** Standard ledger; classification customization unresolved. **Control:** Aged Payable + supplier GL/Trial Balance; exact residual/date/unknown-due controls. Evidence: Wave2:supplier_ledger, discovery:purchases, discovery:reconciliation.

### stock

**Observed source:** stock.quant / stock.move / stock.move.line / stock.location / stock.warehouse / stock.lot; fields: id, company_id, product_id, location_id, quantity, reserved_quantity, lot_id, expiration_date, state, date, origin_returned_move_id, purchase_line_id, sale_line_id. **Eligibility/date:** company 1 owned/internal stock by approved location; done movement only; direction/owner/scrap pending; current quant observation; done move date for events; lot expiry vs use/removal policy. **Identity/joins:** quant stock key + observation; move/move-line IDs; product/lot stable IDs; locations hierarchy to warehouse; product/UOM; lot; original move for returns; PO/sale line and invoice relation for unbilled. **Provenance:** Standard stock/expiry with installation-specific fields; damaged classification unresolved. **Control:** Stock movement/on-hand/lot expiry reports; UOM/category controls, ownership totals and exact return lineage. Evidence: discovery:inventory_current, discovery:expiry_current, discovery:fulfilment_lineage.

### valuation

**Observed source:** stock.valuation.layer / stock.landed.cost / stock.landed.cost.lines; fields: id, stock_move_id, product_id, quantity, value, remaining_value, company_id, date, vendor_bill_id, account_move_id, amount_total. **Eligibility/date:** company 1 approved stock valuation/costing; landed costs done state after approval; September none observed; valuation recognition/stock event and correction date; current vs period basis pending. **Identity/joins:** valuation layer.id/cost.id; no exact lot layer identity proven; layer → stock move/product; cost → vendor bill/journal/picking relation; avoid duplicated allocation. **Provenance:** Standard valuation/landed-cost models; periodic inventory customization observed. **Control:** Inventory Valuation + GL and approved layer/allocation totals; exact lot value unavailable. Evidence: discovery:valuation, Wave2:landed_costs.

### ledger

**Observed source:** account.move.line / account.move / account.account / account.journal; fields: id, move_id, account_id, journal_id, partner_id, date, debit, credit, balance, currency_id. **Eligibility/date:** company 1 posted journal items, approved chart and debit/credit signs; exclude drafts; posting date for P&L/movement; explicit cutoff for balances. **Identity/joins:** company + ledger line.id; account and journal stable IDs; line → posted move/account/journal; company-scoped account relation; dimensions explicit only. **Provenance:** Standard ledger plus business_line_account_reports and periodic inventory customization; chart approval missing. **Control:** GL + Trial Balance + approved P&L/cash/balance schedule, account-level controls and bridges. Evidence: discovery:cogs_population, discovery:company_currency.

### budget

**Observed source:** account.report.budget / account.report.budget.item (candidate); external approved plan; fields: id, company_id, budget_id, account_id, date, amount. **Eligibility/date:** approved company-1 plan/version; none observed; cannot select latest by guess; planned month; effective/version approval date. **Identity/joins:** approved plan/version + item.id; external line ID if imported; item.budget_id → budget; scoped account mapping; no actual-vs-budget fanout. **Provenance:** Installed budget metadata observed; source plan authority unresolved. **Control:** Finance-approved budget/recurring schedule version, exact input import totals and actual GL bridge. Evidence: Wave2:budgets, Wave2:classification_metadata.

### classification

**Observed source:** res.partner.category / product.brand / product.template / custom owned dimension master; fields: category_id, partner_id, product_brand_id, categ_id, id. **Eligibility/date:** company-scoped fact relationships; shared masters only through those facts; no is_company/customer_rank filter; effective/as-of classification; freeze historical assignment. **Identity/joins:** namespaced category/brand/product/partner IDs; agency/branch/type require approved master; partner category relation (many memberships); template → brand; no agency supplier bridge observed. **Provenance:** Observed product_brand / partner_category_salesperson customization; agency and exclusive supplier type not established. **Control:** Approved dimension membership/version crosswalk and per-metric grouped reconciliation; no Cartesian certification. Evidence: Wave2:agency_bridge, Wave2:partner_category_coverage, Wave2:classification_metadata.

All profiles inherit the explicit company-1 scope, immutable correction/reversal contract and bounded extraction rules recorded in JSON. New group identities, cohort history, valuation and payment allocations require their own controls. A physical column or relation is evidence of an ingredient, not evidence that an authoritative report agrees.

The new [read-only feasibility script](../../scripts/integration/odoo-wave-two-feasibility.mjs) runs six fixed SELECTs in one RR READ ONLY transaction, checks the database/read-only mode, uses EXPLAIN without ANALYZE and 15s/1s limits, rolls back and writes a mode-0600 private operator artifact. Source observations contain aggregate coverage and metadata only; no customer labels, credentials or row extracts enter Git. No Odoo ORM/workflow is invoked.

Observed at **2026-10-06T12:01:46.757Z**, company 1; September event probes and current metadata:

| Query | New finding | Consequence |
| --- | --- | --- |
| classification_metadata | No dedicated agency/supplier_type/return_reason/damage fields in inspected relevant models; budget model metadata exists | Named taxonomy not established; this is a bounded inspected scope, not proof no alternative customization exists |
| agency_bridge | 118 scoped brands, 118 missing partner, 0 supplier partners | No brand/vendor agency crosswalk established |
| partner_category_coverage | 1,936 scoped invoice/bill partners; 61 no tag, 1,582 several tags | Arbitrary category selection would misclassify or double count; approve taxonomy/unknown allocation |
| budgets | Company 1: 0 budgets, 0 items | Authoritative plan/version must be supplied; budget utilization is blocked |
| landed_costs | No September company-1 landed-cost documents | Cannot interpret تكاليف الرسائل as landed costs or certify cost ratio from an empty population |
| supplier_ledger | 22 posted September payable lines, 11 partners; 12 missing maturity | Due-month/payment-days metrics require unknown-due policy and further authoritative controls; not a total supplier balance |

No new live receivable totals, prior-period balances or cash totals were recomputed. Existing 6,379 partial links / 4,799 payment-linked sides and 3,739 payment records are discovery evidence only; offsets, cancellations, outbound payments and 18 missing moves still block cash collection inference.

## Slice recommendation and readiness

1. **Receivables aging:** [v1 working policy](receivables-aging-v1.md) now resolves the aging portion of F01–F05. Engineering prepared an independent historical September-30 control from ledger balances and accounting-effective reconciliation links; Finance confirmation remains pending. After confirmation use the existing immutable mapping/snapshot/reconciliation lifecycle, exact bucket/customer controls and separately certified grouping. Distinct invoice counts must deduplicate installments. Existing current residuals are not substituted for September historical balances.
2. **Collections/duration:** after F07–F09, prove cash direction/state, payment-to-invoice allocation and unallocated bridge. Amount-days and applied amounts are separate controlled operands; weighted collection days remains distinct from DSO.
3. Supplier payables/payment days → GRNI/delivered not invoiced → returns/expiry → cash/liquidity → accounting profitability → branch/agency contribution. Ordering is a recommendation, not automatic implementation authorization.

**New metrics ready for extraction now: 0. New metrics ready for reconciliation now: 0. New metrics certified/published: 0.** Existing invoice/refund base controls can be reused; proposed snapshots have technically feasible ingredients, conditional on approvals and mappings. Branch identity and exact lot/expiry valuation remain unsupported on current evidence. Budgets, recurring schedules, agency/type/reason/damage masters and historical cohort/snapshot coverage require authoritative inputs or validation. Predictive cash forecasts have no approved model. Annual sales/prior-month stock/cohort retention are not proven by a September-only window.

## Verification and preservation

Documentation/source feasibility only: no domain/runtime metric definitions, application behavior, dashboard UI, SQL migration, mart writes or availability changes. No new acceptance tests encode unresolved Finance decisions. Frozen install, lint, architecture (0 diagnostics), quality (0 diagnostics), typecheck, build and diff pass. **612 unit/API tests and 110 PostgreSQL tests pass, zero failures/skips**. The existing nonblocking Vite chunk-size warning remains. Structured catalog cross-reference/approval checks pass. Documentation links are checked after the final edits. Browser verification is not repeated because no publication/availability changed; Wave 1 authenticated evidence is reused and clearly historical.

Order Revenue semantics changed = **No**; Net Invoiced Revenue semantics changed = **No**; Order Margin conflated with Accounting Gross Profit = **No**; existing certifications rewritten = **No**; unsupported customer/month dimensions exposed = **No**. Odoo/production mutation, schema changes, sync, external deployment, release, push, merge, force-push and destructive operations = **No**. Original unrelated Odoo/environment edits and `.archify/` are preserved. Starting and final branch/HEAD are recorded in the delivery report; artifacts remain uncommitted because this handoff did not request a commit.

Canonical input contracts distinguish exact candidate fields from output reuse and unestablished business/external operands. Empty field mappings explicitly mean unresolved, never a fabricated source column. Ledger account sets, opening bridges, forecast probabilities, restrictions, recurrence and agency allocations require approved input contracts before extraction.

A final read-only pilot/staging inspection exactly matches the Wave 1 mapping metadata, all eight lifecycle-table fingerprints and serving bindings. Source-certified totals were not re-queried; the preserved facts/evidence prove no local release mutation. Final branch/HEAD remains `codex/production-pilot-lifecycle` / `167e3d9`; the three new Wave 2 files are uncommitted.
