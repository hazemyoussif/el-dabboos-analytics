# Company storage recovery and 2024 retention removal

Owner authorization: reclaim unused space inside/outside the analytics database and remove 2024 analytics data. This is company maintenance, not a source-schema change or an application release.

## Confirmed failure

Direct SSH inspection of `analytics-dashboard` (`46.225.43.242`) found PostgreSQL's 23 October 2026 00:34:40 UTC error: `could not extend file ... No space left on device`. The failed relation was `mart.analytics_fact_revisions`, during the checkpointed capture revision insert. Root had space again after rollback. The failed capture was not sealed/resumable. Earlier five-second local sampling did not reproduce this company failure and is not a company sync pass.

The deployed API remains `1e0de77a45b7169292b83146114652b9a4287b99`; web remains `6caf30ec647801d36a303aae2acc9cf36ce37b81`. No source sync, background worker, timer activation, application rebuild or new deployment is part of this cleanup.

## Recovery point

A fresh custom-format analytics dump, archive inventory, checksum and release record were created before deletion at:

`/mnt/HC_Volume_107192875/el-dabboos-backups/pre-2024-retention-20261023T144846Z`

The dump is about 2.1 GiB and its checksum was checked before maintenance. This is archive/checksum evidence, not a restore test. Previous backups remain intact. Backups deliberately retain the pre-removal 2024 data.

## Approved deletion

The executed operation is [maintenance SQL](maintenance/purge-company-2024-2026-10-23.sql). It accepts explicit tenant/from/through parameters and refuses any scope other than the authorized IQ staging tenant and calendar 2024. It requires a superuser, serializes on the analytics tenant lock and refuses a pending sync. The host maintenance wrapper also held both job locks, confirmed paused jobs/timers, checked free space and briefly stopped the API/web.

The purge checks for cross-year raw/prepared dependencies before deleting. It removes leaf references before parent rows. Foreign keys and proof guards remain enabled. For this explicitly authorized administrative deletion only, the immutable-delete trigger is temporarily suspended on each bounded target under a transaction-held exclusive lock, then restored. All changes are in one transaction; errors roll back both deletions and trigger changes. Before commit it asserts that all retained 2025+ partitions, membership rows and prepared bindings are unchanged, every immutable guard is enabled, and current prepared requirements remain covered.

The operation committed. Significant removed counts:

| Relation | Removed rows |
| --- | ---: |
| review_facts | 1,248,963 |
| review_controls | 843,026 |
| analytics_aggregate_bases | 291,259 |
| analytics_partition_facts | 300,431 |
| analytics_monthly_bases | 206,854 |
| business_allocation_links | 148,310 |
| prepared_cells | 89,172 |
| fact_revisions / fact_heads / batch_facts | 84,413 each |
| analytics_fact_revisions | 53,736 |
| analytics_fact_heads | 52,809 |
| reconciliation_evidence | 36,939 |
| analytics_partitions | 53 |
| finance_snapshot_evidence | 7 |

The full count audit and executed SQL are in the protected recovery directory. The transaction retained 8,233 historical/current 2025+ membership rows and 1,354 2025+ prepared bindings. These are all-version counts, not counts of months.

2024 reporting membership is no longer published. The existing operational baseline begins in October 2025; `readBaseline` extends backward only to accepted fact coverage. With 2024 memberships removed, that extension begins in January 2025. Missing-month discovery and Command initialization therefore do not seed 2024. This does not remove Odoo source records or remove 2024-origin debts from correctly dated 2025+ balance snapshots. Audit metadata and backups remain where needed for retained history and recovery.

## Storage maintenance

Unused API images, the old stopped `el-dabboos-sync-pr19` container, old local image aliases, Docker build cache and APT cache were removed. The deployed images, previous API image `204271b5b48007595bc7cc8239d6ca3eea2dbe9f`, PostgreSQL image and database volumes were retained.

`/opt/el-dabboos/state` archives were copied with preserved metadata to `/mnt/HC_Volume_107192875/el-dabboos-state`, compared with checksum mode, and their original paths retained through a symlink before removing the redundant original copy. No archive was intentionally discarded.

Root free space increased from 2.4 GiB to 9.4 GiB before database compaction. A bounded vacuum pass follows the purge: smaller relations use `VACUUM FULL` only when free space exceeds twice the full relation size plus a 2 GiB reserve. Large `review_facts` and `prepared_cells` use ordinary vacuum to reclaim reusable row/index space without creating another full physical copy. Maintenance logs remain in the recovery directory.

## Completed result

Compaction of eleven bounded relations returned **6,364,078,080 bytes (5.93 GiB)** to the filesystem. Ordinary vacuum also reclaimed reusable row/index space in `review_facts` and `prepared_cells`. Their live 2025+ populations were not rewritten as another full physical copy.

Root now has approximately **16 GiB free (79% used)**, compared with 2.4 GiB before cleanup. The separate volume has about 24 GiB free. Analytics database size is 53,362,169,535 bytes (49.70 GiB), including live retained data and reusable allocated space.

Final read-only database evidence:

- Zero 2024 analytics partitions, canonical revisions, legacy revisions, prepared populations and Finance snapshots remain live for the company tenant.
- All immutable history guards are enabled; foreign keys stayed active throughout.
- Published facts/Business coverage is January 2025–October 2026 (22 months each); review/receivables coverage is January 2025–September 2026 (21 months each).
- Pending sync count is zero. The accepted source cutoff remains `2026-10-20T07:24:09.590Z`.
- API/web restarted successfully; readiness returned `ready`, with persistence and analytics available.

No automated test suite, synthetic test, GitHub CI or company sync was run for this operational cleanup. Source jobs and timers remain paused. Storage recovery and retention removal are complete; a successful current-data sync and independent Command background publication are still outstanding and are not implied by readiness.

## Subsequent sync operation

The cutoff and paused-timer state above describe the cleanup handoff, not the later deployment state. On 23 October, the saved company sync candidate published successfully with zero reconciliation mismatches; the following ordinary incremental cycle took about ten seconds and advanced the cursor to 18:09:45.382 UTC. Ordinary sync and independent Command background timers are enabled. Daily reconciliation remains paused and background capability publication is still pending. See the [subsequent company sync record](sync-seal-identity-correction-2026-10-23.md) for exact evidence and current release. Following capture, preparation and image builds, root has approximately 7.8 GiB free; the earlier 16 GiB was the post-compaction point, not a continuing capacity guarantee.
