# El-Dabboos Business Metric Dictionary

Business definition pack v1 · Company 1 · Iraq · IQD · Prepared October 6, 2026.

**Approval preparation only.** Documentation does not approve, certify or publish a metric. Existing published metrics remain governed by their exact release. New approvals are pending; no approver or date is fabricated.

Discovery evidence: 170 candidates, 28 dimensions, 13 domains, 893 physical tables and 269 relevant models. This pack adds explicit business proposals; its 204 entries are definition records, not 204 executable metrics. Counts below describe each definition once, including separately versioned net and gross receivable policies.

| Lifecycle | Definitions |
| --- | --- |
| Certified | 10 |
| Reconciled · Awaiting Business Approval | 15 |
| Defined · Awaiting Reconciliation | 97 |
| Discovered | 50 |
| Unavailable / Insufficient Source Data | 32 |

Certified here means an existing certified definition with published September summaries and Business Line/Salesperson pairs only. Other candidate dimensions are not certified. “Defined” means a written proposal, not an approved meaning. “Reconciled” may be numerical control evidence with identity gaps, explicitly disclosed below. Discovery A/B classifications establish source ingredients only.

Lifecycle: Discovered → Defined → Reconciled → exact-version business approval → certification → explicit publication. Unavailable identifies insufficient capture or source evidence. A generic canonical ID does not certify its Odoo mapping or a grouping.

Existing decisions, retained without reopening:

- Executive Revenue means Net Invoiced Revenue; Order Revenue is separate.

- Refunds recognized on each credit note’s own issue date.

- Business Line is official; Company 1 is Phase 1 Iraq; reporting currency IQD.

An event contributes once within a period: Order Revenue/Count use the order date in Asia/Baghdad; invoices use invoice issue date; each refund uses its own issue date. A snapshot describes the position at one cutoff: receivables, stock and inventory value. Sum positions at the same cutoff; never sum daily snapshots into monthly revenue. Reporting period, snapshot cutoff and source extraction timestamp are different. September sales freshness is October 5 at 14:54:58.149 UTC; the receivable control freshness is October 6 at 12:53:16.128 UTC.

## Finance candidate control — pending confirmation

**CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION.** Cutoff 2026-09-30, IQD. All 15,519 source-ID customer/bucket cases exactly reproduce the workbook (2,217 customers; zero ambiguous, unmatched or unexpected identities). Installed report metadata was inspected at 2026-10-06T18:20:50.379Z; custom code equivalence is not asserted. Finance owner/date/confirmed policy/accepted exceptions are unrecorded. Nothing is business-certified or published.

| Control output | IQD |
| --- | --- |
| Gross Open Receivable Components | 1532751636.39 |
| Signed Open Credit Components | -173290543.78 |
| Net Aged Receivable | 1359461092.61 |
| At-Date Receivable | 759020481.15 |
| 1–30 Days Overdue (Net) | 218464001.82 |
| 31–60 Days Overdue (Net) | 69135500.55 |
| 61–90 Days Overdue (Net) | 25871000.18 |
| 91–120 Days Overdue (Net) | 33782500.14 |
| Over 120 Days Overdue (Net) | 253187608.77 |

The signed net report uses maturity, falling back to accounting date when absent; due on cutoff belongs in At Date. Gross receivables-aging-v1 instead keeps missing maturity in its own bucket and unapplied credits/advances separate, with no allocation. These policies are not interchangeable. Historical reconstruction uses original balance minus debit-side plus credit-side partial settlements with max_date ≤ cutoff, preserving post-cutoff payments and individual installments. Applied credits reduce residual through accounting settlement; unapplied credits are not assigned by the application.

Gross v1: current 760,615,731.13; 1–30 239,405,751.70; 31–90 94,315,000.66; >90 227,502,606.69; missing maturity 210,912,546.21 IQD (1,319 components). 3,864 positive components / 2,039 known customers; 1,324 partially settled components, residual 623,244,340.38; 1,378 credit/advance components −173,290,543.78. Rejects/ambiguous components: 0 in the preserved extraction; identity verification still pending.

## Sales

### Order Count — order_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Count / عدد الطلبات |
| Canonical ID | `order_count` |
| Version / definition hash | 1 / `edeadf667c18c2e0f76df6d1a8145b8301e7d546c1d6acb759df81c8c781bec4` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Order Count |
| Definition | count confirmed orders |
| Formula / proposed formula | count confirmed orders |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date converted from UTC to Asia/Baghdad; September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | count confirmed orders Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Document count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 2895 |
| Known limitations | Existing approved count; preserve local business date and state scope. |

### Order Revenue — order_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Revenue / قيمة طلبات البيع |
| Canonical ID | `order_revenue` |
| Version / definition hash | 1 / `51d3a9a7c2da2dd49a8c6aa5b21aaf6c2f732152f9791d8e6c25187406baab9b` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Order Revenue |
| Definition | sum confirmed tax-inclusive amount_total |
| Formula / proposed formula | sum confirmed tax-inclusive amount_total |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date converted from UTC to Asia/Baghdad; September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | sum confirmed tax-inclusive amount_total Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; order value includes tax, invoice/refund value excludes tax. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 1461335500 |
| Known limitations | Source order value; distinct from invoice revenue and generic revenue. |

### Untaxed Order Revenue — untaxed_order_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Untaxed Order Revenue / قيمة الطلبات قبل الضريبة |
| Canonical ID | Not registered; proposed definition ID only: `untaxed_order_revenue` |
| Version / definition hash | 1 / `6f58c8c3f05e337702e78333d2ef658737339f1204feb27aa9bedcbd5a160315` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Untaxed Order Revenue |
| Definition | sum confirmed untaxed value |
| Formula / proposed formula | sum confirmed untaxed value |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | sum confirmed untaxed value Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | September tax is zero; other periods need controls. |

### Order Tax — order_tax

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Tax / ضريبة الطلبات |
| Canonical ID | Not registered; proposed definition ID only: `order_tax` |
| Version / definition hash | 1 / `e841f03b88d675d7d9d7c42b602a1dfa647fce3fb72db5ae9c0d54685ae0c99a` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Order Tax |
| Definition | sum |
| Formula / proposed formula | sum |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | sum Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Tax rules need explicit approval despite zero September tax. |

### Average Confirmed Order Value — average_confirmed_order_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Confirmed Order Value / متوسط قيمة الطلب المؤكد |
| Canonical ID | `average_confirmed_order_value` |
| Version / definition hash | 1 / `efe25f2f595061f2573c22a04e85ca1d1f8e243e2652075242dfe504d4050f19` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Average Confirmed Order Value |
| Definition | Confirmed tax-inclusive Order Revenue / confirmed Order Count; weighted ratio of totals. |
| Formula / proposed formula | Confirmed tax-inclusive Order Revenue / confirmed Order Count; weighted ratio of totals. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date converted from UTC to Asia/Baghdad; September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | Confirmed tax-inclusive Order Revenue / confirmed Order Count; weighted ratio of totals. Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; order value includes tax, invoice/refund value excludes tax. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 1461335500 / 2895 |
| Known limitations | Zero denominator returns null; ratio of totals. |

### Units Ordered — ordered_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Units Ordered / الكميات المطلوبة |
| Canonical ID | Not registered; proposed definition ID only: `ordered_quantity` |
| Version / definition hash | 1 / `9a4f2912ee7e72f2193300aadb60c13415d85cc77e9d91f7c26428817ef18dbd` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Units Ordered |
| Definition | sum by compatible normalized UOM |
| Formula / proposed formula | sum by compatible normalized UOM |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | sum by compatible normalized UOM Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | No sum of unlike units. |

### Average Units per Order — average_quantity_per_order

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Units per Order / متوسط الكمية لكل طلب |
| Canonical ID | Not registered; proposed definition ID only: `average_quantity_per_order` |
| Version / definition hash | 1 / `66dd749811e390ce15af975cdfc5a86aef0470137dd105925b767d51b7796e72` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Average Units per Order |
| Definition | normalized ordered quantity / distinct confirmed orders |
| Formula / proposed formula | normalized ordered quantity / distinct confirmed orders |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | normalized ordered quantity / distinct confirmed orders Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Product/UOM scoped denominator. |

### Products per Order — products_per_order

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Products per Order / عدد المنتجات لكل طلب |
| Canonical ID | Not registered; proposed definition ID only: `products_per_order` |
| Version / definition hash | 1 / `5fe126139f0173be9d1edc840ffdad88062405c9851541d11bc5221eb29b230f` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Products per Order |
| Definition | average distinct products per order |
| Formula / proposed formula | average distinct products per order |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | average distinct products per order Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Exclude display-only lines. |

### Confirmed Orders — confirmed_orders

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Confirmed Orders / الطلبات المؤكدة |
| Canonical ID | Not registered; proposed definition ID only: `confirmed_orders` |
| Version / definition hash | 1 / `eac9b739b2b6ddef66e3d34d2dc31bcebf7816c97e5b5c17465c3e4aa7206164` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Confirmed Orders |
| Definition | count state sale |
| Formula / proposed formula | count state sale |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | count state sale Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 2895 in September. |

### Draft Quotations — draft_orders

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Draft Quotations / عروض الأسعار غير المؤكدة |
| Canonical ID | Not registered; proposed definition ID only: `draft_orders` |
| Version / definition hash | 1 / `0f03bb0bce56782392c6b6f4e290bbb6a75e6da3f7e810e7e87edebc0cbd0d97` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Draft Quotations |
| Definition | count draft/sent separately |
| Formula / proposed formula | count draft/sent separately |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | count draft/sent separately Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | No September draft rows; schema supports count zero. |

### Cancelled Orders — cancelled_orders

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Cancelled Orders / الطلبات الملغاة |
| Canonical ID | `cancelled_orders` |
| Version / definition hash | 1 / `5ee489a3ea7d055b884d8d80d99af2ce0d727d8e3e1bd68993026a6818aeab3a` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Cancelled Orders |
| Definition | count state cancel |
| Formula / proposed formula | count state cancel |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date converted from UTC to Asia/Baghdad; September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | count state cancel Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Document count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | Count each cancelled order once; missing salesperson/Business Line uses governed Unassigned. Event date remains original Baghdad order date, not cancellation time. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 200 |
| Known limitations | 200 September cancellations; do not mix with confirmed orders. |

### Invoice Completion Rate — invoiced_order_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Invoice Completion Rate / نسبة اكتمال فوترة الطلبات |
| Canonical ID | Not registered; proposed definition ID only: `invoiced_order_rate` |
| Version / definition hash | 1 / `38c140d8c06348d99bbcd3751c8f3512b44d00a3582b4ef91482f08f351c0bc4` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Invoice Completion Rate |
| Definition | 100 × fully invoiced eligible confirmed orders / all eligible confirmed orders. |
| Formula / proposed formula | 100 × fully invoiced eligible confirmed orders / all eligible confirmed orders. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | 100 × fully invoiced eligible confirmed orders / all eligible confirmed orders. Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Eligibility and partial invoicing definitions needed. |

### Order Delivery Rate — delivery_completion_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Delivery Rate / نسبة اكتمال تسليم الطلبات |
| Canonical ID | Not registered; proposed definition ID only: `delivery_completion_rate` |
| Version / definition hash | 1 / `c04709e764d1c711a26cb1554c1a46941bee41bc3a97e5b1b4fdfb2a47052b01` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Order Delivery Rate |
| Definition | 100 × fully delivered eligible confirmed orders / all eligible confirmed orders. |
| Formula / proposed formula | 100 × fully delivered eligible confirmed orders / all eligible confirmed orders. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | 100 × fully delivered eligible confirmed orders / all eligible confirmed orders. Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Define delivery statuses and returns first. |

### Order-to-Delivery Duration — order_delivery_duration

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order-to-Delivery Duration / المدة من الطلب إلى التسليم |
| Canonical ID | Not registered; proposed definition ID only: `order_delivery_duration` |
| Version / definition hash | 1 / `ae978b0762ad3c179b2016aa45f7d3405312701bed7c84663ae610c45cdd7d64` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Order-to-Delivery Duration |
| Definition | effective_date minus date_order |
| Formula / proposed formula | effective_date minus date_order |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | effective_date minus date_order Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | 279 missing effective dates; 18 confirmed negative durations. |

### Order-to-Invoice Duration — order_invoice_duration

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order-to-Invoice Duration / المدة من الطلب إلى الفوترة |
| Canonical ID | Not registered; proposed definition ID only: `order_invoice_duration` |
| Version / definition hash | 1 / `b8397c6e244391f2bcff654bb3bc57f7622be19f8c1a22754254d7fd6a9434e3` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Order-to-Invoice Duration |
| Definition | first/last posted invoice date minus order date |
| Formula / proposed formula | first/last posted invoice date minus order date |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | first/last posted invoice date minus order date Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD for value; counts; compatible product-base UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Many-to-many lineage needs partial invoice and date definition. |

### Cancellation Rate — cancellation_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Cancellation Rate / نسبة إلغاء الطلبات |
| Canonical ID | Not registered; proposed definition ID only: `cancellation_percentage` |
| Version / definition hash | 1 / `de127c6308afdd5de7a671c90a74698b9a85850a5e53b7a766d8bfb4b9dd3298` |
| Business purpose | Support decisions on sales using the named measure and explicit scope. Cancellation Rate |
| Definition | 100 × cancelled orders / (confirmed + cancelled orders) by order date; draft/sent excluded. This is a cohort proposal, not cancellation-event timing. |
| Formula / proposed formula | 100 × cancelled orders / (confirmed + cancelled orders) by order date; draft/sent excluded. This is a cohort proposal, not cancellation-event timing. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date in Asia/Baghdad; September 1–30, 2026. |
| Source concept / Odoo calculation | 100 × cancelled orders / (confirmed + cancelled orders) by order date; draft/sent excluded. This is a cohort proposal, not cancellation-event timing. Confirmed sales orders, with cancelled orders counted separately. |
| Grain | One order counted once; line quantities require a separate product/base-UOM grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed sales orders, with cancelled orders counted separately. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, customer, business_line, warehouse, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

## Invoicing

### Posted Invoice Value — invoiced_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Posted Invoice Value / قيمة الفواتير المُرحّلة |
| Canonical ID | `invoiced_revenue` |
| Version / definition hash | 1 / `cb2795748c081ce2775a2ab6af8b20c20e182a6bea265df3f76389c60583bcee` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Posted Invoice Value |
| Definition | sum posted out_invoice untaxed signed |
| Formula / proposed formula | sum posted out_invoice untaxed signed |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note on its own issue date, September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | sum posted out_invoice untaxed signed Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; order value includes tax, invoice/refund value excludes tax. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 1465712000 |
| Known limitations | Existing certified 1465712000 IQD; unchanged. |

### Refund Value — refund_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Refund Value / قيمة الإشعارات الدائنة |
| Canonical ID | `refund_value` |
| Version / definition hash | 1 / `a1bccedb022e17daf8b2db5e99f0613cf23b8d51816be9054c2fb24d2f0f6dac` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Refund Value |
| Definition | negate sum posted out_refund untaxed signed |
| Formula / proposed formula | negate sum posted out_refund untaxed signed |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note on its own issue date, September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | negate sum posted out_refund untaxed signed Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; order value includes tax, invoice/refund value excludes tax. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 18545500 |
| Known limitations | Existing certified positive 18545500 IQD; source refunds are negative. |

### Net Invoiced Revenue — net_invoiced_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Invoiced Revenue / صافي إيرادات الفواتير |
| Canonical ID | `net_invoiced_revenue` |
| Version / definition hash | 1 / `cb31f7dbab7fc1b166aa94f2bcda990df5163939c0323506c7bd5e14e58982fd` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Net Invoiced Revenue |
| Definition | posted invoice value minus positive refund value |
| Formula / proposed formula | posted invoice value minus positive refund value |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note on its own issue date, September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | posted invoice value minus positive refund value Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; order value includes tax, invoice/refund value excludes tax. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 1447166500 |
| Known limitations | Existing certified 1447166500 IQD; unchanged. |

### Invoice Count — invoice_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Invoice Count / عدد الفواتير |
| Canonical ID | `invoice_count` |
| Version / definition hash | 1 / `459db204da75e1abf41ef72bcfc1836cfaee7f3bcf280f4afe1185684d65a37e` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Invoice Count |
| Definition | count posted out_invoice |
| Formula / proposed formula | count posted out_invoice |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note on its own issue date, September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | count posted out_invoice Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Document count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 2890 |
| Known limitations | 2890 September invoices. |

### Refund Count — refund_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Refund Count / عدد الإشعارات الدائنة |
| Canonical ID | `refund_count` |
| Version / definition hash | 1 / `9d16b82f3ecfddc90a98532d983973169e9be7df0898987559d9b031e75d1598` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Refund Count |
| Definition | count posted out_refund |
| Formula / proposed formula | count posted out_refund |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note on its own issue date, September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | count posted out_refund Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Document count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 120 |
| Known limitations | 120 September refunds. |

### Average Invoice Value — average_invoice_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Invoice Value / متوسط قيمة الفاتورة |
| Canonical ID | `average_invoice_value` |
| Version / definition hash | 1 / `2a9de4bfbbc8ffa7bcf901f10db1325ab4a45dacb8642d1364abcae61a906dc4` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Average Invoice Value |
| Definition | posted untaxed invoice value / posted invoice count |
| Formula / proposed formula | posted untaxed invoice value / posted invoice count |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note on its own issue date, September 1–30, 2026 inclusive. |
| Source concept / Odoo calculation | posted untaxed invoice value / posted invoice count Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One eligible document; ratio uses matching sums/counts of those documents. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; order value includes tax, invoice/refund value excludes tax. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | business_line, salesperson |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Existing exact release controls and derived-output approvals where applicable; no new evidence added. |
| Business approval | Existing established approval; do not reopen. Registry/reference remains authoritative. |
| Certification / publication | Existing certified/published September summary and exact Business Line/Salesperson pairs only. |
| One lifecycle state | Certified |
| Control example, not a definition constant | 1465712000 / 2890 |
| Known limitations | Choose untaxed or tax-inclusive definition explicitly. |

### Untaxed Invoice Value — untaxed_invoice_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Untaxed Invoice Value / قيمة الفواتير قبل الضريبة |
| Canonical ID | Not registered; proposed definition ID only: `untaxed_invoice_value` |
| Version / definition hash | 1 / `814fd9f0b3959d3a711e558de85046c49617dc751c6f971ba13adadb6a4090a7` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Untaxed Invoice Value |
| Definition | sum posted out_invoice |
| Formula / proposed formula | sum posted out_invoice |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | sum posted out_invoice Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-currency IQD, before tax for the certified invoice values; counts/UOM where specified. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Same source measure as approved posted_invoice_value; avoid duplicate semantics. |

### Invoice Tax — invoice_tax

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Invoice Tax / ضريبة الفواتير |
| Canonical ID | Not registered; proposed definition ID only: `invoice_tax` |
| Version / definition hash | 1 / `533179016f3ab65b4ce1daa44a3d834e9260a398b5b59c052ce59d6be9e8e122` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Invoice Tax |
| Definition | sum with explicit invoice/refund sign scope |
| Formula / proposed formula | sum with explicit invoice/refund sign scope |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | sum with explicit invoice/refund sign scope Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-currency IQD, before tax for the certified invoice values; counts/UOM where specified. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | September zero; gross/untaxed equality is incidental. |

### Tax-inclusive Invoice Value — gross_invoice_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Tax-inclusive Invoice Value / قيمة الفواتير شاملة الضريبة |
| Canonical ID | Not registered; proposed definition ID only: `gross_invoice_value` |
| Version / definition hash | 1 / `5638c8e0870b913d4f0fc6a80ae4c6fc089d0a698a1fd0fb4cb852bb6ac5a873` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Tax-inclusive Invoice Value |
| Definition | sum posted out_invoice |
| Formula / proposed formula | sum posted out_invoice |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | sum posted out_invoice Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-currency IQD, before tax for the certified invoice values; counts/UOM where specified. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Tax-inclusive; distinct definition from approved untaxed headline. |

### Refund Count Percentage — refund_count_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Refund Count Percentage / نسبة الإشعارات الدائنة إلى عدد الفواتير |
| Canonical ID | Not registered; proposed definition ID only: `refund_count_percentage` |
| Version / definition hash | 1 / `c26d8b2f190e70170aca38f1faac8786a17cf7a01488330c49ab4768d37b2e21` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Refund Count Percentage |
| Definition | 100 × Refund Count / Invoice Count; document-count ratio, not proportion of original invoices refunded. |
| Formula / proposed formula | 100 × Refund Count / Invoice Count; document-count ratio, not proportion of original invoices refunded. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | 100 × Refund Count / Invoice Count; document-count ratio, not proportion of original invoices refunded. Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Period ratio versus original-invoice cohort differs. |

### Refund Value Percentage — refund_value_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Refund Value Percentage / نسبة قيمة الإشعارات الدائنة إلى الفواتير |
| Canonical ID | Not registered; proposed definition ID only: `refund_value_percentage` |
| Version / definition hash | 1 / `81a317afcde3b8ff492fd4b20cbf5f40c3621b92f953286cf293a322613232d2` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Refund Value Percentage |
| Definition | 100 × positive Refund Value / Posted Invoice Value in the same issue-date window. |
| Formula / proposed formula | 100 × positive Refund Value / Posted Invoice Value in the same issue-date window. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | 100 × positive Refund Value / Posted Invoice Value in the same issue-date window. Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Denominator and cohort approval needed. |

### Net Invoiced Quantity — invoice_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Invoiced Quantity / صافي الكمية المفوترة |
| Canonical ID | Not registered; proposed definition ID only: `invoice_quantity` |
| Version / definition hash | 1 / `56e6bfe857c75bba198f43f198c1e63601a183dfa7161559426c5d7400939384` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Net Invoiced Quantity |
| Definition | signed product-line quantities by normalized UOM |
| Formula / proposed formula | signed product-line quantities by normalized UOM |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | signed product-line quantities by normalized UOM Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-currency IQD, before tax for the certified invoice values; counts/UOM where specified. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Invoice quantity positive; refund polarity applied by move_type. |

### Net Average Selling Price — average_unit_selling_price

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Average Selling Price / متوسط سعر البيع الصافي |
| Canonical ID | Not registered; proposed definition ID only: `average_unit_selling_price` |
| Version / definition hash | 1 / `dff98883bd3c1408c25791e02e38d1ba4b39bf2a64bb7ec62a5fe6186ab753c7` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Net Average Selling Price |
| Definition | signed untaxed line revenue / signed normalized quantity |
| Formula / proposed formula | signed untaxed line revenue / signed normalized quantity |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | signed untaxed line revenue / signed normalized quantity Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-currency IQD, before tax for the certified invoice values; counts/UOM where specified. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Choose gross or net basis; zero returns null. |

### Invoice Discount Amount — invoice_discount_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Invoice Discount Amount / قيمة خصم الفواتير |
| Canonical ID | Not registered; proposed definition ID only: `invoice_discount_amount` |
| Version / definition hash | 1 / `d08f062023c74d75ed7a79b85eb3c9c37a79252095a54416c60d315cdd31da0f` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Invoice Discount Amount |
| Definition | approved undiscounted baseline minus actual subtotal |
| Formula / proposed formula | approved undiscounted baseline minus actual subtotal |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | approved undiscounted baseline minus actual subtotal Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-currency IQD, before tax for the certified invoice values; counts/UOM where specified. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Percent/fixed discounts all zero in September; validate custom fixed discount formula. |

### Invoice Discount Percentage — invoice_discount_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Invoice Discount Percentage / نسبة خصم الفواتير |
| Canonical ID | Not registered; proposed definition ID only: `invoice_discount_rate` |
| Version / definition hash | 1 / `443af0b085b4ec3f1f5d83f3d2fe147d2e0f93e0effcc48d6f84edd5bef3e70c` |
| Business purpose | Support decisions on invoicing using the named measure and explicit scope. Invoice Discount Percentage |
| Definition | discount amount / approved baseline |
| Formula / proposed formula | discount amount / approved baseline |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; each credit note uses its own issue date. September 2026. |
| Source concept / Odoo calculation | discount amount / approved baseline Posted customer invoices and posted credit notes; supplier bills excluded. |
| Grain | One customer invoice or credit note; product quantities/prices use one eligible product line. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted customer invoices and posted credit notes; supplier bills excluded. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, sales_team, state, city, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Business baseline and stacking order unresolved. |

## Receivables

### Current Net Receivable Balance — outstanding_receivables

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Current Net Receivable Balance / صافي رصيد الذمم الحالي |
| Canonical ID | Not registered; proposed definition ID only: `outstanding_receivables` |
| Version / definition hash | 1 / `cbf0b3b1e1def3a7e7042e24d93f0b417220d20a7a5f962922c93460c2bce13c` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Current Net Receivable Balance |
| Definition | current posted receivable residual net of credits |
| Formula / proposed formula | current posted receivable residual net of credits |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current posted receivable residual net of credits Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Include openings/credits/unallocated payments policy; current snapshot only. |

### Current Invoice Residual — invoice_outstanding_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Current Invoice Residual / الرصيد الحالي المتبقي للفواتير |
| Canonical ID | Not registered; proposed definition ID only: `invoice_outstanding_amount` |
| Version / definition hash | 1 / `e38a3071a7e864a3ac96ee3f72371c2b13f044fa1c375e47cd1391379e064630` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Current Invoice Residual |
| Definition | current residual of posted invoices with explicit refund scope |
| Formula / proposed formula | current residual of posted invoices with explicit refund scope |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current residual of posted invoices with explicit refund scope Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Not September-closing outstanding; freeze observed_at snapshot. |

### Settled Invoice Amount — paid_invoice_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Settled Invoice Amount / قيمة التسويات على الفواتير |
| Canonical ID | Not registered; proposed definition ID only: `paid_invoice_amount` |
| Version / definition hash | 1 / `7d4c2da0932f2ad7ea40d0cb606831f095cd276bccbd8adbdb7d82d9b4ccc871` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Settled Invoice Amount |
| Definition | reconstruct invoice settlements by payment/reconciliation type |
| Formula / proposed formula | reconstruct invoice settlements by payment/reconciliation type |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Snapshot cutoff September 30, 2026; current residual observations are October snapshots, not September close. Collections use an approved settlement/cash date still to be selected. |
| Source concept / Odoo calculation | reconstruct invoice settlements by payment/reconciliation type Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Residual subtraction includes credits/adjustments, not cash collections. |

### Customer Cash Collections — collection_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Cash Collections / المتحصلات النقدية من العملاء |
| Canonical ID | Not registered; proposed definition ID only: `collection_amount` |
| Version / definition hash | 1 / `39864c7d3f1166e0ff06f9920416d246e29298e8d38b734392185cbec47d0b91` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Customer Cash Collections |
| Definition | maximally attributed inbound customer cash settlements |
| Formula / proposed formula | maximally attributed inbound customer cash settlements |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Snapshot cutoff September 30, 2026; current residual observations are October snapshots, not September close. Collections use an approved settlement/cash date still to be selected. |
| Source concept / Odoo calculation | maximally attributed inbound customer cash settlements Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | 18 of 3739 payments lack move; 4799 of 6379 partial links have payment_id on a side. |

### Collection Rate Candidate — collection_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Collection Rate Candidate / نسبة التحصيل المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `collection_rate` |
| Version / definition hash | 1 / `18ea67759c0bec6013d456fb84dc4ec8d95b8c58e07fd74eb8b7d471a3f97c28` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Collection Rate Candidate |
| Definition | approved collections / approved billed or due cohort |
| Formula / proposed formula | approved collections / approved billed or due cohort |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Snapshot cutoff September 30, 2026; current residual observations are October snapshots, not September close. Collections use an approved settlement/cash date still to be selected. |
| Source concept / Odoo calculation | approved collections / approved billed or due cohort Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Cash receipt date versus settlement and invoice cohort decision. |

### Overdue Receivable Candidate — overdue_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Overdue Receivable Candidate / رصيد الذمم المتأخر المقترح |
| Canonical ID | `overdue_amount` |
| Version / definition hash | 1 / `69e65a698a8144b1568a64a23416eb16d135018c2cf02d57dfd58ddbc115ae27` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Overdue Receivable Candidate |
| Definition | current residual where due before as-of |
| Formula / proposed formula | current residual where due before as-of |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current residual where due before as-of Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Missing due dates must remain visible; credit treatment needs policy. |

### Current Receivable Candidate — not_yet_due_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Current Receivable Candidate / رصيد الذمم غير المتأخر المقترح |
| Canonical ID | Not registered; proposed definition ID only: `not_yet_due_amount` |
| Version / definition hash | 1 / `ee102a915c69c1093f16bc56c05a8a828039c5935c7e0093008efda6b7eca64b` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Current Receivable Candidate |
| Definition | current residual due on/after as-of |
| Formula / proposed formula | current residual due on/after as-of |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current residual due on/after as-of Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Unknown due dates stay separate. |

### Legacy 0–30 Aging Candidate — aged_receivables_0_30

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Legacy 0–30 Aging Candidate / شريحة الأعمار القديمة من صفر إلى 30 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `aged_receivables_0_30` |
| Version / definition hash | 1 / `e399d2bc55ae8b7fab2909d6538796d1ab162129c1b874ab96873da08544f533` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Legacy 0–30 Aging Candidate |
| Definition | residual where days overdue 0 through 30 |
| Formula / proposed formula | residual where days overdue 0 through 30 |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | residual where days overdue 0 through 30 Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Define due-today and future buckets separately. |

### 31–60 Aging Candidate — aged_receivables_31_60

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | 31–60 Aging Candidate / شريحة الأعمار من 31 إلى 60 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `aged_receivables_31_60` |
| Version / definition hash | 1 / `36b483740d78287af2832f1f308a44217131c18ea5cf1662c607f7eaf38b9e49` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. 31–60 Aging Candidate |
| Definition | residual where days overdue 31 through 60 |
| Formula / proposed formula | residual where days overdue 31 through 60 |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | residual where days overdue 31 through 60 Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Current snapshot; no historic closing inference. |

### 61–90 Aging Candidate — aged_receivables_61_90

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | 61–90 Aging Candidate / شريحة الأعمار من 61 إلى 90 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `aged_receivables_61_90` |
| Version / definition hash | 1 / `0ce54c947963b09c9c69b4bbd5eea5d4fdffa3986d3d67a71cce0486aa54ea16` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. 61–90 Aging Candidate |
| Definition | residual where days overdue 61 through 90 |
| Formula / proposed formula | residual where days overdue 61 through 90 |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | residual where days overdue 61 through 90 Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Current snapshot. |

### Over-90 Aging Candidate — aged_receivables_90_plus

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Over-90 Aging Candidate / شريحة الأعمار التي تتجاوز 90 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `aged_receivables_90_plus` |
| Version / definition hash | 1 / `c482a1d7a7303d3f54cec4b56018faa43ec8589561f052fa3762086a0145b182` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Over-90 Aging Candidate |
| Definition | residual where days overdue greater than 90 |
| Formula / proposed formula | residual where days overdue greater than 90 |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | residual where days overdue greater than 90 Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Label 90+ boundary must avoid overlap with 61-90. |

### Overdue Invoice Count Candidate — overdue_invoice_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Overdue Invoice Count Candidate / عدد الفواتير المتأخرة المقترح |
| Canonical ID | Not registered; proposed definition ID only: `overdue_invoice_count` |
| Version / definition hash | 1 / `ebe91f68c2317216a375a3d24b41ce1dcfe467ee1077bdd3e3f0386996b8dca2` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Overdue Invoice Count Candidate |
| Definition | distinct posted unpaid overdue invoices |
| Formula / proposed formula | distinct posted unpaid overdue invoices |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | distinct posted unpaid overdue invoices Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Invoice header versus instalment-line due date decision. |

### Average Days Overdue Candidate — average_days_overdue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Days Overdue Candidate / متوسط أيام التأخر المقترح |
| Canonical ID | Not registered; proposed definition ID only: `average_days_overdue` |
| Version / definition hash | 1 / `b2a738c73472ce01e7b3b52774aab4fe64c991ff94f7a409f5e615917eb62bf4` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Average Days Overdue Candidate |
| Definition | approved weighted/unweighted overdue-day average |
| Formula / proposed formula | approved weighted/unweighted overdue-day average |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | approved weighted/unweighted overdue-day average Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Weight by outstanding amount or invoice count must be chosen. |

### Days Sales Outstanding Candidate — dso

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Days Sales Outstanding Candidate / أيام المبيعات القائمة للتحصيل المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `dso` |
| Version / definition hash | 1 / `a9fceff3979229a20ed04f3a53f9eb2b67156dae8714e578ca515fd663618298` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Days Sales Outstanding Candidate |
| Definition | approved debtor-days ratio using closing/average AR and credit sales |
| Formula / proposed formula | approved debtor-days ratio using closing/average AR and credit sales |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | approved debtor-days ratio using closing/average AR and credit sales Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Historical snapshots/openings and credit-sale policy required. |

### Historical Receivable Reconstruction — historical_receivables

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Historical Receivable Reconstruction / إعادة بناء رصيد الذمم التاريخي |
| Canonical ID | Not registered; proposed definition ID only: `historical_receivables` |
| Version / definition hash | 1 / `554bf81c8aa93a0881add1621162d4585103f633525b89e4d75b95b50e6d4615` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Historical Receivable Reconstruction |
| Definition | reconstruct residual as-of historical date |
| Formula / proposed formula | reconstruct residual as-of historical date |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | reconstruct residual as-of historical date Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Mutable reconciliation and posting/cancellation history need validation. |

### Stored Partner Balance Fields — partner_balance_before_after

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stored Partner Balance Fields / حقول رصيد العميل قبل الحركة وبعدها |
| Canonical ID | Not registered; proposed definition ID only: `partner_balance_before_after` |
| Version / definition hash | 1 / `55e10c8e7adb3236be70289565c5b29d29e765db23beb8ca80c36a3c9546faac` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Stored Partner Balance Fields |
| Definition | unusable physical balance columns |
| Formula / proposed formula | unusable physical balance columns |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | unusable physical balance columns Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Metadata store=false and all 3010 sampled columns null; not reliable snapshots. |

### Customers with Positive Receivable Balance — customers_positive_receivable

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customers with Positive Receivable Balance / العملاء ذوو رصيد ذمم موجب |
| Canonical ID | Not registered; proposed definition ID only: `customers_positive_receivable` |
| Version / definition hash | 1 / `2422c9970d7e40b61696cb8a209768ff91fb2d7462e0414caf3efa7ec0647ec4` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Customers with Positive Receivable Balance |
| Definition | Count stable customers with signed net company receivable balance > 0 at cutoff; not the count of customers with any positive component. |
| Formula / proposed formula | Count stable customers with signed net company receivable balance > 0 at cutoff; not the count of customers with any positive component. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Count stable customers with signed net company receivable balance > 0 at cutoff; not the count of customers with any positive component. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Customers with Credit Balance — customers_credit_balance

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customers with Credit Balance / العملاء ذوو رصيد دائن |
| Canonical ID | Not registered; proposed definition ID only: `customers_credit_balance` |
| Version / definition hash | 1 / `75d99d15c0745176745f5b1fc5899db1c003909dc4653644c4a52145a9a0b7c0` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Customers with Credit Balance |
| Definition | Count stable customers with signed net company receivable balance < 0 at cutoff. |
| Formula / proposed formula | Count stable customers with signed net company receivable balance < 0 at cutoff. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Count stable customers with signed net company receivable balance < 0 at cutoff. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Overdue Customer Count — overdue_customer_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Overdue Customer Count / عدد العملاء ذوي ذمم متأخرة |
| Canonical ID | Not registered; proposed definition ID only: `overdue_customer_count` |
| Version / definition hash | 1 / `24040f2e20ba2c403659502d044f37e97025878fa1461fad827e3c6089b43225` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Overdue Customer Count |
| Definition | Count stable customers with positive overdue components at cutoff, without arbitrary allocation of unapplied credits. |
| Formula / proposed formula | Count stable customers with positive overdue components at cutoff, without arbitrary allocation of unapplied credits. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Count stable customers with positive overdue components at cutoff, without arbitrary allocation of unapplied credits. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Gross Open Receivable Components — receivables_gross_outstanding_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Gross Open Receivable Components / إجمالي مكونات الذمم المفتوحة الموجبة |
| Canonical ID | Not registered; proposed definition ID only: `receivables_gross_outstanding_amount` |
| Version / definition hash | receivables-aging-v1 / `ab8d1f90932cbf73b9f183b4103ff9290a40d4109fb6d7e0199eb56a764f54cb` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Gross Open Receivable Components |
| Definition | Sum positive reconstructed component residuals; maturity missing stays separate. |
| Formula / proposed formula | Sum positive reconstructed component residuals; maturity missing stays separate. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Sum positive reconstructed component residuals; maturity missing stays separate. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 1532751636.39 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Signed Open Credit Components — credit_balances

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Signed Open Credit Components / مكونات الأرصدة الدائنة المفتوحة بإشارتها |
| Canonical ID | Not registered; proposed definition ID only: `credit_balances` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `629b243ec953fca55a8da4cd596a40a04f2c5709b928e34482f5e8c50b69b8c6` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Signed Open Credit Components |
| Definition | Sum negative open components without allocating advances to invoice age. |
| Formula / proposed formula | Sum negative open components without allocating advances to invoice age. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Sum negative open components without allocating advances to invoice age. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | -173290543.78 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Net Aged Receivable — net_aged_receivable

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Aged Receivable / صافي الذمم حسب تقرير الأعمار |
| Canonical ID | Not registered; proposed definition ID only: `net_aged_receivable` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `25561db9b16b7017ebb2cfdb45bf5cb15a2bc47c8faefefd5a3aede4b7d72b31` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Net Aged Receivable |
| Definition | Signed gross positive components + signed negative components; net Odoo report definition, separate from gross-aging-v1. |
| Formula / proposed formula | Signed gross positive components + signed negative components; net Odoo report definition, separate from gross-aging-v1. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed gross positive components + signed negative components; net Odoo report definition, separate from gross-aging-v1. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 1359461092.61 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### At-Date Receivable — aged_at_date

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | At-Date Receivable / ذمم غير متأخرة في تاريخ التقرير |
| Canonical ID | Not registered; proposed definition ID only: `aged_at_date` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `0109ae39ed22518b7bebed96299d63909eb79540b5b55144727cdde62c0d40a7` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. At-Date Receivable |
| Definition | Signed residual with effective due date ≥ cutoff; missing maturity uses accounting-date fallback in net Odoo reconstruction only. |
| Formula / proposed formula | Signed residual with effective due date ≥ cutoff; missing maturity uses accounting-date fallback in net Odoo reconstruction only. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed residual with effective due date ≥ cutoff; missing maturity uses accounting-date fallback in net Odoo reconstruction only. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 759020481.15 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### 1–30 Days Overdue (Net) — aged_1_30

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | 1–30 Days Overdue (Net) / متأخرات من 1 إلى 30 يوماً بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `aged_1_30` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `d0f5572a5b129dc8b91ce231a5f495633a00ac7a68bf9893c1ea2ea0c07d420c` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. 1–30 Days Overdue (Net) |
| Definition | Signed residual where effective days overdue are 1–30. |
| Formula / proposed formula | Signed residual where effective days overdue are 1–30. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed residual where effective days overdue are 1–30. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 218464001.82 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### 31–60 Days Overdue (Net) — aged_31_60

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | 31–60 Days Overdue (Net) / متأخرات من 31 إلى 60 يوماً بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `aged_31_60` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `aa3b87bda887554b29721cabcd803edf6de933ed69c24977cb4fa4c8ef580e81` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. 31–60 Days Overdue (Net) |
| Definition | Signed residual where effective days overdue are 31–60. |
| Formula / proposed formula | Signed residual where effective days overdue are 31–60. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed residual where effective days overdue are 31–60. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 69135500.55 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### 61–90 Days Overdue (Net) — aged_61_90

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | 61–90 Days Overdue (Net) / متأخرات من 61 إلى 90 يوماً بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `aged_61_90` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `a3084fa4878dc6a69141529f93078736930bcc6f6ba388387b8403f07180aa0d` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. 61–90 Days Overdue (Net) |
| Definition | Signed residual where effective days overdue are 61–90. |
| Formula / proposed formula | Signed residual where effective days overdue are 61–90. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed residual where effective days overdue are 61–90. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 25871000.18 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### 91–120 Days Overdue (Net) — aged_91_120

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | 91–120 Days Overdue (Net) / متأخرات من 91 إلى 120 يوماً بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `aged_91_120` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `82b5a2d56f1918bfcec27062c43074d467e7ffddcaccc1d835da53febd9ced1f` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. 91–120 Days Overdue (Net) |
| Definition | Signed residual where effective days overdue are 91–120. |
| Formula / proposed formula | Signed residual where effective days overdue are 91–120. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed residual where effective days overdue are 91–120. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 33782500.14 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Over 120 Days Overdue (Net) — aged_over_120

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Over 120 Days Overdue (Net) / متأخرات تتجاوز 120 يوماً بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `aged_over_120` |
| Version / definition hash | odoo-aged-report-reconstruction-v1 / `7c0057b92c12aff22f3f588e5f78b435c21d3fb7928be0955cfecdfe1b311268` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Over 120 Days Overdue (Net) |
| Definition | Signed residual where effective days overdue exceed 120. |
| Formula / proposed formula | Signed residual where effective days overdue exceed 120. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Signed residual where effective days overdue exceed 120. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 253187608.77 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Current Gross Receivables — receivables_current_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Current Gross Receivables / ذمم موجبة غير متأخرة |
| Canonical ID | Not registered; proposed definition ID only: `receivables_current_amount` |
| Version / definition hash | receivables-aging-v1 / `41ee80f564567e332eccbcea3b224f3617b0748b09fe25c3a9d7bc114f3057ed` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Current Gross Receivables |
| Definition | Positive residual with maturity ≥ cutoff; no missing-date fallback. |
| Formula / proposed formula | Positive residual with maturity ≥ cutoff; no missing-date fallback. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Positive residual with maturity ≥ cutoff; no missing-date fallback. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 760615731.13 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Gross 1–30 Days Overdue — receivables_overdue_1_30_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Gross 1–30 Days Overdue / ذمم موجبة متأخرة من 1 إلى 30 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `receivables_overdue_1_30_amount` |
| Version / definition hash | receivables-aging-v1 / `37b71eafc9d991dcabd014f87e6692bd818bf81978f438fc76a0fa27e264413b` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Gross 1–30 Days Overdue |
| Definition | Positive residual with 1–30 days overdue using actual maturity. |
| Formula / proposed formula | Positive residual with 1–30 days overdue using actual maturity. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Positive residual with 1–30 days overdue using actual maturity. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 239405751.70 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Gross 31–90 Days Overdue — receivables_overdue_31_90_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Gross 31–90 Days Overdue / ذمم موجبة متأخرة من 31 إلى 90 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `receivables_overdue_31_90_amount` |
| Version / definition hash | receivables-aging-v1 / `c45e0619bbf0040efc69fa3fdad410d4c206e9123a0aa9c5f64b094087ac91bd` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Gross 31–90 Days Overdue |
| Definition | Positive residual with 31–90 days overdue using actual maturity. |
| Formula / proposed formula | Positive residual with 31–90 days overdue using actual maturity. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Positive residual with 31–90 days overdue using actual maturity. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 94315000.66 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Gross Over-90 Days Overdue — receivables_overdue_over_90_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Gross Over-90 Days Overdue / ذمم موجبة متأخرة أكثر من 90 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `receivables_overdue_over_90_amount` |
| Version / definition hash | receivables-aging-v1 / `65751f24aac04df66cf668c68d960eb7a2ddcec178d1692d5f247784daf7d69d` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Gross Over-90 Days Overdue |
| Definition | Positive residual with >90 days overdue using actual maturity. |
| Formula / proposed formula | Positive residual with >90 days overdue using actual maturity. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Positive residual with >90 days overdue using actual maturity. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 227502606.69 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Missing Due Date Amount — receivables_missing_due_date_amount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Missing Due Date Amount / قيمة الذمم ذات الاستحقاق المفقود |
| Canonical ID | Not registered; proposed definition ID only: `receivables_missing_due_date_amount` |
| Version / definition hash | receivables-aging-v1 / `064a8b50a0eed41c4a29d1b38888477166945a112f7b14c910009ff6f09f9ce9` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Missing Due Date Amount |
| Definition | Positive open residual where actual maturity is absent; retained in gross outside other buckets. |
| Formula / proposed formula | Positive open residual where actual maturity is absent; retained in gross outside other buckets. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Positive open residual where actual maturity is absent; retained in gross outside other buckets. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 210912546.21 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Missing Due Date Component Count — receivables_missing_due_date_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Missing Due Date Component Count / عدد مكونات الذمم ذات الاستحقاق المفقود |
| Canonical ID | Not registered; proposed definition ID only: `receivables_missing_due_date_count` |
| Version / definition hash | receivables-aging-v1 / `310b1816754d98db051fb8c62b47f1c649fe5d5fdb91e2ef3f8bca6ae40239ad` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Missing Due Date Component Count |
| Definition | Count positive open maturity components with missing due date; not invoice count. |
| Formula / proposed formula | Count positive open maturity components with missing due date; not invoice count. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Count positive open maturity components with missing due date; not invoice count. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Open receivable component count; not invoice count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Preserved independent numerical control; partner identity/source-report gaps remain. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Reconciled · Awaiting Business Approval |
| Control example, not a definition constant | 1319 |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Total Overdue (Net) — total_overdue_net

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Total Overdue (Net) / إجمالي المتأخرات بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `total_overdue_net` |
| Version / definition hash | 1 / `c2d7495544b987fdaaccf36843b633338bec10ebbb24ab3a991b88cec2b3d969` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Total Overdue (Net) |
| Definition | Sum net 1–30, 31–60, 61–90, 91–120 and >120 buckets; derived candidate 600,440,611.46 IQD. |
| Formula / proposed formula | Sum net 1–30, 31–60, 61–90, 91–120 and >120 buckets; derived candidate 600,440,611.46 IQD. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | Sum net 1–30, 31–60, 61–90, 91–120 and >120 buckets; derived candidate 600,440,611.46 IQD. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Company-ledger IQD, legal receivable includes tax; never sum document-currency USD with IQD. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

### Overdue Percentage (Net) — overdue_net_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Overdue Percentage (Net) / نسبة المتأخرات بالصافي |
| Canonical ID | Not registered; proposed definition ID only: `overdue_net_percentage` |
| Version / definition hash | 1 / `039e17662bdc8f913ce12a1929d71d616e55fb8c597f43bc51dd1b6ca4102685` |
| Business purpose | Support decisions on receivables using the named measure and explicit scope. Overdue Percentage (Net) |
| Definition | 100 × net total overdue / net aged receivable; net credits can make percentages unusual. No approved ratio yet. |
| Formula / proposed formula | 100 × net total overdue / net aged receivable; net credits can make percentages unusual. No approved ratio yet. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Historical snapshot cutoff September 30, 2026; accounting entries/settlements effective by cutoff only. |
| Source concept / Odoo calculation | 100 × net total overdue / net aged receivable; net credits can make percentages unusual. No approved ratio yet. Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Grain | One receivable maturity/installment component; invoice counts require distinct invoice identity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, currency, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION. The verified source-ID bridge and all 15,519 customer/bucket cases match exactly (2,217 customers; no ambiguous, unmatched or unexpected identities). Installed report metadata was inspected; custom Python equivalence and report-policy confirmation remain Finance decisions. No business certification/publication. Historical residual = original balance − debit-side partial amounts + credit-side partial amounts effective by cutoff, rounded at observed IQD 0.001 precision; post-cutoff payments do not erase historic balances. |

## Customers

### Active Customers Candidate — active_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Active Customers Candidate / العملاء النشطون المقترحون |
| Canonical ID | Not registered; proposed definition ID only: `active_customers` |
| Version / definition hash | 1 / `2e5709a1eaeb34ab0029386f81002238376556445ab5f1b3bbadcdb7b7e3c11b` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Active Customers Candidate |
| Definition | count approved eligible active outlets |
| Formula / proposed formula | count approved eligible active outlets |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | count approved eligible active outlets Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Odoo active is archive flag, not trading activity. |

### Ordering Customers — ordering_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Ordering Customers / العملاء أصحاب الطلبات |
| Canonical ID | Not registered; proposed definition ID only: `ordering_customers` |
| Version / definition hash | 1 / `1378cf573d0914c9762a0c370c9466bbcc8478fe46b951cbd894fa7a7fa14a36` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Ordering Customers |
| Definition | distinct customers with confirmed orders |
| Formula / proposed formula | distinct customers with confirmed orders |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | distinct customers with confirmed orders Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 1939 sampled customer cohort includes cancellations; confirmed-only control still required. |

### New Customers Candidate — new_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | New Customers Candidate / العملاء الجدد المقترحون |
| Canonical ID | Not registered; proposed definition ID only: `new_customers` |
| Version / definition hash | 1 / `6a2cbc299c010eb27815ea09e0d39853498ab70723889823ca0036c05f6aa326` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. New Customers Candidate |
| Definition | first approved purchase or created-customer cohort |
| Formula / proposed formula | first approved purchase or created-customer cohort |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | first approved purchase or created-customer cohort Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Record creation versus first sale differs; history starts 2024. |

### Order Revenue per Ordering Customer — revenue_per_customer

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Revenue per Ordering Customer / قيمة الطلبات لكل عميل صاحب طلب |
| Canonical ID | Not registered; proposed definition ID only: `revenue_per_customer` |
| Version / definition hash | 1 / `2686a1325749c52e100f804caa94649584c0c17b26e653386848e2e9f9d831a3` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Order Revenue per Ordering Customer |
| Definition | confirmed order value / distinct ordering customers |
| Formula / proposed formula | confirmed order value / distinct ordering customers |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | confirmed order value / distinct ordering customers Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Choose order versus invoice definition first. |

### Orders per Ordering Customer — orders_per_customer

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Orders per Ordering Customer / عدد الطلبات لكل عميل صاحب طلب |
| Canonical ID | Not registered; proposed definition ID only: `orders_per_customer` |
| Version / definition hash | 1 / `5e74d34e7756a2b27d09abe178cb6eb34ea5b1927b26a2b3e2600ad37ed41cf3` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Orders per Ordering Customer |
| Definition | confirmed count / distinct ordering customers |
| Formula / proposed formula | confirmed count / distinct ordering customers |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | confirmed count / distinct ordering customers Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Customer hierarchy policy needed. |

### Average Order Frequency Candidate — average_order_frequency

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Order Frequency Candidate / متوسط تكرار الطلبات المقترح |
| Canonical ID | Not registered; proposed definition ID only: `average_order_frequency` |
| Version / definition hash | 1 / `96749967d660d9575226c0514558d2b3ef4c8a5576d10f711c4504896a2ae442` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Average Order Frequency Candidate |
| Definition | approved frequency per observation window |
| Formula / proposed formula | approved frequency per observation window |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | approved frequency per observation window Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Window, active cohort and denominator decisions. |

### Average Days Between Orders — average_days_between_orders

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Days Between Orders / متوسط الأيام بين الطلبات |
| Canonical ID | Not registered; proposed definition ID only: `average_days_between_orders` |
| Version / definition hash | 1 / `6b8ecf30e507c037170bb491f7d4009f48401787099cc06bf1b64a20e973c6af` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Average Days Between Orders |
| Definition | average adjacent confirmed-order interval by customer |
| Formula / proposed formula | average adjacent confirmed-order interval by customer |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | average adjacent confirmed-order interval by customer Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Same-day orders and single-order customers need null policy. |

### Customer Lifetime Invoiced Revenue — customer_lifetime_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Lifetime Invoiced Revenue / إيرادات فواتير العميل طوال التعامل |
| Canonical ID | Not registered; proposed definition ID only: `customer_lifetime_revenue` |
| Version / definition hash | 1 / `dfee0d8809b8600c856849b5b2a9cfe80b9624be41807488bda05748bccc4f9f` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Lifetime Invoiced Revenue |
| Definition | net posted value across complete lifetime history |
| Formula / proposed formula | net posted value across complete lifetime history |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Explicit observation cutoff; most recent eligible order for recency, complete issue-date history through cutoff for lifetime invoiced revenue. |
| Source concept / Odoo calculation | net posted value across complete lifetime history Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Observed source history is not proven lifetime; backfill/opening migration needed. |

### Customer Recency — customer_recency

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Recency / الأيام منذ آخر طلب للعميل |
| Canonical ID | Not registered; proposed definition ID only: `customer_recency` |
| Version / definition hash | 1 / `51e3cfc4c40fba69b19382b192b1d4f303cff9c512c0f60c723e9c41d6f87693` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Recency |
| Definition | as-of minus most recent confirmed order |
| Formula / proposed formula | as-of minus most recent confirmed order |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | Explicit observation cutoff; most recent eligible order for recency, complete issue-date history through cutoff for lifetime invoiced revenue. |
| Source concept / Odoo calculation | as-of minus most recent confirmed order Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Freeze as-of; use business timezone. |

### Customer Order Frequency — customer_frequency

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Order Frequency / عدد طلبات العميل خلال الفترة |
| Canonical ID | Not registered; proposed definition ID only: `customer_frequency` |
| Version / definition hash | 1 / `b4725a1ff0e8497a1fbb725a5142874a6c4b75e11fff950375ffe02b68a94803` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Order Frequency |
| Definition | confirmed orders per customer in approved window |
| Formula / proposed formula | confirmed orders per customer in approved window |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | confirmed orders per customer in approved window Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | History/window required. |

### Inactive Customer Candidates — inactive_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Inactive Customer Candidates / العملاء المرشحون لعدم النشاط |
| Canonical ID | Not registered; proposed definition ID only: `inactive_customers` |
| Version / definition hash | 1 / `02853fcbdeca32dd48351e5b2abfa931c442e45d2a098867fa97e1c55e68ba21` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Inactive Customer Candidates |
| Definition | eligible customers exceeding approved inactivity threshold |
| Formula / proposed formula | eligible customers exceeding approved inactivity threshold |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | eligible customers exceeding approved inactivity threshold Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Archive and inactivity are separate concepts. |

### Churn Risk Candidate — churn_risk

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Churn Risk Candidate / مؤشر احتمالي لفقد العملاء |
| Canonical ID | Not registered; proposed definition ID only: `churn_risk` |
| Version / definition hash | 1 / `5fed01f614c06c9830e19d9ea54975a0fa48ddca1be706c3e4f778ef56c2e57f` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Churn Risk Candidate |
| Definition | approved inactivity/recency risk policy |
| Formula / proposed formula | approved inactivity/recency risk policy |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | approved inactivity/recency risk policy Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | No observed churn label; heuristic requires business approval. |

### Customer Revenue Ranking Candidate — top_bottom_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Revenue Ranking Candidate / ترتيب العملاء حسب الإيرادات المقترح |
| Canonical ID | Not registered; proposed definition ID only: `top_bottom_customers` |
| Version / definition hash | 1 / `aac7a4cecc9087f3bf3475582005d7367c70e460efe87cd9ca3d2144d04ea4e3` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Revenue Ranking Candidate |
| Definition | rank aggregated approved net invoiced value |
| Formula / proposed formula | rank aggregated approved net invoiced value |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | rank aggregated approved net invoiced value Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Stable IDs; deterministic ties and null policy. |

### Stored Customer Rank Validation — customer_rank_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stored Customer Rank Validation / التحقق من ترتيب العملاء المخزّن |
| Canonical ID | Not registered; proposed definition ID only: `customer_rank_revenue` |
| Version / definition hash | 1 / `77011ec37b226a5f1f582db7f032aa0838b927e4346a2d6c24174b4570f4c196` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Stored Customer Rank Validation |
| Definition | compare Odoo activity rank to approved revenue |
| Formula / proposed formula | compare Odoo activity rank to approved revenue |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | compare Odoo activity rank to approved revenue Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Odoo rank is not a governed revenue score. |

### Customer Discount Profile — customer_discount_profile

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Discount Profile / بيانات خصومات العميل |
| Canonical ID | Not registered; proposed definition ID only: `customer_discount_profile` |
| Version / definition hash | 1 / `0e96186c2789583384a3b6356dac1bf542c70218e119961a46beabffc8d9c724` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Discount Profile |
| Definition | unstructured customer discount profile |
| Formula / proposed formula | unstructured customer discount profile |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | unstructured customer discount profile Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | About 79% missing; string semantics not governed percentage. |

### Customer Product Preferences — customer_product_desires

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Product Preferences / تفضيلات منتجات العميل |
| Canonical ID | Not registered; proposed definition ID only: `customer_product_desires` |
| Version / definition hash | 1 / `07ef35b431b6d416a40485b5fc9c11f2c857b71ed4678cfbf2234a3f295c13c6` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Product Preferences |
| Definition | unstructured declared product preferences |
| Formula / proposed formula | unstructured declared product preferences |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | unstructured declared product preferences Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Sparse arbitrary text, no governed product relationship. |

### Returning Customers Candidate — returning_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Returning Customers Candidate / العملاء العائدون المقترحون |
| Canonical ID | Not registered; proposed definition ID only: `returning_customers` |
| Version / definition hash | 1 / `5dbc906f181ff3323a5e35a7152688e5f4e90dc50a97069026e06b9e122c4045` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Returning Customers Candidate |
| Definition | Distinct ordering customers in the period with a confirmed order before period start; requires complete prior history. |
| Formula / proposed formula | Distinct ordering customers in the period with a confirmed order before period start; requires complete prior history. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | Distinct ordering customers in the period with a confirmed order before period start; requires complete prior history. Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Customer Revenue Contribution — customer_revenue_contribution_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customer Revenue Contribution / مساهمة العميل في الإيرادات |
| Canonical ID | Not registered; proposed definition ID only: `customer_revenue_contribution_percentage` |
| Version / definition hash | 1 / `00ff8dcb05401056a7e74557151855d0b16f14ed427598bd606508c49d17ce11` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Customer Revenue Contribution |
| Definition | 100 × customer Net Invoiced Revenue / total Net Invoiced Revenue under the same period and policies. |
| Formula / proposed formula | 100 × customer Net Invoiced Revenue / total Net Invoiced Revenue under the same period and policies. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | 100 × customer Net Invoiced Revenue / total Net Invoiced Revenue under the same period and policies. Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Top Customer Concentration Candidate — top_customer_concentration

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Top Customer Concentration Candidate / تركّز الإيرادات لدى كبار العملاء المقترح |
| Canonical ID | Not registered; proposed definition ID only: `top_customer_concentration` |
| Version / definition hash | 1 / `c39e0525ba16cfd98bf553a0a63db79f443104fcaf92a73656d8e26a75f1e8aa` |
| Business purpose | Support decisions on customers using the named measure and explicit scope. Top Customer Concentration Candidate |
| Definition | 100 × net revenue of approved top N customers / total same-scope net revenue; N and credit/negative-balance treatment await approval. |
| Formula / proposed formula | 100 × net revenue of approved top N customers / total same-scope net revenue; N and credit/negative-balance treatment await approval. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for purchase behavior; invoice date for invoiced contribution; creation date only for a separately named registration cohort. |
| Source concept / Odoo calculation | 100 × net revenue of approved top N customers / total same-scope net revenue; N and credit/negative-balance treatment await approval. Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Grain | One customer or customer-period; lifetime needs complete approved history. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days; IQD for value; ratios within identical customer and period scope. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Stable customer identity, without is_company filtering; ordering customers require confirmed orders. Other cohorts await an explicit decision. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, commercial_customer, salesperson, business_line, city, state, customer_rank, route, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

## Products

### Net Units Sold — units_sold

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Units Sold / صافي الكميات المباعة |
| Canonical ID | `units_sold` |
| Version / definition hash | 1 / `e0d5465e98420f4ef6d97ca9243be00c6bd6c6cf58412ac4e455f0376c493a93` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Net Units Sold |
| Definition | signed posted product-line quantity normalized within UOM category |
| Formula / proposed formula | signed posted product-line quantity normalized within UOM category |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed posted product-line quantity normalized within UOM category Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 6838 of 35437 sale lines use non-base UOM; zero incompatible categories. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Net Invoiced Revenue by Product — product_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Invoiced Revenue by Product / صافي إيرادات الفواتير حسب المنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_revenue` |
| Version / definition hash | 1 / `4434cee10e79840136faa5c0bb0f5dc2277399ac7ea1309373a8b1be9869b580` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Net Invoiced Revenue by Product |
| Definition | signed posted untaxed product-line subtotal |
| Formula / proposed formula | signed posted untaxed product-line subtotal |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed posted untaxed product-line subtotal Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Reconcile sum of lines to headers; never duplicate headers through line joins. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Net Revenue by Product Category — category_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Revenue by Product Category / صافي الإيرادات حسب فئة المنتج |
| Canonical ID | Not registered; proposed definition ID only: `category_revenue` |
| Version / definition hash | 1 / `7da0802e0042689a7dddaed76eb7506ba37fb3fd13a0671449b07b039f37df38` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Net Revenue by Product Category |
| Definition | signed line revenue grouped by approved category version |
| Formula / proposed formula | signed line revenue grouped by approved category version |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed line revenue grouped by approved category version Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 400 sold products; category fully populated, 36 categories. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Net Revenue by Brand — brand_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Net Revenue by Brand / صافي الإيرادات حسب العلامة التجارية |
| Canonical ID | Not registered; proposed definition ID only: `brand_revenue` |
| Version / definition hash | 1 / `229ea76330cfdcc238cf431519e140c57733820b5b24fc953c03b1def960787d` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Net Revenue by Brand |
| Definition | signed line revenue by brand including unknown bucket |
| Formula / proposed formula | signed line revenue by brand including unknown bucket |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed line revenue by brand including unknown bucket Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 99 of 400 products missing brand (24.75%). Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Average Selling Price — product_average_selling_price

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Average Selling Price / متوسط سعر بيع المنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_average_selling_price` |
| Version / definition hash | 1 / `874b9c26fcf2d4574ed6b0b19882af2c6b4aa951ae11b04061ceb3e7b071e027` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Average Selling Price |
| Definition | signed revenue / compatible normalized quantity |
| Formula / proposed formula | signed revenue / compatible normalized quantity |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed revenue / compatible normalized quantity Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Weight by units, not average line prices. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Discount Candidate — product_discount

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Discount Candidate / خصم المنتج المقترح |
| Canonical ID | Not registered; proposed definition ID only: `product_discount` |
| Version / definition hash | 1 / `e20c4cb8739036fc7010e098d96de9097e40445039c1e8ca069843bfd5052e9b` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Discount Candidate |
| Definition | approved line discount formula grouped by product |
| Formula / proposed formula | approved line discount formula grouped by product |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | approved line discount formula grouped by product Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Zero populated discount events in September; validate other periods. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Quantity Mix Candidate — product_mix

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Quantity Mix Candidate / مزيج كميات المنتجات المقترح |
| Canonical ID | Not registered; proposed definition ID only: `product_mix` |
| Version / definition hash | 1 / `64680af5d4e3256bb067c5e2d965e3d6f64dc927357dc5bef3a0c3b3597b4dbc` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Quantity Mix Candidate |
| Definition | approved normalized quantity share |
| Formula / proposed formula | approved normalized quantity share |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | approved normalized quantity share Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Cross-category unit shares are invalid; revenue share alternative. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Revenue Contribution — product_revenue_contribution

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Revenue Contribution / مساهمة المنتج في الإيرادات |
| Canonical ID | Not registered; proposed definition ID only: `product_revenue_contribution` |
| Version / definition hash | 1 / `218297d07f85985c41948ed7f0739ade8d2bb473e25bec341d23ae08ff5c33f1` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Revenue Contribution |
| Definition | 100 × product net posted line revenue / total matching net posted product-line revenue. |
| Formula / proposed formula | 100 × product net posted line revenue / total matching net posted product-line revenue. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | 100 × product net posted line revenue / total matching net posted product-line revenue. Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Same policy/filter denominator; null zero total. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Refund Value by Product — product_refund_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Refund Value by Product / قيمة الإشعارات الدائنة حسب المنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_refund_value` |
| Version / definition hash | 1 / `2e390503a6f5d4288420368658f38b29bf2f83970aa29157284fcb48d680fdf1` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Refund Value by Product |
| Definition | positive refund product-line subtotal |
| Formula / proposed formula | positive refund product-line subtotal |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | positive refund product-line subtotal Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Refund sign convention and header reconciliation required. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Refund Rate Candidate — product_refund_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Refund Rate Candidate / نسبة مرتجعات المنتج المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `product_refund_rate` |
| Version / definition hash | 1 / `f134b5c241b8481b8e57356541f7cbf5c4fdd3b8b1ee1d33ffb3ed174d11241e` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Refund Rate Candidate |
| Definition | approved refund quantity/value / corresponding invoice quantity/value |
| Formula / proposed formula | approved refund quantity/value / corresponding invoice quantity/value |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | approved refund quantity/value / corresponding invoice quantity/value Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Refund cohort and UOM decision. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Customers per Product — customers_per_product

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customers per Product / عدد العملاء لكل منتج |
| Canonical ID | Not registered; proposed definition ID only: `customers_per_product` |
| Version / definition hash | 1 / `570cd6d6b62a6c3959538a5eec05b2a049ffb02dd8a603b237d7bfa06a63aed2` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Customers per Product |
| Definition | distinct invoiced customers per product |
| Formula / proposed formula | distinct invoiced customers per product |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | distinct invoiced customers per product Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Tenant-scoped join and refund/customer eligibility policy. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Products per Customer — products_per_customer

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Products per Customer / عدد المنتجات لكل عميل |
| Canonical ID | Not registered; proposed definition ID only: `products_per_customer` |
| Version / definition hash | 1 / `ddd0f0ee75f6a26a47c54f15985be47c71a22edeb5c5996873bf42366a94168a` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Products per Customer |
| Definition | distinct invoiced products per customer |
| Formula / proposed formula | distinct invoiced products per customer |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | distinct invoiced products per customer Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Exclude display lines and define refunds. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Revenue by Salesperson — salesperson_product_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Revenue by Salesperson / إيرادات المنتجات حسب مندوب المبيعات |
| Canonical ID | Not registered; proposed definition ID only: `salesperson_product_revenue` |
| Version / definition hash | 1 / `d3ffad2d985a7ce5338e2a71ce91960a0f38752183a077b230c93ef24aa8dab0` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Revenue by Salesperson |
| Definition | signed line value by invoice salesperson and product |
| Formula / proposed formula | signed line value by invoice salesperson and product |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed line value by invoice salesperson and product Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Separate historical invoice owner from current customer owner. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Revenue by Business Line — business_line_product_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Revenue by Business Line / إيرادات المنتجات حسب خط الأعمال |
| Canonical ID | Not registered; proposed definition ID only: `business_line_product_revenue` |
| Version / definition hash | 1 / `883f51ee8c2f4dc91399b27a16ac714a3a3d258798a26185e13204ab5d95f7b2` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Revenue by Business Line |
| Definition | signed line value by approved business-line attribution and product |
| Formula / proposed formula | signed line value by approved business-line attribution and product |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed line value by approved business-line attribution and product Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Header/line attribution agreement requires controls. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Revenue by Customer — customer_product_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Revenue by Customer / إيرادات المنتجات حسب العميل |
| Canonical ID | Not registered; proposed definition ID only: `customer_product_revenue` |
| Version / definition hash | 1 / `528d9d4db4b0598e5603251ade1b4c391ac634c609f84048bb9800b8ab17db06` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Revenue by Customer |
| Definition | signed line value by invoice customer and product |
| Formula / proposed formula | signed line value by invoice customer and product |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | signed line value by invoice customer and product Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Customer hierarchy decision and exact two-dimension evidence needed. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Order Revenue by Product — product_order_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Revenue by Product / قيمة الطلبات حسب المنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_order_revenue` |
| Version / definition hash | 1 / `ac973309a934562567c4d8e1a1f4267c6aa9ed1d30ce850458ceff4c4c907b3e` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Order Revenue by Product |
| Definition | Sum confirmed product-line subtotal by product; proposed untaxed order-line value must not be labelled whole tax-inclusive Order Revenue without allocation/reconciliation. |
| Formula / proposed formula | Sum confirmed product-line subtotal by product; proposed untaxed order-line value must not be labelled whole tax-inclusive Order Revenue without allocation/reconciliation. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | Sum confirmed product-line subtotal by product; proposed untaxed order-line value must not be labelled whole tax-inclusive Order Revenue without allocation/reconciliation. Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD before tax; base UOM converted using Odoo category/factor/rounding. 38 observed base UOMs cannot form one quantity total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Refund Quantity — refund_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Refund Quantity / كمية الإشعارات الدائنة للمنتجات |
| Canonical ID | Not registered; proposed definition ID only: `refund_quantity` |
| Version / definition hash | 1 / `c68c9dd7cfc196635b4bec067adfc81940a1169a6a0d4537fb04d4455d948249` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Refund Quantity |
| Definition | Positive posted customer credit-note product quantity by product/base UOM and its own issue date. |
| Formula / proposed formula | Positive posted customer credit-note product quantity by product/base UOM and its own issue date. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | Positive posted customer credit-note product quantity by product/base UOM and its own issue date. Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Refund Value Percentage — product_refund_value_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Refund Value Percentage / نسبة قيمة الإشعارات الدائنة للمنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_refund_value_percentage` |
| Version / definition hash | 1 / `dbd73de0dcdcb1f877fc8b6e3b092fbc13a6dda13b410b3b7965eaaa7ce33c51` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Refund Value Percentage |
| Definition | 100 × product refund value / product posted invoice value in a matching issue-date window. |
| Formula / proposed formula | 100 × product refund value / product posted invoice value in a matching issue-date window. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | 100 × product refund value / product posted invoice value in a matching issue-date window. Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

### Product Refund Quantity Percentage — product_refund_quantity_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Product Refund Quantity Percentage / نسبة كمية الإشعارات الدائنة للمنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_refund_quantity_percentage` |
| Version / definition hash | 1 / `0a7d5d66f65f2e03aa6abf5b85e95203f3dd464e961c49cf54ca8d540a550800` |
| Business purpose | Support decisions on products using the named measure and explicit scope. Product Refund Quantity Percentage |
| Definition | 100 × normalized refund quantity / normalized positive invoiced quantity for the same product/UOM/window. |
| Formula / proposed formula | 100 × normalized refund quantity / normalized positive invoiced quantity for the same product/UOM/window. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Invoice issue date; order date only for explicitly named order-product measures. |
| Source concept / Odoo calculation | 100 × normalized refund quantity / normalized positive invoiced quantity for the same product/UOM/window. Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Grain | One product line then aggregate by stable product ID; never copy whole invoice/order totals to each product. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, product_category, brand, customer, salesperson, business_line, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. Sold products have 38 base UOMs; 99 of 400 lack brand. Show unknowns explicitly and validate UOM conversions. |

## Profitability

### Order Margin — order_margin

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Margin / ربح الطلب وفق هامش أودو |
| Canonical ID | Not registered; proposed definition ID only: `order_margin` |
| Version / definition hash | 1 / `7e1b9d9bc89bc0d046faff41c04693c3000313a996533d5b05250a9af32e5fd9` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Order Margin |
| Definition | sum stored Odoo sale_margin |
| Formula / proposed formula | sum stored Odoo sale_margin |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | sum stored Odoo sale_margin Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 697384876.180 IQD September confirmed order margin; not accounting gross profit. |

### Order Margin Percentage — order_margin_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Margin Percentage / نسبة ربح الطلب وفق هامش أودو |
| Canonical ID | Not registered; proposed definition ID only: `order_margin_percentage` |
| Version / definition hash | 1 / `fbcd63c89c6cbeedd617fba6b339fbc28854577b84be45e75d5a7e299010ae67` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Order Margin Percentage |
| Definition | 100 × sum(stored confirmed-order margin) / sum(untaxed value of the same confirmed orders). |
| Formula / proposed formula | 100 × sum(stored confirmed-order margin) / sum(untaxed value of the same confirmed orders). |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | 100 × sum(stored confirmed-order margin) / sum(untaxed value of the same confirmed orders). Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Weighted ratio; never average stored margin_percent; naming decision. |

### Order Margin by Product — product_order_margin

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Margin by Product / ربح الطلبات حسب المنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_order_margin` |
| Version / definition hash | 1 / `3b5fd7828cefbc9f38e4a3ea0da06308e3bb3459e5f2ac474da4b8dcec7ac777` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Order Margin by Product |
| Definition | sum stored order-line margin by product |
| Formula / proposed formula | sum stored order-line margin by product |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | sum stored order-line margin by product Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Validate line-to-header sums and purchase_price meaning. |

### Order Margin by Customer — customer_order_margin

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Margin by Customer / ربح الطلبات حسب العميل |
| Canonical ID | Not registered; proposed definition ID only: `customer_order_margin` |
| Version / definition hash | 1 / `aee31ccbdba5ce98a142577c6df9637e5eea4e92ed007ce06c96dabb82f515a3` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Order Margin by Customer |
| Definition | sum stored order margin by order customer |
| Formula / proposed formula | sum stored order margin by order customer |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | sum stored order margin by order customer Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Do not substitute for invoiced customer profit. |

### Order Margin by Salesperson — salesperson_order_margin

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Margin by Salesperson / ربح الطلبات حسب مندوب المبيعات |
| Canonical ID | Not registered; proposed definition ID only: `salesperson_order_margin` |
| Version / definition hash | 1 / `6041a64bbe5d8bca644ef831d9584c5ca446a100468b76d6192401514213e94b` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Order Margin by Salesperson |
| Definition | sum stored order margin by salesperson |
| Formula / proposed formula | sum stored order margin by salesperson |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | sum stored order margin by salesperson Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Historic header owner; narrow reconciliation. |

### Order Margin by Business Line — business_line_order_margin

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Margin by Business Line / ربح الطلبات حسب خط الأعمال |
| Canonical ID | Not registered; proposed definition ID only: `business_line_order_margin` |
| Version / definition hash | 1 / `3f581acb9a8cd18bdb82e495f95a0761ca3a4d847d662c2aecb45e043e041cdc` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Order Margin by Business Line |
| Definition | sum stored order margin by business line |
| Formula / proposed formula | sum stored order margin by business line |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | sum stored order margin by business line Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Stored custom attribution; no accounting equivalence. |

### Accounting Gross Profit — accounting_gross_profit

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Accounting Gross Profit / مجمل الربح المحاسبي |
| Canonical ID | Not registered; proposed definition ID only: `accounting_gross_profit` |
| Version / definition hash | 1 / `5450ef9fa6fb58dfb8db1d578a41fcc20ba3e98a299ef52240dfd7960163b3af` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Accounting Gross Profit |
| Definition | approved accounting revenue less mapped COGS |
| Formula / proposed formula | approved accounting revenue less mapped COGS |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | approved accounting revenue less mapped COGS Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | 351 direct-cost product lines/74 moves; all 36746 layers lack accounting references; timing/allocation unproven. |

### Accounting Gross Margin Percentage — accounting_gross_margin

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Accounting Gross Margin Percentage / نسبة مجمل الربح المحاسبي |
| Canonical ID | Not registered; proposed definition ID only: `accounting_gross_margin` |
| Version / definition hash | 1 / `1f8503ba6883f5aa01e55c2fead79365a2867d007ceefa453a4d345a04b7b85e` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Accounting Gross Margin Percentage |
| Definition | approved accounting gross profit / matching approved revenue |
| Formula / proposed formula | approved accounting gross profit / matching approved revenue |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | approved accounting gross profit / matching approved revenue Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | COGS mapping and revenue recognition policy required. |

### Analytically Allocated Profit Candidate — analytic_profit

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Analytically Allocated Profit Candidate / الربح الموزع حسب الحسابات التحليلية المقترح |
| Canonical ID | Not registered; proposed definition ID only: `analytic_profit` |
| Version / definition hash | 1 / `7455ff0b2eb5443877d3aa683c2c9501568740993530bb538f3a5a26bc37d8da` |
| Business purpose | Support decisions on profitability using the named measure and explicit scope. Analytically Allocated Profit Candidate |
| Definition | allocated approved revenue/cost by analytic account |
| Formula / proposed formula | allocated approved revenue/cost by analytic account |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Order date for Order Margin; accounting recognition period for future accounting profit. |
| Source concept / Odoo calculation | allocated approved revenue/cost by analytic account Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Grain | Order or order line for stored margin; approved ledger attribution for accounting profit. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD; percentages from matching total margin and untaxed order value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed order margin from Sales Margin; accounting profit separately needs approved revenue, COGS and recognition. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, customer, salesperson, business_line, warehouse, product_category, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | JSON allocation exists; population, sums and cost-center policy not validated. |

## Inventory

### Stock On Hand — stock_on_hand

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock On Hand / كمية المخزون الفعلية |
| Canonical ID | `stock_on_hand` |
| Version / definition hash | 1 / `02a51d6fdb21d386440ef40922819c9c96ac24e80601d3c4cba9ddc3b792332a` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock On Hand |
| Definition | sum current internal-location quants by compatible base UOM |
| Formula / proposed formula | sum current internal-location quants by compatible base UOM |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | sum current internal-location quants by compatible base UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Current snapshot; owner/consignment and negative positions explicit. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Reserved Stock — reserved_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Reserved Stock / كمية المخزون المحجوزة |
| Canonical ID | Not registered; proposed definition ID only: `reserved_quantity` |
| Version / definition hash | 1 / `f9dc0e41d5d6a0ad405675beabcf3e584d93565e0554de57b0971cd31745b508` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Reserved Stock |
| Definition | sum current internal reservations by compatible base UOM |
| Formula / proposed formula | sum current internal reservations by compatible base UOM |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | sum current internal reservations by compatible base UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Reservation is mutable current state. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Unreserved Available Stock — available_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Unreserved Available Stock / كمية المخزون غير المحجوزة |
| Canonical ID | Not registered; proposed definition ID only: `available_quantity` |
| Version / definition hash | 1 / `249d52364f3084231cbd55283e7b58d6371f3698402d2e78e29ef721314b6018` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Unreserved Available Stock |
| Definition | on hand minus reserved under approved location policy |
| Formula / proposed formula | on hand minus reserved under approved location policy |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | on hand minus reserved under approved location policy Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Do not confuse with forecast or promise-to-deliver. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Incoming Quantity — incoming_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Incoming Quantity / الكمية الواردة المتوقعة |
| Canonical ID | Not registered; proposed definition ID only: `incoming_quantity` |
| Version / definition hash | 1 / `abd927890efd22b5e18d7293f5520d1a3ddb3cb54254e3a7c66c00da2ca5b358` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Incoming Quantity |
| Definition | remaining inbound eligible moves normalized by UOM |
| Formula / proposed formula | remaining inbound eligible moves normalized by UOM |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | remaining inbound eligible moves normalized by UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Need route/state/internal-transfer and planned-versus-done validation. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Outgoing Quantity — outgoing_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Outgoing Quantity / الكمية الصادرة المتوقعة |
| Canonical ID | Not registered; proposed definition ID only: `outgoing_quantity` |
| Version / definition hash | 1 / `c0effc6645a79a93b618639823b904aa0cc777725e5e92621b812813979af57f` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Outgoing Quantity |
| Definition | remaining outbound eligible moves normalized by UOM |
| Formula / proposed formula | remaining outbound eligible moves normalized by UOM |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | remaining outbound eligible moves normalized by UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Avoid counting internal moves twice. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Forecast Stock — forecast_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Forecast Stock / رصيد المخزون المتوقع |
| Canonical ID | Not registered; proposed definition ID only: `forecast_quantity` |
| Version / definition hash | 1 / `a0f8a647c7c65b961b56d829d7884fb4f62f6f446c2c8ff162c9d536cbb7b7a2` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Forecast Stock |
| Definition | on hand plus approved pending incoming minus outgoing |
| Formula / proposed formula | on hand plus approved pending incoming minus outgoing |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | on hand plus approved pending incoming minus outgoing Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Backorders/reservations and horizon policy unresolved. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Inventory Value — inventory_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Inventory Value / قيمة المخزون |
| Canonical ID | `inventory_value` |
| Version / definition hash | 1 / `f8d7bce8f61a05853b8c96a8518a4afb4b95affc2d6f3914e7ddc652483cab3f` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Inventory Value |
| Definition | approved current layer valuation reconciled to stock/accounting |
| Formula / proposed formula | approved current layer valuation reconciled to stock/accounting |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | approved current layer valuation reconciled to stock/accounting Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Net September movement value is not inventory value; cost method and negatives need controls. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stock by Warehouse — warehouse_inventory_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock by Warehouse / المخزون حسب المستودع |
| Canonical ID | Not registered; proposed definition ID only: `warehouse_inventory_quantity` |
| Version / definition hash | 1 / `c505bd60acf68b4b681a1171a464ea8ee088cfa51b9fd738aa21186b5d0c1ccb` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock by Warehouse |
| Definition | on-hand quantity via validated warehouse/location hierarchy |
| Formula / proposed formula | on-hand quantity via validated warehouse/location hierarchy |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | on-hand quantity via validated warehouse/location hierarchy Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Direct warehouse_id may be null; ancestors need validated mapping. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stock by Location — location_inventory_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock by Location / المخزون حسب الموقع |
| Canonical ID | Not registered; proposed definition ID only: `location_inventory_quantity` |
| Version / definition hash | 1 / `f5fc9781d96dffd92a242ee242f529d5bb28562c94160f19873071822c999799` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock by Location |
| Definition | current internal on-hand by stable location |
| Formula / proposed formula | current internal on-hand by stable location |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current internal on-hand by stable location Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | No unlike UOM sums; complete snapshot ownership. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stock by Product — product_inventory_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock by Product / المخزون حسب المنتج |
| Canonical ID | Not registered; proposed definition ID only: `product_inventory_quantity` |
| Version / definition hash | 1 / `b6a8a25af32a0f1180d221e410d03f8bca77d7e98241c9c45df5618f07c3a686` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock by Product |
| Definition | current on-hand by product base UOM |
| Formula / proposed formula | current on-hand by product base UOM |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current on-hand by product base UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Snapshot semantics, not daily flow. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stock by Product Category — category_inventory_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock by Product Category / المخزون حسب فئة المنتج |
| Canonical ID | Not registered; proposed definition ID only: `category_inventory_quantity` |
| Version / definition hash | 1 / `962f45c087ec6c45c9a47d6fc1e055bde60879a0946b7d9271649bc962ab8eff` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock by Product Category |
| Definition | current compatible quantity by category and UOM |
| Formula / proposed formula | current compatible quantity by category and UOM |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | current compatible quantity by category and UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Category alone does not normalize units. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stock Movement Quantity — stock_movement_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock Movement Quantity / كمية حركات المخزون |
| Canonical ID | Not registered; proposed definition ID only: `stock_movement_quantity` |
| Version / definition hash | 1 / `7c542355933d0e5c7986c7f951946471616457ed36b2c1671f587dfd84705788` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock Movement Quantity |
| Definition | done movement quantity by direction and UOM |
| Formula / proposed formula | done movement quantity by direction and UOM |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Exact snapshot observation timestamp; historical September stock is not established. Movement events use actual completion date. |
| Source concept / Odoo calculation | done movement quantity by direction and UOM Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Internal transfers and returns explicit separate categories. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stock Turnover Candidate — stock_turnover

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stock Turnover Candidate / معدل دوران المخزون المقترح |
| Canonical ID | Not registered; proposed definition ID only: `stock_turnover` |
| Version / definition hash | 1 / `9ce8a429c3a3536e98642fa32a0f2c0be5aea67c51f24bb1e5108feb597ceb3d` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stock Turnover Candidate |
| Definition | approved cost-of-sales / average comparable inventory value |
| Formula / proposed formula | approved cost-of-sales / average comparable inventory value |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Exact snapshot observation timestamp; historical September stock is not established. Movement events use actual completion date. |
| Source concept / Odoo calculation | approved cost-of-sales / average comparable inventory value Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | No formula implementation; historic snapshots and COGS unproven. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Days of Inventory Candidate — days_inventory

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Days of Inventory Candidate / أيام المخزون المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `days_inventory` |
| Version / definition hash | 1 / `278defd09f0dbb37bb78c6f53e1c2225a188a99006f958bb9b0c68c14a79179a` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Days of Inventory Candidate |
| Definition | approved inventory / average demand with horizon |
| Formula / proposed formula | approved inventory / average demand with horizon |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | approved inventory / average demand with horizon Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Valuation versus units and denominator period policy needed. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Days Cover Candidate — days_cover

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Days Cover Candidate / أيام تغطية الطلب المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `days_cover` |
| Version / definition hash | 1 / `30ec473096118cb4dec543e445d560d088f9c61f7bd80d11620e47892f33e80e` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Days Cover Candidate |
| Definition | approved available stock / normalized forecast demand |
| Formula / proposed formula | approved available stock / normalized forecast demand |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | approved available stock / normalized forecast demand Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Forecast external/planning inputs not established. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Slow-moving Stock Candidate — slow_moving_stock

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Slow-moving Stock Candidate / المخزون بطيء الحركة المقترح |
| Canonical ID | Not registered; proposed definition ID only: `slow_moving_stock` |
| Version / definition hash | 1 / `43300fa3a67901e40959370b107afc9b33c571e9d21b2d2c7a2f497a961fb42a` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Slow-moving Stock Candidate |
| Definition | positive stock with approved low movement threshold |
| Formula / proposed formula | positive stock with approved low movement threshold |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | positive stock with approved low movement threshold Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Current stock plus historical movement; seasonality and thresholds needed. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Dead Stock Candidate — dead_stock

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Dead Stock Candidate / المخزون الراكد المقترح |
| Canonical ID | Not registered; proposed definition ID only: `dead_stock` |
| Version / definition hash | 1 / `03b004b56e7d5fdbf197a3ab7bd9c24bb958864ee61c7ec200bbf869b1cad32a` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Dead Stock Candidate |
| Definition | positive stock without eligible movement in approved horizon |
| Formula / proposed formula | positive stock without eligible movement in approved horizon |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | positive stock without eligible movement in approved horizon Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Historical completeness and threshold decision. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stockout Count Candidate — stockout_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stockout Count Candidate / عدد المنتجات النافدة المقترح |
| Canonical ID | Not registered; proposed definition ID only: `stockout_count` |
| Version / definition hash | 1 / `b8ca7d569f528721cb629a161937fb15b1db5d62b28d21d7cffc4a1f4d2a4662` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stockout Count Candidate |
| Definition | count approved stocked products unavailable at as-of |
| Formula / proposed formula | count approved stocked products unavailable at as-of |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | count approved stocked products unavailable at as-of Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Absent zero-quant rows require assortment universe; past episodes need snapshots. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Stockout Risk Candidate — stockout_risk

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Stockout Risk Candidate / مخاطر نفاد المخزون المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `stockout_risk` |
| Version / definition hash | 1 / `32afee34d30d2e33aca75cc4161f2ee24c6c649832479986a3fbfa8ee2f1b28d` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Stockout Risk Candidate |
| Definition | approved future demand versus available stock |
| Formula / proposed formula | approved future demand versus available stock |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | approved future demand versus available stock Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Risk model/business assumptions needed; external forecast may be required. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

### Overstock Candidate — overstock

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Overstock Candidate / المخزون الزائد المقترح |
| Canonical ID | Not registered; proposed definition ID only: `overstock` |
| Version / definition hash | 1 / `748578060f981ead87d107000563c874dd86f2c82bccc141ad02ea70b5bc9843` |
| Business purpose | Support decisions on inventory using the named measure and explicit scope. Overstock Candidate |
| Definition | stock beyond approved target/demand horizon |
| Formula / proposed formula | stock beyond approved target/demand horizon |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | stock beyond approved target/demand horizon Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Grain | Product/location/lot/package/owner stock position; movement metrics use distinct movements. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; IQD valuation only after attributable cost/currency controls. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | warehouse, location, product, product_category, lot, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Target assortment, min/max and seasonality need validation. Observed 6,800 positions include 1,361 negatives, not a quantity total. No published historical snapshots. |

## Expiry

### Near-expiry Quantity Candidate — near_expiry_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Near-expiry Quantity Candidate / الكمية القريبة من انتهاء الصلاحية المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `near_expiry_quantity` |
| Version / definition hash | 1 / `314eba7443d42be09dceb080ec97841261b20deeea7623d6be4fa9ba24a6d21d` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Near-expiry Quantity Candidate |
| Definition | positive internal lot quantity within approved expiry horizon |
| Formula / proposed formula | positive internal lot quantity within approved expiry horizon |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | positive internal lot quantity within approved expiry horizon Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 2739 company lots all expiry-populated; some positive untracked stock has no expiry. |

### Expiry Risk Value Candidate — near_expiry_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Expiry Risk Value Candidate / قيمة المخزون المعرّض لانتهاء الصلاحية المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `near_expiry_value` |
| Version / definition hash | 1 / `de9ca9e372aacd7aaa1251136dc622d42f591aa0f1f18abbc9b3d643fd974438` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Expiry Risk Value Candidate |
| Definition | near-expiry stock at approved attributable lot cost |
| Formula / proposed formula | near-expiry stock at approved attributable lot cost |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | near-expiry stock at approved attributable lot cost Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; days/counts; monetary risk remains unavailable without lot valuation. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Exact lot valuation is not established: sampled lot-price fields are null and stock valuation layers lack lot attribution. Quantity risk does not prove monetary risk. |

### Expired Quantity — expired_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Expired Quantity / كمية المخزون منتهي الصلاحية |
| Canonical ID | Not registered; proposed definition ID only: `expired_quantity` |
| Version / definition hash | 1 / `b7b0a46b57940da0e9f3254b5b9cfcaeb0754d95b0dd613c10c66ae5983b3317` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Expired Quantity |
| Definition | positive internal stock past approved expiry cutoff |
| Formula / proposed formula | positive internal stock past approved expiry cutoff |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | positive internal stock past approved expiry cutoff Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | As-of snapshot and expiry versus removal/use-date decision. |

### Expired Stock Value Candidate — expired_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Expired Stock Value Candidate / قيمة المخزون منتهي الصلاحية المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `expired_value` |
| Version / definition hash | 1 / `864ccd786993291896f1df125f54bf8b120d26f7207f20f6b6be754fd09c8698` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Expired Stock Value Candidate |
| Definition | expired quantity at approved attributable cost |
| Formula / proposed formula | expired quantity at approved attributable cost |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | expired quantity at approved attributable cost Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; days/counts; monetary risk remains unavailable without lot valuation. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Exact lot valuation is not established: sampled lot-price fields are null and stock valuation layers lack lot attribution. Quantity risk does not prove monetary risk. |

### Days to Expiry — days_to_expiry

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Days to Expiry / الأيام المتبقية للصلاحية |
| Canonical ID | Not registered; proposed definition ID only: `days_to_expiry` |
| Version / definition hash | 1 / `13ee853efb614aa035d0030a322cc104d01179b77b0fc2b971b4c6cb7965fb44` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Days to Expiry |
| Definition | expiry date minus as-of business date |
| Formula / proposed formula | expiry date minus as-of business date |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | expiry date minus as-of business date Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; days/counts; monetary risk remains unavailable without lot valuation. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Unknown expiry stays unknown; inclusive boundary policy. |

### Products Expiring within 7 Days — products_expiring_7_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Products Expiring within 7 Days / المنتجات التي تنتهي صلاحيتها خلال 7 أيام |
| Canonical ID | Not registered; proposed definition ID only: `products_expiring_7_days` |
| Version / definition hash | 1 / `6ac0e3c7c5dcc2bdf2d888fad60dd60929bf5e6a4e86112cb0673e7813514f38` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Products Expiring within 7 Days |
| Definition | distinct products with positive stock expiring in next 7 days |
| Formula / proposed formula | distinct products with positive stock expiring in next 7 days |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | distinct products with positive stock expiring in next 7 days Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Distinct product count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Same snapshot and compatible quantity controls. |

### Products Expiring within 30 Days — products_expiring_30_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Products Expiring within 30 Days / المنتجات التي تنتهي صلاحيتها خلال 30 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `products_expiring_30_days` |
| Version / definition hash | 1 / `2c49b2f28344c7c3f234b2f775818a25f1380e394b672dc840955895e4c747d9` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Products Expiring within 30 Days |
| Definition | distinct products with positive stock expiring in next 30 days |
| Formula / proposed formula | distinct products with positive stock expiring in next 30 days |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | distinct products with positive stock expiring in next 30 days Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Distinct product count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Separate expired and unknown. |

### Products Expiring within 60 Days — products_expiring_60_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Products Expiring within 60 Days / المنتجات التي تنتهي صلاحيتها خلال 60 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `products_expiring_60_days` |
| Version / definition hash | 1 / `2ecda18d5e13be353d80d8fd4ef6884d1c06bce743868e3398b16e96eee2bf04` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Products Expiring within 60 Days |
| Definition | distinct products with positive stock expiring in next 60 days |
| Formula / proposed formula | distinct products with positive stock expiring in next 60 days |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | distinct products with positive stock expiring in next 60 days Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Distinct product count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Approved horizon. |

### Products Expiring within 90 Days — products_expiring_90_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Products Expiring within 90 Days / المنتجات التي تنتهي صلاحيتها خلال 90 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `products_expiring_90_days` |
| Version / definition hash | 1 / `5f5821565d2b508673ad591f77eea504dfdef33a0dee799dc9a9fa6d5a311dbc` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Products Expiring within 90 Days |
| Definition | distinct products with positive stock expiring in next 90 days |
| Formula / proposed formula | distinct products with positive stock expiring in next 90 days |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | distinct products with positive stock expiring in next 90 days Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Distinct product count |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Approved horizon. |

### Expiry Risk by Business Line Candidate — business_line_expiry_risk

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Expiry Risk by Business Line Candidate / مخاطر الصلاحية حسب خط الأعمال المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `business_line_expiry_risk` |
| Version / definition hash | 1 / `8d9f05bcbb8a622e2841cb9d77d7adf24cfbe29dda9431c7a466bd7390c137c7` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Expiry Risk by Business Line Candidate |
| Definition | expiry quantity attributed to an approved business line |
| Formula / proposed formula | expiry quantity attributed to an approved business line |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | expiry quantity attributed to an approved business line Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible base UOM; days/counts; monetary risk remains unavailable without lot valuation. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | No proven product/stock-to-business-line allocation; do not infer from order owner. |

### Near-expiry Percentage Candidate — near_expiry_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Near-expiry Percentage Candidate / نسبة المخزون القريب من انتهاء الصلاحية المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `near_expiry_percentage` |
| Version / definition hash | 1 / `dbcd0e26af88370bc6fe97322706062d70ae4672df752252ed9a5ffe019278de` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Near-expiry Percentage Candidate |
| Definition | 100 × positive known-expiry quantity in approved horizon / positive eligible stock in same compatible UOM; report unknown-expiry coverage separately. |
| Formula / proposed formula | 100 × positive known-expiry quantity in approved horizon / positive eligible stock in same compatible UOM; report unknown-expiry coverage separately. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | 100 × positive known-expiry quantity in approved horizon / positive eligible stock in same compatible UOM; report unknown-expiry coverage separately. Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Quantity Expiring within 7 Days — expiring_quantity_7_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Quantity Expiring within 7 Days / الكمية التي تنتهي صلاحيتها خلال 7 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `expiring_quantity_7_days` |
| Version / definition hash | 1 / `350f309ab724dbdc379983f7e1fa7b1d4625a2a16f53bce29d31d9f6fef7a525` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Quantity Expiring within 7 Days |
| Definition | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 7, within compatible UOM; boundary is proposed pending approval. |
| Formula / proposed formula | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 7, within compatible UOM; boundary is proposed pending approval. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 7, within compatible UOM; boundary is proposed pending approval. Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Quantity Expiring within 30 Days — expiring_quantity_30_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Quantity Expiring within 30 Days / الكمية التي تنتهي صلاحيتها خلال 30 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `expiring_quantity_30_days` |
| Version / definition hash | 1 / `a9b06abd2053df2a8931c6008e08f096090971fe966e5845892ac8bb7d6f4e20` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Quantity Expiring within 30 Days |
| Definition | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 30, within compatible UOM; boundary is proposed pending approval. |
| Formula / proposed formula | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 30, within compatible UOM; boundary is proposed pending approval. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 30, within compatible UOM; boundary is proposed pending approval. Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Quantity Expiring within 60 Days — expiring_quantity_60_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Quantity Expiring within 60 Days / الكمية التي تنتهي صلاحيتها خلال 60 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `expiring_quantity_60_days` |
| Version / definition hash | 1 / `717dd47d06e4bb85f01fbec2cd2a9a3ae32bb32c7f18ad9f88cca8f4736b86ba` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Quantity Expiring within 60 Days |
| Definition | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 60, within compatible UOM; boundary is proposed pending approval. |
| Formula / proposed formula | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 60, within compatible UOM; boundary is proposed pending approval. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 60, within compatible UOM; boundary is proposed pending approval. Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

### Quantity Expiring within 90 Days — expiring_quantity_90_days

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Quantity Expiring within 90 Days / الكمية التي تنتهي صلاحيتها خلال 90 يوماً |
| Canonical ID | Not registered; proposed definition ID only: `expiring_quantity_90_days` |
| Version / definition hash | 1 / `d1fd00197858e6d7476876d1aa55ef7d29074aa05f3dc85200132288e71ca0c9` |
| Business purpose | Support decisions on expiry using the named measure and explicit scope. Quantity Expiring within 90 Days |
| Definition | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 90, within compatible UOM; boundary is proposed pending approval. |
| Formula / proposed formula | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 90, within compatible UOM; boundary is proposed pending approval. |
| Event / snapshot | Snapshot: one cutoff, never summed across dates. |
| Business date | One explicit snapshot cutoff. Receivable controls: September 30, 2026. Inventory/expiry: current observation time, not a certified September closing balance. |
| Source concept / Odoo calculation | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 90, within compatible UOM; boundary is proposed pending approval. Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Grain | Positive product/location/lot stock position; distinct product counts are different from quantity. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Compatible product-base UOM; never a mixed-unit total. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Positive internal lot stock with known expiry; show missing expiry separately, not as safe stock. Exact lot cost is unproven. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | product, warehouse, location, lot, product_category, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. |

## Procurement

### Purchase Commitments Candidate — purchase_spend

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Purchase Commitments Candidate / قيمة التزامات الشراء المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `purchase_spend` |
| Version / definition hash | 1 / `39a90f924de6a319bba30315100068ac17f3b07c3388eb7b13d9aac25395a3c3` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Purchase Commitments Candidate |
| Definition | approved confirmed PO commitment or posted bill expense |
| Formula / proposed formula | approved confirmed PO commitment or posted bill expense |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | approved confirmed PO commitment or posted bill expense Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Orders are not actual accounting spend; currency and tax basis decision. The observed 316 POs are historical, not an approved September cohort. |

### Purchase Order Count — purchase_order_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Purchase Order Count / عدد أوامر الشراء |
| Canonical ID | Not registered; proposed definition ID only: `purchase_order_count` |
| Version / definition hash | 1 / `5725cf18143ae0855cc65beff78a58115c84cc1d7bb295586f9e6c43d7ae3c63` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Purchase Order Count |
| Definition | count confirmed purchase/done orders |
| Formula / proposed formula | count confirmed purchase/done orders |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | count confirmed purchase/done orders Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 313 confirmed of 316 total source-history POs. The observed 316 POs are historical, not an approved September cohort. |

### Average Purchase Order Value — average_purchase_order_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Purchase Order Value / متوسط قيمة أمر الشراء |
| Canonical ID | Not registered; proposed definition ID only: `average_purchase_order_value` |
| Version / definition hash | 1 / `4bf705488ce080113b43343ac5c2cb219cd7e1da6669bd96f7ff27e9bbc1f21b` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Average Purchase Order Value |
| Definition | approved normalized PO value / count |
| Formula / proposed formula | approved normalized PO value / count |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | approved normalized PO value / count Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | No summing USD/RUB/EUR/IQD blindly. The observed 316 POs are historical, not an approved September cohort. |

### Ordered Purchase Quantity — purchase_ordered_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Ordered Purchase Quantity / كمية الشراء المطلوبة |
| Canonical ID | Not registered; proposed definition ID only: `purchase_ordered_quantity` |
| Version / definition hash | 1 / `7c91b3e151c35616fcfdbee3cbae7998bedc74b42dbfac6642edda8282c94e6e` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Ordered Purchase Quantity |
| Definition | sum confirmed purchase quantities by compatible UOM |
| Formula / proposed formula | sum confirmed purchase quantities by compatible UOM |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | sum confirmed purchase quantities by compatible UOM Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Purchase UOM may differ from selling/base units. The observed 316 POs are historical, not an approved September cohort. |

### Received Purchase Quantity — purchase_received_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Received Purchase Quantity / كمية الشراء المستلمة |
| Canonical ID | Not registered; proposed definition ID only: `purchase_received_quantity` |
| Version / definition hash | 1 / `0682dfa506ad805e987b56ee3fc54f0de7b1393a5b55ff75369f24ce576910a4` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Received Purchase Quantity |
| Definition | sum received quantity by normalized UOM |
| Formula / proposed formula | sum received quantity by normalized UOM |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | sum received quantity by normalized UOM Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Returns and receipt adjustments need controls. The observed 316 POs are historical, not an approved September cohort. |

### Billed Purchase Quantity — purchase_billed_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Billed Purchase Quantity / كمية الشراء المفوترة |
| Canonical ID | Not registered; proposed definition ID only: `purchase_billed_quantity` |
| Version / definition hash | 1 / `f96c7b557455a774477c265508418f9386a0ac1a764f59f151592dbe77949e46` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Billed Purchase Quantity |
| Definition | sum billed quantity by normalized UOM |
| Formula / proposed formula | sum billed quantity by normalized UOM |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | sum billed quantity by normalized UOM Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Vendor bills versus credit notes policy. The observed 316 POs are historical, not an approved September cohort. |

### Open Purchase Quantity — open_purchase_quantity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Open Purchase Quantity / كمية الشراء المتبقية للاستلام |
| Canonical ID | Not registered; proposed definition ID only: `open_purchase_quantity` |
| Version / definition hash | 1 / `6af9d3b23a9d67b04c5099b0ab881e8ee8dd3a41aa2d3307363c46a708037263` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Open Purchase Quantity |
| Definition | approved ordered less received quantity |
| Formula / proposed formula | approved ordered less received quantity |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | approved ordered less received quantity Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | All sampled historical confirmed orders receipt full; future open coverage needs controls. The observed 316 POs are historical, not an approved September cohort. |

### Vendor Purchase Commitments Candidate — vendor_spend

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Vendor Purchase Commitments Candidate / التزامات الشراء حسب المورد المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `vendor_spend` |
| Version / definition hash | 1 / `046c123ce8c43384ead963757ebc98b66f49c8d6deb7254142498eb136062014` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Vendor Purchase Commitments Candidate |
| Definition | approved normalized purchase commitment/value by vendor |
| Formula / proposed formula | approved normalized purchase commitment/value by vendor |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | approved normalized purchase commitment/value by vendor Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 36 vendors; do not equate PO commitments to booked spend. The observed 316 POs are historical, not an approved September cohort. |

### Average Purchase Cost — average_purchase_cost

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Purchase Cost / متوسط تكلفة الشراء |
| Canonical ID | Not registered; proposed definition ID only: `average_purchase_cost` |
| Version / definition hash | 1 / `94f2e0ad283e32a4a8af7a8303d5abb3ca60dde146583ea752dc760b49f5ce5b` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Average Purchase Cost |
| Definition | normalized untaxed line value / normalized quantity |
| Formula / proposed formula | normalized untaxed line value / normalized quantity |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | normalized untaxed line value / normalized quantity Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Currency rate date and UOM conversion policy. The observed 316 POs are historical, not an approved September cohort. |

### Supplier Lead Time Candidate — supplier_lead_time

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Supplier Lead Time Candidate / مهلة التوريد المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `supplier_lead_time` |
| Version / definition hash | 1 / `7184cb22326bc9ee40d459d6d6271064253a090a435f8582516eb7315ca6b478` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Supplier Lead Time Candidate |
| Definition | approved first/last receipt minus confirmation |
| Formula / proposed formula | approved first/last receipt minus confirmation |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | approved first/last receipt minus confirmation Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Receipt bridge, partial returns and date choice need validation. The observed 316 POs are historical, not an approved September cohort. |

### Purchase Confirmation Time — po_confirmation_time

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Purchase Confirmation Time / مدة تأكيد أمر الشراء |
| Canonical ID | Not registered; proposed definition ID only: `po_confirmation_time` |
| Version / definition hash | 1 / `bb1df7f7e6bd5230bf0b0f480aba711391e8c0bc7e21faefeec5ad21bb393273` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Purchase Confirmation Time |
| Definition | confirmation minus order date |
| Formula / proposed formula | confirmation minus order date |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | confirmation minus order date Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | 3 missing approvals on cancelled orders; eligible confirmed cohort. The observed 316 POs are historical, not an approved September cohort. |

### Purchase Receipt Time Candidate — purchase_receipt_time

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Purchase Receipt Time Candidate / مدة استلام المشتريات المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `purchase_receipt_time` |
| Version / definition hash | 1 / `4e28870df437413c54bd90063deb344239cc66d59a025c8af9e5bc15c6f4b17a` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Purchase Receipt Time Candidate |
| Definition | approved complete receipt minus order date |
| Formula / proposed formula | approved complete receipt minus order date |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | approved complete receipt minus order date Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | First/last receipt semantics and bridge validation. The observed 316 POs are historical, not an approved September cohort. |

### Supplier On-time Delivery Candidate — supplier_delivery_performance

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Supplier On-time Delivery Candidate / نسبة التوريد في الموعد المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `supplier_delivery_performance` |
| Version / definition hash | 1 / `21ff845b4959176536ddc5c244512ecd722f90a7e4d24f06c3c2cbf31dc01c73` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Supplier On-time Delivery Candidate |
| Definition | actual receipt versus approved promised date |
| Formula / proposed formula | actual receipt versus approved promised date |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | actual receipt versus approved promised date Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | SLA and partial receipt policy need approval. The observed 316 POs are historical, not an approved September cohort. |

### Purchase Price Trend Candidate — purchase_price_trend

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Purchase Price Trend Candidate / اتجاه أسعار الشراء المقترح |
| Canonical ID | Not registered; proposed definition ID only: `purchase_price_trend` |
| Version / definition hash | 1 / `cc83064fba5a0165541d7064d109ef098bed3321e1690414b95f9dfbc2df0837` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Purchase Price Trend Candidate |
| Definition | normalized weighted unit cost by business period |
| Formula / proposed formula | normalized weighted unit cost by business period |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | normalized weighted unit cost by business period Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Fixed currency/UOM basis and changing product mix. The observed 316 POs are historical, not an approved September cohort. |

### Supplier Concentration — supplier_concentration

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Supplier Concentration / تركّز المشتريات لدى الموردين |
| Canonical ID | Not registered; proposed definition ID only: `supplier_concentration` |
| Version / definition hash | 1 / `86bafe4d00b31a2f2026926c95f257d0a8dbaac82fc6e7cf5d273b2695adc675` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Supplier Concentration |
| Definition | share of approved normalized PO commitment by vendor |
| Formula / proposed formula | share of approved normalized PO commitment by vendor |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | share of approved normalized PO commitment by vendor Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Currency normalization and spend definition prerequisites. The observed 316 POs are historical, not an approved September cohort. |

### Posted Vendor Bill Spend Candidate — vendor_bill_spend

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Posted Vendor Bill Spend Candidate / قيمة فواتير الموردين المُرحّلة المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `vendor_bill_spend` |
| Version / definition hash | 1 / `8bb089f3a878a74056c4a51ba620f532b96aa6e7526ff5cabd627be9640716ee` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Posted Vendor Bill Spend Candidate |
| Definition | posted vendor-bill value with credits and PO attribution |
| Formula / proposed formula | posted vendor-bill value with credits and PO attribution |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | posted vendor-bill value with credits and PO attribution Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Vendor accounting population and sign controls not profiled here. The observed 316 POs are historical, not an approved September cohort. |

### Purchase Price Variance Candidate — purchase_price_variance

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Purchase Price Variance Candidate / انحراف سعر الشراء المقترح |
| Canonical ID | Not registered; proposed definition ID only: `purchase_price_variance` |
| Version / definition hash | 1 / `2fae186bec6fef9a0542aa6e3c36c13f5fd32e21d5d53de821b89cc20783df0e` |
| Business purpose | Support decisions on procurement using the named measure and explicit scope. Purchase Price Variance Candidate |
| Definition | Actual normalized unit cost minus approved baseline unit cost; baseline/rate/date and optional percentage remain unresolved. |
| Formula / proposed formula | Actual normalized unit cost minus approved baseline unit cost; baseline/rate/date and optional percentage remain unresolved. |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Proposed order/confirmation date for commitments; actual receipt date for receipt events; bill date for posted spend. Choice awaits owner approval. |
| Source concept / Odoo calculation | Actual normalized unit cost minus approved baseline unit cost; baseline/rate/date and optional percentage remain unresolved. Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Grain | Purchase order, purchase line, or receipt as named; never multiply header commitment through receipt joins. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | IQD reporting only after validated company-currency conversion/date/rate; source IQD/USD/EUR/RUB cannot be silently mixed. Compatible UOM for quantities. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Confirmed/done purchase orders; commitments are separate from posted supplier bills. Receipts/returns require exact lineage. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | vendor, currency, product, product_category, warehouse, uom, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Dictionary-only proposal. Exact source-input mapping and reconciliation remain required. The observed 316 POs are historical, not an approved September cohort. |

## CRM

### Lead Count — lead_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Lead Count / عدد العملاء المحتملين |
| Canonical ID | Not registered; proposed definition ID only: `lead_count` |
| Version / definition hash | 1 / `ea58f1186fedd3fe3cf1ad2868e3d0fda39a17af1dd58e98e5d695b69fe3cea6` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Lead Count |
| Definition | count lead records |
| Formula / proposed formula | count lead records |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | count lead records Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Only one company-1 opportunity exists; no meaningful lead activity. |

### Opportunity Count — opportunity_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Opportunity Count / عدد الفرص البيعية |
| Canonical ID | `opportunity_count` |
| Version / definition hash | 1 / `1482a94b5498033b192c3327b4dbde6dd142f5bf205bcb8f8487dab41f722437` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Opportunity Count |
| Definition | count opportunities |
| Formula / proposed formula | count opportunities |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | count opportunities Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | One inactive zero-probability opportunity. |

### Won Opportunity Count — won_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Won Opportunity Count / عدد الفرص المحققة |
| Canonical ID | Not registered; proposed definition ID only: `won_count` |
| Version / definition hash | 1 / `275694d06139b628f16c169ee28c247140a9caa3c54c92f09bb43445c469ae5c` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Won Opportunity Count |
| Definition | count approved won opportunities |
| Formula / proposed formula | count approved won opportunities |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | count approved won opportunities Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Insufficient usage; define won stage and archived records. |

### Lost Opportunity Count — lost_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Lost Opportunity Count / عدد الفرص المفقودة |
| Canonical ID | Not registered; proposed definition ID only: `lost_count` |
| Version / definition hash | 1 / `e671771401d6b27fc1b12b9896be6c15a3085e4c28f81d0e708141dc3dd351dd` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Lost Opportunity Count |
| Definition | count approved lost opportunities |
| Formula / proposed formula | count approved lost opportunities |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | count approved lost opportunities Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Archive alone is not loss; insufficient usage. |

### Opportunity Win Rate — win_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Opportunity Win Rate / نسبة الفوز بالفرص |
| Canonical ID | `win_rate` |
| Version / definition hash | 1 / `bc2c62ebea44241b5aa9fa485cd091cc39a399a43a358fbbb304651fba5eae8d` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Opportunity Win Rate |
| Definition | won / approved closed opportunity cohort |
| Formula / proposed formula | won / approved closed opportunity cohort |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | won / approved closed opportunity cohort Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No meaningful historical population. |

### Pipeline Value — pipeline_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Pipeline Value / قيمة الفرص المفتوحة |
| Canonical ID | `pipeline_value` |
| Version / definition hash | 1 / `7fd82e52be5e8ba4576aeb5d1dd3bbf0f597115884da363991e2189c84491983` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Pipeline Value |
| Definition | sum approved active opportunity expected value |
| Formula / proposed formula | sum approved active opportunity expected value |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | sum approved active opportunity expected value Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | One inactive opportunity; not useful pipeline. |

### Average Opportunity Value — average_opportunity_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Average Opportunity Value / متوسط قيمة الفرصة |
| Canonical ID | Not registered; proposed definition ID only: `average_opportunity_value` |
| Version / definition hash | 1 / `954c439a272f7a6071e2858e29042fa9177389a09983a566709fa9c45462716a` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Average Opportunity Value |
| Definition | expected revenue / eligible opportunities |
| Formula / proposed formula | expected revenue / eligible opportunities |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | expected revenue / eligible opportunities Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Insufficient population. |

### Lead-to-Order Conversion — lead_order_conversion

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Lead-to-Order Conversion / تحويل العملاء المحتملين إلى طلبات |
| Canonical ID | Not registered; proposed definition ID only: `lead_order_conversion` |
| Version / definition hash | 1 / `640c30adf2d1ee059573ac6cfd9e5fe0b80cc0feb1708c51fe6dc1b34cdb513e` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Lead-to-Order Conversion |
| Definition | linked converted leads / eligible leads |
| Formula / proposed formula | linked converted leads / eligible leads |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | linked converted leads / eligible leads Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | All 68471 historical order opportunity_id null. |

### Opportunity-to-Order Conversion — opportunity_order_conversion

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Opportunity-to-Order Conversion / تحويل الفرص إلى طلبات |
| Canonical ID | Not registered; proposed definition ID only: `opportunity_order_conversion` |
| Version / definition hash | 1 / `8d2f431a730a58c3dc172031fd863c11fe98f47d93c55cfaf84f77ef8e2b2c83` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Opportunity-to-Order Conversion |
| Definition | linked ordering opportunities / eligible cohort |
| Formula / proposed formula | linked ordering opportunities / eligible cohort |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | linked ordering opportunities / eligible cohort Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No usable lineage population. |

### Sales Cycle Duration — sales_cycle_duration

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Sales Cycle Duration / مدة دورة البيع |
| Canonical ID | Not registered; proposed definition ID only: `sales_cycle_duration` |
| Version / definition hash | 1 / `b16698cb69fc63395944b938a394aab40aa44435ffb7b8b92280032dc83334b2` |
| Business purpose | Support decisions on crm using the named measure and explicit scope. Sales Cycle Duration |
| Definition | close minus open by approved closed cohort |
| Formula / proposed formula | close minus open by approved closed cohort |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Approved opened/closed dates, not an unspecified global date. |
| Source concept / Odoo calculation | close minus open by approved closed cohort Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Grain | One lead/opportunity; conversion requires direct order linkage. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts, days and separately normalized expected value. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | salesperson, sales_team, stage, campaign, source, medium, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Only one record; no representative performance. |

## Marketing

### Campaign Order Count — campaign_order_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Campaign Order Count / عدد الطلبات حسب الحملة |
| Canonical ID | Not registered; proposed definition ID only: `campaign_order_count` |
| Version / definition hash | 1 / `20eda8b621c9de84c4447427a5bc0b756b91b78c5a215a5332f5b3aa527b7f34` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Campaign Order Count |
| Definition | count orders grouped by campaign |
| Formula / proposed formula | count orders grouped by campaign |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | count orders grouped by campaign Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | 100% null across 68471 historical orders. |

### Campaign Order Revenue — campaign_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Campaign Order Revenue / قيمة الطلبات حسب الحملة |
| Canonical ID | Not registered; proposed definition ID only: `campaign_revenue` |
| Version / definition hash | 1 / `8ed5fb70e22892b34746f3657685e5a4a9fc901c48f3dc858ffcd054ce77460b` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Campaign Order Revenue |
| Definition | sum approved order value by campaign |
| Formula / proposed formula | sum approved order value by campaign |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | sum approved order value by campaign Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No attribution population. |

### Acquisition Source Order Count — source_order_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Acquisition Source Order Count / عدد الطلبات حسب مصدر الاستقطاب |
| Canonical ID | Not registered; proposed definition ID only: `source_order_count` |
| Version / definition hash | 1 / `9f9eb22ec7879764f825487b2b3760686f660e6e9d987d79d9f004435a0ba97d` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Acquisition Source Order Count |
| Definition | count orders grouped by acquisition source |
| Formula / proposed formula | count orders grouped by acquisition source |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | count orders grouped by acquisition source Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | 100% null historical source_id. |

### Acquisition Source Revenue — source_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Acquisition Source Revenue / قيمة الطلبات حسب مصدر الاستقطاب |
| Canonical ID | Not registered; proposed definition ID only: `source_revenue` |
| Version / definition hash | 1 / `2ae0605929b0eeff0fe080c893e8b0e46624292966c440fd0c586d8dfd0bdf19` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Acquisition Source Revenue |
| Definition | sum approved order value by acquisition source |
| Formula / proposed formula | sum approved order value by acquisition source |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | sum approved order value by acquisition source Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No attribution population. |

### Marketing Medium Order Count — medium_order_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Marketing Medium Order Count / عدد الطلبات حسب قناة التسويق |
| Canonical ID | Not registered; proposed definition ID only: `medium_order_count` |
| Version / definition hash | 1 / `483aba704d015dd02ce60139b034df1d85b5bd6fcb54e917b86728b3e80f2939` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Marketing Medium Order Count |
| Definition | count orders grouped by medium |
| Formula / proposed formula | count orders grouped by medium |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | count orders grouped by medium Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | 100% null historical medium_id. |

### Marketing Medium Revenue — medium_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Marketing Medium Revenue / قيمة الطلبات حسب قناة التسويق |
| Canonical ID | Not registered; proposed definition ID only: `medium_revenue` |
| Version / definition hash | 1 / `8c4df8039c7e4bff3c20c26f558a2808c927507a0a3295d310a52a936488e8a7` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Marketing Medium Revenue |
| Definition | sum approved order value by medium |
| Formula / proposed formula | sum approved order value by medium |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | sum approved order value by medium Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No attribution population. |

### Acquisition Average Order Value — acquisition_average_order_value

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Acquisition Average Order Value / متوسط قيمة الطلب حسب الاستقطاب |
| Canonical ID | Not registered; proposed definition ID only: `acquisition_average_order_value` |
| Version / definition hash | 1 / `33e9d301d927e10e8622e1f326c3aeec9069ca0610f719c61b46b06b2476ff24` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Acquisition Average Order Value |
| Definition | approved source revenue / source order count |
| Formula / proposed formula | approved source revenue / source order count |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | approved source revenue / source order count Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No attribution population. |

### Marketing Return on Investment Candidate — marketing_roi

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Marketing Return on Investment Candidate / العائد على الاستثمار التسويقي المقترح |
| Canonical ID | Not registered; proposed definition ID only: `marketing_roi` |
| Version / definition hash | 1 / `acc1e0a05c6cad491172413179a78999e3e147d2e675058653e91f9caac2e46b` |
| Business purpose | Support decisions on marketing using the named measure and explicit scope. Marketing Return on Investment Candidate |
| Definition | approved attributable contribution / external campaign spend |
| Formula / proposed formula | approved attributable contribution / external campaign spend |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Attributed order date; external spend needs its own aligned approved accounting period. |
| Source concept / Odoo calculation | approved attributable contribution / external campaign spend Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Grain | Order/acquisition cohort; external cost input required for ROI. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/IQD after attribution and currency validation; ROI definition remains unresolved. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Attributed eligible orders; historical campaign/source/medium attribution is empty; campaign spend is absent in the inspected scope. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | campaign, source, medium, customer, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No usable ad-platform spend, impressions or attribution lineage identified; external source required. |

## Delivery

### Delivered Orders Candidate — delivered_orders

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Delivered Orders Candidate / الطلبات المسلّمة المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `delivered_orders` |
| Version / definition hash | 1 / `f490a25868acb4b2ee76f5cfeb9016786d6239dc4716617286b53286079df009` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Delivered Orders Candidate |
| Definition | distinct confirmed orders under approved delivered status |
| Formula / proposed formula | distinct confirmed orders under approved delivered status |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | distinct confirmed orders under approved delivered status Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Picking count differs from order count; returns/backorders explicit. |

### Open Outbound Deliveries — open_deliveries

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Open Outbound Deliveries / عمليات التسليم الصادرة المفتوحة |
| Canonical ID | Not registered; proposed definition ID only: `open_deliveries` |
| Version / definition hash | 1 / `70ee3e12c9edeeca69a24287ad3284474b846761c196d81ea56a1c93aac3a4d2` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Open Outbound Deliveries |
| Definition | eligible non-done/non-cancel outbound pickings |
| Formula / proposed formula | eligible non-done/non-cancel outbound pickings |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | eligible non-done/non-cancel outbound pickings Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Direction from picking type; scheduled cohort is not delivered cohort. |

### Fulfilment Completion Rate Candidate — fulfilment_completion_rate

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Fulfilment Completion Rate Candidate / نسبة اكتمال التنفيذ المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `fulfilment_completion_rate` |
| Version / definition hash | 1 / `abb12de51e1c44528b6135efe4d9fce2fb4ff931e9949c98a932ce99845fe96d` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Fulfilment Completion Rate Candidate |
| Definition | done outbound pickings / approved eligible cohort |
| Formula / proposed formula | done outbound pickings / approved eligible cohort |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | done outbound pickings / approved eligible cohort Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Backorder/order versus picking denominator decision. |

### Fulfilment Duration Candidate — fulfilment_duration

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Fulfilment Duration Candidate / مدة تنفيذ التسليم المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `fulfilment_duration` |
| Version / definition hash | 1 / `d4166318e91e08520c827750ccac8041ee6d6efc96696cc13eedc0c72dd2d625` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Fulfilment Duration Candidate |
| Definition | approved final delivery minus order timestamp |
| Formula / proposed formula | approved final delivery minus order timestamp |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | approved final delivery minus order timestamp Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | 18 negative order effective durations; missing date_done and many-to-many shipments. |

### Late Deliveries Candidate — late_deliveries

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Late Deliveries Candidate / عمليات التسليم المتأخرة المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `late_deliveries` |
| Version / definition hash | 1 / `db2ea04d5559d3327d618facc74dbea9563ace36378d8e925f6049b167ab5bf5` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Late Deliveries Candidate |
| Definition | actual completion after approved promised timestamp |
| Formula / proposed formula | actual completion after approved promised timestamp |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | actual completion after approved promised timestamp Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Order commitment_date entirely null; deadlines partial; no assumed SLA. |

### On-time Delivery Percentage Candidate — on_time_delivery_percentage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | On-time Delivery Percentage Candidate / نسبة التسليم في الموعد المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `on_time_delivery_percentage` |
| Version / definition hash | 1 / `a4e2eeb52caa8af164e5e0e4558c1c8a9b60fb8b0603167da2745a81d0771529` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. On-time Delivery Percentage Candidate |
| Definition | approved on-time completed deliveries / eligible deliveries |
| Formula / proposed formula | approved on-time completed deliveries / eligible deliveries |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | approved on-time completed deliveries / eligible deliveries Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Exclude/report missing promises; business approval required. |

### Deliveries by Driver — deliveries_by_driver

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Deliveries by Driver / عمليات التسليم حسب السائق |
| Canonical ID | Not registered; proposed definition ID only: `deliveries_by_driver` |
| Version / definition hash | 1 / `e540eb5494d162e787a17036e26a9441f17214814fb3a5809686e27ab6dae942` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Deliveries by Driver |
| Definition | delivered orders/pickings by validated driver |
| Formula / proposed formula | delivered orders/pickings by validated driver |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | delivered orders/pickings by validated driver Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Only 1 of 3095 September orders has driver; no reliable population. |

### Driver Productivity Candidate — driver_productivity

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Driver Productivity Candidate / إنتاجية السائق المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `driver_productivity` |
| Version / definition hash | 1 / `810b1a37a52ebe7efaf218f8829a46f640807f3eb5a19fb1614a0e7c4f74c738` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Driver Productivity Candidate |
| Definition | approved delivery output per driver/time |
| Formula / proposed formula | approved delivery output per driver/time |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | approved delivery output per driver/time Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Driver population insufficient; shifts/hours not proven. |

### Delivered Revenue Candidate — delivered_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Delivered Revenue Candidate / الإيرادات المنسوبة إلى التسليم المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `delivered_revenue` |
| Version / definition hash | 1 / `5446d74c3067e7f4a3419f4963b083d5f5efcea3df2f99e84708510d91e15d55` |
| Business purpose | Support decisions on delivery using the named measure and explicit scope. Delivered Revenue Candidate |
| Definition | approved revenue allocated to delivered quantities |
| Formula / proposed formula | approved revenue allocated to delivered quantities |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Actual completion date for delivery; promise date for punctuality; order date for an explicitly selected order cohort. |
| Source concept / Odoo calculation | approved revenue allocated to delivered quantities Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Grain | Order, picking or movement must be named; count once at the chosen grain. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/days/compatible UOM; allocated IQD only after validated revenue linkage. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Eligible outbound pickings/done movements; order completion, partials, returns and promise date require explicit definitions. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | customer, salesperson, warehouse, driver, product, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | Partial invoicing, delivery and refunds require allocation bridge. |

## Routes / Field Sales

### Customers per Route — customers_per_route

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Customers per Route / عدد العملاء لكل مسار |
| Canonical ID | Not registered; proposed definition ID only: `customers_per_route` |
| Version / definition hash | 1 / `59100c97061acba6860b8604fca0643cd8141654aecc5d05b98159cc34ab4999` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Customers per Route |
| Definition | distinct authoritative route customers |
| Formula / proposed formula | distinct authoritative route customers |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | distinct authoritative route customers Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | 40 company route links; only 17/1939 order-cohort customers mapped; legacy route_id is store=false. |

### Orders per Route — orders_per_route

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Orders per Route / عدد الطلبات لكل مسار |
| Canonical ID | Not registered; proposed definition ID only: `orders_per_route` |
| Version / definition hash | 1 / `b2d2ce417a30f827944e1a287217c85d594b1d3f07d019f23f422e5493e5bf68` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Orders per Route |
| Definition | count orders attributed by approved historic route |
| Formula / proposed formula | count orders attributed by approved historic route |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | count orders attributed by approved historic route Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Sparse M2M; multi-route allocation and historical assignment unresolved. |

### Route Order Revenue — route_revenue

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Route Order Revenue / قيمة الطلبات حسب المسار |
| Canonical ID | Not registered; proposed definition ID only: `route_revenue` |
| Version / definition hash | 1 / `e1e8342fde7b751d7510941a41448bb1f7a73d650a295f3024e927b12faf8967` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Route Order Revenue |
| Definition | allocated approved order value by route |
| Formula / proposed formula | allocated approved order value by route |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | allocated approved order value by route Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Do not infer stable route from non-stored legacy column. |

### Active Route Customers Candidate — active_route_customers

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Active Route Customers Candidate / عملاء المسار النشطون المقترحون |
| Canonical ID | Not registered; proposed definition ID only: `active_route_customers` |
| Version / definition hash | 1 / `fc2778bc3d6e9e6de94b9b28d41806b4f7344fc50266090256e78e7f5b4c5b3e` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Active Route Customers Candidate |
| Definition | ordering route outlets under approved activity policy |
| Formula / proposed formula | ordering route outlets under approved activity policy |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | ordering route outlets under approved activity policy Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | Sparse authoritative mappings. |

### Route Coverage Candidate — route_coverage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Route Coverage Candidate / تغطية عملاء المسار المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `route_coverage` |
| Version / definition hash | 1 / `3579406b2717c7a0484c001fa2b90aa016ed9bc239264bf03770e833864ef624` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Route Coverage Candidate |
| Definition | visited eligible assigned outlets / eligible outlets |
| Formula / proposed formula | visited eligible assigned outlets / eligible outlets |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | visited eligible assigned outlets / eligible outlets Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Percentage (%), computed from matching totals; cohort and zero-denominator rules require exact-version approval. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | All 10574 September visits have route_id null; denominator sparse. |

### Salesperson Route Performance Candidate — salesperson_route_performance

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Salesperson Route Performance Candidate / أداء المندوب حسب المسار المقترح |
| Canonical ID | Not registered; proposed definition ID only: `salesperson_route_performance` |
| Version / definition hash | 1 / `b7478c07a3a484c8549020382d129fedb1843913bd1896fa6456496592bdba29` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Salesperson Route Performance Candidate |
| Definition | approved route visit/order output by salesperson |
| Formula / proposed formula | approved route visit/order output by salesperson |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | approved route visit/order output by salesperson Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | User-route links exist but visits have no route attribution. |

### Order Revenue per Ordering Outlet — revenue_per_outlet

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Order Revenue per Ordering Outlet / قيمة الطلبات لكل منفذ صاحب طلب |
| Canonical ID | Not registered; proposed definition ID only: `revenue_per_outlet` |
| Version / definition hash | 1 / `6897d5c5869c4b8bdd2a911e9a9072ba003ddbecc98833182db19c3d5b248b45` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Order Revenue per Ordering Outlet |
| Definition | approved order value / distinct ordering outlets |
| Formula / proposed formula | approved order value / distinct ordering outlets |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | approved order value / distinct ordering outlets Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Defined · Awaiting Reconciliation |
| Control example, not a definition constant | — |
| Known limitations | Route-free customer analytic feasible; outlet hierarchy needs definition. |

### Actual Visit Count Candidate — visit_count

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Actual Visit Count Candidate / عدد الزيارات الفعلية المقترح |
| Canonical ID | Not registered; proposed definition ID only: `visit_count` |
| Version / definition hash | 1 / `a18ed52ab189b65c98e1fbfd07c1bfc9fe891c1fd9563d17de43c5f0a1707780` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Actual Visit Count Candidate |
| Definition | count approved actual completed visits separately from scheduled records |
| Formula / proposed formula | count approved actual completed visits separately from scheduled records |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | count approved actual completed visits separately from scheduled records Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | 10574 scheduled September records; roughly half missing end time; states need owner interpretation. |

### Visit-to-Order Conversion Candidate — visit_order_conversion

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Visit-to-Order Conversion Candidate / تحويل الزيارات إلى طلبات المقترح |
| Canonical ID | Not registered; proposed definition ID only: `visit_order_conversion` |
| Version / definition hash | 1 / `528998b99dc927b48a39264d9cd71e39d4dca7ff9919ff15b5757d6b0df462c1` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Visit-to-Order Conversion Candidate |
| Definition | explicitly linked visits leading to orders / eligible visits |
| Formula / proposed formula | explicitly linked visits leading to orders / eligible visits |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | explicitly linked visits leading to orders / eligible visits Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | No direct visit-order FK found; temporal matching alone is approximate and not exact conversion. |

### Geographic Coverage Candidate — geographic_coverage

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Geographic Coverage Candidate / التغطية الجغرافية المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `geographic_coverage` |
| Version / definition hash | 1 / `8fdff26ac14defa304522d95784d4186dd97964d24c3af913aa3607d040123f4` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Geographic Coverage Candidate |
| Definition | approved eligible outlet coverage by area/geofence |
| Formula / proposed formula | approved eligible outlet coverage by area/geofence |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | approved eligible outlet coverage by area/geofence Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Discovered |
| Control example, not a definition constant | — |
| Known limitations | 1884/1939 valid nonzero coordinate pairs; coordinates not verified for accuracy; privacy controls required. |

### Maidan Integration Events Candidate — maidan_integration_events

| Definition field | Meaning |
| --- | --- |
| English / Arabic name | Maidan Integration Events Candidate / أحداث تكامل الميدان المقترحة |
| Canonical ID | Not registered; proposed definition ID only: `maidan_integration_events` |
| Version / definition hash | 1 / `5d8dc7d3968a6dfcc46123d605db9a69d1c51323d302f3230dc9cee815d5c13c` |
| Business purpose | Support decisions on routes / field sales using the named measure and explicit scope. Maidan Integration Events Candidate |
| Definition | externally identified field-sales integration event lifecycle |
| Formula / proposed formula | externally identified field-sales integration event lifecycle |
| Event / snapshot | Event / period-derived measure: defined business window. |
| Business date | Scheduled date is source discovery only; completed visit date needs an approved actual-visit rule. |
| Source concept / Odoo calculation | externally identified field-sales integration event lifecycle Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Grain | Route/outlet/visit; direct visit-order linkage required, not customer/user/date approximation. |
| Aggregation | Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances. |
| Currency / unit | Counts/percentages; IQD only for approved attributed orders. |
| Signs | Preserve source signs; posted invoice/refund values have explicit polarity. Refund Value is positive magnitude; Net Invoiced Revenue subtracts it. Negative stock and signed credits remain visible. No blanket absolute-value transform. |
| Included states | Actual completed visits distinct from scheduled visits; trustworthy historic route/customer assignment and visit-order linkage are insufficient. |
| Excluded / cancellation | Draft/cancelled documents excluded from value and completed-count measures. Cancelled Orders explicitly counts state cancel by order date. Other source states/returns must be approved before extraction; later source edits require a new frozen release, not rewriting history. |
| Refund / settlement | Order measures are not reduced by unrelated invoices/credit notes; invoicing recognizes each posted refund on its own issue date. Product/receipt returns require signed line/movement lineage; no header amount repeated per line. Snapshot settlements include only those effective by cutoff. |
| Null / Unassigned | No missing monetary, quantity, identity or date value becomes zero silently. Ratios with zero denominator are undefined. Missing owner/Business Line maps to governed Unassigned where supported; missing customer/product identity is an exception, never display-name matching. No arbitrary attribution. |
| Published dimensions | None |
| Candidate dimensions (not permissions) | route, customer, salesperson, business_line, state, city, geography, time |
| Technical evidence | Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference. |
| Business approval | Pending exact-version decision; owner/date/exceptions unrecorded. |
| Certification / publication | Not certified; unpublished; unavailable to normal AI/builder generation. |
| One lifecycle state | Unavailable / Insufficient Source Data |
| Control example, not a definition constant | — |
| Known limitations | No explicitly named Maidan model/table lineage found; owner must identify integration representations before assuming absence or joins. |

## Technical Source Reference

Names below are inspected source references, not runnable mappings. A proposed ID is never a canonical MetricId. Candidate dimensions require exact pair reconciliation and admission. Empty fields mean an input mapping is unresolved, never an invented column. Order salesperson = sale_order.user_id; invoice salesperson = account_move.invoice_user_id; stable customers = res_partner.id, without is_company. Branch identity is unproven. Stock procurement routes are not field-sales routes.

| ID | Discovery reference | Physical fields / candidate date / grain | Evidence |
| --- | --- | --- | --- |
| order_count | order_count | sale_order.id, sale_order.state / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| order_revenue | order_revenue | sale_order.amount_total, sale_order.state / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| untaxed_order_revenue | untaxed_order_revenue | sale_order.amount_untaxed / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| order_tax | order_tax | sale_order.amount_tax / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| average_confirmed_order_value | average_order_value | sale_order.amount_total, sale_order.id / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| ordered_quantity | ordered_quantity | sale_order_line.product_uom_qty, sale_order_line.product_uom / sale_order.date_order / order line, aggregated within compatible product/UOM scope | sales_values, sales_fields, sales_line_values |
| average_quantity_per_order | average_quantity_per_order | sale_order_line.product_uom_qty, sale_order_line.order_id, sale_order_line.product_uom / sale_order.date_order / order line, aggregated within compatible product/UOM scope | sales_values, sales_fields, sales_line_values |
| products_per_order | products_per_order | sale_order_line.product_id, sale_order_line.order_id / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| confirmed_orders | confirmed_orders | sale_order.id, sale_order.state / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| draft_orders | draft_orders | sale_order.id, sale_order.state / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| cancelled_orders | cancelled_orders | sale_order.id, sale_order.state / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| invoiced_order_rate | invoiced_order_rate | sale_order.invoice_status, sale_order.id / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| delivery_completion_rate | delivery_completion_rate | sale_order.delivery_status, sale_order.id / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| order_delivery_duration | order_delivery_duration | sale_order.date_order, sale_order.effective_date / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| order_invoice_duration | order_invoice_duration | sale_order.date_order, sale_order_line_invoice_rel.order_line_id, sale_order_line_invoice_rel.invoice_line_id, account_move.invoice_date / sale_order.date_order / order | sales_values, sales_fields, sales_line_values |
| invoiced_revenue | posted_invoice_value | account_move.amount_untaxed_signed, account_move.move_type, account_move.state / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| refund_value | refund_value | account_move.amount_untaxed_signed, account_move.move_type, account_move.state / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| net_invoiced_revenue | net_invoiced_revenue | account_move.amount_untaxed_signed, account_move.move_type, account_move.state / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| invoice_count | invoice_count | account_move.id, account_move.move_type, account_move.state / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| refund_count | refund_count | account_move.id, account_move.move_type, account_move.state / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| average_invoice_value | average_invoice_value | account_move.amount_untaxed_signed, account_move.id / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| untaxed_invoice_value | untaxed_invoice_value | account_move.amount_untaxed_signed / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| invoice_tax | invoice_tax | account_move.amount_tax_signed / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| gross_invoice_value | gross_invoice_value | account_move.amount_total_signed / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| refund_count_percentage | refund_rate | account_move.id, account_move.move_type / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| refund_value_percentage | refund_percentage | account_move.amount_untaxed_signed, account_move.move_type / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| invoice_quantity | invoice_quantity | account_move_line.quantity, account_move_line.product_uom_id, account_move.move_type / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| average_unit_selling_price | average_unit_selling_price | account_move_line.price_subtotal, account_move_line.quantity, account_move_line.product_uom_id / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| invoice_discount_amount | invoice_discount_amount | account_move_line.price_unit, account_move_line.quantity, account_move_line.discount, account_move_line.fixed_discount, account_move_line.price_subtotal / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| invoice_discount_rate | invoice_discount_rate | account_move_line.price_unit, account_move_line.quantity, account_move_line.discount, account_move_line.fixed_discount / account_move.invoice_date / invoice | invoice_controls, invoice_fields, invoice_line_values, invoice_lineage |
| outstanding_receivables | outstanding_receivables | account_move_line.amount_residual, account_account.account_type, account_move.state / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| invoice_outstanding_amount | invoice_outstanding_amount | account_move.amount_residual_signed, account_move.state, account_move.move_type / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| paid_invoice_amount | paid_invoice_amount | account_move.amount_total_signed, account_move.amount_residual_signed, account_partial_reconcile.amount / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| collection_amount | collection_amount | account_payment.move_id, account_payment.payment_type, account_payment.partner_type, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id, account_partial_reconcile.amount / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| collection_rate | collection_rate | account_payment.amount, account_move.amount_total_signed / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| overdue_amount | overdue_amount | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| not_yet_due_amount | not_yet_due_amount | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| aged_receivables_0_30 | aged_receivables_0_30 | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| aged_receivables_31_60 | aged_receivables_31_60 | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| aged_receivables_61_90 | aged_receivables_61_90 | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| aged_receivables_90_plus | aged_receivables_90_plus | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| overdue_invoice_count | overdue_invoice_count | account_move.id, account_move.invoice_date_due, account_move.amount_residual_signed / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| average_days_overdue | average_days_overdue | account_move_line.date_maturity, account_move_line.amount_residual / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| dso | dso | account_move_line.amount_residual, account_move.amount_untaxed_signed / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| historical_receivables | historical_receivables | account_partial_reconcile.max_date, account_partial_reconcile.amount, account_move_line.balance, account_move_line.date / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| partner_balance_before_after | partner_balance_before_after | account_move.partner_balance_before, account_move.partner_balance_after / account_move_line.date / date_maturity / receivable ledger line | receivable_current, payment_linkage, reconciliation, reconciliation_sides, invoice_fields |
| active_customers | active_customers | res_partner.active, res_partner.customer_rank / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| ordering_customers | ordering_customers | sale_order.partner_id, sale_order.state / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| new_customers | new_customers | res_partner.create_date, sale_order.date_order, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| revenue_per_customer | revenue_per_customer | sale_order.amount_total, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| orders_per_customer | orders_per_customer | sale_order.id, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| average_order_frequency | average_order_frequency | sale_order.date_order, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| average_days_between_orders | average_days_between_orders | sale_order.date_order, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| customer_lifetime_revenue | customer_lifetime_revenue | account_move.amount_untaxed_signed, account_move.partner_id, account_move.invoice_date / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| customer_recency | customer_recency | sale_order.date_order, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| customer_frequency | customer_frequency | sale_order.id, sale_order.partner_id, sale_order.date_order / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| inactive_customers | inactive_customers | sale_order.date_order, sale_order.partner_id, res_partner.active / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| churn_risk | churn_risk | sale_order.date_order, sale_order.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| top_bottom_customers | top_bottom_customers | account_move.amount_untaxed_signed, account_move.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| customer_rank_revenue | customer_rank_revenue | res_partner.customer_rank, account_move.amount_untaxed_signed, account_move.partner_id / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| customer_discount_profile | customer_discount_profile | res_partner.Customer_discount / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| customer_product_desires | customer_product_desires | res_partner.customer_desires_products, res_partner.products_customer_not_work / sale_order.date_order / res_partner.create_date / customer / customer-period | customer_fields, customer_geography_quality, route_cohort, history |
| units_sold | units_sold | account_move_line.quantity, account_move_line.product_uom_id, account_move.move_type / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_revenue | product_revenue | account_move_line.price_subtotal, account_move_line.product_id, account_move.move_type / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| category_revenue | category_revenue | account_move_line.price_subtotal, account_move_line.product_id, product_template.categ_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| brand_revenue | brand_revenue | account_move_line.price_subtotal, account_move_line.product_id, product_template.product_brand_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_average_selling_price | product_average_selling_price | account_move_line.price_subtotal, account_move_line.quantity, account_move_line.product_uom_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_discount | product_discount | account_move_line.discount, account_move_line.fixed_discount, account_move_line.price_unit, account_move_line.quantity, account_move_line.price_subtotal / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_mix | product_mix | account_move_line.quantity, account_move_line.product_uom_id, account_move_line.product_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_revenue_contribution | product_revenue_contribution | account_move_line.price_subtotal, account_move_line.product_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_refund_value | product_refund_value | account_move_line.price_subtotal, account_move_line.product_id, account_move.move_type / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| product_refund_rate | product_refund_rate | account_move_line.quantity, account_move_line.product_id, account_move.move_type / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| customers_per_product | customers_per_product | account_move_line.product_id, account_move.partner_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| products_per_customer | products_per_customer | account_move_line.product_id, account_move.partner_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| salesperson_product_revenue | salesperson_product_revenue | account_move_line.product_id, account_move_line.price_subtotal, account_move.invoice_user_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| business_line_product_revenue | business_line_product_revenue | account_move_line.product_id, account_move_line.price_subtotal, account_move_line.business_line_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| customer_product_revenue | customer_product_revenue | account_move_line.product_id, account_move_line.price_subtotal, account_move.partner_id / account_move.invoice_date / product line / product-period | invoice_line_values, sales_line_values, product_dimensions, uom_quality, invoice_lineage |
| order_margin | order_margin | sale_order.margin / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| order_margin_percentage | order_gross_margin_percentage | sale_order.margin, sale_order.amount_untaxed / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| product_order_margin | product_order_margin | sale_order_line.margin, sale_order_line.product_id / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| customer_order_margin | customer_order_margin | sale_order.margin, sale_order.partner_id / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| salesperson_order_margin | salesperson_order_margin | sale_order.margin, sale_order.user_id / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| business_line_order_margin | business_line_order_margin | sale_order.margin, sale_order.business_line_id / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| accounting_gross_profit | accounting_gross_profit | account_move_line.balance, account_move_line.account_id, account_account.account_type, stock_valuation_layer.stock_move_id, stock_valuation_layer.value / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| accounting_gross_margin | accounting_gross_margin | account_move_line.balance, account_move_line.account_id / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| analytic_profit | analytic_profit | account_move_line.analytic_distribution, account_move_line.balance / sale_order.date_order / account_move_line.date / order / order line / accounting period | sales_values, sales_line_values, custom_field_ownership, valuation, cogs_population |
| stock_on_hand | on_hand_quantity | stock_quant.quantity, stock_quant.product_id, stock_quant.location_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| reserved_quantity | reserved_quantity | stock_quant.reserved_quantity, stock_quant.product_id, stock_quant.location_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| available_quantity | available_quantity | stock_quant.quantity, stock_quant.reserved_quantity / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| incoming_quantity | incoming_quantity | stock_move.product_uom_qty, stock_move.quantity, stock_move.state, stock_move.location_dest_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| outgoing_quantity | outgoing_quantity | stock_move.product_uom_qty, stock_move.quantity, stock_move.state, stock_move.location_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| forecast_quantity | forecast_quantity | stock_quant.quantity, stock_move.product_uom_qty, stock_move.quantity, stock_move.state / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| inventory_value | inventory_value | stock_valuation_layer.remaining_value, stock_valuation_layer.remaining_qty, stock_valuation_layer.value / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| warehouse_inventory_quantity | warehouse_inventory_quantity | stock_quant.quantity, stock_quant.location_id, stock_location.warehouse_id, stock_location.parent_path / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| location_inventory_quantity | location_inventory_quantity | stock_quant.quantity, stock_quant.location_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| product_inventory_quantity | product_inventory_quantity | stock_quant.quantity, stock_quant.product_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| category_inventory_quantity | category_inventory_quantity | stock_quant.quantity, stock_quant.product_id, product_template.categ_id, product_template.uom_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| stock_movement_quantity | stock_movement_quantity | stock_move.quantity, stock_move.product_uom, stock_move.state, stock_move.date / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| stock_turnover | stock_turnover | stock_valuation_layer.value, stock_quant.quantity / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| days_inventory | days_inventory | stock_quant.quantity, stock_move.quantity, stock_move.date / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| days_cover | days_cover | stock_quant.quantity, stock_quant.reserved_quantity, sale_order_line.product_uom_qty / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| slow_moving_stock | slow_moving_stock | stock_quant.quantity, stock_move.date, stock_move.product_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| dead_stock | dead_stock | stock_quant.quantity, stock_move.date, stock_move.product_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| stockout_count | stockout_count | stock_quant.quantity, stock_quant.product_id, stock_quant.location_id / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| stockout_risk | stockout_risk | stock_quant.quantity, sale_order_line.product_uom_qty / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| overstock | overstock | stock_quant.quantity, stock_move.quantity, stock_move.date / observed_at / stock_move.date / current quant / stock move / valuation layer | inventory_current, valuation, fulfilment_lineage, uom_quality |
| near_expiry_quantity | near_expiry_quantity | stock_quant.quantity, stock_quant.lot_id, stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| near_expiry_value | near_expiry_value | stock_quant.quantity, stock_quant.lot_id, stock_valuation_layer.lot_id, stock_valuation_layer.value / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| expired_quantity | expired_quantity | stock_quant.quantity, stock_quant.lot_id, stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| expired_value | expired_value | stock_quant.quantity, stock_quant.lot_id, stock_valuation_layer.lot_id, stock_valuation_layer.value / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| days_to_expiry | days_to_expiry | stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| products_expiring_7_days | products_expiring_7_days | stock_quant.product_id, stock_quant.lot_id, stock_quant.quantity, stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| products_expiring_30_days | products_expiring_30_days | stock_quant.product_id, stock_quant.lot_id, stock_quant.quantity, stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| products_expiring_60_days | products_expiring_60_days | stock_quant.product_id, stock_quant.lot_id, stock_quant.quantity, stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| products_expiring_90_days | products_expiring_90_days | stock_quant.product_id, stock_quant.lot_id, stock_quant.quantity, stock_lot.expiration_date / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| business_line_expiry_risk | business_line_expiry_risk | stock_quant.product_id, stock_quant.lot_id, stock_lot.expiration_date, business_line.id / observed_at / stock_lot.expiration_date / current positive internal quant / lot | expiry_current, lots, valuation, product_dimensions |
| purchase_spend | purchase_spend | purchase_order.amount_total, purchase_order.amount_total_cc, purchase_order.currency_id, purchase_order.state / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| purchase_order_count | purchase_order_count | purchase_order.id, purchase_order.state / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| average_purchase_order_value | average_purchase_order_value | purchase_order.amount_total, purchase_order.currency_id, purchase_order.id / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| purchase_ordered_quantity | purchase_ordered_quantity | purchase_order_line.product_qty, purchase_order_line.product_uom / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| purchase_received_quantity | purchase_received_quantity | purchase_order_line.qty_received, purchase_order_line.product_uom / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| purchase_billed_quantity | purchase_billed_quantity | purchase_order_line.qty_invoiced, purchase_order_line.product_uom / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| open_purchase_quantity | open_purchase_quantity | purchase_order_line.product_qty, purchase_order_line.qty_received, purchase_order_line.product_uom / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| vendor_spend | vendor_spend | purchase_order.partner_id, purchase_order.amount_total, purchase_order.amount_total_cc / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| average_purchase_cost | average_purchase_cost | purchase_order_line.price_subtotal, purchase_order_line.product_qty, purchase_order_line.product_uom, purchase_order_line.currency_id / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| supplier_lead_time | supplier_lead_time | purchase_order.date_approve, stock_picking.date_done, stock_move.purchase_line_id / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| po_confirmation_time | po_confirmation_time | purchase_order.date_order, purchase_order.date_approve / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| purchase_receipt_time | purchase_receipt_time | purchase_order.date_order, purchase_order.effective_date, stock_picking.date_done / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| supplier_delivery_performance | supplier_delivery_performance | purchase_order_line.date_planned, stock_picking.date_done / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| purchase_price_trend | purchase_price_trend | purchase_order_line.price_unit, purchase_order_line.discount, purchase_order_line.product_uom, purchase_order_line.currency_id, purchase_order.date_order / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| supplier_concentration | supplier_concentration | purchase_order.partner_id, purchase_order.amount_total_cc / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| vendor_bill_spend | vendor_bill_spend | account_move.move_type, account_move.amount_untaxed_signed, account_move.invoice_date, account_move_line.purchase_line_id / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | purchases, purchase_fields, purchase_lines, currency_labels, history |
| lead_count | lead_count | crm_lead.id, crm_lead.type / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| opportunity_count | opportunity_count | crm_lead.id, crm_lead.type / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| won_count | won_count | crm_lead.stage_id, crm_stage.is_won / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| lost_count | lost_count | crm_lead.active, crm_lead.lost_reason_id / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| win_rate | win_rate | crm_lead.stage_id, crm_lead.active / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| pipeline_value | pipeline_value | crm_lead.expected_revenue, crm_lead.active, crm_lead.probability / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| average_opportunity_value | average_opportunity_value | crm_lead.expected_revenue, crm_lead.id / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| lead_order_conversion | lead_order_conversion | crm_lead.id, crm_lead.type, sale_order.opportunity_id / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| opportunity_order_conversion | opportunity_order_conversion | crm_lead.id, sale_order.opportunity_id / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| sales_cycle_duration | sales_cycle_duration | crm_lead.date_open, crm_lead.date_closed / crm_lead.date_open / date_closed / lead/opportunity | crm_usage, crm_fields, attribution_history |
| campaign_order_count | campaign_order_count | sale_order.campaign_id, sale_order.id / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| campaign_revenue | campaign_revenue | sale_order.campaign_id, sale_order.amount_total / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| source_order_count | source_order_count | sale_order.source_id, sale_order.id / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| source_revenue | source_revenue | sale_order.source_id, sale_order.amount_total / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| medium_order_count | medium_order_count | sale_order.medium_id, sale_order.id / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| medium_revenue | medium_revenue | sale_order.medium_id, sale_order.amount_total / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| acquisition_average_order_value | acquisition_average_order_value | sale_order.source_id, sale_order.amount_total, sale_order.id / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| marketing_roi | marketing_roi | unresolved / sale_order.date_order / order / acquisition cohort | attribution_history, sales_fields, invoice_fields |
| delivered_orders | delivered_orders | sale_order.delivery_status, sale_order.id / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| open_deliveries | open_deliveries | stock_picking.id, stock_picking.state / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| fulfilment_completion_rate | fulfilment_completion_rate | stock_picking.state, stock_picking.id / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| fulfilment_duration | fulfilment_duration | sale_order.date_order, stock_picking.date_done, stock_picking.sale_id / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| late_deliveries | late_deliveries | stock_picking.date_deadline, stock_picking.scheduled_date, stock_picking.date_done / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| on_time_delivery_percentage | on_time_delivery_percentage | stock_picking.date_deadline, stock_picking.scheduled_date, stock_picking.date_done / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| deliveries_by_driver | deliveries_by_driver | sale_order.driver_id, stock_picking.sale_id / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| driver_productivity | driver_productivity | sale_order.driver_id, stock_picking.date_done / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| delivered_revenue | delivered_revenue | account_move_line.price_subtotal, stock_move.sale_line_id, stock_move.quantity, stock_picking.date_done / stock_picking.scheduled_date / date_done / order / picking / movement | delivery, delivery_fields, fulfilment_lineage, sales_values, sales_fields |
| customers_per_route | customers_per_route | visits_partner_route_rel.partner_id, visits_partner_route_rel.route_id, sales_route.company_id / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| orders_per_route | orders_per_route | visits_partner_route_rel.partner_id, visits_partner_route_rel.route_id, sale_order.partner_id, sale_order.id / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| route_revenue | route_revenue | visits_partner_route_rel.partner_id, visits_partner_route_rel.route_id, sale_order.amount_total / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| active_route_customers | active_route_customers | visits_partner_route_rel.partner_id, visits_partner_route_rel.route_id, sale_order.date_order / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| route_coverage | route_coverage | sales_visit.partner_id, sales_visit.route_id, visits_partner_route_rel.partner_id / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| salesperson_route_performance | salesperson_route_performance | sales_visit.user_id, sales_visit.route_id, res_users_sales_route_rel.sales_route_id / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| revenue_per_outlet | revenue_per_outlet | sale_order.partner_id, sale_order.amount_total / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| visit_count | visit_count | sales_visit.id, sales_visit.stage_id, sales_visit.is_pending, sales_visit.from_time, sales_visit.to_time / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| visit_order_conversion | visit_order_conversion | sales_visit.partner_id, sales_visit.user_id, sales_visit.scheduled_date, sale_order.partner_id, sale_order.user_id, sale_order.date_order / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| geographic_coverage | geographic_coverage | res_partner.partner_latitude, res_partner.partner_longitude, res_partner.state_id, res_partner.city_id / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| maidan_integration_events | maidan_integration_events | unresolved / sales_visit.scheduled_date / route / outlet / scheduled visit | route_relations, route_cohort, visit_fields, visit_states, customer_fields, custom_field_ownership |
| cancellation_percentage | proposal/control | unresolved / sale_order.date_order / order | proposal; no exact output reconciliation |
| returning_customers | proposal/control | unresolved / sale_order.date_order / res_partner.create_date / customer / customer-period | proposal; no exact output reconciliation |
| customer_revenue_contribution_percentage | proposal/control | unresolved / sale_order.date_order / res_partner.create_date / customer / customer-period | proposal; no exact output reconciliation |
| top_customer_concentration | proposal/control | unresolved / sale_order.date_order / res_partner.create_date / customer / customer-period | proposal; no exact output reconciliation |
| product_order_revenue | proposal/control | unresolved / account_move.invoice_date / product line / product-period | proposal; no exact output reconciliation |
| refund_quantity | proposal/control | unresolved / account_move.invoice_date / product line / product-period | proposal; no exact output reconciliation |
| product_refund_value_percentage | proposal/control | unresolved / account_move.invoice_date / product line / product-period | proposal; no exact output reconciliation |
| product_refund_quantity_percentage | proposal/control | unresolved / account_move.invoice_date / product line / product-period | proposal; no exact output reconciliation |
| purchase_price_variance | proposal/control | unresolved / purchase_order.date_order / date_approve / purchase order / purchase line / receipt | proposal; no exact output reconciliation |
| near_expiry_percentage | proposal/control | unresolved / observed_at / stock_lot.expiration_date / current positive internal quant / lot | proposal; no exact output reconciliation |
| customers_positive_receivable | proposal/control | unresolved / account_move_line.date / date_maturity / receivable ledger line | proposal; no exact output reconciliation |
| customers_credit_balance | proposal/control | unresolved / account_move_line.date / date_maturity / receivable ledger line | proposal; no exact output reconciliation |
| overdue_customer_count | proposal/control | unresolved / account_move_line.date / date_maturity / receivable ledger line | proposal; no exact output reconciliation |
| expiring_quantity_7_days | proposal/control | unresolved / observed_at / stock_lot.expiration_date / current positive internal quant / lot | proposal; no exact output reconciliation |
| expiring_quantity_30_days | proposal/control | unresolved / observed_at / stock_lot.expiration_date / current positive internal quant / lot | proposal; no exact output reconciliation |
| expiring_quantity_60_days | proposal/control | unresolved / observed_at / stock_lot.expiration_date / current positive internal quant / lot | proposal; no exact output reconciliation |
| expiring_quantity_90_days | proposal/control | unresolved / observed_at / stock_lot.expiration_date / current positive internal quant / lot | proposal; no exact output reconciliation |
| receivables_gross_outstanding_amount | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| credit_balances | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| net_aged_receivable | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| aged_at_date | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| aged_1_30 | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| aged_31_60 | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| aged_61_90 | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| aged_91_120 | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| aged_over_120 | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| receivables_current_amount | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| receivables_overdue_1_30_amount | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| receivables_overdue_31_90_amount | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| receivables_overdue_over_90_amount | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| receivables_missing_due_date_amount | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| receivables_missing_due_date_count | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| total_overdue_net | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |
| overdue_net_percentage | proposal/control | account_move_line.balance, account_move_line.date, account_move_line.date_maturity, account_move_line.partner_id, account_partial_reconcile.amount, account_partial_reconcile.max_date, account_partial_reconcile.debit_move_id, account_partial_reconcile.credit_move_id / cutoff 2026-09-30; max_date <= cutoff; sourceAsOf 2026-10-06T12:53:16.128Z / receivable ledger line | receivables-aging-v1, odoo-aged-receivable-numeric-replay, source-evidence-report-unlock-wave |

## Evidence and operating references

- [Discovery catalog](../integration/odoo-analytics-capability-catalog.json) · [Discovery report](../integration/odoo-analytics-capability-discovery.md)

- [Wave 1 exact controls](../integration/odoo-certification-wave-one.json) · [Wave 2 requirements](../integration/finance-product-wave-two-catalog.json)

- [Gross aging v1](../integration/receivables-aging-v1.md) · [Net Odoo control](../integration/odoo-aged-receivable-control.md)

- [Current local reports](../integration/local-management-reports-v1.md) · [Luna QA handoff](../qa/local-management-pack-luna-handoff.md)

- [Versioned definition source](enterprise-metrics-v1.json)

Private workbook and customer extracts remain outside Git. Documents contain aggregate examples only. Tunnel unavailable on October 6: no new source extraction, approval, certification or publication. Existing local authentication and AI/manual publication guards unchanged. Visual/browser QA deferred to Luna; no visual pass claimed.
