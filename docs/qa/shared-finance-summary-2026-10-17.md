# Shared Finance summary reduction — 17 October 2026

Status: verified scheduling/shared-summary checkpoint; not published, merged or deployed. The evidence below belongs to that checkpoint. The later [publication-consistency extension](pinned-publication-2026-10-17.md) has separate verification and must not inherit this company proof. Dashboard performance targets remain unmet.

## Scope and architecture

Build 270 independently selects and reduces the same Finance snapshot population for each summary metric. The Receivables & Aging report makes eleven such summary reductions. This candidate reduces the governed ten-component aging vector once for compatible requests within one dashboard execution, then projects individual metrics and ratio operands from it. It applies to that data family across reports; no report identifier or environment-specific identity appears in the implementation.

The domain port optionally creates a fresh execution-scoped adapter. The application still owns bounded scheduling and identical-query deduplication. The data adapter owns vector selection/reduction. SQL still selects eligible snapshot dates with the existing customer-versus-summary priority, and applies customer/policy filters. The vector remains exact decimal text until the existing per-metric numeric safety boundary. Ratios use catalog operands and preserve zero-denominator nulls; snapshots are never summed across dates.

Every query revalidates membership-independent analytics context, metric and published capabilities through existing boundaries. Operand reuse is not an authorization mechanism. Its identity includes the transaction-observed trusted revision, tenant/locale/enforced policy, selected cutoff slots, effective customer filter parameters, grouping shape and configured result bound. Publication changes produce fresh reads. Failed or unsafe independent metrics do not poison safe vector components. Scopes and cached promises do not outlive one executor call; there is no persistent/global result cache.

No source connection, schema/index migration, permissions, timer, serving activation, data import or credential change is required. Finance customer detail and review/business paths are unchanged by the vector reduction. The candidate also includes the separately verified shared scheduling change; its benefit must not be attributed to vector sharing.

## Evidence so far

- Focused tests: 24 passed, zero failed/cancelled/skipped. They cover fresh adapter lifetimes, one reduction for ten compatible metrics, exact output/provenance, policy isolation, missing/empty results, distinct cutoff/group shapes, changed publications and unsafe independent operands. Broader checks are pending; focused counts overlap them.
- Frozen installation, architecture/quality/lint/typecheck, API/web builds and the diff gate passed. The web build retains its existing large-chunk warning. The full unit/API/web/engineering suite passed 922 tests and the disposable synthetic PostgreSQL suite passed 315 tests, both with zero failures/cancellations/skips. The PostgreSQL suite completed in 653,581 ms. No developer env files, Odoo service or company fixtures were used by the automated tests.
- First quiet laptop comparison against installed build 270: Receivables & Aging 10,256 → 3,756 ms; summary reductions 11 → 1, repository calls 19 in both, peak eight in both. Values and full result metadata excluding execution timestamps matched; trusted revision was unchanged.
- Customer Debt & Aging 8,524 → 2,602 ms in that comparison, with zero Finance summary reductions in either mode. That report uses another data family; this sample reflects scheduling and run conditions, not a benefit from the new Finance reduction.
- A subsequent attempt to isolate vector sharing overlapped the full local test suites and showed resource contention, including slower unchanged review reads and seven installed-reader timeouts. Its result hashes are not comparable because the baseline failed. It is not accepted as an isolated timing or parity comparison. The uncontended company comparison below establishes the marginal effect without another laptop repetition.

These are executor samples on a smaller laptop dataset, not company measurements, browser-load p95 or concurrent-user guarantees. The three-second everyday dashboard target is not established.

## Company read-only comparison

Operator timestamp: `2026-10-16T21:21:13Z`, as reported by the company host. Installed image: `el-dabboos-api:1c479727dc2857e3552a8f4da818ffd111f90239`. The probe verified `el_dabboos_analytics_staging`, `read_only=on`, pool size eight and the unchanged 15-second statement bound. Candidate modules ran in memory; no company files/data/schema/services/settings changed and Odoo was not contacted.

| Report | Installed | Scheduling only | Scheduling + shared vector | Summary reductions |
| --- | ---: | ---: | ---: | --- |
| Customer Debt & Aging, September 2026 | 24,268 ms | 19,011 ms | 18,139 ms | 0 in all modes |
| Receivables & Aging, Jan 1–Oct 16, 2026 | 18,542 ms | 16,082 ms | 7,327 ms | 11 → 11 → 1 |

Every mode returned the same values and full result metadata excluding execution timestamps. All eight/twenty debt widgets/series and thirteen/nineteen aging widgets/series succeeded. Repository calls stayed 16 and 19; peak active logical reads stayed eight. Trusted revision was unchanged. Debt ran installed → scheduled → candidate; aging used reverse order. These are individual executor samples, not load-test percentiles.

Receivables elapsed time fell 60.5% against installed and 54.4% against scheduling alone in this sample. The 0.872-second debt difference between scheduled and candidate is not attributed to vector sharing: that report performs zero Finance summary reductions. Both reports remain above the proposed dashboard targets; browser time adds further stages.

| Report | Value SHA-256 | Full result SHA-256 |
| --- | --- | --- |
| Debt | `b565036f13137834cc1cabe911f78475db48593c21b4b405b2473269aa1fd9da` | `4e1e8bf3758b263bc2fd47e3c39ba5e68dc5bf92ce0796e9f60e6c5afda79c92` |
| Aging | `b1057a79a7029d8ce656c56768e6294d54b96c833989498a5def357cd16015e6` | `8289c257882bf59ad2bb4dea46f3bb1fe953d51da8fb9338b300c3938e9abad7` |

Candidate source fingerprints (SHA-256 of the JSON source string, not raw-file/Git hashes):

- `query-execution.ts`: `5311ce2838e7f1d8e51fb88b40410633fd00e3de42df79cc1f1520ce41ba89d6`
- `grouped-widget-execution.ts`: `210fbbfac15fcec9740f84fbf27dd96a29d5591a4753d648092cc231661e9515`
- `executor.ts`: `21a3665c23ad8bf79cd1790d8bf37650d8697dfe470d2e35928be543f8ef5beb`
- `finance-summary.ts`: `4256411e82a73f62c69d3d733013869ddb0c70a2d28a381fd975562c9d5dc656`
- `finance-repository.ts`: `ef20879c52203a8125caa2f32c0db26836ae5fcac6ecfa0973ab188b19e6e9a4`
- `repository.ts`: `6579ce7333fcf595220238e1525875813f16d0a870de3027f2ba63140b84f42f`

## Remaining performance work and release boundary

The company probe establishes timing and exact parity for the two report selections. Broader multi-user, browser and all-report performance targets remain unproved. The candidate has not been installed in either staging environment; the company and laptop comparisons loaded it in memory. Obtain user approval before publishing; no GitHub CI run has been started. The remaining debt read path is a separate serving-family optimization and must not be represented as solved by this Finance vector. Future work should measure the remaining snapshot/detail work before choosing a query or serving-projection change; progressive widget rendering is a separate UI/API change and does not remove database cost.

Automated freshness for every dataset and Pareto presentation remain separate outstanding work.
