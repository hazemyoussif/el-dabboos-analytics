# El-Dabboos Metric Approval Pack

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

Sign an exact definition/version/hash and control reference, not a metric name alone. Any formula/date/currency/grain/credit-policy change creates a new definition version and requires new approval/reconciliation. Completed forms are business evidence, not runtime authorization: an authorized operator must record them through existing append-only versioned governance, link exact controls, certify and explicitly publish. Never insert these pending entries into the runtime registry.

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

## Finance

### APP-01

Approve two separately named issue-date ratios: positive credit-note value / posted invoice value, and credit-note count / invoice count, both ×100; undefined at zero denominator?

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Refund Value Percentage (`refund_value_percentage` v1) | 100 × positive Refund Value / Posted Invoice Value in the same issue-date window. | — |
| Refund Count Percentage (`refund_count_percentage` v1) | 100 × Refund Count / Invoice Count; document-count ratio, not proportion of original invoices refunded. | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `refund_value_percentage` / `81a317afcde3b8ff492fd4b20cbf5f40c3621b92f953286cf293a322613232d2`
- `refund_count_percentage` / `c26d8b2f190e70170aca38f1faac8786a17cf7a01488330c49ab4768d37b2e21`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-02

Approve stored Odoo Sales Margin as Order Margin, separate from Accounting Gross Profit, and the ratio of summed margin to matching untaxed order value?

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Order Margin (`order_margin` v1) | sum stored Odoo sale_margin | — |
| Order Margin Percentage (`order_margin_percentage` v1) | 100 × sum(stored confirmed-order margin) / sum(untaxed value of the same confirmed orders). | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `order_margin` / `7e1b9d9bc89bc0d046faff41c04693c3000313a996533d5b05250a9af32e5fd9`
- `order_margin_percentage` / `fbcd63c89c6cbeedd617fba6b339fbc28854577b84be45e75d5a7e299010ae67`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-03

Specify approved COGS accounts, revenue/cost recognition and return/valuation attribution before defining Accounting Gross Profit and its percentage.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Accounting Gross Profit (`accounting_gross_profit` v1) | approved accounting revenue less mapped COGS | — |
| Accounting Gross Margin Percentage (`accounting_gross_margin` v1) | approved accounting gross profit / matching approved revenue | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `accounting_gross_profit` / `5450ef9fa6fb58dfb8db1d578a41fcc20ba3e98a299ef52240dfd7960163b3af`
- `accounting_gross_margin` / `1f8503ba6883f5aa01e55c2fead79365a2867d007ceefa453a4d345a04b7b85e`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-04

Recorded: Finance standing approval dated October 7 applies to this exact published signed-cutoff family. Exact identity/evidence, maturity-date fallback, signed credits, aggregate overdue ratio and zero-denominator null are demonstrated. Other custom report options or policy changes still require explicit Finance confirmation.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Net Aged Receivable (`net_aged_receivable` vodoo-aged-report-reconstruction-v1) | At Date + 1–30 + 31–60 + 61–90 + 91–120 + >120 = Gross Open Receivable Components + Credit Balances | 1359461092.61 |
| At-Date Receivable (`aged_at_date` vodoo-aged-report-reconstruction-v1) | Signed receivable balances due on or after cutoff, including due today. | 759020481.15 |
| 1–30 Overdue (`aged_1_30` vodoo-aged-report-reconstruction-v1) | Signed receivable balances overdue by 1–30 days at cutoff. | 218464001.82 |
| 31–60 Overdue (`aged_31_60` vodoo-aged-report-reconstruction-v1) | Signed receivable balances overdue by 31–60 days at cutoff. | 69135500.55 |
| 61–90 Overdue (`aged_61_90` vodoo-aged-report-reconstruction-v1) | Signed receivable balances overdue by 61–90 days at cutoff. | 25871000.18 |
| 91–120 Overdue (`aged_91_120` vodoo-aged-report-reconstruction-v1) | Signed receivable balances overdue by 91–120 days at cutoff. | 33782500.14 |
| Older than 120 (`aged_over_120` vodoo-aged-report-reconstruction-v1) | Signed receivable balances overdue by more than 120 days at cutoff. | 253187608.77 |
| Total Overdue (`total_overdue_net` v1) | 1–30 + 31–60 + 61–90 + 91–120 + >120 | 600440611.46 |
| Overdue % (`overdue_net_percentage` v1) | Total Overdue ÷ Net Aged Receivable × 100 | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `net_aged_receivable` / `742b71fb367dbfff4fd8f82313c5be5c90597ae9e92eac18e809bb2d1e91c359`
- `aged_at_date` / `a6e25410f1e454021f4b7c6da0843e66eacdbc6672ef045fa62375b2033222c6`
- `aged_1_30` / `6c0b088d24b67ef814c7f67192ac36f59ccd824dfb7cd9bb11a0176ee3f110f0`
- `aged_31_60` / `7dcb5bd89ebceea808aec0c4d8346c9cff8b9d13a738ab2c6cabc9f6d9d6092d`
- `aged_61_90` / `2e52737b9a436e7fb0fb0138c1ef053bf1ea8677c6ebe379264e00e5e496c929`
- `aged_91_120` / `3ca10aeb39dfda5177888fbcb017378f3cce20ec7627937163bb8bb2245f5cda`
- `aged_over_120` / `50dc4f50fbd334a2adb95b45670e909c93771ec55db4c485b2fb580e907eba2b`
- `total_overdue_net` / `c58acecc08e48c13e570c70e639ed8d4ff92a85b2aac6d27e7ffb3b3d8b6e046`
- `overdue_net_percentage` / `7879bb81eec5243cd715a3ccb5efa99bb14d09261168e16792d1b5a648c6be41`

Finance standing approval already recorded for the exact published family; no repeated sign-off is requested. Policy changes require a new explicit decision.

### APP-05

Gross-positive and credit summary totals are already certified under the standing decision. Explicit Finance confirmation is still required for the alternative gross-aging-v1 bucket policy, its separate missing-maturity bucket without fallback, and any allocation change. Signed net aging approval does not certify these alternate buckets.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Gross Open Receivable Components (`receivables_gross_outstanding_amount` vreceivables-aging-v1) | Positive open receivable components before remaining credit balances are netted. | 1532751636.39 |
| Current Gross Receivables (`receivables_current_amount` vreceivables-aging-v1) | Positive residual with maturity ≥ cutoff; no missing-date fallback. | 760615731.13 |
| Gross 1–30 Days Overdue (`receivables_overdue_1_30_amount` vreceivables-aging-v1) | Positive residual with 1–30 days overdue using actual maturity. | 239405751.70 |
| Gross 31–90 Days Overdue (`receivables_overdue_31_90_amount` vreceivables-aging-v1) | Positive residual with 31–90 days overdue using actual maturity. | 94315000.66 |
| Gross Over-90 Days Overdue (`receivables_overdue_over_90_amount` vreceivables-aging-v1) | Positive residual with >90 days overdue using actual maturity. | 227502606.69 |
| Missing Due Date Amount (`receivables_missing_due_date_amount` vreceivables-aging-v1) | Positive open residual where actual maturity is absent; retained in gross outside other buckets. | 210912546.21 |
| Missing Due Date Component Count (`receivables_missing_due_date_count` vreceivables-aging-v1) | Count positive open maturity components with missing due date; not invoice count. | 1319 |
| Credit Balances (`credit_balances` vodoo-aged-report-reconstruction-v1) | Remaining negative open receivable components, shown with their negative sign. | -173290543.78 |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `receivables_gross_outstanding_amount` / `b7f8b5b16ba131a9ae7c483005832fafe08b90992a96ad193cfd4c8502e5908a`
- `receivables_current_amount` / `41ee80f564567e332eccbcea3b224f3617b0748b09fe25c3a9d7bc114f3057ed`
- `receivables_overdue_1_30_amount` / `37b71eafc9d991dcabd014f87e6692bd818bf81978f438fc76a0fa27e264413b`
- `receivables_overdue_31_90_amount` / `c45e0619bbf0040efc69fa3fdad410d4c206e9123a0aa9c5f64b094087ac91bd`
- `receivables_overdue_over_90_amount` / `65751f24aac04df66cf668c68d960eb7a2ddcec178d1692d5f247784daf7d69d`
- `receivables_missing_due_date_amount` / `064a8b50a0eed41c4a29d1b38888477166945a112f7b14c910009ff6f09f9ce9`
- `receivables_missing_due_date_count` / `310b1816754d98db051fb8c62b47f1c649fe5d5fdb91e2ef3f8bca6ae40239ad`
- `credit_balances` / `74bedd03fa03269a685edead64d281f7dddebf372d5c87abb1c82b319895ea95`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-06

Confirm future nonzero-tax treatment and reporting currency lineage; September zero tax does not establish tax-inclusive/untaxed equality. Existing Net Invoiced Revenue meaning remains approved.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Invoice Tax (`invoice_tax` v1) | sum with explicit invoice/refund sign scope | — |
| Tax-inclusive Invoice Value (`gross_invoice_value` v1) | sum posted out_invoice | — |
| Untaxed Order Revenue (`untaxed_order_revenue` v1) | sum confirmed untaxed value | — |
| Order Tax (`order_tax` v1) | sum | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `invoice_tax` / `533179016f3ab65b4ce1daa44a3d834e9260a398b5b59c052ce59d6be9e8e122`
- `gross_invoice_value` / `5638c8e0870b913d4f0fc6a80ae4c6fc089d0a698a1fd0fb4cb852bb6ac5a873`
- `untaxed_order_revenue` / `6f58c8c3f05e337702e78333d2ef658737339f1204feb27aa9bedcbd5a160315`
- `order_tax` / `e841f03b88d675d7d9d7c42b602a1dfa647fce3fb72db5ae9c0d54685ae0c99a`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-07

Define cash versus settlement, collection cohort, DSO credit sales and closing/average receivable denominator, and overdue-day weighting. No default formula or allocation will be inferred.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Customer Cash Collections (`collection_amount` v1) | maximally attributed inbound customer cash settlements | — |
| Collection Rate Candidate (`collection_rate` v1) | approved collections / approved billed or due cohort | — |
| Days Sales Outstanding Candidate (`dso` v1) | approved debtor-days ratio using closing/average AR and credit sales | — |
| Average Days Overdue Candidate (`average_days_overdue` v1) | approved weighted/unweighted overdue-day average | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `collection_amount` / `39864c7d3f1166e0ff06f9920416d246e29298e8d38b734392185cbec47d0b91`
- `collection_rate` / `18ea67759c0bec6013d456fb84dc4ec8d95b8c58e07fd74eb8b7d471a3f97c28`
- `dso` / `a9fceff3979229a20ed04f3a53f9eb2b67156dae8714e578ca515fd663618298`
- `average_days_overdue` / `b2a738c73472ce01e7b3b52774aab4fe64c991ff94f7a409f5e615917eb62bf4`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-08

Approve purchase commitment naming, tax basis and company-currency rate/date evidence; distinguish commitments from posted vendor-bill spend.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Purchase Commitments Candidate (`purchase_spend` v1) | approved confirmed PO commitment or posted bill expense | — |
| Vendor Purchase Commitments Candidate (`vendor_spend` v1) | approved normalized purchase commitment/value by vendor | — |
| Average Purchase Cost (`average_purchase_cost` v1) | normalized untaxed line value / normalized quantity | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `purchase_spend` / `39a90f924de6a319bba30315100068ac17f3b07c3388eb7b13d9aac25395a3c3`
- `vendor_spend` / `046c123ce8c43384ead963757ebc98b66f49c8d6deb7254142498eb136062014`
- `average_purchase_cost` / `94f2e0ad283e32a4a8af7a8303d5abb3ca60dde146583ea752dc760b49f5ce5b`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-09

Identify attributable inventory/lot valuation and accounting reconciliation; reject arbitrary average cost as exact expiry valuation.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Inventory Value (`inventory_value` v1) | approved current layer valuation reconciled to stock/accounting | — |
| Expiry Risk Value Candidate (`near_expiry_value` v1) | near-expiry stock at approved attributable lot cost | — |
| Expired Stock Value Candidate (`expired_value` v1) | expired quantity at approved attributable cost | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `inventory_value` / `f8d7bce8f61a05853b8c96a8518a4afb4b95affc2d6f3914e7ddc652483cab3f`
- `near_expiry_value` / `de9ca9e372aacd7aaa1251136dc622d42f591aa0f1f18abbc9b3d643fd974438`
- `expired_value` / `864ccd786993291896f1df125f54bf8b120d26f7207f20f6b6be754fd09c8698`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

## Management

### APP-10

Confirm preferred report ordering and KPI presentation priorities while retaining the established Executive Revenue = Net Invoiced Revenue decision; no formula reapproval requested.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Net Invoiced Revenue (`net_invoiced_revenue` v1) | posted invoice value minus positive refund value | 1447166500 |
| Posted Invoice Value (`invoiced_revenue` v1) | sum posted out_invoice untaxed signed | 1465712000 |
| Refund Value (`refund_value` v1) | negate sum posted out_refund untaxed signed | 18545500 |
| Order Revenue (`order_revenue` v1) | sum confirmed tax-inclusive amount_total | 1461335500 |
| Order Count (`order_count` v1) | count confirmed orders | 2895 |
| Average Confirmed Order Value (`average_confirmed_order_value` v1) | Confirmed tax-inclusive Order Revenue / confirmed Order Count; weighted ratio of totals. | 1461335500 / 2895 |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `net_invoiced_revenue` / `cb31f7dbab7fc1b166aa94f2bcda990df5163939c0323506c7bd5e14e58982fd`
- `invoiced_revenue` / `cb2795748c081ce2775a2ab6af8b20c20e182a6bea265df3f76389c60583bcee`
- `refund_value` / `a1bccedb022e17daf8b2db5e99f0613cf23b8d51816be9054c2fb24d2f0f6dac`
- `order_revenue` / `51d3a9a7c2da2dd49a8c6aa5b21aaf6c2f732152f9791d8e6c25187406baab9b`
- `order_count` / `edeadf667c18c2e0f76df6d1a8145b8301e7d546c1d6acb759df81c8c781bec4`
- `average_confirmed_order_value` / `efe25f2f595061f2573c22a04e85ca1d1f8e243e2652075242dfe504d4050f19`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-11

Choose purchase-based versus registration-based customer cohorts, observation windows and top-N policy. Define inactivity thresholds explicitly; do not label inactivity churn.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Active Customers Candidate (`active_customers` v1) | count approved eligible active outlets | — |
| New Customers Candidate (`new_customers` v1) | first approved purchase or created-customer cohort | — |
| Returning Customers Candidate (`returning_customers` v1) | Distinct ordering customers in the period with a confirmed order before period start; requires complete prior history. | — |
| Inactive Customer Candidates (`inactive_customers` v1) | eligible customers exceeding approved inactivity threshold | — |
| Top Customer Concentration Candidate (`top_customer_concentration` v1) | 100 × net revenue of approved top N customers / total same-scope net revenue; N and credit/negative-balance treatment await approval. | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `active_customers` / `2e5709a1eaeb34ab0029386f81002238376556445ab5f1b3bbadcdb7b7e3c11b`
- `new_customers` / `6a2cbc299c010eb27815ea09e0d39853498ab70723889823ca0036c05f6aa326`
- `returning_customers` / `5dbc906f181ff3323a5e35a7152688e5f4e90dc50a97069026e06b9e122c4045`
- `inactive_customers` / `02853fcbdeca32dd48351e5b2abfa931c442e45d2a098867fa97e1c55e68ba21`
- `top_customer_concentration` / `c39e0525ba16cfd98bf553a0a63db79f443104fcaf92a73656d8e26a75f1e8aa`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-12

Assign capture owners for campaign spend/attribution, CRM adoption and trustworthy outlet-route history; confirm these are data/capture gaps rather than unbuilt charts.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Marketing Return on Investment Candidate (`marketing_roi` v1) | approved attributable contribution / external campaign spend | — |
| Pipeline Value (`pipeline_value` v1) | sum approved active opportunity expected value | — |
| Route Coverage Candidate (`route_coverage` v1) | visited eligible assigned outlets / eligible outlets | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `marketing_roi` / `acc1e0a05c6cad491172413179a78999e3e147d2e675058653e91f9caac2e46b`
- `pipeline_value` / `7fd82e52be5e8ba4576aeb5d1dd3bbf0f597115884da363991e2189c84491983`
- `route_coverage` / `3579406b2717c7a0484c001fa2b90aa016ed9bc239264bf03770e833864ef624`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

## Sales / Operations

### APP-13

Preserve confirmed-order date/value/count semantics. For new rates approve denominator cohorts, partial completion and cancellation timing; approve proposed cancelled/(confirmed+cancelled) ratio or revise it.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Order Count (`order_count` v1) | count confirmed orders | 2895 |
| Order Revenue (`order_revenue` v1) | sum confirmed tax-inclusive amount_total | 1461335500 |
| Cancellation Rate (`cancellation_percentage` v1) | 100 × cancelled orders / (confirmed + cancelled orders) by order date; draft/sent excluded. This is a cohort proposal, not cancellation-event timing. | — |
| Invoice Completion Rate (`invoiced_order_rate` v1) | 100 × fully invoiced eligible confirmed orders / all eligible confirmed orders. | — |
| Order Delivery Rate (`delivery_completion_rate` v1) | 100 × fully delivered eligible confirmed orders / all eligible confirmed orders. | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `order_count` / `edeadf667c18c2e0f76df6d1a8145b8301e7d546c1d6acb759df81c8c781bec4`
- `order_revenue` / `51d3a9a7c2da2dd49a8c6aa5b21aaf6c2f732152f9791d8e6c25187406baab9b`
- `cancellation_percentage` / `de127c6308afdd5de7a671c90a74698b9a85850a5e53b7a766d8bfb4b9dd3298`
- `invoiced_order_rate` / `38c140d8c06348d99bbcd3751c8f3512b44d00a3582b4ef91482f08f351c0bc4`
- `delivery_completion_rate` / `c04709e764d1c711a26cb1554c1a46941bee41bc3a97e5b1b4fdfb2a47052b01`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-14

Approve eligible product lines, base-UOM conversion/rounding, value versus quantity mix and explicit untaxed order-product naming. Confirm stable product/customer identity and unknown brand/category treatment.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Net Invoiced Revenue by Product (`product_revenue` v1) | signed posted untaxed product-line subtotal | — |
| Order Revenue by Product (`product_order_revenue` v1) | Sum confirmed product-line subtotal by product; proposed untaxed order-line value must not be labelled whole tax-inclusive Order Revenue without allocation/reconciliation. | — |
| Net Units Sold (`units_sold` v1) | signed posted product-line quantity normalized within UOM category | — |
| Product Average Selling Price (`product_average_selling_price` v1) | signed revenue / compatible normalized quantity | — |
| Product Quantity Mix Candidate (`product_mix` v1) | approved normalized quantity share | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `product_revenue` / `4434cee10e79840136faa5c0bb0f5dc2277399ac7ea1309373a8b1be9869b580`
- `product_order_revenue` / `ac973309a934562567c4d8e1a1f4267c6aa9ed1d30ce850458ceff4c4c907b3e`
- `units_sold` / `e0d5465e98420f4ef6d97ca9243be00c6bd6c6cf58412ac4e455f0376c493a93`
- `product_average_selling_price` / `874b9c26fcf2d4574ed6b0b19882af2c6b4aa951ae11b04061ceb3e7b071e027`
- `product_mix` / `64680af5d4e3256bb067c5e2d965e3d6f64dc927357dc5bef3a0c3b3597b4dbc`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-15

Confirm operational stewardship of existing order user_id and invoice invoice_user_id attribution and official Business Line IDs; never create_uid. No reopening of established definitions.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Order Revenue (`order_revenue` v1) | sum confirmed tax-inclusive amount_total | 1461335500 |
| Net Invoiced Revenue (`net_invoiced_revenue` v1) | posted invoice value minus positive refund value | 1447166500 |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `order_revenue` / `51d3a9a7c2da2dd49a8c6aa5b21aaf6c2f732152f9791d8e6c25187406baab9b`
- `net_invoiced_revenue` / `cb31f7dbab7fc1b166aa94f2bcda990df5163939c0323506c7bd5e14e58982fd`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-16

Approve internal location, ownership/consignment, negative balance, reservation and warehouse hierarchy policy for a first current snapshot.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Stock On Hand (`stock_on_hand` v1) | sum current internal-location quants by compatible base UOM | — |
| Reserved Stock (`reserved_quantity` v1) | sum current internal reservations by compatible base UOM | — |
| Unreserved Available Stock (`available_quantity` v1) | on hand minus reserved under approved location policy | — |
| Stock by Warehouse (`warehouse_inventory_quantity` v1) | on-hand quantity via validated warehouse/location hierarchy | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `stock_on_hand` / `02a51d6fdb21d386440ef40922819c9c96ac24e80601d3c4cba9ddc3b792332a`
- `reserved_quantity` / `f9dc0e41d5d6a0ad405675beabcf3e584d93565e0554de57b0971cd31745b508`
- `available_quantity` / `249d52364f3084231cbd55283e7b58d6371f3698402d2e78e29ef721314b6018`
- `warehouse_inventory_quantity` / `c505bd60acf68b4b681a1171a464ea8ee088cfa51b9fd738aa21186b5d0c1ccb`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-17

Approve expiry-day boundary/timezone and 7/30/60/90-day overlapping horizons, define near-expiry horizon and explicit unknown-expiry handling.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Expired Quantity (`expired_quantity` v1) | positive internal stock past approved expiry cutoff | — |
| Near-expiry Quantity Candidate (`near_expiry_quantity` v1) | positive internal lot quantity within approved expiry horizon | — |
| Quantity Expiring within 7 Days (`expiring_quantity_7_days` v1) | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 7, within compatible UOM; boundary is proposed pending approval. | — |
| Quantity Expiring within 30 Days (`expiring_quantity_30_days` v1) | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 30, within compatible UOM; boundary is proposed pending approval. | — |
| Quantity Expiring within 60 Days (`expiring_quantity_60_days` v1) | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 60, within compatible UOM; boundary is proposed pending approval. | — |
| Quantity Expiring within 90 Days (`expiring_quantity_90_days` v1) | Sum positive internal known-expiry lot quantity with 0 ≤ days to expiry ≤ 90, within compatible UOM; boundary is proposed pending approval. | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `expired_quantity` / `b7b0a46b57940da0e9f3254b5b9cfcaeb0754d95b0dd613c10c66ae5983b3317`
- `near_expiry_quantity` / `314eba7443d42be09dceb080ec97841261b20deeea7623d6be4fa9ba24a6d21d`
- `expiring_quantity_7_days` / `350f309ab724dbdc379983f7e1fa7b1d4625a2a16f53bce29d31d9f6fef7a525`
- `expiring_quantity_30_days` / `a9b06abd2053df2a8931c6008e08f096090971fe966e5845892ac8bb7d6f4e20`
- `expiring_quantity_60_days` / `717dd47d06e4bb85f01fbec2cd2a9a3ae32bb32c7f18ad9f88cca8f4736b86ba`
- `expiring_quantity_90_days` / `d1fd00197858e6d7476876d1aa55ef7d29074aa05f3dc85200132288e71ca0c9`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-18

Approve purchase/receipt states, returns, order/confirmation date, first/last/complete receipt, and promised-date meaning before supplier SLA publication.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Purchase Order Count (`purchase_order_count` v1) | count confirmed purchase/done orders | — |
| Received Purchase Quantity (`purchase_received_quantity` v1) | sum received quantity by normalized UOM | — |
| Open Purchase Quantity (`open_purchase_quantity` v1) | approved ordered less received quantity | — |
| Supplier Lead Time Candidate (`supplier_lead_time` v1) | approved first/last receipt minus confirmation | — |
| Supplier On-time Delivery Candidate (`supplier_delivery_performance` v1) | actual receipt versus approved promised date | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `purchase_order_count` / `5725cf18143ae0855cc65beff78a58115c84cc1d7bb295586f9e6c43d7ae3c63`
- `purchase_received_quantity` / `0682dfa506ad805e987b56ee3fc54f0de7b1393a5b55ff75369f24ce576910a4`
- `open_purchase_quantity` / `6af9d3b23a9d67b04c5099b0ab881e8ee8dd3a41aa2d3307363c46a708037263`
- `supplier_lead_time` / `7184cb22326bc9ee40d459d6d6271064253a090a435f8582516eb7315ca6b478`
- `supplier_delivery_performance` / `21ff845b4959176536ddc5c244512ecd722f90a7e4d24f06c3c2cbf31dc01c73`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

### APP-19

Approve actual completion versus scheduled records, partial/return and promised-date rules, and direct visit-order linkage before conversion/SLA metrics.

| Metric / exact version | Proposed formula / meaning | Control example |
| --- | --- | --- |
| Delivered Orders Candidate (`delivered_orders` v1) | distinct confirmed orders under approved delivered status | — |
| On-time Delivery Percentage Candidate (`on_time_delivery_percentage` v1) | approved on-time completed deliveries / eligible deliveries | — |
| Actual Visit Count Candidate (`visit_count` v1) | count approved actual completed visits separately from scheduled records | — |
| Visit-to-Order Conversion Candidate (`visit_order_conversion` v1) | explicitly linked visits leading to orders / eligible visits | — |

Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.

Exact definition fingerprints:

- `delivered_orders` / `f490a25868acb4b2ee76f5cfeb9016786d6239dc4716617286b53286079df009`
- `on_time_delivery_percentage` / `a4e2eeb52caa8af164e5e0e4558c1c8a9b60fb8b0603167da2745a81d0771529`
- `visit_count` / `a18ed52ab189b65c98e1fbfd07c1bfc9fe891c1fd9563d17de43c5f0a1707780`
- `visit_order_conversion` / `528998b99dc927b48a39264d9cd71e39d4dca7ff9919ff15b5757d6b0df462c1`

Decision: [ ] Approve  [ ] Revise  [ ] Reject

Comments: ________________________

Approver name and role: ________________________

Approval date: ________________________

Confirmed totals / accepted exceptions / control reference: ________________________

## Evidence and operating references

- [Discovery catalog](../integration/odoo-analytics-capability-catalog.json) · [Discovery report](../integration/odoo-analytics-capability-discovery.md)

- [Wave 1 exact controls](../integration/odoo-certification-wave-one.json) · [Wave 2 requirements](../integration/finance-product-wave-two-catalog.json)

- [Gross aging v1](../integration/receivables-aging-v1.md) · [Net Odoo control](../integration/odoo-aged-receivable-control.md)

- [Current local reports](../integration/local-management-reports-v1.md) · [Luna QA handoff](../qa/local-management-pack-luna-handoff.md)

- [Versioned definition source](enterprise-metrics-v1.json) · [Finance publication and metric-help delivery](../integration/finance-metric-definitions-delivery.md)

Private workbook and customer extracts remain outside Git. Documents contain aggregate examples only. Finance publication reuses exact frozen evidence through the existing local lifecycle; no new source writes or extraction. Authentication and AI/manual publication guards remain unchanged. Visual/browser QA is deferred to Luna; no visual pass claimed.
