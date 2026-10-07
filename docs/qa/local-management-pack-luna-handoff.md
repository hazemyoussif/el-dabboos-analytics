# Luna handoff — deferred local management report QA

The user explicitly requested skipping browser/visual QA for the Local Management Reports Pack v1 **and the next task**, then handing both scopes to Luna; Executable Reports Wave 2 also explicitly defers visual QA. This is a deferred acceptance run, not a passed visual gate. The additional task scopes are recorded below. No Luna task/message has been dispatched automatically.

Read [pack implementation/evidence](../integration/local-management-reports-v1.md), [ADR 022](../architecture/adr/022-web-presentation-themes.md) and the project [dashboard quality skill](../../.agents/skills/el-dabboos-dashboard-quality/SKILL.md) in AFTER mode. Inspect the actual final HEAD and preserve the unrelated Odoo edits and `.archify/`. Do not push, merge, deploy online, modify Odoo, weaken certification or change authentication.

## Environment and evidence

Production-built laptop-local HTTPS: `https://localhost:8443`. Existing protected operator launcher: `/home/hazem/.config/el-dabboos-local-staging/stack`. Persistent mart: `dabboos-analytics-mart-postgres-1`. Current target: El-Dabboos Iraq, IQD, fixed September 2026 release. Start with the three commands in the pack document. Confirm API health before testing; proxy 502 during startup is not final readiness.

Existing tenant-admin login is required. Ask the user to sign in if no active session exists; do not collect passwords in chat, create synthetic authentication or change credentials. Existing protected local configuration stays outside Git; do not print envs/cookies/passwords or capture unnecessary customer PII in screenshots. No Odoo connection is required to view this static release.

Automated baseline at handoff: 628 unit/API and 114 PostgreSQL tests, zero failures/skips; build/typecheck/lint/architecture/quality/diff passed. Actual PostgreSQL report executions: zero failed series, roughly 21–23 seconds for complete dashboards on this laptop. These are not authenticated browser passes. New publication/certification events: zero; eleven staging history fingerprints unchanged.

## Acceptance sequence

1. **Landing and identity:** existing local login works, correct tenant selected, Executive Sales & Invoicing opens for September 1–30, no seven-widget/ten-series failure state or synthetic-data claim. Check reload, tenant selection and saved routes.
2. **Executive:** six runtime cards: net invoice 1,447,166,500; posted invoice 1,465,712,000; refund 18,545,500; order revenue 1,461,335,500 IQD; 2,895 orders; average confirmed order value from the approved ratio. Verify period and sourceAsOf October 5 remain distinct. No invented trend or comparison.
3. **Business Line:** invoice/refund comparison, order revenue and six-column monetary/count/average detail. General is the only actual September group; no synthetic No Sugar row. Verify source translated labels render as General / عام, with No Sugar / بدون سكر only where returned. Identity remains stable.
4. **Salesperson:** all 39 returned groups render; labels are readable source labels, not raw technical IDs/JSON. Unassigned is localized where present. Detail counts and currencies remain aligned. No hidden categories, invented ranking or summed group averages. Exercise accessible chart tables and scrolling.
5. **Customer:** unavailable explanation before execution, no synthetic customer data or cross-tenant evidence. Unsupported template is disabled/incompatible in template browsing.
6. **Finance:** separate validation view says Reconciled · Awaiting approval, explains partner identity/source metadata and Finance approval pending, exposes balance-as-of and control sourceAsOf, never says Certified and never bypasses analytics publication. Check loading, no-review and retry/error states where safely testable.
7. **Data Status:** company/currency, fixed September period, actual source freshness, serving certification and exact published pairs. Technical release/certification IDs live only in details. Zero published release must not say certified. The Finance control timestamp must not replace sales/invoicing freshness.
8. **Navigation/lifecycle:** every new report button works and marks the active report. New dashboard, Browse templates, existing saved library, administration and returning from Finance/Data Status still work. Unsaved changes retain existing confirmation/Save/version behavior; no automatic saves occur.
9. **Builder/planner:** unavailable metrics/groupings/analyses are absent or clearly unavailable. Gross profit/margin, branch, generic revenue alias and outstanding balance cannot enter normal analytics. If invoking a live model, follow current privacy approval; fake-provider regression evidence is separate.
10. **Generic demos:** Sales Performance remains available/default where compatible; existing reports are retained. Compatibility depends on published capabilities, never only tenant/source names.
11. **Themes/localization:** English and natural Arabic, RTL, Light/Dark/System. Check typography, source labels, number/currency/date formats, legends, precise values, status copy and focus treatment.
12. **Responsive/accessibility:** desktop, 1024px tablet and approximately 390px mobile; no page overflow/clipping, navigation drawer closes after selection, controls remain reachable, tables/charts have intentional scrolling/reflow. Exercise keyboard focus, Escape/modal containment, theme selection and every changed interactive action.

Record numbered Blocker/High/Medium/Low findings with file/screen evidence and the smallest justified fix. Do not redesign unrelated screens. Recheck affected states after fixes and run appropriate tests plus required gates. Capture privacy-conscious screenshots for management and report exactly which acceptance steps passed, failed or remain blocked. Do not mark a pending Finance metric certified as part of QA.

Append the next task's scope, final commit(s), changed surfaces, additional controls and its deferred browser criteria before beginning the combined run.

## Second task scope — enterprise expansion and bilingual approvals

The second task starts at `e5ea6a1` and adds the [business package](../business/README.md): six EN/AR Markdown documents generated from a validated documentation-only definition source, 204 definition records, 17 current/planned report specifications and 19 exact-version decision forms. Find its final local commit with `git log` (`docs(business): add bilingual enterprise metric approval pack`). **No new UI screen, executable template, metric, capability or publication is added in this second task.** All twelve original Odoo/environment edits and `.archify/` remain preserved. The combined browser scope is therefore the twelve-step acceptance sequence above.

Additional review cases:

1. Verify product navigation still exposes only the established reports; proposed Product/Order Margin/Inventory/Expiry/Procurement specifications must not appear as executable/certified dashboard choices or AI/manual capabilities.
2. Compare each live report's period, six exact series, General/39 salesperson groups and status with the bilingual report catalog. Receivables remains validation-only and pending.
3. Review EN/AR business docs in the chosen management viewing/export tool: Arabic reading direction, table wrapping and formulas must be understandable. Do not assume browser Markdown rendering proves a printable PDF layout; no DOCX/PDF was generated or visually certified.
4. Confirm both approval packs preserve established decisions, distinguish refund value/count percentages, signed net Odoo fallback aging versus gross v1 missing-date buckets, and Order Margin versus Accounting Gross Profit. Completed approvals must identify exact definition version/hash, named owner/date/control/accepted exceptions before operator recording.
5. Check documentation lifecycle counts (10 certified, 15 numerically reconciled/pending, 97 defined/pending reconciliation, 50 discovered, 32 unavailable) are **definition counts**, not runtime capability counts. Candidate dimensions are not certified pair permissions. Marketing/CRM/routes/branch limitations describe source/capture gaps.

Second-task automated evidence: 634 unit/API and 114 isolated PostgreSQL tests; all required engineering/build gates; bilingual render/reference/hash and financial bucket invariants. Read-only actual-mart executions preserve zero failed series; eleven staging history fingerprints unchanged; approved Odoo tunnel unavailable, so no new source extraction or publication. HTTPS health/local auth-state checks pass; authenticated login/browser/theme/responsive QA remains **Deferred**. No Luna task was dispatched; this document is the concrete handoff for the later requested run.

## Third task scope — Executable Reports Wave 2

Starts at `c692d6a`; find its final local commit with `git log` and read [Wave 2 evidence and blockers](../integration/executable-reports-wave-two.md) and the [pair ledger](../integration/executable-reports-wave-two.json). One new template, **Invoice & Refund Operations / عمليات الفواتير والإشعارات الدائنة**, uses existing certified summary and Salesperson pairs. No new reconciliation case, certificate or publication was created. Catalog now contains 18 report specifications and four executable reports; 204 definitions and 19 approval forms are unchanged. Customer/Product/Margin remain unavailable; do not interpret historical source-only findings as new certification.

Production API/web images were rebuilt and started with the existing local launcher. Actual governed-profile/PostgreSQL executions passed all four executable reports with zero failed series on a quiet recheck; new report took approximately 35 seconds. An earlier run during PostgreSQL test load had timeouts; deadlines were not raised. These checks do not cover authenticated browser behavior.

Additional deferred criteria:

1. Select the new report through existing report/template navigation. It has **six KPI cards and one six-metric Salesperson table**. Verify September 1–30, 2026 and October 5 sourceAsOf; Executive remains the landing default.
2. Check summary values: Invoice Count **2,890**, Refund Count **120**, Average Invoice Value **507,166.78200692043 IQD** before display rounding, Posted Invoice Value **1,465,712,000**, Refund Value **18,545,500**, Net Invoiced Revenue **1,447,166,500 IQD**. Refund Count counts credit-note documents; average invoice value excludes refunds. No refund percentage or ranking was added.
3. Check stable Salesperson identity and readable labels. Invoice/value/average groups have 39 identities, refund-only operands 31; the merged table must preserve null/absent cells rather than invent zero evidence. Do not sum the per-person averages or require 39 refund groups. Exercise table scrolling and accessible controls.
4. Check English/Arabic titles, RTL, Light/Dark/System, count versus IQD formatting, 3-column KPI layout and wide table at desktop/tablet/mobile. Pay attention to table column readability, horizontal scrolling, loading/error/retry states and actual execution latency.
5. Confirm unavailable Customer/Product/Margin capabilities remain gated, Finance remains pending, the existing Executive/Business Line/Salesperson reports retain their values and all twelve original acceptance steps still apply. Record visual QA separately from automated/runtime evidence.

No browser session, visual pass, new Finance approval or Luna dispatch is implied by this handoff.

## Fourth task scope — source evidence acquisition and pending Customer activation

Read [source evidence and exact activation proposal](../integration/source-evidence-report-unlock-wave.md). The source tunnel was restored by the user; all 15,519 receivable identity cases now match exactly. Finance validation in EN/AR must show identity verified while **Finance confirmation remains pending**. Metadata inspection is not proof of custom Python equivalence. Verify the newer Finance source check timestamp October 6, 18:20:50 UTC remains separate from the serving sales/invoicing timestamp.

A separate fresh Customer candidate has 10,307 exact technical cases (308 baseline + 9,999 Customer). **Certification/promotion/activation remains pending exact-package approval after automatic review rejection**. Customer remains unavailable in the currently active release. Do not claim a published Customer report until an explicit follow-up records activation and zero-failed-series runtime evidence.

If subsequently approved/activated, append its final release/commit here and test complete stable Customer labels in 1,927 net-invoice groups, 1,923 posted-invoice groups, 111 refund groups and 1,922 order/average groups. The existing Customer template has two grouped charts and a six-metric detail table. No Top-N/ranking/trend or silently truncated 1,000-group result is allowed. Check scroll/readability, sparse refund cells, duplicate display names as distinct identities, natural EN/AR/RTL, all themes and desktop/tablet/mobile. Four earlier executable reports must retain their totals and zero failed series. Finance approval cannot be inferred from Customer activation.

No new Product/Margin/Inventory/Procurement screen is claimed. Visual/browser QA remains Deferred; no Luna dispatch has occurred.


The fourth task observed default eight-query fan-out timeouts (including one Average Invoice Value summary on a quiet run). The existing laptop-local execution concurrency is now two; SQL deadlines remain unchanged. Inspect final runtime evidence separately from visual QA, assess loading/retry/latency honestly, and do not claim newly certified Customer execution before its explicit activation check. All earlier acceptance criteria remain required.

## Fifth task scope — Finance standing approval, Receivables publication and metric definitions

Visual/browser QA status: **Deferred**. Sol visual/browser QA: **not run**. Luna: **not dispatched**. Earlier acceptance scopes remain accumulated above; historical Finance-pending expectations are superseded only for the exactly published aging family described in [delivery](../integration/finance-metric-definitions-delivery.md).

Apply the dashboard-quality skill AFTER review to the final local production build at `https://localhost:8443`. Include Executive, Business Line, Salesperson, Invoice & Refund Operations, navigation, saved dashboards, EN/AR/RTL, all themes and responsive layouts. Customer activation remains a separate workflow; inspect current publication rather than restarting its certification.

Additional checks:

1. **Receivables & Aging / الذمم المدينة وأعمار الديون:** fixed September 30 cutoff, eleven KPI metrics and the complete seven-metric Customer Aging table. Preserve all 2,217 stable identities, including zero/negative net customers. No Top-N truncation or invented positive-only balance. Gross Open Receivable Components remains distinct from Net Aged Receivable. Verify published/certified status and absence of Finance-pending badges on the normal report.
2. **Common information action:** hover and keyboard focus reveal a short definition; click/tap opens the full dialog. Check KPI cards, chart headers, metric table headers and accessible chart tables, manual builder palette and selected metric pickers. Inspecting help must not add/select/drag a metric or change/save a dashboard. Saved and AI-created widgets use the same component.
3. **Dialog:** correct metric and alternate EN/AR label, plain definition/formula, included/excluded scope, date basis, currency/unit, event/snapshot/derived type, refunds/credits, aggregation, allowed groupings, definition version, reporting coverage and actual sourceAsOf. Certification comes from serving provenance. Demo data must remain visibly demo. No SQL or physical ERP field names in management copy; technical references remain collapsed.
4. **Keyboard/mobile:** visible close button, initial focus, Tab/Shift-Tab containment, Escape closes, focus returns to the exact triggering info button. Open/close repeatedly from different metrics. Touch works without hover. Long definitions scroll inside a viewport-fitting dialog. Check 390px phone, 1024px tablet and desktop in both directions and all themes. Check tooltips near screen edges and chart/table overflow.
5. **Copy Definition:** copied text matches the active language, metric, formula/date/aggregation/version and truthful lifecycle status. Verify clipboard success and denied-clipboard feedback. No stale copied metric after reopening another definition.
6. **Financial semantics:** cutoff-today in At Date, maturity/accounting fallback, signed credits in their own buckets, historical residual and later-payment rule; overdue is the sum of five buckets and percentage uses aggregated signed operands with null for zero denominator. Do not sum customer percentages or snapshot dates.
7. **Regression:** the four existing reports retain their values, zero failed series and normal navigation/Save/version behavior. Source freshness of sales versus aging remains separate. Review loading/error/partial/empty states and normal unavailability controls.

Automated/runtime evidence and final local commit(s) will be in the delivery document. Native-dialog SSR/lifecycle tests are engineering evidence, not a browser accessibility pass. Record any Blocker/High/Medium/Low findings with exact screen/file evidence and the smallest fix; no unrelated redesign or automatic certification.

Final engineering status: all five reports have zero failed series in their latest checks (Executive and Invoice/Refund retried after builds/tests). Finance headlines are exact and the Customer table returns all 2,217 rows/labels. Report durations range from 63 to 218 seconds; initial concurrent-build timeouts remain preserved and headroom is limited. Evaluate loading/error/partial states honestly. Migrations 17/18 were explicitly authorized and applied; no rollback ran. The one-byte draft migration formatting exception and unchanged evidence checks are recorded in delivery. Sol visual/browser QA remains not run; Luna remains deferred and not dispatched.

## Runtime recovery and four shared UI fixes — October 7 follow-up

The earlier 63–218 second timings above are historical and superseded by [runtime recovery evidence](../integration/runtime-incident-20261007.md) and [follow-up performance evidence](../integration/performance-followup-20261007.md). All five current reports, including published Receivables & Aging, are in scope. Customer performance remains unavailable. Do not dispatch Luna until requested. Sol browser/visual QA has not run; DOM tests are functional evidence only.

Append these checks to the combined pass, in EN/AR, RTL, Light/Dark/System, desktop/tablet/mobile:

1. Metric tooltip escapes KPI/card/grid clipping and stacks above neighboring widgets. Check viewport edges, table/chart headers, accessible chart tables and manual builder. Hover between trigger and hint, focus/blur, Escape, scrolling/resizing; click/tap still opens the full definition dialog and never adds/selects/drags/resizes a widget.
2. Click Report B during Report A: B highlights immediately and its title/loading state identifies the destination. Check a slow response, failure/retry, rapid A/B clicks, browser back/forward, direct report/saved deep links and tenant changes. Late A results must never replace B. Saved/version/unsaved-change behavior remains explicit.
3. Header logout uses compact shell styling and a recognizable icon; verify hover/focus, light/dark, EN/AR/RTL, long names and desktop/tablet/mobile wrapping. Current-session logout and all-session revocation retain their separate authentication semantics.
4. Salesperson filters show human names, never `el-dabboos-odoo18-pg:2045`. Check Customer and Business Line labels, localized Unassigned, duplicate names remaining distinct selectable identities, EN/AR/RTL and restored saved filters. Missing/conflicting governed labels show “—”; do not substitute names for IDs. Product/Warehouse and other dimensions without certified label evidence must also avoid revealing source identities. Unavailable capabilities remain gated.

Record appearance, responsive behavior and browser accessibility findings separately; none is claimed passed by the functional tests.

Final functional delivery check after removing diagnostics: all five reports return
200 through normal HTTPS, exact headlines/grouped totals and zero failed series;
5.112–12.164 seconds, with all 2,217 Aging rows/labels. EN/AR filter endpoints
show business labels for all discovered Salesperson/Customer/Business Line options
and no technical identity labels. Automated gates pass (656 unit, 133 PostgreSQL).
These results do not replace the visual/accessibility/responsive checks above.
