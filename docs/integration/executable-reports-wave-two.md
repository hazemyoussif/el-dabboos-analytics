# Executable reports Wave 2 — evidence audit and safe report expansion

Starting branch `codex/production-pilot-lifecycle`, HEAD `c692d6adf0e3a68c899e57c4d797a2fcc80a2a02`. Final commit is recorded in the delivery response. Scope remains laptop-local; no push/merge or external deployment. Twelve existing Odoo/environment dirty files, `.archify/`, Finance evidence and local protected configuration are preserved.

## Delivered result

**One new executable report: Invoice & Refund Operations / عمليات الفواتير والإشعارات الدائنة.** The priority Customer/Product/Margin tracks were investigated first; their independent evidence/input gaps remain unresolved. Rather than publish unproved pairs, the new report uses existing certified invoice metrics that were not covered by the six-metric Executive report. No metric meaning, publication or original approval was changed.

| Report | Before | After | Available metrics / dimension | State | Remaining blocker |
| --- | --- | --- | --- | --- | --- |
| Executive Sales & Invoicing | Executable | Preserved | Net invoice, posted invoice, refund, order value/count, average confirmed order value; summary | Certified exact September series | No new blocker |
| Business Line Performance | Executable | Preserved | Same six metrics × Business Line | Certified | General only in this release; no fabricated No Sugar group |
| Salesperson Performance | Executable | Preserved | Same six × Salesperson, 39 rendered groups | Certified | No ranking/Top-N/trend admitted |
| Invoice & Refund Operations | Absent | **New executable** | Invoice Count, Refund Count, Average Invoice Value, Posted Invoice Value, Refund Value, Net Invoiced Revenue; summary + Salesperson detail | Existing certified/published pairs | None for exact series; visual QA deferred |
| Customer Performance | Unavailable | Unavailable | Six requested pairs evaluated; none newly available | No Customer publication | Full independent source vectors missing; existing grouped/case cardinality limits; immutable approval admission |
| Product Performance | Specification | Unavailable | Four value pairs and three quantity concepts evaluated | No Product publication | No retained product/value/UOM inputs or grouped controls |
| Order Profitability | Specification | Unavailable / approval preparation | Order Margin and weighted Margin %; summary and four possible groupings evaluated | No mart reconciliation/certification | Margin and untaxed inputs absent; business approval pending |
| Receivables & Aging | Validation | Preserved validation | Existing exact numeric controls, no normal analytics execution | Numerically reconciled; identity/Finance approval pending | 15,519 identity cases and report metadata unresolved |
| Data & Certification Status | Information | Preserved | Existing period/currency/capability/provenance metadata | Information surface | None |
| Inventory / Expiry / Procurement | Specifications | Queued | Direct first-subset feasibility inspected after priority blocks | Unpublished | Source inputs absent; scope/horizon/currency/UOM approvals also pending |

The new report has six KPI cards and one six-metric Salesperson table: seven widgets, twelve unique summary/grouped series. It answers document volume, invoice size and monetary balance questions without creating new refund percentages. Refund Count means credit-note documents, not the number of original invoices/customers refunded. Average Invoice Value excludes refunds and uses the established ratio `invoiced_revenue / invoice_count`; averages are not summed across groups.

September summary examples remain runtime values, not template constants: 2,890 invoices; 120 credit notes; average invoice value `1,465,712,000 / 2,890 IQD`; posted invoice value 1,465,712,000; refund value 18,545,500; net invoice revenue 1,447,166,500 IQD. Each credit note uses its own issue date. Period September 1–30, 2026; sales/invoicing sourceAsOf `2026-10-05T14:54:58.149Z`. Executive remains the compatible real-data default; synthetic Sales Performance is retained. Templates/AI/manual use the existing published-capability boundary, without Odoo-specific execution behavior.

## Exact preserved-evidence investigation

Read-only repeatable-read audits inspected **both pilot and staging marts** with tenant/dataset predicates, September date bounds, 15-second statements, one-second lock deadlines and rollback. Each has **308 existing approval-linked reconciliation cases**, **zero Customer cases**, and six existing derived-output certificates. The existing 308 cover summary, Salesperson and Business Line; none cover Customer or Product. The mapping already declares candidate Customer grouping and maps stable `partner_id`; declaration alone does not publish it.

| Requested Customer output | Current retained mart groups | Technical evidence usable now | Business meaning | Pair certification/publication/runtime |
| --- | ---: | --- | --- | --- |
| Net Invoiced Revenue | 1,927 | Historical Wave 1 summary says exact; full source vectors unavailable | Established signed posted untaxed invoice/refund value on issue date | Unpublished / not executed |
| Posted Invoice Value | 1,923 | Same evidence gap | Established posted customer invoice value, refunds excluded | Unpublished / not executed |
| Refund Value | 111 | Same evidence gap | Established positive refund magnitude on own issue date | Unpublished / not executed |
| Order Revenue | 1,922 | Same evidence gap | Established confirmed tax-inclusive order value, Baghdad order date | Unpublished / not executed |
| Order Count | 1,922 | Same evidence gap | Established confirmed order count | Unpublished / not executed |
| Average Confirmed Order Value | 1,922 operand groups | Both independent operands and output pair proof required | Established ratio of matching totals; zero denominator null | Unpublished / not executed |

All retained event facts have non-null/non-Unassigned Customer identities. IDs are stable source-partner IDs; display labels do not merge customers and `is_company` is not used. This proves retained identity coverage, not an independent source-group value/count comparison. Transaction evidence retains labels, header amounts/state/currency and order/invoice line IDs; it **does not retain raw source partner IDs independently of canonical dimensions, product IDs/values/quantities/UOM, stored margin or line costs**. Re-summing `fact.value` or reusing the same canonical Customer field to manufacture expected controls would not establish an independent source control.

Wave 1's committed summary reports 14,049 source controls, including 9,846 new Customer/month comparisons. Full group-control files were searched in repository/ignored paths, protected operator configuration, available temporary evidence and home artifact paths; only summary/control-code references were recovered. Historical summary is not relabeled as current per-group proof. The user was asked for the retained artifact path while other work continued. The approved source tunnel failed the bounded three-second reachability check; no source SQL/extraction was run. A recovered independent control file can avoid source re-extraction; no claim is made that the earlier numerical comparisons failed.

Additional engineering constraints must be resolved after independent evidence is restored: existing frozen reconciliation and approval case bounds are 1,000, below the 1,922–1,927 Customer populations. Runtime has a configurable bounded group limit (default 1,000, maximum 5,000); an appropriate verified setting is needed for these populations. No truncation, per-group subset certification, timeout increase or bound bypass was introduced. Existing approved case IDs and original mapping history cannot be rewritten; new Customer evidence needs a governed release/evidence admission under the existing lifecycle. No alternate capability registry was created.

## Other tracks and exact next inputs

[Structured attempt ledger](executable-reports-wave-two.json) records every evaluated metric/pair, its source definition, reconciliation/approval/certification/publication/runtime state and blocker: **42 blocked feasibility records plus 12 existing published pairs consumed by the new report**. Feasibility inspections are labeled separately from live source extraction and successful reconciliation.

- Product value: the current mart has **zero product-attributed facts** and only header order/invoice inputs. `relatedLines` contains order/invoice line linkage, not product/value/UOM evidence. Independently extract eligible product lines, freeze stable `product_product.id` with template/category relation, prove every source/mart group and total-to-header equality, refund signs/null products/rounding/downpayments and monetary currency. Product quantity can stay blocked while exact monetary pairs progress. Do not divide a header arbitrarily among products or silently rename untaxed order-line value as tax-inclusive Order Revenue.
- Quantities: discovery observed 6,838 mixed-UOM order lines and 38 base UOMs. No retained quantity or conversion operands permit a mart comparison. Validate category/factor/rounding, missing conversions and signed refunds; never combine boxes/pieces/kg. Product Category requires its own pair proof.
- Margin: preserved source-only September margin is **697,384,876.180 IQD**; all 2,895 orders had margin and zero header/line discrepancies. Stored percentage used untaxed order value. Frozen mart has neither margin nor untaxed measure facts, so this is **not source-to-mart reconciliation**. Bounded new inputs and exact summary/group controls are required, followed by approval of Order Margin and `100 × summed margin / same-order untaxed value`. No accounting Gross Profit or averaged/summed percentages are exposed.
- Receivables: original numeric total/buckets/2,217 vectors are unchanged. Identity-aware cases remain **0 / 15,519**. Source access is needed to establish partner identities/duplicate-name handling and custom report parameters; Finance must subsequently approve exact policy/control/owner/date/exceptions. Gross-positive missing-date policy and signed-net accounting-date fallback remain separate. No self-approval.
- Inventory: current positions/location hierarchy/ownership/reservation/pending moves are absent from this mart. A new current as-of snapshot and approved inclusion/UOM rules are needed; no historical September stock or Branch alias inferred.
- Expiry: depends on that inventory basis, lot linkage, missing-expiry coverage and approved day/timezone/horizons. No arbitrary alert threshold or valuation.
- Procurement: no preserved PO/line/receipt inputs. Commitment date/tax/currency/rate and receipt/return/UOM controls must be approved and reconciled. Commitment is not accounting spend.

## Read-only replay tool and privacy

[`odoo-wave-two-evidence.mjs`](../../scripts/integration/odoo-wave-two-evidence.mjs) performs this bounded audit. Optional preserved Wave 1 JSON is checked for tenant/dataset/period/timezone/read-only observation provenance. It replays five additive Customer operands using **only source `expectedValue`/`expectedCount`** against freshly read mart groups and separately read summary totals. It ignores old mart `actualValue` fields and does not use runtime metrics to generate expected values. The existing average needs its own later governed output proof; the tool does not approve it automatically.

The [exact comparator](../../scripts/integration/wave-two-group-controls.mjs) verifies source/mart totals, sums of complete group sets, every value/count, missing/unexpected groups, duplicate/stable IDs and exact six-decimal arithmetic using integers. Empty/partial/malformed controls cannot pass. Matching grand totals cannot hide customer swaps. Exact replay is technical evidence only: approval/certification/publication are never inferred. The tool writes **no DB rows**; audit mode with no independent controls reports `allComparedExact: null`, not a fabricated pass.

```bash
# Protected existing operator env; NEW directory (existing evidence is refused).
node scripts/integration/odoo-wave-two-evidence.mjs \
  /home/hazem/.config/el-dabboos-local-staging/operator-host.env \
  /tmp/new-wave2-private-audit

# Only when the actual independent Wave 1 source-control file is available:
node scripts/integration/odoo-wave-two-evidence.mjs \
  /home/hazem/.config/el-dabboos-local-staging/operator-host.env \
  /tmp/new-wave2-private-replay /absolute/path/to/preserved-source-controls.json
```

Private directories are mode 0700 and evidence files 0600/exclusive creation. Customer vectors stay outside Git; stdout contains counts/status only. Source details live in the mapping/provenance and integration report, not templates/planner/UI. The dictionary's 204 definitions and 19 approval forms are unchanged. Only the EN/AR report catalogs receive the implemented Invoice Operations addition (18 specifications / four executable reports); no duplicate approval forms are created.

## Verification, preservation and handoff

Focused replay tests cover precision/signs, matching-total customer swaps, counts, missing/unexpected groups, duplicate names/IDs, partial sets and malformed decimals. Report tests cover exact summary/group requirements, absent average/pair rejection, EN/AR instantiation, Customer incompatibility, Finance isolation and unchanged defaults. Frozen-lockfile install, lint, architecture, quality, typecheck, build and diff gates passed. **639 unit/API and 114 PostgreSQL tests passed, zero failures/skips**; architecture/quality/diff each report zero diagnostics. Bilingual generated-document checks passed.

Actual governed-profile/PostgreSQL execution passed all four executable reports with **zero failed series**: approximately 20 seconds Executive, 19 Business Line, 21 Salesperson and 35 Invoice Operations. Customer remained incompatible before execution. An initial execution concurrent with the PostgreSQL suite suffered timeout failures; the quiet recheck passed with the existing deadlines unchanged. This is functional runtime evidence, not a latency guarantee. Trusted local-CA HTTPS smoke returned 200 for `/`, `/health/ready` and `/api/auth/state`; `/api/auth/me` remained 401 anonymously. No synthetic authentication is used for the real-data evidence; authenticated browser interaction remains deferred.

Private audits, both runtime attempts, history fingerprints, HTTPS smoke and verification logs are preserved outside Git at `/home/hazem/.codex/visualizations/2026/10/06/01a11133-5bc7-7b53-826d-2cc96621f508/executable-reports-wave-two` (0700 directory / 0600 files). No independent Customer source replay was possible: **zero new reconciliation cases, zero new certificates, zero new published capabilities**. Existing cases remain 308 in each mart; Customer persisted cases remain zero and AR identity cases remain 0/15,519.

Before/after staging publication/history fingerprints and original Finance workbook/control hashes remain unchanged. No new reconciliation cases, output certificates, publication events or source extraction. Production API/web images are rebuilt for the new template and started through the existing protected launcher at `https://localhost:8443`; no auth/port/network redesign. CI is unrun because no push is authorized. Existing Vite chunk warning remains.

[Combined Luna handoff](../qa/local-management-pack-luna-handoff.md) includes the new Invoice Operations entry and preserves visual/browser QA as **Deferred**. No browser/visual pass is claimed; no Luna task is automatically dispatched.

Existing reports regressed, unsupported auto-publication, Customer bypass, ignored Product UOM ambiguity, Order Margin called Accounting Gross Profit, premature Aged Receivable certification, Warehouse called Branch, fake historical comparisons, Odoo/schema/auth changes, online staging/CD, historical backfill, continuous sync, push and merge: **all no**.
