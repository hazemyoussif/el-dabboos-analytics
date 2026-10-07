# Local HTTPS analytics runtime incident — 7 October 2026

Scope: restore the existing five reports at `https://localhost:8443`. No new reports/metrics, source extraction, customer publication, visual QA, push or merge. The pre-existing Odoo working changes and `.archify/` were preserved. Branch: `codex/production-pilot-lifecycle`; incident base: `db7eeca3f7fd3b671de6c3a64ef5b472f9306f82`.

## Measured failure

The authorized diagnostic reused only the intended local administrator's existing unexpired session. Token and cookie-signing secret stayed in memory; output retained HTTP statuses, timings, counts and aggregate values only. Requests used the real CA-verified HTTPS path and the same template-instantiation endpoints as the web client.

Executive returned HTTP 504 after 60.013 seconds, 167 bytes of `text/html`. Nginx logged `upstream timed out ... while reading response header from upstream`, with request/upstream timing 60.011 seconds. The production-built HTTPS configuration had no `proxy_read_timeout` override; observed timeout was 60 seconds. No timeout was raised, including for diagnostics. The web client calls `response.json()` before HTTP error handling, so this HTML response produces a JSON parse error surfaced by `useWorkspace` instead of analytics results. No visual/browser QA is claimed.

The API continued SQL work after the proxy disconnected. Its final observed SQL transaction completed at 73.282 seconds; a successful end-to-end baseline response cannot be claimed after the client received 504. Maximum observed pool wait was 0 ms. All observed statements completed without a PostgreSQL error; slowest statement was 9.364 seconds. This failure was the proxy read timeout, caused by accumulated SQL work, not a 15-second statement timeout or measured pool starvation. Fastify config does not set an API request timeout; its default requestTimeout is disabled.

Prior delivery's isolated repository executions (not HTTPS acceptance) were Executive 62.743s, Business Line 135.297s, Salesperson 128.673s, Invoice/Refund 175.218s, Receivables 217.640s. During incident intermediate checks, Invoice/Refund and Receivables still returned HTTPS 504 at 60 seconds after the initial index/set changes; those changes alone were insufficient.

## Executive baseline timeline

Times are from request receipt; SQL timings overlap between two series jobs and must not be summed into wall time.

| Phase | Time / observation |
| --- | --- |
| Request received | 0 ms |
| Authentication, readiness and binding checks | approximately 0–1.19s; pool acquisition 0 ms |
| Publication coverage | 1.189–1.928s |
| Derived proof query 1 | 1.928–5.973s |
| Derived proof query 2 | 5.972–10.692s |
| Derived proof query 3 | 10.692–12.725s |
| Six unique metric jobs | two concurrent jobs; fact aggregates, data-through and freshness queries continue to 73.281s |
| Proxy response | 504 at 60.011s, while API still working |
| Slowest aggregate | query ordinal 119: 52.804–62.168s, 9.364s |
| Final data-through query | 62.167–71.139s, 8.972s |
| Final freshness / output proof / commit | 71.139–73.282s |
| Serialization / successful baseline response | not observable after proxy disconnect |

Aggregate statement time across jobs: fact queries 49.933s; separate data-through scans 48.124s; derived proofs 12.677s; freshness 7.503s; mapping/RLS checks 4.691s; publication coverage 1.485s. These totals overlap. Executor already deduplicates identical normalized queries across widgets and runs a bounded concurrency of two; series are not strictly sequential. SQL inside each metric transaction and the initial three publication-proof calls are sequential. Concurrency was not increased.

## Root cause and fix

Ordinary requests repeatedly recomputed certification exact sets, including 18,054 technical cases. Restrictive policies repeat technical/business proof checks on canonical-view dependencies. The completed-revision RLS probe also lacked an index on `(tenant,dataset,fact_key,source_revision)`. Baseline EXPLAIN ANALYZE for a single net-invoice sum took 7.882s: 37,190 eligible revision lookups, 3,010 correlated completion probes using the batch-identity primary key, and repeated proof-function scans. A representative canonical sum fell to 0.639s after access-path and verified-result changes.

Migrations 019–020 add the completed-revision covering index and equivalent set-based technical proof / business case-order fast path. Migrations 021–023 reuse verified positive technical/derived results with private tenant RLS, offline full-proof refresh, transactional dependency invalidation, full-proof fallback and low-overhead statement invalidation. Both intended local marts were migrated; the existing IQ Finance release has one verified technical result and eight derived results. No financial/evidence/approval/binding row was rewritten.

A single KPI/period previously used a parameterized lateral aggregate scan even when it had only one slot. `query-aggregate.ts` now executes a direct aggregate for that case, preserving snapshot selection before policy filtering, null/zero behavior, ratios, distinct counts and comparison ranges. Multi-slot and grouped aggregation semantics remain covered by repository parity tests.

Normal request-path full certification proofs can safely be avoided only while their dependencies are unchanged. [ADR 034](../architecture/adr/034-verified-certification-results.md) describes the invalidation and concurrency boundary. Any input write removes reuse; an unexpected zero-value fact still revokes derived publication under the original exact proof. Existing live business certification, tenant isolation, restrictive RLS, immutable approval and serving bindings remain required. The default 15-second per-statement deadline is unchanged.

## Acceptance and limits

The following final run used the normal production local configuration after removing diagnostic preloads and Nginx access logging. A preceding independent quiet run also passed all five reports in 5.276–13.411 seconds. No broader performance wave was started.

| Report | Prior isolated execution (not HTTPS) | Final HTTPS end-to-end | HTTP | Succeeded / failed series |
| --- | --- | --- | --- | --- |
| Executive | 62.743s | 5.277s | 200 | 6 / 0 |
| Business Line | 135.297s | 9.487s | 200 | 10 / 0 |
| Salesperson | 128.673s | 9.469s | 200 | 10 / 0 |
| Invoice & Refund Operations | 175.218s | 12.249s | 200 | 12 / 0 |
| Receivables & Aging | 217.640s | 13.192s | 200 | 18 / 0 |


Final traced Executive request: receipt 0ms; publication coverage ends 318ms; three reused derived checks end 321ms; first two aggregates 430–967ms; their metadata ends 1,491ms; next two aggregates 1,563–2,039ms and metadata ends 2,555ms; final two jobs end 5,274ms; response finishes 5,275ms; HTTPS client completes 5,276ms. Last SQL-to-response interval was 1ms, encompassing final computation/serialization/send; it is not a separately instrumented serializer CPU measurement. Receivables finished API work at 13,383ms and client receipt at 13,411ms (2,498,155 bytes). Across all five traced final requests, maximum pool wait was 6ms, no SQL failed and the slowest SQL was Invoice Operations' data-through scan at 1,287ms. API versus HTTPS timings are consistent with negligible proxy overhead. Reused derived proof calls were 0–1ms rather than seconds.

The restored API and PostgreSQL are healthy; the web root and readiness paths return 200. Nginx has its original `access_log off` and unchanged proxy behavior. Diagnostic preload/mounts are removed. The API confirms `MART_STATEMENT_TIMEOUT_MS=15000` and `ANALYTICS_EXECUTION_CONCURRENCY=2`. Temporary diagnostics were not committed. Authentication/session state was reused, not created or changed.

## Exact acceptance values

Values below are IQD where monetary. Business Line and Salesperson grouped totals match the Executive additive headlines; their weighted average uses certified revenue/count rather than summing displayed averages. Each report had zero failed series.

| Metric | Exact current headline |
| --- | --- |
| `net_invoiced_revenue` | 1447166500 |
| `invoiced_revenue` | 1465712000 |
| `refund_value` | 18545500 |
| `order_revenue` | 1461335500 |
| `order_count` | 2895 |
| `average_confirmed_order_value` | 504779.1018998273 |
| `invoice_count` | 2890 |
| `refund_count` | 120 |
| `average_invoice_value` | 507166.78200692043 |
| `net_aged_receivable` | 1359461092.61 |
| `aged_at_date` | 759020481.15 |
| `aged_1_30` | 218464001.82 |
| `aged_31_60` | 69135500.55 |
| `aged_61_90` | 25871000.18 |
| `aged_91_120` | 33782500.14 |
| `aged_over_120` | 253187608.77 |
| `total_overdue_receivable` | 600440611.46 |
| `overdue_receivable_percentage` | 44.167546590629314 |
| `gross_open_receivable_components` | 1532751636.39 |
| `credit_balances` | -173290543.78 |

Customer Aging retains exactly 2,217 result rows and 2,217 unambiguous labels. Grouped sums for the seven displayed receivable measures reconcile to the headline amounts at cent precision. Net / total overdue / overdue percentage remain 1,359,461,092.61 / 600,440,611.46 / 44.167546590629314%; credits remain negative at -173,290,543.78.

## Verification and handoff

Frozen install, lint, architecture, baseline-aware quality, typecheck, unit suite (651 passed), complete isolated PostgreSQL suite (131 passed), API/web production build and diff gate passed. Targeted single-slot repository regressions passed 81 tests; cached/full proof equivalence, runtime privilege denial, invalidation after a zero-value appended fact, privileged truncation invalidation and coherent concurrent repeatable-read behavior passed. The final additional MVCC assertions passed in both derived-certification tests. Tests use disposable synthetic foundation databases and never load developer configuration. Live HTTPS acceptance is separate manual operational evidence.

Known build warning: existing web bundle exceeds Vite's chunk-size advisory. No new UI changes or visual QA. Retrieval is now reliable at 5.3–13.2 seconds; broader latency optimization remains paused. Offline input changes invalidate reusable results and return to full proof work until an authorized offline refresh; this is deliberate fail-closed behavior, not an automatic runtime recertification service. CI was not dispatched because no push was requested. No push or merge occurred. Final commit is the local commit containing this report; report its SHA in the task handoff rather than embedding a self-referential SHA here.
