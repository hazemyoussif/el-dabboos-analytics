# Finance historical serving — 8 October 2026

Priority 0 is fixed and local staging serves all twelve month-end Finance customer snapshots from October 2025 through September 2026. This report supersedes the Finance limitation in the earlier local staging benchmark; that earlier document remains the before evidence. Current branch is `codex/production-pilot-lifecycle`, HEAD `526bf32`, with uncommitted implementation and pre-existing work preserved. No push, merge, or external deployment occurred.

## Priority 0 diagnosis and behavior

The old SQL numeric guard scaled every result to six fractional places. Valid annual monetary values with cents consequently failed its safe-integer check. The guard now checks the actual significant fractional precision and verifies the numeric round trip; genuinely unsafe values still fail closed. This is not a blanket zero normalization.

| Failure class | Affected outputs / resolution |
|---|---|
| Covered period, zero events | Additive invoice/order/refund amounts and counts return zero only inside established trusted coverage. Authenticated customer-filtered September 1 Executive and Invoice selections verified this. |
| Selection exceeds event cutoff | Executive, Business Line, Salesperson, Invoice/Refund and Customer event series aggregate the trusted intersection and expose `PARTIAL_COVERAGE`. October 8 is a partially loaded day, not zero-complete. Cutoff presentation is tenant-local Baghdad, October 8 at 03:21. |
| No exact snapshot at selected end | Net Aged, six aging buckets, Total Overdue, Overdue %, Gross Components and Credit Balances resolve the latest trusted snapshot at or before the end. No exact-date lookup failure, interpolation or summation. |
| Zero/null ratio denominator | Average Invoice Value, Average Confirmed Order Value and snapshot ratios remain nullable. Authenticated zero-invoice selection rendered “—”. |
| Missing serving partition / no coverage | Missing partitions remain unavailable; ranges before the first snapshot render `DATA_NOT_READY`, with EN/AR copy. Synthetic PostgreSQL tests exercise missing partitions. |
| Invalid SQL numeric | Valid large monetary outputs are accepted; corrupt or precision-unsafe values are rejected internally. Cards receive a safe product error; logs contain metric/category only. Focused tests verify failure and diagnostic behavior. |

Annual Executive Net Invoiced Revenue, Posted Invoice Value, Order Revenue and the Average Order Value numerator exposed the old monetary precision defect. Invoice Value and Average Invoice Value share the affected additive base. Grouped cards use the same normalization for each group, including Business Line, Salesperson and Customer outputs; their safety does not depend on a particular customer's size. Counts and small refund totals were not inherently invalid. Visible `Unsafe SQL numeric output`, `NaN`, `Infinity`, or `SQL error` count was zero in completed valid-selection checks.

## Immutable historical capability and customer serving

Available cutoffs: 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31, 2026-06-30, 2026-07-31, 2026-08-31 and 2026-09-30.

The explicit offline Finance job reconstructed customer residuals under retained repeatable-read, read-only source snapshots. Independent signed-link controls matched every customer's ten canonical monetary measures, customer populations, and existing published company summaries. Publication stores immutable evidence, wide customer vectors and a separate published pointer. Month-end, bucket closure, signed credits, complete population, exact totals, and publication freeze are enforced. Published snapshots cannot accept later appended customers.

Ordinary reads use these persisted vectors; they never reconstruct Odoo residuals. Customer identity semantics match September. The original September certificate and serving binding remain intact. Historical metadata separately identifies exact reconciliation and the standing approved Finance definition; May is not presented as the September data certificate. New Finance extraction cutoffs are separate from the unchanged operational cursor.

Headline selected end June 17 resolves to May 31 (exact Net Aged `1391974112.61` IQD); October 8 resolves to September 30 (`1359461092.61` IQD). Before October 31, 2025 there is no available snapshot. EN/AR desktop checks verified as-of, unavailable and stale-snapshot messages. The unsaved manual monthly line rendered twelve independent cutoff values; its accessible value table contained all twelve. No customer trend was added.

## Exact September regression

Gross Components `1532751636.39`; Credit Balances `-173290543.78`; Net Aged `1359461092.61` IQD. At Date `759020481.15`; 1–30 `218464001.82`; 31–60 `69135500.55`; 61–90 `25871000.18`; 91–120 `33782500.14`; Older `253187608.77`; Total Overdue `600440611.46`. All remain exact. The governed UI rounds IQD to its existing display precision; stored values retain cents.

## Discovery and authorization

Before: opening report metadata enumerated the complete covered customer population, including irrelevant measures; this could exceed the 3,000-group bound and cost approximately 0.98–1.46 seconds.

After: opening a customer filter requests 50 options. Literal server-side search and stable keyset continuation are bounded (maximum 100 per page). Selected identities hydrate independently, including selections outside the first page. Cursor context binds tenant, user policy, metric, date, locale and search. Stable IDs stay internal; labels remain governed. An unrelated KPI does not trigger discovery. Synthetic tests use 3,105 identities and verify stable paging, search, selected hydration and cross-context cursor rejection.

Forced tenant RLS and publication-only restrictions remain enabled. The explicitly approved local login received SELECT on the three Finance tables and inclusion in the two publication policies. No write grants, role memberships, passwords or source permissions changed. Policy-filtered queries remain scoped; unpublished and other-tenant access is governed by the table policies. Runtime has no source/operator/model credentials.

## Measured query plans

`EXPLAIN (ANALYZE, BUFFERS)` was executed with the actual local runtime role and tenant context. Before plans show repeated legacy fact-membership/RLS probes: approximately 95,203–114,500 shared hits, 1,477–1,568 temporary blocks, and 367.949/423.691 ms execution for representative Finance aggregate/customer statements.

Chosen change: persist the already exact customer snapshot as one ten-measure vector per customer and query the published snapshot through its primary keys and restrictive publication RLS. The publication manifest is evaluated as a small hashed/subplan scope. Authorization remains per query; no unsafe cross-request authorization cache or RLS bypass was introduced. Source reconstruction is offline. All cards read the same immutable base rather than rebuilding each bucket's historical residual model.

After: summary plan 2.780 ms, customer plan 4.699 ms, discovery plan 4.884 ms. Summary/customer plans read 2,217 vectors with about 330 shared hits and no temporary spill. Direct runtime calls including adapter overhead measured 30.197/34.371 ms; twelve-month trend 52.699 ms, middle-date KPI 6.519 ms, 50-option Finance discovery 10.187 ms. No speculative indexes were added. These SQL measurements are separate from HTTP samples, not a claim of instrumentation inside every HTTP request.

## Authenticated HTTPS timings

Seconds, first / warm, already running database; no cold-cache claim. Nginx request time includes API/proxy/body transfer, excludes connection setup and browser rendering. Upstream API time agrees within approximately 1 ms. Sanitized logs contain route, method, status, elapsed and byte count only.

| Receivables request | Before | After first / warm | Effective snapshot |
|---|---|---|---|
| September | 9.527 / 9.011 | 0.458 / 0.397 | September 30 |
| April–September selection | HTTP 403 | 0.412 / 0.321 | September 30 |
| October 2025–October 8 selection | HTTP 403 | 0.420 / 0.312 | September 30 |
| Twelve-month independent snapshot trend | Unavailable customer path | 0.069 / 0.061 | Twelve month ends |

Latest-image six-month samples are recorded separately from the earlier report matrix. The trend's initial default September execution was 0.164 seconds; its explicit twelve-month first request was 0.069 seconds. The trend was an unsaved manual draft, with no AI/model request or saved record.

Event regression, September first/warm and annual first/warm: Executive 0.084/0.083 and 0.171/0.148; Business Line 0.433/0.397 and 0.655/0.657; Salesperson 0.660/0.638 and 5.003/4.967; Invoice/Refund 0.539/0.475 and 3.694/3.693 seconds. This remains within the requested approximate ceilings and ordinary machine variance.

The five baseline report families completed September, September–October 8 and October 2025–October 8 selections, first and warm, with no numeric diagnostic. Customer Performance was additionally checked for these ranges. Its unfiltered annual event groups exceed the retained 3,000 bound; the final runtime shows “Choose customers or narrow the dates to view this report.” Successful series remain visible and failed series are explicit; results are not silently truncated. Broad annual customer event optimization remains outside this task.

## Verification and limits

Priority 0 focused tests passed before Finance work. The full nine-command gate suite ran once: install, lint, architecture, quality, unit tests, build and diff passed. Typecheck and PostgreSQL exposed small typing/fixture-count issues, repaired with focused checks. Unit/API/web total: 707 pass, zero skipped. PostgreSQL: 158 initially passed, five fixture failures repaired; focused repair run seven pass (five failures plus two Finance cases), giving 163 unique passing cases with zero skipped. Final focused behavior regressions: 35 pass. Final lint, quality (zero diagnostics) and typecheck passed after trust-copy changes. No second full-suite run occurred. Latest local API image is `sha256:1d9fe5dedf0215d161ed28d6e17ca65da6cb1eaff066b4274d6dc6d75d8ce073`; web image is `sha256:a2b1338aa01be7cd7ce3b46b3a8be02b35d3be2ac041774f396f73d96f3d5d60`. Temporary timing logging was removed and HTTPS readiness returned 200 with persistence and analytics available.

Read-only fingerprints of operational runs/cases/failures/cursors, technical proofs, trusted serving, September binding and historical bindings/members matched before and after authenticated acceptance. Report reads did not advance or reconstruct those records.

Dashboard-quality AFTER review: desktop EN/AR availability and provenance exercised; Light/Dark Finance screenshot review completed; phone content width 375 and tablet content width 1009 had equal document scroll widths, with no page-level overflow. Phone and desktop screenshots are retained beside this document. Final Arabic phone/tablet and keyboard checks were not completed after browser interaction became unreliable; do not claim a complete bilingual responsive/accessibility sign-off. Runtime/UI tests cover bounded discovery interactions and EN/AR availability copy. This limitation is separate from successful financial and HTTPS checks.

## Safety confirmation

- Receivables semantics changed: **no**.
- September certified values changed: **no**; September certification overwritten: **no**.
- Historical snapshots summed: **no**; interpolated: **no**.
- October falsely represented as an October snapshot: **no**.
- Customer discovery cap simply increased: **no**; all customers loaded for every KPI: **no**.
- RLS bypassed: **no**; authorization weakened: **no**. Approved SELECT grants preserve tenant and publication restrictions.
- Odoo contacted during ordinary report reads: **no**; Odoo writes: **no**.
- Timeouts increased: **no**; broad event rewrite: **no**.
- LLM runtime dependency: **no**.
- Push: **no**; merge: **no**; external deployment: **no**.

Machine-readable sanitized publication, query-plan, timing and gate evidence: `finance-historical-serving-20261008.json`. No credentials, customer identities, extracted customer vectors, raw SQL or request bodies are included.
