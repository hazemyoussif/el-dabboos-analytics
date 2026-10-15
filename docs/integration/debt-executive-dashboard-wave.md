# Customer Debt & Aging and Executive Monthly Overview

Authorized October 14, 2026, after the staging review-family backfill. Operator evidence confirms 29 fact months (June 2024–October 2026), 28 receivable months and 28 review months (June 2024–September 2026), no missing review months, and zero changed/missing original fact or receivable partitions against revision `9b0f6aab-f31b-413a-b2e6-5eebba48c8c0`. Latest observed trusted review revision: `537e9ebd-1e61-4286-b0d2-4356fbd0fcaf`. Finance review remains pending for exposed review data. This is operator-supplied hosted evidence, separate from automated tests.

## First report release

Two new application-owned templates preserve existing reports, metric definitions and immutable serving data. No migration, source extraction, Odoo write or automatic Save is introduced.

- **Customer Debt & Aging:** six headline metrics (signed net receivables, total overdue, signed credit balances, positive components due for collection, cash collected and weighted collection days), a single month-end aging table and a clearly labelled Top 100 Customers Due for Collection. Existing customer filters apply to every series and enable individual-customer balance/aging inspection without an unbounded all-customer table.
- **Executive Monthly Overview:** six headline metrics (net invoiced revenue, invoice refund value, cash collected, unallocated customer receipts, signed net receivables and total overdue), a Business Line comparison and the same clearly labelled Top 100 due table. Business Line is not relabelled as agency or customer department.

The aging table retains the source-backed signed buckets: At Date (due on or after cutoff), 1–30, 31–60, 61–90, 91–120 and older than 120 days. It does not relabel At Date as overdue 0–30 or silently combine older buckets. Signed credit balances remain negative; positive due-for-collection components are a separate measure, not the signed net-debt total. Collection timing excludes unpaid invoices. Period collections may settle older invoices. The Executive Overview intentionally omits collections/sales percentage: that existing ratio uses the review extraction’s invoice operands, whereas the displayed net invoice KPI uses preserved certified sales history, whose source cutoff can differ. The existing Customer Cash Collections report retains the ratio with its governed review-cohort definition; it can exceed 100%. No cross-release arithmetic or historical refresh is introduced.

Both templates use `latest_complete_month`: hosted template opening binds a fixed explicit month supported by every summary, grouping and analysis before canonical authorization/execution. Missing shared coverage or a required capability makes the template unavailable. The strategy selects the latest complete month, excludes a partial current month, does not stitch monthly review releases into annual totals, and remains independent of wall-clock rollover. Existing relative and historical template behavior is preserved. New reports containing pending review series retain the existing Finance review pending status.

## Remaining requested scope

Last sale/collection dates and customer balance-to-sales ratios need canonical metrics and source controls; they are not synthesized from labels or renderer arithmetic. Annual collections trends require explicit multi-month review serving. Inventory, lot expiry, physical return conditions, purchasing/delivery exceptions, banks/cash balances and forecasts remain separate source-backed work. Agency/customer-department/geography mappings must be verified before exposure. The original broader dashboard roadmap remains open; this release delivers the two reports above using available governed measures.

## Deployment and acceptance

Use the established repository pull, paired API/web image builds, operator verify and restart workflow. No migration or reload of published months is required. On hosted staging open both reports in EN/AR, confirm the fixed September 2026 period, pending review status and no failed/partial series; check customer filtering and reset, signed aging interpretation, Top 100 labelling and existing reports. Saving requires the normal explicit Save/version lifecycle.

Synthetic API, template and renderer evidence is distinct from hosted browser acceptance and live source reconciliation. Do not treat synthetic preview amounts as business values.

## Verification evidence — October 14, 2026

- Targeted tests exercise latest shared month selection independent of release order/calendar rollover, leap February, incomplete/disjoint coverage rejection, missing grouping/Top N capability rejection, EN/AR API opening, tenant-isolated amounts, latest snapshot selection, customer filter/reset and absence of automatic saved records. The synthetic IQ/EG template matrix validates all 36 templates.
- Full PostgreSQL regression suite: **244 passed**, zero skips, on isolated synthetic PostgreSQL 18.6 with disposable disk-backed storage. No customer source, developer env file or company staging database was used.
- Dashboard quality AFTER review used the actual renderer with explicitly labelled synthetic data. Debt: EN Light phone 390px, AR Dark phone 390px/tablet 1024px, EN Dark desktop 1440px. Executive: EN Light desktop 1440px, AR Dark phone 390px, EN Dark tablet 1024px. No page overflow was observed; wide tables retained internal scrolling. Metric definition opening/Escape close and the chart's precise-value disclosure were exercised. The final Executive percentage-to-unallocated-receipts replacement preserves the layout and existing monetary renderer; authenticated hosted browser acceptance remains pending.
Resolved AFTER findings:

1. Report opening could request an unloaded relative month. `apps/api/src/routes/templates.ts` now binds the latest complete shared month before canonical validation and authorization.
2. A due subset must not imply the company total. `packages/application/src/leadership-templates.ts` explicitly labels Top 100 and retains the complete summary KPI.
3. The aging table must preserve signed source bucket meanings. The leadership template keeps At Date and both older-than-90-day buckets separate.
4. The Executive percentage could imply a denominator from a different sales release. The final template uses unallocated receipts; the existing Collections report retains its own governed ratio.

No unrelated presentation redesign was made.
- Existing web bundle-size warning remains. Hosted live report execution, authenticated customer-filter/keyboard/export flows and rendered Finance review status need operator acceptance after rollout; synthetic previews are not that acceptance.

- Final unit/API suite: **886 passed**, zero skips. Frozen install, lint, architecture, quality (zero diagnostics), typecheck, API/web build and diff gates passed. PostgreSQL test cases all completed successfully as recorded above; the command launcher reported termination status 143 after the completed test summary, so CI must confirm the final release job exit before merge.

## Expanded authorized purpose delivery

The initial two-report slice is superseded in PR 32 by the [source-backed business purpose wave](business-purpose-dashboard-wave.md), following the fresh Company-1 read-only audit. The original signed aging and operational invoice definitions remain unchanged. Expanded reports use new, matching-source operands and a separate immutable business family, with Finance review pending. Earlier validation in this document applies only to the initial slice; final evidence belongs to the expanded delivery document.
