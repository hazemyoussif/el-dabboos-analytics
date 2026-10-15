# Grouped result execution delivery evidence — 2026-10-15

## Scope and revision

Branch: `codex/fix-grouped-result-execution`. Base and current HEAD: `0200980397222b34f73068cd121f1869b427f419`; implementation is an uncommitted local patch. No push, new CI run, merge, or deployment was performed. The original checkout and its unrelated work were preserved.

Implements the grouped-result handoff through domain read options, source-owned database projections, shared SQL selection, application widget coordination, authorized HTTP reads and shared rendering. There are no report IDs, tenant IDs, business dates, source credential changes, or larger query/time limits in production selection logic. See [ADR 038](../architecture/adr/038-grouped-result-windows.md).

## Automated verification

- Frozen dependency installation passed.
- Final lint, architecture, quality, typecheck, API build, web build and diff gates passed; architecture/quality/diff each reported zero diagnostics.
- Final complete unit/API/web/engineering suite: **910 passed, zero failed/skipped**.
- Complete PostgreSQL 18.6 suite: **298 passed, zero failed/skipped**, approximately 615 seconds. An earlier attempt encountered a stopped disposable database; only the successful complete rerun is counted.
- Subsequent targeted regression run: four PostgreSQL tests passed after the final history-provenance correction. The selector's final revision-only bound guard and malformed Pareto continuation were then verified by all three selector tests. The complete application suite above includes the final disjoint-series ordering regression.
- Database tests used an owned disposable project on localhost port 55436, synthetic fixtures and runtime RLS roles. No developer environment files, Odoo, company database or real model service was used.

Coverage includes complete traversal of 5,001 groups above a response bound of three; global contribution/Pareto/ranking/Top-N before selection; Unicode ordering; asymmetric peer series and missing cells; tenant/policy/search/locale/revision scope changes; real published operational populations above their configured bound; exact Finance calendar dates; snapshot and compatible-UOM semantics; immutable publications; and distinction between missing data and failed readiness checks.

## Local performance evidence

The final targeted multi-month fixture contains 300,000 synthetic event facts. Summary, month, year, salesperson and state queries completed together in **2,068 ms**, with at most three output rows per query. Exact totals were 0.3 across the period and 0.1 per month. Latest contributing business date remained September 20 after compaction.

Independent local EXPLAIN measurements of an equivalent aggregate were approximately **402 ms** for payload extraction and **303 ms** for typed columns in that run. These are local measurements, not a hosted latency guarantee. The full PostgreSQL run separately measured the existing 5,000-customer summary fixture at 22.8 ms, nine calls and two transferred rows.

## Manual browser evidence

Used the real web/API application with a temporary, explicitly labelled synthetic repository containing 5,125 added customer identities. This browser fixture verifies UI/API coordination; SQL correctness is covered separately by PostgreSQL tests.

- Next/previous table pages changed the visible customers from 1–100 to 101–200 and back.
- Search found `SYNTHETIC Customer 05124` beyond the initially loaded page; the result showed one row and disabled continuation.
- English and Arabic, Light and Dark, and 390/1024/1440-pixel viewports were exercised. Document width stayed within the viewport; wide tables retained native internal scrolling.
- Keyboard navigation reached result controls, Enter changed pages, and native table keyboard scrolling moved its scroll position. Mobile navigation opened and Escape dismissed it.
- Stopping only the synthetic QA API produced a recoverable paging error while preserving valid visible data. Restarting it allowed paging again.
- AFTER quality finding 1 (High, fixed): result controls could squeeze a compact table to 15 pixels. Shared control wrapping, a minimum table reading area and card overflow corrected this; measured table reading areas were at least 127 pixels on phone and 161 pixels on desktop, with controls reachable. No report-specific layout override was introduced.
- Export controls were activated without an application error, but the in-app browser did not return a download event. **Downloaded workbook contents remain manually unverified.** Dashboard export now receives displayed page results; the UI explicitly labels exports as loaded rows only.

Synthetic screenshot evidence was saved locally at `/tmp/grouped-results-qa-en-dark.jpg`. Temporary viewport overrides were reset after review.

## Security and deployment limits

Every window request validates and authorizes the full dashboard and current published capabilities. Source adapters enforce tenant/policy predicates inside read-only repeatable-read transactions. Cursor scope is not authority. Request-local deduplication does not cache across actors or executions. Canonical DashboardSpec/Patch, AI plans, Save/version behavior, Finance review state and immutable facts remain unchanged.

Migration 049 adds generated projections and an index to analytics review facts. It needs the normal stopped-application migration workflow, time to populate existing rows, and sufficient disk space. Historical payloads and trusted publication identities are retained; no source reload is required. Migrations 001–048 were not edited.

Automatic approval review rejected a larger persisted-rollup proposal because its RLS toggles, backfill and new ingestion triggers required a concrete lifecycle review. That proposal was not executed. The delivered alternative has no RLS toggle, rollup table or new ingestion trigger.

Statement/pool limits remain enforced. Browser abort prevents stale UI updates but does not establish cancellation of running SQL. Pie/treemap composition retains complete-result behavior. Streaming full-dataset export and persisted rollups are not included. The existing large web-chunk warning remains.

Next step: review/publish this patch with explicit CI-budget authorization, then use the normal manual company-staging build/migrate/restart workflow. After deployment, verify actual report windows, paging/search, download contents, migration time/disk and hosted query latency. Company staging has not been claimed fixed by this local evidence.
