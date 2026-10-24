# Allocation presence sweep cursor — 24 October 2026

## Company evidence

All five October Command recipes published. The current-month delta completed at 00:01:44 UTC on October 24 and extended all five recipe observations to October 24. The separate allocation presence sweep then expired its source lease at 00:11:58 UTC; its failure handler paused only the Command timer. Ordinary sync and daily timers remained enabled. The midnight daily invocation deferred on the tenant writer lock, so that service success is not a completed reconciliation.

The presence loop rebuilt the same deduplicated inventory from accepted Business allocation links, allocation facts and operational dependency IDs for every 1,000-ID keyset page. The corrected inventory, measured once under the company ingestor in a read-only transaction, contains 148,314 IDs in 149 pages and took 6,029 ms. Rebuilding a set of that size for every page can consume the source lease before the presence check completes.

## Correction and scope

A transaction-owned, forward-only PostgreSQL cursor reads the same sorted, deduplicated, nonempty inventory once and fetches 1,000 IDs per batch. Company and tenant filters, actual source-ID presence checks, prior-link requirements, deletion requests, source snapshot validation and rollback remain unchanged. The cursor closes on success; the owning transaction rolls back and closes it on failure. No source configuration, source writes, financial definition, timeout, history rebuild or publication guard changes.

Changed-file ESLint, TypeScript, architecture, baseline-aware quality and diff checks passed. No new automated tests, broad suite, local rehearsal or GitHub CI were run. The inventory measurement is manual company evidence, not synthetic coverage or successful end-to-end sweep evidence.

## Deployment and acceptance

The API-only deployment script is `maintenance/deploy-allocation-cursor-2026-10-24.sh`. It requires the current a01bfd1 API, unchanged migration history and exactly the allocation sweep source change. It retains the web and rollback images, waits for existing jobs, verifies schemas and leaves source schedules paused for supervised completion. No schema or data migration is performed.

Deployed API: `09d411ea3a05f81d93152dda7cdae9838ba3a143`; the retained web image and migrations 001–090 are unchanged. A fresh ordinary sync passed at 06:28:51 UTC. Daily reconciliation `d3fc99b4-4311-4406-adca-f62a78d1fbdb` passed 428 cases with zero mismatches at 06:30:15 UTC; operational sweep `453868ed-6048-47c5-b6de-0559ae230142` completed unchanged at 06:31:25 UTC.

The supervised current-month delta passed in 234.383 seconds, replacing 26 identities and writing 82 fact rows in a sparse partition. The corrected allocation unit then returned `allocations_checked` in 119.462 seconds at 06:38:21 UTC. This is actual complete company sweep evidence, distinct from the earlier inventory-only measurement. Both check timestamps were recorded and all three timers restored. Rebuildable Docker cache cleanup recovered 1.036 GB; root had 4.0 GiB available afterwards.

The signed-in company browser displays all current invoice, receipt, order, same-day cash and debt measures with source checked at 09:36 Cairo on October 24. Measured report refresh was 2.391 seconds before the renewed observation. Shared customer/salesperson filtering and reset, independent order dates, English/Arabic and Light/Dark presentation were exercised without changing UI code. The original System theme and default filter range were restored. September comparison/trend coverage and final full-report acceptance remain pending while background preparation advances.
