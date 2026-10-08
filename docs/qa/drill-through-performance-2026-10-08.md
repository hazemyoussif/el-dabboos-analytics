# Real event drill-through performance — 8 October 2026

## Scope and diagnosis

Measured the existing authenticated local staging mart at `https://localhost:8443`. No Odoo/Teleport/source connection, refresh-transport change, UI redesign, export, cache or elevated runtime identity was introduced. Existing unrelated working-tree changes are preserved. No push or merge.

The September Net Invoiced Revenue baseline took **17,950ms** in the repository, split across totals **9,032ms** and page **8,900ms**. Read-only `EXPLAIN (ANALYZE,BUFFERS)` under the dedicated runtime role confirmed each statement visited all **13** published months and performed **178,249** revision probes to obtain **3,010** eligible records. Each touched approximately **1.9 million shared buffer hits plus 61,800 reads**. Explicit month bounds alone reduced the scan to 15,030 facts; JIT still cost roughly 1,000ms per bounded query. An initial indexed/shared-scan version reduced September to about 250ms but left annual requests around six seconds because the planner still drove them from all published facts.

## Final implementation

- Migration **037** stores generated `measure_id` and canonical ISO `business_date` projections from the immutable payload, with a tenant/measure/date/fact/revision index. Existing migrations and all policies/grants are unchanged.
- The query starts from the indexed revision range. A pinned-release monthly partition array is initialized once; correlated membership probes use `OFFSET 0` to retain the measured revision-first plan. Every read still passes forced tenant/trusted RLS.
- One materialized eligible projection serves exact full-context supporting bases and the ordered `limit+1` page. Search/cursors apply only to page rows. There is no COUNT query or row cache.
- JIT is disabled transaction-locally; repeatable-read, the original 15-second statement deadline, fresh capability/metric authorization, release/source-cutoff checks and encrypted context-bound cursors remain intact. Decimal/ratio/null behavior and Finance snapshot semantics remain unchanged.

## Deployment and persistence

Applied **037 only** with the protected local staging migrator, then ran `ANALYZE mart.analytics_fact_revisions` and recreated the production API. The web image and auth configuration were retained. Migration checksums/runtime roles/readiness were verified using protected configuration.

Before/after trusted-manifest and source-cursor digests matched. Counts were unchanged: 178,515 immutable revisions; 178,249 partition memberships; 13 event partitions and exact drill-readiness records; 171,647 daily aggregate rows; 25,813 Finance customer vectors; 12 Finance publications. Forced RLS remains enabled. No PostgreSQL volume, history, certification, publication, source cursor or external database was recreated or modified.

## Verification

Forty targeted PostgreSQL tests passed across the migration, operational serving, Finance serving, security and pre-migration serving-scope fixtures after updating ledger-version fixtures. The final revision-first change additionally passed all five selected event/ratio/Finance drill and migration-backfill tests. No skips in these executed selections. Four API/web tests passed for authorization, strict shape, series/date/filter context and bilingual detail contracts. Lint, typecheck, architecture, quality and diff gates passed; the production API build used the frozen lockfile.

Synthetic fixtures check every admitted event family, signed October refunds, partial dates, annual totals, supporting operands, paging/ties, no-match search retaining context totals, tenant/policy denial, unpublished revisions, stale release/source cutoffs and Finance snapshot paging. Migration tests cover populated backfill, generated-column agreement, checksum rejection, rollback, rerun and concurrent runners. Manual observations and timings below are separate from synthetic coverage.

## Final real staging timings

Three sequential repository samples, using the dedicated runtime role and the retained real mart:

| Request | Milliseconds | Correctness |
| --- | --- | --- |
| September Net Invoiced Revenue | 284, 242, 241 | 50 rows; exact summary total |
| Full available annual period | 3,089, 3,174, 3,016 | 50 rows; exact summary total |
| Annual salesperson | 1,237, 1,218, 1,169 | 50 rows; exact scoped summary total |
| September customer | 95, 92, 95 | 2 rows; exact scoped summary total |
| September continuation | 263 | 50 rows; unchanged supporting bases |
| September no-match search | 242 | zero rows; full-context total unchanged |
| September contribution ascending | 278 | monotonic signed contributions |

The September median is **242ms versus the measured 17,950ms baseline**, approximately **98.7% lower**. Baseline and final readings are local sequential observations; cache and request-path overhead are not experimentally isolated. The final API image is `53313a9f5d26`; the retained web is `5080d01ab9b5`. The final runtime passed manifest/checksum verification and the dedicated role check; `/health/ready` returned 200.

Authenticated EN and AR/RTL executive KPI detail requests returned 200, displayed 50 business rows without errors and retained the originating date period. Source remained unavailable throughout. Database timing samples exclude browser rendering; Sanitized API logs recorded **3,095ms EN** and **3,099ms AR**, both HTTP 200 for the full annual KPI context.

## Limits

Timings are sequential local observations on this mart, not production p95, controlled cold-cache comparisons or sustained concurrent-load guarantees. Full-context bases still require reading all eligible revisions; broader ranges and concurrent users remain workload-dependent. Larger-scale capacity testing is separate. Finance remains customer-snapshot detail, without fabricated accounting lines.
