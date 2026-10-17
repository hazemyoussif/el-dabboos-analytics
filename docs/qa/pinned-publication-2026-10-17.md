# Pinned-publication candidate — 17 October 2026

Status: local implementation; not committed, pushed, merged or deployed. Extends the separately verified scheduling/shared-Finance-summary checkpoint. No schema, index, RLS, source, credentials, timer or permanent data changes.

## Behavior

The trusted adapter creates one scope bound to the current shared tenant publication and effective context. Finance, review, business and legacy data selections assert that publication within their own repeatable-read read-only transactions. After all work settles, a fresh transaction verifies that the publication stayed current. If publication changed, the executor discards the complete attempt and retries once with fresh operands and the same resolved business dates. A second conflict returns a safe availability error. Ordinary per-series errors and stale-page errors keep their original behavior. Revision metadata identifies the common publication; source cutoffs, business cutoffs and metric definitions remain separate.

This preserves parallel short transactions and current-only RLS rather than locking the tenant or attempting to authorize superseded rows by revision ID. It adds small metadata reads and can repeat work once under publication churn. It is a consistency guarantee, not a claim of additional latency improvement. The shared vector's previous company measurements do not automatically verify this later candidate.

## Local evidence

- Focused consistency/scheduling/API/Finance/history tests: 32 passed, zero failures/cancellations/skips. Includes real publication between widgets, all-family transaction guards, context/policy isolation, deterministic dates across retry, full work settlement, bounded retry and safe HTTP failure. The focused run predates a final metadata simplification; complete suites cover that final code.
- Unit/API/web/engineering suite: 926 passed, zero failures/cancellations/skips.
- Lint, architecture, quality, typecheck, API/web build and diff gates passed. The existing large web chunk warning remains.
- Final complete disposable PostgreSQL suite: 316 passed, zero failures/cancellations/skips, 555,887 ms. The final review publication query was included. This supersedes the earlier failed run described below.
- The in-memory loader imported all twelve candidate modules inside exact build 270 without database/source access. The subsequent company execution and source fingerprints are recorded below.

## Release and next dependency

Company staging has no authenticated agent shell. Its operator ran the bounded in-memory comparison prepared separately. The comparison uses only the existing read-only analytics role and unchanged statement deadlines; it does not contact Odoo or modify services/data/settings. Metadata comparison enriches the installed result only with the known common revision; every other metadata field remains in the exact comparison. Timing samples are not p95 or multi-user guarantees.

No GitHub CI runs have started. User approval is required before publication or deployment. [Architecture decision](../architecture/adr/039-consistent-dashboard-publication.md). [Remaining performance and freshness work](performance-freshness-delivery-2026-10-17.md).

## Company operator result

Installed API: `el-dabboos-api:1c479727dc2857e3552a8f4da818ffd111f90239`. Intended database `el_dabboos_analytics_staging`, read-only on, pool eight, unchanged 15-second statement bound. No source access or company mutation. All twelve tested source fingerprints match the final local source, including the correction that reuses the existing review metadata query.

| Report / period | Installed | Candidate | Widgets / series | Shared Finance reductions |
| --- | ---: | ---: | --- | --- |
| Customer Debt & Aging / September 2026 | 25,087 ms | 19,635 ms | 8 / 20, all succeeded in both | 0 → 0 |
| Receivables & Aging / Jan 1–Oct 16, 2026 | 18,820 ms | 7,397 ms | 13 / 19, all succeeded in both | 11 → 1 |

Values and all existing metadata matched exactly. Metadata comparison enriches the installed results only with the known shared serving revision and excludes execution timestamps; it does not drop other provenance. Both candidate reports and all their successful series actually exposed the same verified revision. Trusted publication stayed unchanged. Candidate execution used one scope per report, peak eight logical reads, and the same 16/19 repository calls. Debt ran baseline → candidate; Finance aging used reverse order.

These single executor samples show 21.7% and 60.7% lower elapsed time against installed serving, respectively. They do not establish percentiles, concurrent-user capacity, a sub-three-second dashboard, or an isolated performance benefit from the revision guard. The earlier shared-summary checkpoint was measured at 7.327 seconds for Finance aging and 18.139 seconds for debt in a different run; do not attribute sample variation between those runs to this consistency change. Debt still makes no Finance summary reductions and is not solved by that vector.

| Report | Value hash | Existing metadata hash after explicit revision enrichment |
| --- | --- | --- |
| Debt | `b565036f13137834cc1cabe911f78475db48593c21b4b405b2473269aa1fd9da` | `99e35ac182b1d8bc120240a8461937ef833c1bc14d7a92f7441e703bc995496f` |
| Finance aging | `b1057a79a7029d8ce656c56768e6294d54b96c833989498a5def357cd16015e6` | `1dff2103be2cd0423b07d922a6ce7b0d4903b4bb5683dae5e0b6ac2ffe81f741` |

## Query-budget regression found and corrected locally

The first complete PostgreSQL run passed 315/316 tests and failed the review-read query-count bound. An unconditional extra revision query caused ten calls where the test allows nine. The revision now travels in the existing review publication/capability selection, with tenant-qualified joins and no loosened bound. The affected sequential follow-up passed all seven tests, returning nine calls, two rows and 260 bytes for 5,000 synthetic customers; the 60,000-snapshot history test reported zero index-only heap fetches. A first parallel follow-up also encountered a query-join error corrected before that successful run and a visibility-bound failure while another suite was active; it is not accepted as final evidence. The complete final PostgreSQL run subsequently passed all 316 tests with zero failures/cancellations/skips.
