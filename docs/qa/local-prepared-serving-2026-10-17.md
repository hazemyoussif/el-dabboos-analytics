# Local prepared-serving candidate — 17 October 2026

Scope: user explicitly requested building/testing the new approach on laptop staging first, using existing local coverage. The user explicitly approved additive migration 053, local API/web restart, preparation and verification; prepared dashboard reads remain inactive until verification passes. Company staging and Odoo remain unchanged.

Images:
- API: `el-dabboos-api:prepared-local-20261017-c7375884c6de`, manifest `sha256:627387f81d80cc3a6c07491dd6a152830d14537d596b667e3b8094be0059a256`.
- Web: `el-dabboos-web:prepared-local-20261017-c7375884c6de`, manifest `sha256:31ae2eeff77ae6f7ed1b1a8a68960dbb56341b19aa6fb8ee74f9db60f3d7d3f2`.
- Uncommitted candidate fingerprint: `c7375884c6dea3d96babb1b9fab0732a93d5fac2d34c1b86e7158326c87732ad`; base commit `1c479727dc2857e3552a8f4da818ffd111f90239`. UI uses the supported `development` build label; these are not published commit artifacts.
- Offline image imports succeeded without a network or credentials.
- Migration 053 image checksum: `e25b6ed94700fe25d920fb6efde20a6b5120359ac7bdd71638cd3502679a392e`.

Backups: `/home/hazem/.config/el-dabboos-local-staging/backups/prepared-20261017T054208Z-complete`. Full dumps, format checks and SHA-256 checksums; mode 0600 in mode-0700 directory. The initial analytics dump through the non-superuser owner was refused by forced RLS, so complete backups used the existing local PostgreSQL administrator in a read-only session. No policies or credentials were changed to obtain a backup. Format checking is not a completed restore rehearsal.

Migration 053 and scoped role grants applied only to laptop staging using the existing protected operator, under the shared maintenance lock. Both candidate containers became healthy and HTTPS readiness returned 200. Exact before/after equality confirmed the baseline, trusted manifest and original tenant-visible data counts were preserved.

Frozen local revision: `3b5f517c-a1a4-4eda-9da3-45c975d3b03e`; 28 members, manifest fingerprint `08bef338b8186543885f35cda8f0dc30`.
Coverage: facts 13 months (October 2025–October 2026); exact customer Finance 12 month ends (October 2025–September 2026); review September 2026; business September/October 2026. This is not the full company-history dataset beginning June 2024.

Preparation preflight found 43 required chunks: business 4, facts 25, receivables 12, review 2. The protected ingestor prepares the fixed publication with one-million-cell per-chunk bounds and a 43-chunk bound, under tenant and host locks. The local runner monitors a 12-GiB free-disk reserve and 30-minute overall bound; current chunk rollback and completed-chunk resume remain the existing operator behavior. No application request deadlines were increased. The container receives `ENVIRONMENT=staging` explicitly, as the existing governed job runner does; protected files remain unchanged.

Preparation stopped after 386 seconds in the first chunk: the exact-cell comparison inside `guard_prepared_binding` line 24 exceeded the unchanged 120-second statement deadline. The transaction rolled back; zero prepared bindings were accepted. No completion seal, complete real-data comparison, prepared serving activation, company-scale claim or browser performance acceptance is implied. The earlier compatibility and per-family source-freshness gates remain open.

The existing laptop Odoo relay returned `ECONNREFUSED` on one bounded read-only identity/query check. No fallback connection, SSH/tunnel ownership change, source permission change, credential edit, source writes, CI, push, merge, company migration or company deployment occurred. The user selected refreshing existing local coverage first after the relay is restored; the current preparation uses the unchanged accepted local publication.

Operational evidence files are under `/tmp/el-dabboos-prepared-local-*`; the temporary local compose launcher and preparation monitor are not committed product code.

## Forward proof candidate — locally applied with explicit approval

Migration 053 checksum remains unchanged. Migration 054 replaces the duplicated wide `EXCEPT ALL` comparisons with a shared unique-key/content/cardinality proof: all canonical keys must match one stored cell, every numeric/extrema/date/dimension/label/conflict field must compare exactly, and stored count must equal canonical count to reject extra rows. Both sides have unique canonical keys; dimensions are compared as well as their hash. No digest substitutes for cell content, and no independent source control, permission, immutable-history guard or deadline is removed.

Fifteen targeted disposable PostgreSQL tests passed, including exact equivalence with the previous multiset comparison for valid/missing/extra cells and changes in dimensions, value, count, minimum, maximum, data-through date, labels and conflicting labels. Existing prepared family parity, independent controls, migration replay and runtime-denial tests also pass. These tests do not establish local real-data preparation performance. The user subsequently explicitly approved local migration 054, the candidate restart and the 43-chunk preparation retry. Migration 054 applied successfully and both local services passed readiness; exact original-data/manifest fingerprints remained unchanged. The retry ran with the original statement deadlines and prepared reads inactive. It stopped after 414 seconds in `mart.guard_prepared_binding` line 24, calling the new `mart.prepared_cells_exact` proof, at the unchanged 120-second statement deadline. The forward proof candidate therefore does not resolve the real-data preparation bottleneck. No further preparation retry or schema change follows from this result. Company deployment remains unauthorized.

The local retry uses API/web tags `prepared-local-20261017-74dca392d04f`, source fingerprint `74dca392d04f81f1a582a42005cd802ff49b35583594a704d80c2e6f4efed754` and immutable migration-054 checksum `dd55e52f55d77b0fd3b5815fe8904fea35e11969dafeafe376bd798397944054`. Logs are `/tmp/el-dabboos-proof-local-preparation{,-monitor}.log`; the earlier failed preparation logs remain preserved separately.

## Migration-054 retry result

The first chunk transaction rolled back completely. Administrator read-only counts confirmed zero prepared datasets, cells, bindings, seals and activations, with migration head 54. Exact before/after comparison again confirmed the original baseline, source-family counts and trusted manifest were unchanged. Both API/web containers remained healthy; local HTTPS readiness returned 200. Minimum free disk was 28,764,000,256 bytes, above the 12-GiB reserve. Sanitized PostgreSQL evidence recorded one statement timeout, no source-control mismatch and no disk-full error; the failure stack referenced the new exact proof rather than the previous multiset proof. This does not prove that every data-control check would pass after the timeout is resolved.

No prepared report performance measurements or shadow comparisons were run because no validated prepared publication exists. The helper `/tmp/el-dabboos-local-prepared-report-check.mjs` is unexecuted verification tooling, not QA evidence. The current local reader remains the installed reader. Company staging, Odoo, credentials, request/statement limits and GitHub CI remain unchanged. Further proof-performance work must establish the actual execution bottleneck before proposing another persistent change; migrations 053 and 054 remain immutable.


## Controlled workspace implementation — local integration in progress

The user explicitly requested a working laptop staging using prepared data. Additive migration 055 is now applied locally; the two `prepared-workspace-20261017-85791b88b29a` images are healthy. Full protected analytics/control backups were taken before migration, with archive inventories and checksums verified. No restore rehearsal is claimed for these new archives.

The materializer now freezes each chunk once in owner-controlled transaction-private tables. It generates the cells once, validates each governed grain against an independent canonical expansion with analyzed/indexed intermediates, then persists only validated immutable cells. The binding guard compares every persisted cell with that validated population and retains independent accepted source controls. Private tables drop at chunk commit; persistent bindings provide resumability between chunks. The ingestion login still has no general TEMP privilege, and runtime has no execute access to the build functions.

Verification before integration: 934 unit/API/web/engineering tests and 331 PostgreSQL tests passed; lint, architecture, quality, types, production build and diff checks passed. An isolated 100,000-item synthetic scale check prepared in 5.91 seconds and read in 16.8–33.2 ms. This is synthetic evidence, not company-scale acceptance. All 12 existing local legacy Finance cutoffs have exact customer snapshots; none are legacy-only. Facts label conflict and fallback audits found zero discrepancies on this frozen local publication.

The preparation CLI requires `ENVIRONMENT=staging` when using the protected container alias `postgres`; this selector is passed to the operator invocation without changing protected files. The first invocation omitted it and stopped before preparing data. Preparation is running on the same fixed accepted revision. Activation, real-data report comparisons and browser acceptance are still pending; no Odoo refresh or company deployment has occurred.


## Completed local prepared cutover

Migration 055 checksum: `76c852ddbe376a63f2ccf85795b338c3da07a76d48d319c9c801b74e7cf26d76`. Previously applied 053/054 files remain byte-for-byte unchanged. All 43 required chunks committed (business 4, facts 25, receivables 12, review 2), totaling 1,833,541 prepared cells. The exact required/present membership check sealed revision `3b5f517c-a1a4-4eda-9da3-45c975d3b03e`. Explicit local activation succeeded; runtime status now has 43 bindings, one seal and one activation. Both images remain the candidate tags documented above; API readiness is 200.

The pre/post accepted baseline, original record counts and 28-member manifest fingerprint are exactly equal. No source refresh was performed. The existing accepted source cutoffs and Finance-review-pending labels remain visible; the source-unavailable/freshness warning is retained. This is the selected existing local coverage, not company history beginning June 2024.

### Real-data correctness and latency

All 27 available templates executed using the governed template projection and one fixed publication. Nineteen other catalog templates are not supported by this local published dataset; preparation does not invent coverage. Every widget/series succeeded and all results were pinned to the same revision. All existing per-series metadata matched the original reader (execution timestamps excluded).

Twenty-two reports were byte-exact in values and aligned rows. Five reports had only summary-number differences: Customer Cash Collections, Customer Debt & Aging, Executive Monthly Overview, Customer ABC Detail and Book Liquidity & Payable Due Coverage. Customer identities, row membership, ordering, aligned non-value fields and metadata were unchanged. The maximum monetary difference was 0.00000762939453125 IQD. The existing review summary path converts each operand to JavaScript Number and reduces with ordinary floating-point addition; the prepared SQL reduces exact numeric operands before the final safe-number conversion. Rather than accepting a tolerance, a separate read-only check compared all 11 affected metric/cutoff combinations to independently accepted snapshot source controls (including both ratio operands). All 11 prepared results matched exactly, with zero failed controls. This explicitly explains the legacy comparison differences; it is not a claim of 27 byte-exact legacy comparisons.

A subsequent execution-only pass through the actually activated PublishedAnalyticsRepository used the application concurrency of eight: 27 reports, zero failed widgets or series, all pinned. Backend executor latency was 23–1,098 ms (median 118 ms). These are sequential report runs on the local accepted data, not browser/network latency, a cold-cache SLA, a multi-user load test or company-scale evidence. Raw execution-only measurements have no baseline comparison; the separately recorded pre-activation pass provides the comparison evidence.

| Report | Widgets | Activated backend execution (ms) |
| --- | ---: | ---: |
| executive-sales-invoicing | 7 | 142 |
| business-line-performance | 3 | 128 |
| salesperson-performance | 3 | 163 |
| customer-performance | 3 | 402 |
| invoice-refund-operations | 9 | 157 |
| receivables-aging | 13 | 132 |
| customer-cash-collections | 10 | 196 |
| confirmed-order-margin | 6 | 118 |
| product-invoice-performance | 4 | 89 |
| customer-debt-aging | 8 | 273 |
| executive-monthly-overview | 9 | 114 |
| source-sales-collections-history | 4 | 53 |
| customer-positive-sales-pareto | 7 | 77 |
| governorate-sales-abc | 8 | 739 |
| customer-abc-detail | 6 | 215 |
| product-brand-positive-sales-pareto | 8 | 1098 |
| observed-customer-movement | 8 | 180 |
| current-stock-expiry | 5 | 73 |
| physical-returns-transfers | 5 | 110 |
| current-unbilled-order-exceptions | 4 | 419 |
| book-liquidity-due-coverage | 9 | 65 |
| historical-executive-trend | 4 | 29 |
| sales-invoicing-trend | 1 | 23 |
| business-line-trend | 2 | 25 |
| salesperson-historical-analysis | 2 | 43 |
| customer-historical-analysis | 2 | 71 |
| sales-invoicing | 4 | 36 |

Prepared persistent storage after completion: 1,080 MiB table/TOAST and 709 MiB indexes, 1,789 MiB (about 1.75 GiB) total, plus under 1 MiB publication metadata. Transaction-private build storage is removed at chunk commit. About 30 GiB remained free locally. This is additive prepared storage; original accepted evidence/history remains preserved.

Manual browser evidence after activation: authenticated Receivables & Aging and Customer Cash Collections render their KPI/chart/table populations successfully; 71 metrics remain available. Collections retains Finance review pending. No company deployment, CI, push, merge, Odoo write, source access, credential edit, source-permission change or tunnel change occurred.
