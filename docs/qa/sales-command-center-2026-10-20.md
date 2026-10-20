# Sales Command Center implementation receipt — 20 October 2026

Status: implementation and local staging publication are complete. On 20 October,
the user confirmed that the numbers are correct and explicitly authorized final
deployment using the existing configured source. PR 46 (the prepared-reader
prerequisite) was merged; PR 47 carries this release. The agent owns local Docker
rehearsal and repository merge; the user executes company-host deployment commands.
Company schema changes and company exposure/promotion have not been performed by
the agent. No source writes were performed.

## Source/reference investigation and user acceptance

The user reported extra zeros in local staging. A fresh read-only source check on
20 October at 09:01 UTC confirmed the local reader's October counts, while the
reference dashboard at the same Baghdad date, October 1–20 range and unfiltered
salesperson/customer scope displayed substantially different counts:

| Cohort | Local configured source | Live reference |
| --- | ---: | ---: |
| Posted invoices today | 0 | 139 |
| Posted invoices October to date | 745 | 1,796 |
| Confirmed orders October to date | 827 | 1,800 |

The existing tunnel reaches `127.0.0.1:5432`, database `accounting`. Its Odoo
`web.base.url` is `http://stage.aldabboos.com`; this is an environment clue, not
proof of which upstream the reference uses. Only `accounting` and the maintenance
`postgres` database are listed on that PostgreSQL instance. Current-month invoice
and order counts across all companies resolve to company 1. INV-prefixed
receivable-line counts equal the invoice-header counts; there are no current-month
orders with missing order dates rescued by creation-date fallback. Those cohort
and scope differences do not explain the discrepancy. Latest invoice and payment
creation timestamps are October 19, while orders include October 20 activity.

September/October local exposures completed and the real prepared reader matched
its native mart reader for all 34 widgets, comparisons, customer, salesperson,
combined filters and an enforced customer policy. Observed first/repeat reads
were 291/270 ms, with zero raw-history attempts. These checks establish internal
reader agreement only; they **do not establish parity with the live reference**.
The user-opened [invoice workflow](https://n8n.aldabboos.com/workflow/oTsR0CEei0DBpAxb)
was inspected read-only: `Odoo New Invoices1` uses the `live-version` credential,
site `https://accounting.aldabboos.com/`, database `accounting`. Its Journal Item
reader includes all receivable accounts changed since Baghdad day-start minus
two days. `Shape New Invoices1` maps journal-item ID to invoice ID, `move_name` to
name, accounting `date` to invoice date, debit minus credit to total, parent state
to state and the line's custom salesperson to attribution. A fresh 09:08 UTC source
check using that exact INV-prefixed receivable/accounting-date cohort still found
745 posted lines/headers in October, zero today and no header/line date differences.
The workflow's live endpoint therefore differs from the staging identity reported
by the configured source. The user subsequently confirmed the current numbers are correct and instructed
the agent to finalize deployment. The existing source connection and scope are
therefore retained; this does not assert equality between the two environments. No workflow, credential or sync was
changed, saved or executed during inspection. No source scope, connection, metric
formula or display values were changed to force agreement.

## Checkout and delivered scope

- Branch: `codex/sales-command-center`; base
  `d62262bfe52351a4149778851c53eae7e990470f`. Final HEAD is recorded with delivery.
- Isolated managed worktree `sales-command-center`; primary user changes preserved.
- [Implementation plan](../integration/proposals/sales-command-center-implementation-plan-2026-10-19.md),
  [ADR 041](../architecture/adr/041-sales-command-center-composition.md),
  [owning documentation](../integration/sales-command-center.md),
  [34-entry manifest](../integration/proposals/sales-command-center-widget-manifest-2026-10-19.json).
- Built-in report at `/reports/sales-command-center`; authenticated read-only
  `POST /api/reports/sales-command-center`.
- Twenty-six domain-owned command metrics, source recipes/mapping, forward migration
  061, independent header controls and exact grouped source/mart certification.
- Today/month/selected-range/six-week orchestration, invoice/payment/order states,
  true same-day cash, distinct customers, cancellations, signed debt/unknown maturity,
  oldest debit age, source-matching salesperson roles, per-debtor owner details,
  comparisons, complete-denominator shares, charts, collapsible tables and Excel.
- Prepared/source coverage is explicit. Publication eligibility alone cannot mark
  a result usable. Old balance cutoffs and unknown timestamps remain visible.

## Source evidence — read-only company scope

Access path: existing host SSH local forward `127.0.0.1:5432`, configured
`accounting` database, approved company 1. Existing protected credentials were
loaded in process and never printed/copied into the checkout. SSH and database
authentication work. The configured role has creation privileges; the existing
staging read-only mode was explicitly selected for the user-authorized inspections.
All source transactions were retained-snapshot RR/RO. Default guards, source
permissions, tunnel and persistent connection settings were unchanged.

Aggregate/metadata evidence, not retained customer rows:

1. On 20 October in Baghdad, the first today-only snapshot returned zero orders,
   invoices and customer receipts for that date. This is an empty cohort in the configured source,
   not a missing connection; it does not agree with the live reference (see above). The inspection took 1,795 ms after snapshot acquisition.
2. October source states: orders `sale`, `draft`, `cancel`; invoice documents
   `posted`, `cancel`; invoice payment states `not_paid`, `paid`, `partial`,
   `reversed`; receipts `paid`, `in_process`, `canceled`. Other states remain supported
   as explicit unknowns. Fifty-seven selected fields/FK targets were inspected.
3. Actual FK evidence: payment `salesperson_id`, receivable-line `salesperson_id`
   and customer `user_id` reference `res_users`. Invoice payment state, maturity,
   partial-reconciliation debit/credit links, max date and creation date exist.
4. A retained-snapshot extraction of 24 populated command operands passed source
   quality checks. Six independent headline aggregates matched exactly: posted
   invoice value/count, refunds, signed cash, confirmed order value/count.
   Extraction/control reading took 34,507 ms; this is an offline source check,
   not report latency or an ingestion SLA.
5. Same-day cash was tightened to actual reconciliation creation day, not merely
   accounting max date. The final aggregate found 279 qualifying allocations,
   no invalid rows, in 798 ms. Late-created backdated allocations are excluded.
6. Attribution verification found 59 differences between header invoice owner and
   line salesperson among 745 October posted invoices, all with one receivable
   line. The implementation uses the reference's line field, rejects ambiguous
   assignments and never multiplies headers by lines.
7. Final invoice value, count, residual and settled value by salesperson matched
   independent INV-prefixed receivable-ledger aggregates in all 148 cases, with
   zero mismatches and no invalid rows; aggregate execution took 466 ms.

Full monetary aggregate evidence remains in protected ignored local state, not
committed documentation or fixtures. These checks do not establish company
prepared-cell acceptance, Finance approval or every possible filter case.

## Automated verification

- Frozen dependency installation passed; dependencies/lockfile unchanged.
- Complete regular suite: **968 passed, zero failures/skips**.
- Targeted source fixture passes: header identity, tax/refund signs, Baghdad
  midnight, sale/done vs unknown states, receipt salesperson, line/header owner
  mismatch, master-owner precedence, signed unknown maturity, exact overdue days,
  cash-only allocation and later-created reconciliation exclusion. Missing nonzero
  header operands cannot certify as empty measures.
- Domain/calendar checks cover leap February, month-end clamping, six consecutive
  Saturday weeks, four disjoint prior weekdays, missing operands and zero denominators.
- History checks cover current-only residuals alongside cross-month order coverage,
  gaps, source/recipe changes and suppression of obsolete command capabilities.
- API/report checks cover authentication, tenant/profile ownership, strict bodies,
  enforced policies, shared filters, one clock, one revision, deduplication,
  bounded concurrency, full retry after publication changes and null/partial states.
- Complete PostgreSQL suite after the source-read handoff correction: **385 passed, zero failures/skips**. An earlier
  compatibility run exposed missing physical state columns and missing legacy
  analysis provenance; both were corrected. Final scoped provenance hardening
  additionally passed the native/prepared dashboard acceptance check.
- Lint, typecheck, architecture, baseline-aware quality and build pass. The resolved
  `executeFacts` complexity allowance was removed; no debt allowance grew.
- Existing Vite large-chunk warning remains. Implementation commit `732cc6c0d62a45d430f4742f9e0c21b82606cacc` passed [CI](https://github.com/hazemyoussif/el-dabboos-analytics/actions/runs/39391093208). Final application-code commit
  `b3c74f5f66114537bc483bc015a18ac70476d2e1` also passed
  [CI](https://github.com/hazemyoussif/el-dabboos-analytics/actions/runs/39404653092).
  The subsequent company-storage adjustment changes documentation only: it uses
  the verified existing backup mount, retains the root reserve, and preserves
  tagged images and database volumes. All three company Bash blocks pass syntax
  validation and the diff gate; application/test sources are unchanged after CI.

## Prepared-reader proof and measured limits

The acceptance fixture extends the complete synthetic Business partition and
retains existing measures. Its prior month excludes current-only residuals;
current month includes them. All 34 command entries must be usable, with working
ownership and share outputs. The native canonical reader must match every result
exactly, including comparison periods and provenance. A weekly filter is checked
through both readers.

A runtime pool guard prohibits raw-history reads; every prepared-cell query checks
`SHOW jit = off`. The whole response retains one serving revision. Latest targeted
measurement: **202 ms first / 172 ms repeat**, 131 prepared-cell reads across first
and repeated executions, zero history attempts. This is synthetic single-client
local evidence. Company latency, browser-to-complete and concurrent-user performance
have not been certified. The concurrency budget is per execution, not process-wide.

## Browser and quality-gate evidence

The original matrix used a synthetic local fixture and Iraq Admin in the Iraq
demo. Its customer/salesperson identities and numbers are explicitly synthetic.
The subsequent local HTTPS rehearsal used the existing authenticated tenant admin
and accepted source publication: English/Arabic switching, a real salesperson
selection plus Apply/reset, selected-range date Apply with Today unchanged,
390px Arabic phone reflow, 1024px tablet navigation/theme controls and restoration
of the original English/Light preferences were checked. Source freshness and
unknown empty-cohort business dates remain visible. Reference-site selections
and company data were not changed.

- English/Arabic, Light/Dark checked at 390, 1024 and 1440 px: one/two/four KPI
  columns respectively, correct LTR/RTL, no page-level horizontal overflow.
- Date Apply changed order periods while Today, month and six weeks retained their
  rules. Salesperson selection narrowed invoice/cash/order/debt data together.
  Filtered synthetic Today values were 1,000 invoice value, two invoices, 500 cash,
  three confirmed orders and 250 same-day cash. Per-customer owner matched the
  selected salesperson. Reset and report refresh work.
- Weekly chart and accessible values contain six consecutive buckets, including
  covered zero weeks; combined top-ten contribution is displayed.
- Metric-definition dialog exposes the real tax/date/sign/attribution meaning;
  Escape dismisses it. Tables collapse; phone navigation opens as a modal and
  Escape dismisses it. Bilingual source captions refresh when locale changes,
  preserving submitted filters; theme changes remain presentation-only.
- Excel export was clicked in Arabic and produced a valid XLSX archive with one
  worksheet and 16 rows including report context, headers and the synthetic
  debtor data. No PDF control is claimed.

AFTER findings fixed within scope:

1. Report bootstrap could leave a blank area: explicit loading/error/retry.
2. Date input could display unapplied state: native input ownership corrected.
3. Long helper text obscured phone data: concise summaries and collapsed guidance.
4. Weekly chart omitted empty weeks: actual accepted coverage now supplies all six.
5. Share/ownership completeness could be inferred from eligibility: adapters now
   provide actual observation/segment coverage, including accepted empty snapshots.
6. Invoice attribution could substitute the wrong header owner: verified line
   attribution, stable identity and ambiguity rejection.
7. Cross-month history could be hidden by current-only residuals: stitch each
   compatible event capability independently; never stitch snapshots or obsolete
   command recipes.
8. A workspace catalog loaded before publication could leave new table metric
   headers unformatted: use canonical metric metadata as a presentation fallback.
   Bilingual SSR regression covers an empty workspace catalog.
9. Prepared dimension discovery could execute with session JIT enabled: disable
   it transaction-locally, with prepared-cell guards and an assertion that session
   settings are restored after discovery.

Screenshots are saved in the task's local visualization folder, separate from
company/source evidence. The local preview is synthetic and does not imply a
company deployment.

## Concrete release boundary

The intended company revision in the plan is distinct from the original local
staging revision `3b5f517c-a1a4-4eda-9da3-45c975d3b03e`. Before the authorized local
rehearsal, local staging was behind the selected baseline
(`mart.prepared_reporting_windows` absent). The rehearsal backed up both local
staging databases, built commit-pinned images, applied forward migrations through
061, verified runtime roles and reached API readiness 200. Protected TLS/source
relay configuration and the old accepted publication were retained.

The source rehearsal exposed an existing lifecycle defect: a source lease was
retained during offline preparation after all source reads and exact reconciliation
were complete. The first short lease rolled back; an expired longer attempt was
cancelled before publication. The corrected protocol requires a successful
source-read handoff after exact reconciliation, closes the RR/RO source lease, and
prepares only from the reconciled mart facts/controls within the same atomic
publication transaction. Tests prove source loss/handoff failure still rolls back,
preparation bounds still reject work after source close, and only sealed revisions
promote. No source guard, statement bound or maximum lease duration was removed.

Local real-data publication/reader acceptance is recorded separately from the
synthetic/browser evidence above. The user executes the [company rollout
commands](sales-command-center-company-rollout-2026-10-20.md); local success does
not certify the company revision. The agreed workflow and outstanding timer
refresh work are preserved in the owning integration document.

After deployment authorization, use the documented normal backup/deploy/migrate/
verify workflow, then the explicit `expose-business --sales-command` write operation
for the months needed by the trusted clock. It retains original Business measures,
checks independent aggregates/exact controls, prepares and promotes atomically.
It is not a diagnostic. Verify exact company widget/filter cases, prepared JIT-off
reads with no raw fallback, first/repeat and concurrent-user timing, and retain
previous accepted serving data during preparation. Finance review remains pending.
No blanket source refresh schedule or company cutover is inferred. Repository
merge and local deployment are explicitly authorized by the user.
