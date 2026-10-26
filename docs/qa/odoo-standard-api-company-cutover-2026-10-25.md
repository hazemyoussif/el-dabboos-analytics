# Company staging standard Odoo API cutover — 25 October 2026

## Scope and implementation

The owner selected the standard Odoo 18 API without an Odoo module, approved a private input copy on the Analytics server, required every report family, and prioritized Sales Command Center and Products & Warehouses. The owner subsequently explicitly approved removal of the second complete API scan, repeated observed-mode acceptance flag and duplicate model-readability probe. Odoo still enforces read permissions; access control, tenant isolation, canonical validation and financial reconciliation remain.

The `odoo:orm import --tenant el-dabboos-iq` command captures API inputs and invokes ordinary incremental synchronization. `refresh` and `sync` invoke that same incremental path against the latest copy. The custom five-stage full-period wrapper was removed in `ab219b5`. Daily scheduling captures the API inputs, then retains the original reconciliation/sweep schedule; it does not rebuild Business/review/Finance periods. All report requests continue using prepared serving. No new report formulas, Odoo writes, saved-report changes, GitHub Actions or merge were introduced.

Code base: `2316d6677a8d4c7432a97fb7c4ea4303e8029faf`.

Deployed application: `d6da7ba29a48c1b63a757eab12e258e4eb711b3a`; running mart worker: `04676a3f5eb0e2f7d34da407803fc04bb96d3466`, preceded by `5a93b0842aef253b5f6a524e4c8930e8ae8f2882`, `c32d9ac1bb6314d2913dd64e0d452000535e75e6`, `d4198b2070f7714770efe14066e072e0ee550801` and `fa499175a49f6a605fc2f8e9b92fe8d815184dac`. Branch: `codex/odoo-standard-api`. Commits were transferred directly to company staging using Git bundles; no GitHub push or merge was performed.

[ADR 044](../architecture/adr/044-observed-odoo-api-imports.md) and the [operations guide](../integration/odoo-standard-api.md) own the source-consistency and recovery contract. `api_observed` is independent-request API evidence, not an ERP-wide MVCC snapshot. The private copy gives existing SQL recipes a repeatable local input. `sourceAsOf` is the receipt time. Source captions use the API's en_US context; other source translations are not attested.

## Company-only source evidence

The initial company capture completed successfully with all 28 selected models matching a second complete read. That initial double-read evidence remains valid; subsequent imports use the owner-approved single-read path.

- Input schema: `api_c3c80931b8424ae6828c31c2d730ca52`.
- Receipt: `2026-10-25T17:59:16.741Z`.
- Fingerprint: `56856a9701ec6ee72c694c1495740abdcf5adb2a17d4a6b846834de6a339465f`.
- Company scope: 1; currency: IQD; business timezone: Asia/Baghdad.
- Selected model counts include 70,663 orders, 858,088 order lines, 245,690 accounting moves, 1,325,414 accounting lines, 151,452 reconciliations, 987,675 stock moves and 897,084 stock movement lines.
- Copied salesperson identities exactly matched the API's company-1 membership set: 290 identities, equality checked on the company server.

No raw source rows, customer names or credentials were copied to the workstation. Company diagnostics return phases, counts, cutoffs and SQL function names only. Keys remain in protected backend configuration and are absent from Git.

## Storage and deployment

With explicit approval for the six named recovery folders, approximately 12 GiB of obsolete backup dumps were deleted from sdb. Those recovery points no longer exist. The live `mart.review_facts` table moved transactionally to the secondary disk without deleting rows; the trusted publication was checked unchanged. The private input database uses its own sdb tablespace and distinct writer/reader roles. Both original database storage and the additional tablespace mount must be retained on PostgreSQL recreation.

Immediately after the table move, root had 23,260,233,728 bytes free and sdb 18,374,025,216 bytes free; later imports/builds consume space. The completed capture and failed refresh containers were removed after preserving their safe diagnostic logs. Active web/API/PostgreSQL containers were preserved.

The normal company deployment script built commit-pinned images, held the shared job lock, ran migration/role verification and waited for healthy API/web. Manual operations remained disabled as previously configured; private staging writer credentials were not added to the runtime app.

## Preparation correction

The first publication attempt timed out with SQLSTATE 57014 in the existing preparation population reader. Its transaction rolled back, with zero publications at the new receipt cutoff and the previous trusted pointer retained.

Migration 095 makes event preparation enumerate only selected monthly members before calling the existing canonical lineage reader. It removes expansion through the shared all-history population view. This is a generic Business/review preparation correction, with unchanged values, snapshot logic, RLS, deadlines and independent reconciliation. The regression test revokes access to the shared view and proves matching event values, foreign-tenant isolation and empty out-of-period selection.

The next attempt progressed through event preparation but timed out in complete snapshot population. Migration 096 selects the existing canonical reader by snapshot observation day and member root, and indexes summary controls. On company staging the same read-only snapshot population profile returned 145,825 rows in 12,542 ms after deployment, compared with a 120,051 ms timeout before the fix. This profile is performance evidence, not publication acceptance. Synthetic tests additionally cover sparse snapshot masking, retained observation dates and foreign-tenant isolation.

The c32 retry reconciled its inputs and completed population, aggregation and validation, but its final binding transaction exceeded 120 seconds in the complete-history identity check. It rolled back with zero API-copy publications. A subsequent scoped background deadline change allows finite ten-minute preparation statements and restores the caller deadline before promotion. Its regression test verifies the active publication budget and restoration, plus unchanged runtime defaults. The company read-only identity probe completed unchanged in 196,008 ms with no ambiguous identities, establishing that the previous deadline was insufficient. Deployment completed with healthy API/web at 5a93b08; the ordered refresh has restarted. That retry was subsequently stopped before publication after the company-local date rolled into 26 October. A fresh single-scan capture and ordered refresh now run under the same shared job lock, so today-labelled readings can use a current-day observation. Actual report publication remains pending.

## Verification

Automated tests use only synthetic local data and no developer environment files or customer/model services.

- Frozen install, lint, architecture, baseline-aware quality, typecheck, API/web build and diff gates passed. Builds retain the existing large-bundle warning.
- Simplified code unit/API/UI suite: 1,025 passed, zero failures/skips.
- Focused scoped-preparation/provenance/serving suite: 14 passed, zero failures/skips.
- Full PostgreSQL run for `5a93b08`: 459 passed, zero failures/skips (1,349,264 ms). The earlier c32-started run overlapped the deadline edit and is not exact-revision evidence.
- Full PostgreSQL suite for preceding `d4198b2`: 457 passed, zero failures/skips.
- Earlier full PostgreSQL runs passed 455 and 456 tests respectively; they are separate evidence from final-code verification.
- Synthetic notice visual review: English/Arabic × Light/Dark × 375/768/1440 px, all 12 states visible and contained with no horizontal overflow. This is component-level visual evidence, not a claim of authenticated live-browser QA.

## Current-day copy and adapter-only blockers

The fresh capture finished at `2026-10-25T23:16:48.849Z` (26 October in Baghdad/Cairo), schema `api_a483d2c9d8984852ae7dc7e1177123e2`, fingerprint `ed5c563f8f8be9a3b0bf9c4500e8236a1a8300d82d30ae90e3e00599f24d2661`. It includes 70,664 orders and 858,092 order lines. This is the already captured input to reuse for subsequent retries; do not recapture to fix report availability.

The following reader attempt failed with SQLSTATE 57014 at the adapter-specific fifteen-second SQL deadline. The adapter now uses the existing two-minute background source-query bound, and its unnecessary ten-minute local-copy expiry is removed. Direct ERP lease limits remain unchanged. Existing systemd sync/daily/Command timers were explicitly restarted at the owner’s request; recurring data and business workflows remain unchanged. The worker service budget is increased to two hours so a daily import is not terminated by the previous fifteen-minute service timeout. Live execution/availability must still be verified; active timer state alone is not sync completion.

## Pre-publication report evidence

Using actual active administrator membership and deployed runtime bounds, the previous trusted revision `d789ac88-9da6-4dc2-9846-c2ee2a6231ac` was checked in both languages. Sales Command Center had 34 unavailable entries because its default periods were outside accepted coverage (latest Business coverage ended 24 October). Products & Warehouses returned six successful series but zero complete readings, with source evidence dated 15 October. These are baseline limitations, not acceptance of the new API publication.

All 46 existing template definitions were checked against the existing mart in both locales: 27 supported templates passed per locale, with zero failed series; 19 definitions per locale remained unavailable under the pre-existing capabilities. These checks do not attest fresh API publication or enable unsupported template definitions.

## Products & Warehouses readiness delivery

The application correction recognizes accepted mart revision/publication evidence when optional coverage metadata is absent. Missing evidence, explicit partial coverage, errors, authorization, dates and values remain unchanged. Focused report/API tests passed 10/10; the full unit/API/UI suite passed 1,026/1,026, with lint/architecture/quality/types/build/diff green. A read-only company probe confirmed six complete readings in each locale against the existing mart before rollout.

Only application composition/test/docs differ between `04676a3` and `d6da7ba`; source, data, domain, API and infrastructure files were checked identical. The compatible API/web rollout performed no migrations or database restart and left the independent worker pinned to `04676a3`. The deployed API is healthy. Native report verification then returned Products & Warehouses 6/6 complete, 6 successful series and zero failures in both locales, using existing evidence dated 15 October. This is delivery of report availability, not fresh API publication. Sales Command remains outside accepted default-date coverage until the running update publishes.

## Publication and report acceptance

October Business/Command completed at revision `b8b60b6a-5d0f-4fc6-a692-a091a3c66340`; September completed at `908e2f4c-b229-4008-ba98-a8ef949ddc41`. Do not repeat either full-period update. Native acceptance with actual administrator membership and deployed runtime limits returned Sales Command Center 34/34 complete, 60 successful series, zero errors, all API-observed; existing Products & Warehouses 6/6 complete, six successful series, zero errors, all API-observed. Both locales passed with source receipt `2026-10-25T23:16:48.849Z`.

The wrapper then incorrectly requested an unfinished October review. September review alone was subsequently completed, revision `01688b98-d4df-4d91-a38e-72b0168b8fc0`, 244,662 facts and 85,979 controls. The Finance helper incorrectly required the API receipt day even though existing Finance evidence requires completed month ends. That extra restriction is removed; the one-off Finance update for 30 September succeeded against the existing 26 October API copy, snapshot `6f407df96375c133632d235d0a96eb86e114fac27f78ecb90f84fdc092a8883d`, revision `f1b35696-df14-4879-bae4-2aa54e2b7776`. It does not alter Finance formulas/date semantics.

The scheduled core sync run `e8bfe2ca-0def-414b-a0eb-bee7d24d21cd` failed reconciliation: 12,867 cases, 445 mismatches; accepted data stayed intact. Company-only diagnostics show source headers missing from retained event facts and stale states dated before the accepted modification cursor, across August–October. Orders: 1,254 missing and 19 stale-state identities; invoices/refunds: 1,256 missing, 45 stale-state and 20 now-absent identities. No evidence yet establishes the historical cause. Existing 120-second cursor overlap is already present and does not recover these older differences.

At the 26 October follow-up, a one-time bounded event-identity catch-up is queued under the shared job lock, using canonical source SQL/mapping and the existing checkpointed capture, reconciliation, preparation and atomic acceptance. No new API capture, full Business reload, direct fact-head edit or reconciliation bypass is used. `/opt/el-dabboos/releases/odoo-core-catchup.log` owns execution status; Finance status is `/opt/el-dabboos/releases/odoo-api-finance-finish.log`. Confirm actual results before restarting paused sync/Command timers. Their original failure pause handler remains installed. Daily timer is active. API inputs refresh daily; five-minute sync reads that copy and is not five-minute live Odoo polling.

The exact forecasted-stock/per-customer Sold/Unsold feature is NOT deployed. After successful ordinary sync and all supported report checks, resume existing chat “Review product dashboard handoff” (`01a16a03-952a-7c92-8f8a-11321043c6c9`) with the authorized handoff. Preserve its dirty worktree. It needs source-API compatibility for new `reserved_quantity`, product `standard_price` and SQL cost defaults/metadata, read-lease factory usage, and migration renumbering after deployed migrations 095/096. Do not hand off as though sync/Finance/exact-report work is already verified.

In progress. Do not interpret successful deployment or sealed source capture as successful report refresh. Replace this section only after publication and normal prepared report composition have completed. Manual report acceptance must use actual active control membership, the normal authorization policy and the deployed runtime limits, returning counts/statuses only.
