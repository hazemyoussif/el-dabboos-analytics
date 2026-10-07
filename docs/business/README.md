# Enterprise reports and metric approval package

## Current delivery — October 7, 2026

Finance standing approval is recorded in the existing versioned package and applied through exact local certification/publication. Current catalog: **18 report specifications / 5 executable reports; 204 definitions / 21 certified** (6 reconciled pending, 95 defined pending reconciliation, 50 discovered, 32 unavailable). APP-04 is recorded; the remaining forms retain their unresolved choices. Eleven signed-aging summary metrics and nine exact Customer pairs are published at September 30 only; Gross Open Receivable Components and Credits are summary-only. Customer Performance activation remains separate and pending.

The domain semantic catalog owns bilingual metric help used by planner, builder, widgets and generated dictionaries. A metric is product-ready only when business meaning, formula/date semantics, EN/AR and help metadata are complete; certification remains a separate evidence requirement. Material meaning changes require a new definition version. Read [Finance/metric-help delivery](../integration/finance-metric-definitions-delivery.md) and the [combined deferred Luna handoff](../qa/local-management-pack-luna-handoff.md) for current runtime, gates and limitations.

Everything below records the historical October 6 baseline and its earlier delivery evidence. Its pending Finance statements and counts are superseded for the precisely published family above.

## Historical baseline

Wave 2 update: [Invoice & Refund Operations](../integration/executable-reports-wave-two.md) adds one executable report from already-published invoice metrics. Current catalog: **18 specifications / 4 executable reports**; all 204 metric definitions and 19 approval forms are unchanged. The delivery record below describes the earlier `c692d6a` baseline.

Prepared October 6, 2026 for Company 1 (Iraq), reporting currency IQD. Starting branch `codex/production-pilot-lifecycle`, HEAD `e5ea6a1ac3ada7574ac51f4a472fa226bdb0a2db`. This task expands the business catalog and approval specifications, with **no runtime metric/template change**. No new executable report has sufficient complete evidence for safe publication while the approved Odoo tunnel is unavailable. The three existing executable reports are preserved.

| Deliverable | English | العربية |
| --- | --- | --- |
| Current/planned reports and exact next unlocks | [Report catalog](el-dabboos-report-catalog-en.md) | [دليل التقارير](el-dabboos-report-catalog-ar.md) |
| Full business dictionary, date/grain/sign/unit rules and secondary source reference | [Metric dictionary](el-dabboos-metric-dictionary-en.md) | [قاموس المؤشرات](el-dabboos-metric-dictionary-ar.md) |
| Version-specific approval forms grouped by Finance, Management and Sales/Operations | [Approval pack](el-dabboos-metric-approval-en.md) | [حزمة الاعتماد](el-dabboos-metric-approval-ar.md) |

## Inventory and authority

The unchanged discovery contains 170 candidates, 28 dimensions and 13 domains (893 tables / 269 relevant models). The bilingual package preserves every discovery candidate and adds 34 explicit proposal/control definitions: **204 definition records**, not 204 runtime metrics. Exactly one lifecycle state is assigned per record:

| State | Definitions |
| --- | ---: |
| Certified | 10 |
| Reconciled · Awaiting Business Approval | 15 |
| Defined · Awaiting Reconciliation | 97 |
| Discovered | 50 |
| Unavailable / Insufficient Source Data | 32 |

The 10 certified records are the current summary metrics and their exact published Business Line/Salesperson pairs. Certification of a metric does not admit its candidate Customer/Product/Month groupings. The 15 reconciled records are **numerical candidate-control outputs**, not approved/certified/published receivable outputs. Reconciliation/identity limitations remain explicit. The 97 defined records are written proposals, not new approved business meanings.

There are **17 report specifications**: three existing executable reports, one blocked Customer report, the existing Finance validation and Data Status surfaces, and eleven future specifications. Priority unlocks are Product, Order Margin, Inventory, Expiry and Procurement. Each catalog entry names users, purpose, questions, exact metric IDs, candidate dimensions, business date, available period, status, limitations and required approvals/reconciliation. It distinguishes an unavailable source/capture capability from unfinished implementation.

### Current executable report contract

Executive contains six KPI cards: `net_invoiced_revenue`, `invoiced_revenue` (Posted Invoice Value), `refund_value`, `order_revenue`, `order_count`, `average_confirmed_order_value`. Business Line and Salesperson retain a three-series invoice/refund bar, an Order Revenue bar and a six-metric detail table, grouped only by their exact published dimensions. September 1–30, 2026; IQD; sales sourceAsOf `2026-10-05T14:54:58.149Z`. General remains one returned Business Line group and Salesperson 39 groups. No extra Customer/Product pair, trend, YoY or ranking was exposed.

Receivables retains a status-only validation surface. Net Odoo control = 1,359,461,092.61 IQD, gross components = 1,532,751,636.39, signed credits = −173,290,543.78. Cutoff `2026-09-30`; control sourceAsOf `2026-10-06T12:53:16.128Z`. Net Odoo fallback aging and gross-positive `receivables-aging-v1` remain separate exact definitions. Excel numeric vectors are not verified stable partner identities. Finance owner/date/confirmed totals/accepted exceptions remain unrecorded.

### Required decisions

Nineteen decision forms cover Finance (nine), Management (three), Sales/Operations (seven). Existing Executive Revenue = Net Invoiced Revenue, separate Order Revenue, refund issue-date recognition, official Business Line, Company 1 and IQD decisions remain established; they are not reopened.

- Finance: separate refund count/value ratios; stored Order Margin and ratio denominator; accounting COGS; independent net/gross receivable controls; future nonzero-tax treatment; cash versus settlement/DSO/overdue weighting; procurement currency/commitment basis; attributable inventory/lot valuation.
- Management: report/KPI ordering, customer activity/new/returning/inactivity and concentration policy, capture owners for marketing/CRM/routes.
- Sales/Operations: new order-rate cohorts, product/UOM scope, stewardship of established salesperson/Business Line attribution, inventory ownership/hierarchy, expiry boundaries/horizons, receipt and supplier dates, delivery/visit completion/linkage.

## Definition ownership and consistency

[enterprise-metrics-v1.json](enterprise-metrics-v1.json) is a documentation-only source. Shared normative policies avoid repeated structured definitions; each metric has bilingual meaning/formula, version, exact content fingerprint, grain/date/unit, source evidence, one lifecycle state, and separate approval/publication flags. Pending approval forms identify version/hash and request owner, date, confirmed totals, exceptions and control reference. No separate runtime approval system was created. An authorized operator must record returned business evidence using existing append-only release/derived-output governance, reconcile exact inputs/outputs and explicitly publish. A dictionary entry cannot enter normal AI/manual generation.

Formula, recognition date, grain, credit policy, unit or currency changes require a new definition version and fingerprint; approval of v1 does not approve v2. The new document fingerprints are approval-document identities, not replacements for the existing runtime mapping/certification IDs. Existing approved records reference existing governance and do not invent new sign-off dates or approvers.

Regenerate and verify:

```bash
node scripts/business/render-enterprise-pack.mjs
node scripts/business/render-enterprise-pack.mjs --check
node --experimental-transform-types --disable-warning=ExperimentalWarning \
  --test scripts/engineering/test/business-pack.test.mjs \
  packages/application/test/documentation.test.ts
```

Consistency coverage includes every original discovery candidate, known canonical IDs versus proposed IDs, bilingual coverage/render drift, valid lifecycle states, report/decision references, unchanged certified subset/group boundaries, definition hash invalidation and exact net/gross bucket invariants. Tests use committed aggregate documents only; no developer environments/customer services.

## Delivery verification and limits

Frozen offline install, lint, architecture, quality, typecheck, full unit/API suite and production build pass. Full unit/API suite: **634 passed, zero failures/skips**. Full isolated PostgreSQL 18.6 suite: **114 passed, zero failures/skips**. Final documentation consistency and local diff gates pass. Existing Vite chunk warning remains.

Read-only actual-mart executions of the three existing reports return zero failed series. Local HTTPS remains healthy (`/` and `/health/ready` 200, `/api/auth/state` local/200, anonymous `/api/auth/me` 401). No image rebuild is needed for documentation-only changes; existing production-built containers continue serving the previous implementation. Eleven publication/history table fingerprints match before/after. No source query/extraction was attempted after the bounded tunnel reachability check failed. New reconciliation cases, approvals, certification events and published capabilities: **0**.

Browser/visual QA is **Deferred** by user instruction. [Combined Luna handoff](../qa/local-management-pack-luna-handoff.md) contains this task's documentation/specification scope alongside the preceding web task. No Luna run or visual pass is claimed. GitHub CI is unrun at the new local SHA because push is prohibited.

All twelve existing dirty Odoo/environment files and `.archify/` remain excluded from this commit; Finance workbook/control hashes are preserved. Private customer details stay outside Git and these documents. Online staging, external CD, public localhost exposure, source writes/schema changes, auth changes, historical backfill, continuous sync, push and merge: **none**. Order Revenue remains distinct from Net Invoiced Revenue; Order Margin remains distinct from Accounting Gross Profit. No certification bypass, fake historical comparison or premature receivable certification.
