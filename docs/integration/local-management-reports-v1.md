# Laptop-local management reports pack v1

Starting branch `codex/production-pilot-lifecycle`, starting HEAD `2358eae041a83451d14fa492e898e4efa7189e29`. Final commit is recorded in the delivery response. No push, merge, cloud infrastructure, online staging or external CD. Discovery report/catalog/two scripts are already committed in `6fe12c0`; no duplicate discovery commit was created.

## Reports and governance

| Surface | Exact analytics series | State for the September Iraq serving release |
| --- | --- | --- |
| Executive Sales & Invoicing / ملخص المبيعات والفواتير | Six KPI cards: `net_invoiced_revenue`, `invoiced_revenue` (Posted Invoice Value), `refund_value`, `order_revenue`, `order_count`, `average_confirmed_order_value` | All published/certified; new automatic default |
| Business Line Performance / أداء خطوط الأعمال | Invoice/refund bar: net invoiced, posted invoice, refund. Separate order-revenue bar. Detail table: those four monetary metrics, order count, average confirmed order value, all × `business_line` | All six exact grouped pairs already published/certified |
| Salesperson Performance / أداء مندوبي المبيعات | Same bars/table and six exact metrics × `salesperson` | All six grouped pairs already published/certified |
| Customer Performance / أداء العملاء | Same requirements × `customer`; no execution or substitute values when unsupported | Unavailable; exact grouped source reconciliation/publication absent |
| Receivables & Aging / الذمم المدينة وأعمار الديون | Separate Finance validation/status surface; no executable receivable series or unpublished numeric values | Reconciled numerically · Awaiting approval; stable partner identity/source-report checks and Finance approval pending |
| Data & Certification Status / البيانات وحالة الاعتماد | Tenant/company, reporting currency, covered period, actual sourceAsOf, serving state, published metric/pair inventory; release/certification references inside details | Grounded in published capabilities and result metadata |

The report pack contains four canonical templates plus two information surfaces. No dashboard is automatically saved; existing explicit Save/version lifecycle remains intact. Generic Sales Performance and the former Sales & Invoicing template remain present. Synthetic workspaces still default to supported Sales Performance; real certified workspaces prefer the supported Executive report. Compatibility is metric × grouping × analysis × covered period, not a source/tenant exception. Unavailable and restricted templates cannot instantiate.

Actual staging runtime capabilities remain ten summary metrics and twenty grouped pairs: the original eight additive outputs plus the two previously certified averages, each with Business Line and Salesperson coverage. **New reconciliation cases: 0. New published capabilities: 0. New certification events: 0.** The original 308 linked controls and six derived-output certification records remain unchanged.

No month/time pair, trend, YoY, ranking or Top-N analysis was inferred. The September release contains one certified period; charts compare approved categories rather than manufacturing a trend. Customer, branch, gross profit/margin, generic revenue aliases and receivable execution remain unavailable for this dataset. Source mapping/pair guards and backend authorization remain authoritative. A bounded connection check found the approved Odoo tunnel unavailable; no additional Customer source control was extracted or inferred.

## Actual runtime values and provenance

| Executive output | Actual September runtime value |
| --- | ---: |
| Net Invoiced Revenue | 1,447,166,500 IQD |
| Posted Invoice Value | 1,465,712,000 IQD |
| Refund Value | 18,545,500 IQD |
| Order Revenue | 1,461,335,500 IQD |
| Order Count | 2,895 |
| Average Confirmed Order Value | 1,461,335,500 / 2,895 IQD; approximately 504,779.101900 |

These values come from runtime execution, never template/UI constants. Serving release: `el-dabboos-staging-comparison-202609-v1`; certification `FIN-OIA-STAGING-2026-09-V1`; period **September 1–30, 2026**; reporting currency IQD; actual sales/invoicing sourceAsOf **2026-10-05T14:54:58.149Z**. This is a static approved period, not live October data.

Direct actual-runtime execution of all three supported templates completed with **zero failed series**: Executive approximately 20.7 seconds, Business Line 20.8 seconds, Salesperson 22.6 seconds on this laptop. These are one-run operational observations, not browser QA or a latency guarantee. Business Line returned **one** September group, General. No Sugar is a known identity with no returned September group; no fabricated zero or synthetic second row was added. Salesperson returned **39** groups with source labels. Unassigned remains governed and localized where present.

The former categorical aggregation executed one authorized ledger scan per group; Salesperson exceeded the unchanged source query deadline. The adapter now aggregates categorical event groups in one pass, retaining tenant/release/measure/date/policy predicates, null ratio denominators, group bounds and the original snapshot/time paths. No global timeout or certification guard was weakened.

Optional `AnalyticsResult.metadata.dimensionLabels` separates display labels from row identity. Labels come only from the same authorized result keys and fact scope; ambiguous multiple labels are omitted instead of chosen arbitrarily. Stored translated label text resolves by locale; General / No Sugar display naturally in English/Arabic. No source field/formula appears in dashboard specs or planner contracts. No `is_company` or `create_uid` behavior was introduced.

## Finance, AI and manual builder

`/api/management-control-review` returns only authenticated, permission-checked, tenant-scoped non-executable review metadata. It contains no numeric metric values, raw customer rows or publication authority. The earlier source-control evidence is preserved. A tenant-scoped evidence record is not template/capability certification. The Finance surface explains numerical reproduction, missing partner-identity/source metadata checks and pending Finance sign-off; it never says Certified.

AI continues to receive the freshly resolved published capability inventory. Manual palette/grouping/analysis preflight and backend execution continue to reject unpublished metrics, unsupported exact pairs and analyses. `gross_profit`, `gross_margin`, `branch` and `outstanding_amount` are not offered as available for this release. No planner/provider/authentication redesign or external model verification was performed.

## Local operator workflow

Use the existing protected launcher and production images:

```bash
docker start dabboos-analytics-mart-postgres-1
/home/hazem/.config/el-dabboos-local-staging/stack up -d api web
/home/hazem/.config/el-dabboos-local-staging/stack ps
```

Open `https://localhost:8443`. Use the existing local tenant-admin account; do not use synthetic headers or provision/change credentials. After source changes, rebuild with `stack build api web` before `stack up -d api web`. A brief proxy 502 can occur while API startup checks run; wait for the API to be healthy before the demo. No alternate dev server, port/network/auth change or cloud service was introduced.

Both production images were rebuilt locally. API/web startup and HTTPS with the existing CA are verified: `/` 200, `/health/ready` 200, `/api/auth/state` 200 with local mode, anonymous `/api/auth/me` 401. Authenticated browser login and report interactions are deferred at the user's explicit request; these smoke checks do not replace them.

Read-only before/after fingerprints match for **eleven** staging publication/history tables, including the mapping, serving binding, original certification, derived approvals, extraction/batches/fact revisions/heads and all 308 reconciliation cases. No mart ingestion/publication or Odoo writes occurred. Persistent mart and test containers retain their existing roles and configuration.

## Verification and preserved work

Frozen offline install, lint, architecture (zero diagnostics), baseline-aware quality (zero diagnostics), full monorepo/web typecheck, production API/web build and diff gate pass. Full unit/API suite: **628 passed, 0 failed, 0 skipped**. Full disposable PostgreSQL 18.6 suite: **114 passed, 0 failed, 0 skipped**. Focused report/label/route tests, EN/AR SSR rendering and the existing presentation regression suite pass. Existing Vite large-chunk warning remains nonblocking.

Browser/visual quality review, authenticated login, actual EN/AR/RTL layouts, Light/Dark/System and desktop/tablet/mobile interaction acceptance are **DEFERRED TO LUNA by explicit user instruction for this task and the next task**. No visual pass is claimed. [Luna handoff](../qa/local-management-pack-luna-handoff.md) defines the acceptance run after the next task. GitHub CI has not run for the new local commit because no push is authorized.

Preserved uncommitted files: `.env.example`, `apps/api/src/odoo-pilot.ts`, `docs/integration/odoo-postgres-pilot.md`, Odoo data `config.ts`, `identity.ts`, `ingestion.ts`, `mapper.ts`, `pilot.ts`, `snapshot.ts`, `sql.ts`, existing `odoo-mapper.test.ts` and PostgreSQL `odoo-source.test.ts`, plus `.archify/`. Credentials, protected env files, workbooks and customer-level extracts are excluded from Git.

Online staging created = **no**. External CD configured = **no**. Odoo mutated = **no**. Source schema changed = **no**. Certification weakened = **no**. Aged Receivable prematurely certified = **no**. Authentication changed = **no**. Historical backfill implemented = **no**. Continuous sync implemented = **no**. Push = **no**. Merge = **no**.
