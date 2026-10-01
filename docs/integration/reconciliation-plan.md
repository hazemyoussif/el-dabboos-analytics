# Proposed reconciliation plan

**Future integration gate.** Process: Source → approved canonical transform → AnalyticsRepository adapter → semantic result → compare to agreed source report. Business owner signs definitions and tolerances; integration owner records lineage/watermark; security owner signs tenant/policy/currency isolation. No real-data execution is part of this branch.

## Establish a reproducible control

Freeze approved source extraction/revision and reporting watermark. Record tenant/company, timezone, recognition date, eligible states, sign convention, transaction/base/reporting currency and conversion rule. Select closed month, quarter, month-end/leap boundary, current partial period and an approved corrected/backdated sample. Do not compare a current source report to yesterday's extract without acknowledging drift.

## Checks and evidence

| Check | Procedure |
| --- | --- |
| Control totals | Compare revenue/net revenue/order count and relevant input measures before deriving ratios; report missing/duplicate/rejected row counts |
| Group totals | Compare customer/branch/product totals and sum of groups to the same authorized control; identify unknown grouping IDs |
| Date windows | Confirm inclusive boundaries, month/quarter alignment, leap years and recognition timezone; separate event from extraction dates |
| Derived metrics | Recompute numerator/denominator totals; test zero denominator null, not average-of-averages |
| Snapshots | Compare latest eligible entity balance at cutoff; verify completeness, moved dimensions, missing entity and same-date duplicates |
| Currency | Reconcile one approved reporting currency at a time; review conversion date/rate and rounding; never silently combine unrelated currencies |
| Corrections/deletes | Replay agreed backfill/reversal/update/tombstone samples; show restated periods and stable idempotent totals |
| Sign conventions | Agree credits, refunds, negative stock and cost signs; no blanket abs() correction |
| Nulls/missing | Distinguish unavailable denominator/snapshot from semantic additive zero; report dropped/unknown data explicitly |
| Duplicates | Verify source event identity/version, joins and entity/measure/date uniqueness; quarantine or approved deterministic resolution |
| Tenant/policy | Run second-tenant control and disallowed branch intersection; compare only authorized totals without exposing foreign rows |
| Freshness | Record dataThrough and true sourceAsOf separately with missing-watermark disclosure |

## Tolerances and sign-off

Absolute and relative numeric tolerances, rounding/currency precision and acceptable missing-data thresholds are **TBD by business approval**. Count equality is the desired definition but its approved acceptance rule still needs sign-off. Do not invent a universal 1% or epsilon policy. Failed reconciliation blocks pilot for that metric family; an approved exception must name scope, owner and expiry.

Retain redacted control totals, source/report identifiers, transform/adapter/version, expected/actual delta, applicable tolerance approval and disposition. Do not commit customer extracts or result rows. Re-run after source mapping, semantic definition, currency, calendar or correction-rule changes. Automate the signed cases as source contract/reconciliation tests. [TC-DATA specifications](../qa/real-data-acceptance-tests.md).
