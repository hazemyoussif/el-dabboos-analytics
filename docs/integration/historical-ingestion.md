# Deterministic historical ingestion

The historical job is a local operator composition. It has no planner, provider, model endpoint or model credential dependency. It does not run an HTTP server. SQL is fixed in the existing source adapters and signed aged-ledger readers; dates are query parameters. The approved staging credential exception remains explicitly read-only.

```sh
pnpm odoo:history backfill --tenant el-dabboos-iq \
  --from 2025-10-01 --to 2026-09-30 \
  --checkpoint-dir .local-state/historical-202510-202609
```

Use the existing approved local source/mart environment and SSH tunnel. Do not put credentials in arguments. The acceptance run's `/tmp` directory is retained unchanged. Its success files were copied byte-for-byte to the private, Git-ignored `.local-state/historical-202510-202609` directory and verified. Back up that directory together with the mart. `/tmp` alone is not restart-safe across machine cleanup/reboot. The original positional `/tmp` invocation remains an alias for this acceptance range. A checkpoint directory identifies one immutable job; retain it when repeating the command.

The command enumerates complete months from input boundaries (including leap years, at most 24 months per invocation), executes events then month-end aging sequentially, and returns nonzero if any period failed or was blocked. One company/source mapping is currently approved: `el-dabboos-iq`, company `1`, `el-dabboos-odoo18-pg`, native IQD. Other tenants require an approved typed source mapping; changing the flag cannot bypass that boundary.

## Checkpoints and recovery

Each accepted period/kind has `YYYY-MM.events.json` or `YYYY-MM.aging.json`: dataset/mapping identity, retained source fingerprint and as-of time, cutoff, exact controls and outcomes, populations, quality observations and timings. Events additionally retain atomic mart page checkpoints in `mart.extraction_runs` (cursor, page/row counts, immutable extraction specification) and committed ingestion batches. Both kinds retain complete runs and immutable reconciliation evidence. Successful files are published exclusively after equality; new writes use fsync and an exclusive atomic hard link. A completed file is never overwritten.

Rerunning validates the file against complete database extraction runs and canonical immutable reconciliation specifications, then skips extraction/writes. A success label alone is insufficient. A changed fingerprint, scope, source/mart value/population, incomplete group set or missing case blocks reuse. September additionally checks the five certified anchor values.

New jobs hold a PostgreSQL advisory lock for each tenant/month/kind; connection loss releases it. The original in-progress acceptance run is additionally protected by its recent unfinished extraction lease. Do not start a second job in its checkpoint directory while it is running.

If execution dies halfway through a month, committed pages remain as unapproved candidate evidence; the monthly success file is absent and serving is unaffected. A retained PostgreSQL snapshot cannot be reopened after its owner connection dies. Recovery therefore **restarts only the failed bounded period under a new lease and new candidate**, preserving the partial attempt. It never joins pages from different source snapshots. After the old ten-minute lease has expired (the command uses a twelve-minute conservative guard), run only the affected month:

```sh
pnpm odoo:history backfill --tenant el-dabboos-iq \
  --from 2026-03-01 --to 2026-03-31 \
  --checkpoint-dir .local-state/historical-202510-202609 --retry-incomplete
```

The successful counterpart is skipped. Failed records are append-only `*.failed.json`. Database-complete extraction without a successful reconciliation checkpoint is not assumed successful. Retry uses the same readers, mappers and controls. No manually authored per-month metric SQL or corrective transformation is permitted.

The full twelve-month verification rerun validated and skipped all 24 event/aging checkpoints using an unusable model endpoint. No extraction or fact write ran. November/December dataset IDs and evidence files remained unchanged.

## Separate publication

Hosted single-mart staging uses the explicit `--in-place` publication mode and retains exact monthly receipts without copying release rows. See the [hosted historical parity runbook](hosted-historical-parity.md) for topology, approval preservation, Finance prerequisites and post-merge commands. The default two-mart transfer below remains supported.

`odoo:history:publish` accepts the same `backfill` arguments. It requires `MART_PUBLICATION_TARGET_URL` and a private `business-approval.json` with explicit `reference`, `approverReference` and ISO `approvedAt`. The task owner's authorization covers only exactly reconciled historical data under unchanged definitions. It records independent monthly business certificates, approves each immutable candidate, certifies the existing ratios and promotes each bounded release without a serving binding. It does not attribute historical data approval to Finance or inherit September data certification.

Historical transfer uses ordered server cursors and 250-record pages, a 512 MiB total monthly byte budget, atomic target transactions and the existing canonical fingerprint. Every proof link is retained. The old array transfer path remains unchanged. Target planner statistics are refreshed after each committed bulk copy before the exact ratio guards run. Offline ratio certification uses a bounded 120-second statement deadline; interactive report deadlines remain unchanged. Interrupted publication can rerun independently and reuses its existing approval/promotion; it never re-extracts a period.

`odoo:history:activate` also accepts those arguments. It requires every monthly publication receipt, refreshes the existing transactionally invalidated proof cache, checks each full promoted fingerprint, and atomically creates the explicit immutable historical collection. Its normal September anchor binding is retained. For the existing NOINHERIT local staging identities, run the established staging migration workflow after applying mart migrations so their migration-owned read-only grants and restrictive serving policies are mirrored. The task owner explicitly approved this local grant refresh; credentials and authentication flows remain unchanged. There is no automatic certification or binding inside ingestion.

Historical event totals and categorical contributions aggregate in the existing PostgreSQL canonical query path. Monthly buckets are calendar-complete. The shared categorical event query obtains complete keys, numeric totals and latest labels in one authorized scan. Historical identity-filter discovery likewise obtains the complete policy-filtered identity set and latest nonempty source labels in one scan. The shared multi-bucket event aggregation materializes the authorized numeric/date scope once instead of rereading its RLS proofs per bucket. Historical result freshness reuses the latest observed business date in that aggregation, avoiding another full ledger scan; source extraction freshness still comes from completed ingestion batches. Per-series proof reads select only the requested ratio, while capability discovery still projects every certified ratio. The single-cutoff snapshot fast path first checks the unfiltered authorized population for unique measure/entity pairs and one exact date; mixed dates or duplicates retain latest-state selection. Historical event query transactions disable JIT compilation only for their bounded scans. Report statement deadlines and execution concurrency remain unchanged. Historical filter discovery has a separate bounded 45-second statement budget because it covers the complete identity population across all approved event measures; September report queries retain their existing deadline. Historical categorical results and discovery have a separate configurable 4,000-group bound (maximum 5,000); the acceptance year has 3,528 invoicing and 3,533 order customer identities. Normal September retains its existing group bound. A population beyond the historical bound fails explicitly; it is never silently truncated. The domain permits monthly signed-aging samples, but the original September mapping grants no monthly pair. The historical collection grants month only after all member cutoff summaries are proven. Snapshot trends sample one independently certified cutoff per month; an ungrouped snapshot selects the latest eligible state and never sums positions across months. Monthly event ratios retain their independent monthly output certificates; an annual average is not inferred by averaging monthly ratios. Source labels remain evidence: history selects the latest observed authorized label for each stable ID within the selected range, while discovery uses the latest observation across members. Different IDs with identical names remain separate.

MoM absolute change is current minus previous month. Percentage change is `(current - previous) / abs(previous) * 100`, preserving the existing governed transform. Missing prior/current values yield null changes; zero prior yields a null percentage change. The first coverage month has no prior comparison. MoM requires monthly grouping and complete months. Three/six-month moving averages require sufficient selected coverage and use the existing partial-prefix mean of present values; an entirely missing window stays missing. Twelve-month moving average and YoY are unavailable in this wave. Executed MoM/moving-average definitions appear in the existing bilingual metric-help popup and its copied text.

## Reusable components

- `OdooSnapshotLease`: retained RR/READ ONLY source consistency and bounded lifetime.
- Existing Odoo source readers: deterministic keyset pages, eligibility and stable business identities.
- Versioned Odoo header mapper and `mapReceivableSnapshots`: approved event/date/attribution/currency definitions and signed cutoff reconstruction.
- `PostgresMartWriter` and `PostgresExtractionRuns`: atomic pages, revisions, idempotent batches and durable cursors.
- `PostgresReconciliation` and bounded evidence persistence: exact independent source controls and complete group populations.
- The complete-month planner and job orchestration: bounded inputs, sequential execution, evidence validation, period locks and independent recovery.

Event periods aggregate transactions by their own approved business dates. Aging is one signed company state at each cutoff; it is never a sum of monthly snapshots. Phase A aging has company summaries only. The subsequent trusted Finance customer publication described below adds separately immutable customer evidence. Display names do not define identities; event labels reflect the source labels observed in that retained extraction, while partner/user/Business Line IDs remain stable.

## Trusted historical Finance customer publication

The explicit offline operator entry `scripts/integration/finance-snapshots.ts` requires protected `MART_MIGRATOR_URL` and the existing source connection configuration. It processes October 2025–September 2026 month ends, skips already published immutable snapshots, and requires the existing trusted company summary for each cutoff. It is not invoked by HTTP routes, normal report reads, or a scheduler. Source transactions are retained repeatable-read/read-only leases; independent customer controls and ten monetary totals must match exactly before publication, with lease validity checked through mart commit.

Migrations 031–033 store immutable Finance evidence, wide customer vectors and publication records with forced tenant RLS and restrictive published-only runtime reads. A publication locks its evidence row, verifies complete customer coverage and exact totals, and freezes further customer inserts. The September data certificate is not overwritten. Historical reconciliation references its own snapshot evidence and the standing Finance definition separately.

The ordinary operational Finance adapter selects the latest published cutoff at or before report end. June 17 resolves to May 31; October 8 resolves to September 30. Headline balances ignore range start. Explicit monthly trends return independent month-end samples within the selection, never summed or interpolated. Before the first snapshot, results are unavailable. Snapshot date and source freshness remain separate presentation fields.

Customer filter discovery uses the authenticated `/api/dimensions/customer/search` route: 50 initial options, at most 100 per page, literal server search, context-bound keyset continuation and independent selected-ID hydration. Headline KPIs do not trigger discovery. The older historical repository's complete-population discovery budgets above describe that legacy path; they are not increased or used as a workaround in the current operational Finance path. The ordinary operational group bound remains 3,000 and over-bound analytics requests require customer/date narrowing.

See [Finance serving acceptance](../qa/finance-historical-serving-20261008.md) for exact September anchors, runtime-role query plans, HTTPS timings and verification limits.

## Future incremental synchronization

Reuse the same source readers, versioned mapping, mart writer, page lifecycle and reconciliation. A scheduler can invoke a deterministic job, but continuous synchronization still needs an approved incremental selection contract (write-date overlap and durable watermarks), correction/late-arrival handling, retained-lease recovery policy, delete/presence evidence, incremental reconciliation/certification and immutable serving activation rules, credential hardening, operational monitoring and retention/backup policy. Successor collection activation also needs an explicit governed binding-rollover lifecycle; the current active historical binding and its members are immutable. Earlier periods can be extracted independently, but a larger collection cannot replace this active binding in place. None is enabled by this backfill. Publication remains a separate explicitly authorized lifecycle; technically exact candidate data does not inherit September data certification.

Empty customer month ends are publishable when both retained-snapshot population queries complete with zero rows and the independent company control contains all ten canonical zero totals. Migration 042 allows customer count zero in the current unified publication guard while preserving every nonempty exact sum check. A published empty cutoff yields zero balances, a null zero-denominator percentage, empty customer discovery/detail and pinned snapshot metadata; a missing cutoff remains unavailable. No customer row is synthesized and no deployed migration is rewritten.

Migration 043 scopes ratio input reconstruction to the requested tenant and dataset before choosing each latest completed revision. It retains the canonical completion, tombstone, population, signed-total, grouped set and snapshot-cutoff rules. Publication does not scan unrelated monthly histories to certify one month; existing extraction and publication checkpoints remain reusable.
