# Finance approval, signed aging publication and metric definitions

Business approval date: **2026-10-07**. Laptop-local scope: `https://localhost:8443`. Base `73e1d27`, branch `codex/production-pilot-lifecycle`. Visual/browser QA is **Deferred**; no Sol browser session or Luna dispatch.

## Governance and canonical definitions

Finance’s standing metric-design approval is recorded in the existing [versioned business package](../business/enterprise-metrics-v1.json), projected into all six EN/AR dictionary, report and approval documents. It covers financially established meanings implemented correctly and reconciled exactly. Unresolved policy choices, accounting gross profit/cost, inventory valuation, FX, procurement basis and allocation still need explicit Finance confirmation. It does not approve an unproven source mapping.

The domain semantic catalog owns structured bilingual help: short/full definition, formula, inclusion/exclusion, recognition date, refunds/credits, aggregation and definition version. API catalog, planner descriptions, manual builder and renderer consume that catalog. The business dictionary projects canonical help rather than maintaining independent UI copy. Existing approval-definition versions/fingerprints remain distinguished from the catalog help version. Material meaning changes require a new governed definition version and fresh evidence.

Product rule: **A metric is not product-ready until its business definition, formula/date semantics, localization and metric-help metadata are complete.** This does not replace technical certification.

## Publication evidence

Certification **`finance-standing-20261007-receivables-v1`** and promotion completed through the existing lifecycle. Active serving release: **`el-dabboos-finance-202609-v6`**, mapping version **6**. The package has **18,054 exact cases**, including 308 retained event controls and the source identity-aware aging package plus exact net/overdue derivations. Eight independently certified derived references retain the existing averages and add Overdue % summary/Customer. Promotion fingerprint: `28fdad3094338080bafc357d41b613c2a8a199c9696e2f7b162c0bdd9008a99e`.

Eleven summary metrics and nine Customer pairs are published: Net Aged Receivable, At Date, each of the five overdue buckets, Total Overdue and Overdue %. Gross Open Receivable Components and Credit Balances are summary-only. Snapshot capabilities admit September 30 only; retained event capabilities admit September 1–30. No unsupported dimension or date is admitted.

**Final runtime verification:** all five reports have **zero failed series** in their latest results, preserving the four retained reports and admitting Receivables normally. The verification combines the initial report smoke with quiet targeted retries of Executive and Invoice/Refund after engineering/rebuild activity finished; it is not presented as one uninterrupted run. All eleven Finance headlines and all six retained Executive headlines match; Customer Aging has **2,217 rows and 2,217 labels**. Earlier concurrent timeout evidence remains preserved privately.

| Report | Successful / failed series | Observed duration |
| --- | ---: | ---: |
| Executive | 6 / 0 | 62.7 s |
| Business Line | 10 / 0 | 135.3 s |
| Salesperson | 10 / 0 | 128.7 s |
| Invoice & Refund Operations | 12 / 0 | 175.2 s |
| Receivables & Aging | 18 / 0 | 217.6 s |

There is no numerical/execution regression in these final checks. Latency and concurrent-build timeout risk remain material limitations; visual/browser regressions remain unverified until Luna.

The user explicitly authorized the [statement-scope RLS optimization](proposals/finance-serving-scope-review.md) and [exact derived set comparison](proposals/derived-exact-sets-review.md) after automatic approval review initially rejected each broader live action. Immutable migrations 17/18 were applied through the existing runner to both local marts, preserving tenant/binding/business/technical checks, FORCE RLS, role targets, extraction completion, immutable records and 15-second SQL deadlines. The guarded rollback was rejected and never executed. The user also explicitly authorized the [one-byte correction to this task’s uncommitted migration 14](proposals/draft-migration-format-review.md); both hashes are retained and every other ledger/certification/promotion/binding record was verified unchanged. These are recorded exceptions, not a general waiver.

The retained control contains 5,242 posted receivable components and 2,217 customers. Historical residual is reconstructed through September 30; later payments do not erase that balance. Maturity date determines age, with accounting date fallback; due on the cutoff belongs in At Date. Signed credits remain in their own buckets without allocation. Gross-positive components and negative credits are distinct from signed net aging.

All **15,519 / 15,519** stable-identity source customer/bucket cases match. Ambiguous, unmatched, unexpected and mismatched cases are zero. Component control SHA256: `a8f6a00eab4fef2b1b9ff8924ba1a4dd89847c3c86ed83a57aa651d799751848`. Private workbook/components/customer extracts remain outside Git. Installed report metadata supports the fixed observed package; this does not claim general equivalence with custom Python modules or other report options.

| Exact September 30 control | IQD |
| --- | ---: |
| At Date | 759,020,481.15 |
| 1–30 | 218,464,001.82 |
| 31–60 | 69,135,500.55 |
| 61–90 | 25,871,000.18 |
| 91–120 | 33,782,500.14 |
| >120 | 253,187,608.77 |
| Net Aged Receivable | 1,359,461,092.61 |
| Gross Open Receivable Components | 1,532,751,636.39 |
| Credit Balances | −173,290,543.78 |
| Total Overdue (five exact buckets) | 600,440,611.46 |

Overdue % divides aggregated signed overdue by aggregated signed net balance, multiplied by 100; zero denominator yields null. Customer percentages are never summed. A credit-only customer can have a negative denominator. Snapshot positions are never summed across dates.

## Implementation and UX

`MetricInfo` and `MetricDefinitionDialog` are shared by KPI/chart headers, metric table headers (including accessible chart tables), builder palette/pickers and publication status. Saved and AI-created dashboards inherit the same renderer. The palette help action is independent of selecting/dragging a metric. Dimension headers do not get metric popups.

The tooltip is short; click/tap opens a native modal with named dialog semantics, initial close-button focus, native focus containment, Escape/visible close and trigger-focus restoration. The body scrolls within a responsive width. EN/AR content is authored metadata, with explicit RTL and alternate-language labels. Copy Definition uses the active language and includes formula, recognition date, aggregation, version and truthful lifecycle status, with success/failure feedback. Actual published capabilities and result provenance determine certification; synthetic data is labelled demo. Safe IDs/mapping/certification/source references are collapsed in technical details; no SQL or raw ERP field names are exposed in management help.

Architecture remains domain → application/adapters; HTTP owns composition and browser code calls the existing API. AI compact generation/edit planning, canonical/semantic validators, publication permissions, tenant/policy filtering, explicit Save and version checks remain intact.

## Verification and limitations

All required gates passed: frozen install, lint, architecture, baseline-aware quality (zero diagnostics), typecheck, **651 unit/API tests**, **129 PostgreSQL tests**, build and diff. Final focused metadata/dialog/bilingual dictionary consistency checks passed (11/11); the before/after statement-scope test and post-format migration/checksum tests also passed. No tests load developer env files or need customer/model services. PostgreSQL evidence uses only the isolated synthetic foundation-test cluster. The build retains its existing >500 kB chunk warning.

The production laptop-local API/web stack was rebuilt. HTTPS root/readiness/auth-state checks pass (200), anonymous auth/me correctly refuses access (401). Runtime checks use the actual dedicated read-only mart identity, IQ tenant, English locale, published pair validation, two-query executor concurrency, 3,000-group bound and unchanged SQL deadlines; they print aggregate results, never customer extracts. No theme/browser visual evidence is claimed. Latency is substantial: grouped reports took approximately 129–135 seconds and Receivables 218 seconds in the observed run; deadline headroom under concurrent builds remains limited. This is a known operational limitation, not a correctness or accessibility pass. Automated SSR/native-dialog lifecycle evidence does not establish a browser accessibility or visual pass. The combined [Luna handoff](../qa/local-management-pack-luna-handoff.md) accumulates the four existing reports, Receivables, all help surfaces, EN/AR/RTL, themes, responsive layout, keyboard/mobile dialog behavior, Copy Definition, scrolling, status and regressions.

No Odoo writes, source schema change, authentication change, online staging, external CD, historical backfill or continuous sync. Customer certification/activation remains a separate pending workflow. Previous publication history, private evidence, unrelated dirty Odoo/environment files and `.archify/` are preserved. No push or merge; GitHub CI at the new local commits is unrun.

## Dashboard-quality AFTER source review

Source review used the project [dashboard quality skill](../../.agents/skills/el-dabboos-dashboard-quality/SKILL.md). Task-required findings resolved:

1. Table definitions needed one action per metric header; the widget header now avoids repeating all seven table metrics.
2. Builder help needed actual tenant currency and current publication status; shared contexts provide them without changing selection, specs or Save behavior.
3. Aging names needed stable, authorized label evidence; optional bounded `displayLabels` on canonical facts supplies names without inventing transaction amounts. The existing label query retains tenant/policy/result-key scope and rejects ambiguous names. Duplicate display names remain separate customer identities.

Tokens, Lucide, chart palettes, native controls, EN/AR and presentation/domain boundaries are preserved. No new debt allowances were added; only resolved historical short-name entries were removed. Visual hierarchy, overflow, focus containment in an actual browser, themes and responsive appearance remain unverified until Luna runs the accumulated handoff.

Transfer preflight preserves the 128 MiB actual UTF-8 payload bound and 100,000 rows/table. The byte check now counts immutable PostgreSQL JSON records plus framing instead of their double-quoted JavaScript representation. Snapshot entity IDs are stable partner IDs within the single-source dataset; Customer dimension keys retain the verified source prefix. Each unsplit customer/measure uses the canonical whole-record component. No evidence, Customer key, financial value or certification check is dropped. Earlier unsuccessful candidates remain pending/unpublished.

## Local commits and safety

- `370f4e1` — domain/application/data: exact signed aging, governed help, evidence publication and authorized serving/proof performance work.
- `35f3473` — shared bilingual web metric definitions and dialogs.
- Governance/delivery commit recorded in the final response; branch remains `codex/production-pilot-lifecycle`. CI for these local SHAs is **unrun**, not passed.

| Requested safety confirmation | Result |
| --- | --- |
| Existing report regression | No in final numerical/execution checks; visual QA deferred, latency caveat above |
| Metric definitions duplicated across UI | No — canonical semantic catalog |
| Tooltip-only access | No — click/tap native modal |
| Raw SQL exposed to management users | No |
| Arabic generated mechanically at runtime | No — authored EN/AR metadata |
| Aging published without exact evidence | No |
| Unlimited accounting authority inferred | No |
| Order Margin renamed Accounting Gross Profit | No |
| Customer certification restarted | No — separate pending candidate retained |
| Unsupported capability auto-published | No |
| Odoo mutated / source schema changed | No / no — mart migrations are separately disclosed |
| Authentication changed | No — explicit RLS/proof implementation changes disclosed above |
| Online staging / external CD | No / no |
| Historical backfill / continuous sync implemented | No / no — fixed existing control replay only |
| Sol visual/browser QA | Not run |
| Luna visual/browser QA | Deferred; not dispatched |
| Combined Luna handoff updated | Yes |
| Push / merge | No / no |

Pre-existing dirty environment/Odoo files and `.archify/` are excluded from the task commits. Private component/customer evidence and local protected configuration remain outside Git.
