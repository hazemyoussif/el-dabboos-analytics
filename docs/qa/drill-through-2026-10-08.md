# Governed drill-through acceptance — 8 October 2026

Branch: `codex/production-pilot-lifecycle`. Starting/final committed HEAD: `2800df19401578bba8e6679739c7c483c5c5851d`; implementation remains uncommitted. The checkout already contained operational UX, connectivity and dimension-filter changes; those are preserved. No push, merge, external migration or deployment occurred. CI was not triggered.

## Delivered behavior

- KPI detail action; bar pointer action; chart precise-value table and table-cell keyboard actions.
- Strict semantic `POST /api/analytics/drill-through`, canonical validation, application authorization, certified capability checks and tenant/policy intersection before DB results.
- Seven event families plus existing order/invoice averages, with decimal supporting bases, recognition dates, governed names, actual stored document type/status and currency when present.
- Exact immutable partition-fact publication lineage under migration 035. Event release or source-cutoff changes return a refresh requirement, including unchanged sync runs that advance the cutoff.
- Signed Finance customer snapshot and bucket detail, one effective snapshot only, with visible As of date and historical per-point publication lineage.
- Authenticated encrypted keyset continuation; 50-row default, 100-row maximum; safe sorting and bounded literal customer-name search; no COUNT(*) or row cache.
- EN/AR, RTL, native modal, loading/empty/error recovery, explicit pagination, preserved parent viewing state and metric-definition access.

Full semantics, contract and consistency rules: [governed drill-through](../integration/governed-drill-through.md).

## Automated evidence

Focused HTTP/UI tests: 3 passing, covering cross-tenant denial, metric-domain denial, scoped manager context, SQL-shaped input rejection, clicked context and complete viewer-filter preservation, date narrowing and EN/AR business labels/empty rows. Focused PostgreSQL tests cover all event families, full/partial/historical periods, own-date signed refunds, exact ratio bases, stable page continuation without missing rows, scoped policy intersections, cross-tenant RLS, release/cutoff changes, signed Finance/customer buckets and per-month trend lineage.

Final full suites: **734/734 standard tests** and **177/177 PostgreSQL tests**, zero failures/skips. Frozen install, lint, architecture, quality, typecheck, build and diff gates all pass. The initial run found one missing report link and two stale schema/policy inventory counts; those were repaired without relaxing security assertions. The final review added resolved-period admission and unsupported-dimension action guards, followed by 6 passing focused HTTP/UI/documentation tests and clean lint/architecture/quality/typecheck/build/diff rechecks. The existing Vite large-chunk warning remains. Tests use isolated synthetic PostgreSQL 18.6 and do not load developer environment files, customer extracts or real model/source services.

## Browser evidence

[Browser results](drill-through-2026-10-08/browser-results.json): 12 passing cases — EN/AR × Light/Dark × 390/1024/1440 px. Every case exercises opening, Close/Escape, customer search, amount/customer/salesperson sorting, sort direction, Load more, empty state, stale-release error and Retry. Tab stays within the dialog, Escape restores opening-button focus, and no page-level overflow or browser error occurs. Dialog widths: 352, 986 and 1100 px. Screenshots are saved alongside the results; [Arabic Dark phone](drill-through-2026-10-08/ar-dark-390.png) and [English Light desktop](drill-through-2026-10-08/en-light-1440.png).

This is a local isolated component harness with synthetic intercepted HTTP responses, not a live staging/end-to-end source acceptance. Real mart behavior is covered separately by PostgreSQL tests. The AFTER quality review found one keyboard-focus escape; focus wrapping and restoration were fixed and the complete matrix rerun successfully. No unresolved Blocker/High findings in the exercised dialog. No claim is made about new employee identities or external source connectivity.

## Performance

Local synthetic first-page measurements with 50-row pages:

| Path | Population | Focused measurement | Full-suite measurement |
| --- | ---: | ---: | ---: |
| September invoice detail | 2,000 event records | 111 ms | 166 ms |
| Annual Salesperson-filtered detail | 2,000 event records + explicit month coverage | 109 ms | 144 ms |
| Customer-filtered detail | 2,000 event records | 104 ms | 126 ms |
| Receivables At Date bucket | 3,105 customer snapshot records | 17 ms | 41 ms |

These include capability lookup, a read-only tenant transaction, aggregate supporting bases, bounded page selection and label projection. They are single-machine synthetic measurements, not production p95. No measured drill path required an added speculative index. SQL returns limit+1 rows; it does not transfer the full detailed population to React. Aggregate bases necessarily scan the authorized population.

## Source independence and limits

The concrete drill repository takes a mart pool and certified capability provider only. Synthetic mart tests execute it without Odoo, a relay, Machine ID or an LLM. No source transport is invoked by the API/service/repository drill path, and source unavailability does not affect a previously trusted mart's details.

Existing canonical transaction evidence has no business document reference. Existing published Finance snapshots have customer vectors rather than accounting/document components. Those absent fields are not fabricated or replaced with stable IDs. Finance document-level drill-through therefore remains unsupported until a separately governed component publication exists. Transformed chart values are excluded; raw metric values and in-scope ratios remain supported. Cursor tokens expire on process restart. Export is deferred.

Migration 035 is verified in disposable test databases only. It must be applied by the existing offline migration process before runtime use. Existing partitions with incompatible mutable heads do not get guessed historical fact lineage; detail availability fails closed until a verified rebuild. No external database was migrated in this task.

## Safety confirmation

| Check | Result |
| --- | --- |
| Drill-through contacts Odoo | no |
| Frontend sends raw SQL | no |
| Stable IDs exposed as normal labels | no |
| Summary/detail semantic mismatch | no; incompatible or changed states fail closed |
| Ratio derived from averaged ratios | no |
| Receivables snapshots summed | no |
| Snapshot date semantics changed | no |
| RLS bypassed at runtime | no |
| Authorization weakened | no |
| Cross-tenant details exposed | no |
| Full result eagerly loaded | no |
| LLM runtime dependency | no |
| Odoo writes | no |
| Push / merge / external deployment | no / no / no |
