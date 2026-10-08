# Local staging refresh and trusted-serving benchmark — 8 October 2026 Cairo

Current checkout HEAD `526bf32`, branch `codex/production-pilot-lifecycle`, includes all four accepted operational commits. Pre-existing historical/frontend work and `.archify/` were preserved. No source code, SQL, indexes or analytics semantics changed; production Docker builds and runtime verification replace a full-suite rerun for this task. Images contain the current checkout, including its existing uncommitted dependencies, rather than a clean standalone HEAD.

## Runtime before and after

Before: **C — old image + correct published mart**. API lacked the operational adapter and migration 030, and was unhealthy. At recreation it was about 6 hours 10 minutes old; the web about 6 hours 28 minutes old.

| Service | Before image | After image |
|---|---|---|
| el-dabboos-staging-api-1 | `sha256:c45a7bf0a19340df596c715979843cfb37fee9d162a78f9792bdd7ad4bf0e0a4` | `sha256:ed9e6713e9d258fee220e76ebffda97a6ef6849204899fcf46d29e17657e43ec` |
| el-dabboos-staging-web-1 | `sha256:5b1a8c6f5ea6efbcd08a6aecf3c3e8def251362fdfd20e56b6505e7f6b9187c9` | `sha256:aebb593697d274fff6b0a62c5047e7b3271ca629a4c2e8ab8159e9b4a61680e7` |

After: **D — current image + correct published mart**. API and web rebuilt through `/home/hazem/.config/el-dabboos-local-staging/stack build api web`; only those services were recreated. TLS remains at `https://localhost:8443`; `/health/ready` returns 200 ready and API health is healthy. Exact operational adapter, migration 030 and compiled server SHA-256 hashes match the current checkout. No PostgreSQL services, volumes, migrations or bootstraps were run.

The existing protected runtime file already targets Docker `postgres:5432/el_dabboos_analytics_staging` and `el_dabboos_control_staging`, the same physical server as the protected host operator endpoint `127.0.0.1:55437`. The runtime role directly sees the same binding, history and trusted state. The operator file remains external and is used only for protected host probes; it is not passed wholesale to the API, which has no source, migrator, ingestor or model credentials.

- Certified binding: `el-dabboos-finance-202609-v6`.
- Trusted serving revision: `7c752b1f-f1f4-46e8-b5eb-65ad79d8dc54`.
- Historical collection: `el-dabboos-history-202510-202609-v1`, October 2025–September 2026.
- Last successful sync: `b9d983de-1530-4906-b590-9e3ea4241390`, unchanged.
- Latest successful source cutoff: `2026-10-08T00:21:08.728Z`.
- Latest affected: 202 exact cases, passed, zero mismatches.
- Latest daily: 248 exact cases, passed, zero mismatches.
- Pending rejected candidate: none.
- Freshness at final capture: 1552 seconds against 600-second target. No sync was run to make the benchmark appear fresher.

The visible report source timestamp belongs to the immutable last changed serving revision (October 7 at 23:03 UTC); successful zero-change polls update operational freshness without rewriting that revision.

## Authenticated HTTPS timings

Seconds, first / warm. The first sample uses an already running database; no cache flush or cold-cache claim. Nginx HTTP request elapsed time includes proxy/API/body transfer but not DNS/TLS handshake. Upstream API elapsed times agree within approximately 1 ms; individual SQL timings were not instrumented in live requests.

| Report | September | Six months | Twelve months |
|---|---:|---:|---:|
| Executive | 0.066 / 0.067 | 0.125 / 0.095 | 0.187 / 0.141 |
| Business Line | 0.422 / 0.345 | 0.453 / 0.451 | 0.566 / 0.547 |
| Salesperson | 0.673 / 0.651 | 2.321 / 2.240 | 4.749 / 4.770 |
| Invoice & Refund | 0.528 / 0.531 | 1.603 / 1.633 | 3.592 / 3.563 |
| Receivables | 9.527 / 9.011 | Blocked: HTTP 403 | Blocked: HTTP 403 |

All five September reports return HTTP 200, correct Iraq tenant/dates, no displayed failed series/partial warnings. The four event reports also pass six and twelve months ending September 30. Templates contain 6, 10, 10, 12 and 18 series respectively. DOM row counts and response sizes are recorded separately in JSON; table counts include collapsed chart summaries. September Receivables returns all 2,217 customer rows.

Executive September anchors: net invoice **1,447,166,500**, posted **1,465,712,000**, refunds **18,545,500**, order revenue **1,461,335,500**, count **2,895**. Six-month net invoice is **8,443,871,500** and twelve-month is **17,453,365,250**, demonstrating real range selection rather than a fixed September response. Dedicated Historical Executive Trend passes all three ranges, with 4/24/48 monthly table rows across four widgets. Browser refresh was also exercised.

Receivable summary is exactly **1,359,461,092.61 IQD**, as of September 30, for all three ranges in the supplemental runtime query check. The UI formats the headline to whole IQD. The **complete** Receivables report includes a pinned September-only customer snapshot; six/twelve month selections correctly fail capability authorization with HTTP 403. They are blocked, not N/A: snapshot semantics themselves are valid, but this full report lacks the published scope. No warm repeat was made after a deterministic rejection.

Compared with the supplied approximate September baseline: Executive 5.11 → 0.067 seconds (98.7% faster); Business Line 9 → 0.345 (96.2%); Salesperson 9 → 0.651 (92.8%); Invoice & Refund 12 → 0.531 (95.6%); Receivables 12 → 9.011 (24.9%). These are comparisons with prior approximate timings, not controlled before/after experiments or pass/fail thresholds.

## Architecture evidence

- Dashboard reads trigger source sync = **no**.
- Dashboard reads trigger reconciliation = **no**.
- Dashboard reads rebuild certification = **no**.
- Dashboard reads use trusted serving = **yes**, with categorical Finance remaining on its separately certified original anchor.

Before/after tenant-scoped fingerprints match for 11 operation runs, 734 exact cases, 8 technical failures, cursor, trusted pointer, 25 stored proof results, September binding, historical binding and 24 historical members. Runtime is a dedicated read-only/RLS role, source/writer secrets are absent, API composes `TrustedAnalyticsRepository`, and cached-proof-only anchor transactions fail closed rather than rebuilding a missing proof. No source or job routes were invoked. Cursor positions and cutoff are unchanged after opening reports, changing dates and refreshing the browser.

## Three measured bottlenecks, no optimization performed

1. **Categorical slot fan-out.** Twelve-month salesperson order revenue runs a correlated aggregate 64 times across 13 partition references. EXPLAIN: 987.122 ms, 286,470 shared hits, aggregate-base index scan 832 loops, 2,497 rows discarded per scan on average. This accounts for much of the 4.77-second twelve-month Salesperson request.
2. **Legacy Finance membership/RLS joins.** Full customer snapshot reads still use original fact/extraction/batch evidence with cached positive proofs. Representative net-aged and overdue-percentage statement plans take 367.949/423.691 ms, 95,203/114,500 shared hits, 2,217/4,434 membership probes and approximately 1,477/1,568 temporary read blocks. Complete repository shapes take 2.64/2.62 seconds; multiple Finance series make the report about nine seconds. This is stored-evidence access, not new source reconciliation or certification generation.
3. **Whole-coverage dimension discovery.** Customer filter discovery scans the current full event coverage and exceeds the configured 3,000-group bound. HTTPS returns 500 in 0.98–1.46 seconds. A bounded read-only probe returns 3,001 IDs; EXPLAIN takes 580.249 ms and 11,463 shared hits. No IDs are included in this evidence.

The default full range through October additionally produces four Executive numeric-output failures; the requested complete ranges ending September pass. Numeric conversion boundaries were not relaxed. This and the blocked complete Finance history are correctness/scope follow-ups, separate from the three measured query bottlenecks.

**Recommendation:** stale images explained the broken readiness and inactive operational path. The refreshed event reports are substantially faster. Remaining Finance latency and longer categorical ranges belong to the current query path and need focused optimization, alongside explicit handling of the discovered scope/numeric/discovery boundaries. Configuration already selected the correct published mart.

## Safety and cleanup

Temporary safe TLS timing logging was removed by restoring the original protected web mount. API remains rebuilt and healthy; HTTPS readiness passes after restoration. No repository source change or full test-suite rerun; no secrets copied into the checkout or images. This report and sanitized JSON are new uncommitted evidence artifacts. No Odoo writes, mart/history wipe, certification overwrite, credentials printed/committed, production deployment, online staging, external CD, push or merge.

[Sanitized measurements, plans, status and fingerprints](local-staging-trusted-serving-benchmark-20261008.json).
