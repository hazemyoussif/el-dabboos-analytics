# Allocation presence sweep cursor — 24 October 2026

## Company evidence

All five October Command recipes published. The current-month delta completed at 00:01:44 UTC on October 24 and extended all five recipe observations to October 24. The separate allocation presence sweep then expired its source lease at 00:11:58 UTC; its failure handler paused only the Command timer. Ordinary sync and daily timers remained enabled. The midnight daily invocation deferred on the tenant writer lock, so that service success is not a completed reconciliation.

The presence loop rebuilt the same deduplicated inventory from accepted Business allocation links, allocation facts and operational dependency IDs for every 1,000-ID keyset page. The corrected inventory, measured once under the company ingestor in a read-only transaction, contains 148,314 IDs in 149 pages and took 6,029 ms. Rebuilding a set of that size for every page can consume the source lease before the presence check completes.

## Correction and scope

A transaction-owned, forward-only PostgreSQL cursor reads the same sorted, deduplicated, nonempty inventory once and fetches 1,000 IDs per batch. Company and tenant filters, actual source-ID presence checks, prior-link requirements, deletion requests, source snapshot validation and rollback remain unchanged. The cursor closes on success; the owning transaction rolls back and closes it on failure. No source configuration, source writes, financial definition, timeout, history rebuild or publication guard changes.

Changed-file ESLint, TypeScript, architecture, baseline-aware quality and diff checks passed. No new automated tests, broad suite, local rehearsal or GitHub CI were run. The inventory measurement is manual company evidence, not synthetic coverage or successful end-to-end sweep evidence.

## Deployment and acceptance

The API-only deployment script is `maintenance/deploy-allocation-cursor-2026-10-24.sh`. It requires the current a01bfd1 API, unchanged migration history and exactly the allocation sweep source change. It retains the web and rollback images, waits for existing jobs, verifies schemas and leaves source schedules paused for supervised completion. No schema or data migration is performed.

The actual sweep, renewed source freshness, a completed daily reconciliation, September comparison/trend coverage and final company browser acceptance remain pending at this record's initial commit.
