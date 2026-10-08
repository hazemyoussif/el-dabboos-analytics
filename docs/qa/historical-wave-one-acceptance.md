# Historical wave 1 acceptance — local execution

Coverage: **2025-10-01–2026-09-30**, tenant `el-dabboos-iq`, company 1, native IQD. Twelve event periods and twelve independent month-end aging states passed exact reconciliation and were separately approved/published. November/December evidence was retained. Historical reference: `el-dabboos-history-202510-202609-v1`. September normal release `el-dabboos-finance-202609-v6` and binding were preserved.

UI polish is separately committed as `5abdfed` (`fix(web): polish localized account and chart labels`): reserved bootstrap account labels localize EN/AR; edited names remain profile data. Shared grapheme-aware category-axis ellipsis preserves full hover/focus labels and source identity. No Sol visual QA was run. Luna’s deferred EN/AR/RTL scope is appended to the existing handoff.

## Monthly coverage

Orders/invoices/refunds below are certified document counts. Dimension columns count exact cases across the eight event measures, including governed zero-valued group controls. Receivables are signed month-end company values; customer aging is Phase B.

| Month | Orders | Invoices | Refunds | Customer cases | Business Line cases | Salesperson cases | Net receivables IQD | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 2025-10 | 2,893 | 2,792 | 150 | 9,431 | 8 | 295 | 1373251612.610000 | Exact, published |
| 2025-11 | 2,744 | 2,873 | 154 | 9,696 | 8 | 280 | 1449064362.610000 | Exact, published |
| 2025-12 | 2,807 | 2,805 | 160 | 9,860 | 8 | 301 | 1261873112.610000 | Exact, published |
| 2026-01 | 2,899 | 2,877 | 168 | 10,095 | 8 | 278 | 1482066362.610000 | Exact, published |
| 2026-02 | 2,567 | 2,543 | 139 | 9,193 | 8 | 282 | 1400325612.610000 | Exact, published |
| 2026-03 | 2,620 | 2,745 | 195 | 9,267 | 8 | 277 | 1426285112.610000 | Exact, published |
| 2026-04 | 3,024 | 3,157 | 174 | 10,092 | 8 | 300 | 1355147112.610000 | Exact, published |
| 2026-05 | 2,762 | 2,961 | 154 | 10,133 | 8 | 298 | 1391974112.610000 | Exact, published |
| 2026-06 | 2,738 | 2,832 | 116 | 8,858 | 8 | 280 | 1301105112.610000 | Exact, published |
| 2026-07 | 3,110 | 3,180 | 129 | 9,767 | 8 | 287 | 1370980112.610000 | Exact, published |
| 2026-08 | 2,817 | 2,788 | 127 | 9,839 | 8 | 290 | 1334112862.610000 | Exact, published |
| 2026-09 | 2,895 | 2,890 | 120 | 9,999 | 8 | 292 | 1359461092.610000 | Exact, published |

## Exact controls

[Structured monthly ledger](historical-wave-one-ledger.json) retains each month/kind’s snapshot fingerprint/as-of/cutoff, source and logical mart populations, physical mart fact count, metric/dimension/group population, exact/delta/unmatched cases, mapping and semantic versions, quality observations and timing. Raw proof links remain in the private checkpoints and mart, not the repository.

| Metric | Dimension | Exact cases across 12 months | Deltas | Unmatched groups |
|---|---|---:|---:|---:|
| aged_1_30 | summary | 12 | 0 | 0 |
| aged_31_60 | summary | 12 | 0 | 0 |
| aged_61_90 | summary | 12 | 0 | 0 |
| aged_91_120 | summary | 12 | 0 | 0 |
| aged_at_date | summary | 12 | 0 | 0 |
| aged_over_120 | summary | 12 | 0 | 0 |
| average_confirmed_order_value | business_line | 12 | 0 | 0 |
| average_confirmed_order_value | customer | 22,258 | 0 | 0 |
| average_confirmed_order_value | salesperson | 485 | 0 | 0 |
| average_confirmed_order_value | summary | 12 | 0 | 0 |
| average_invoice_value | business_line | 12 | 0 | 0 |
| average_invoice_value | customer | 22,374 | 0 | 0 |
| average_invoice_value | salesperson | 454 | 0 | 0 |
| average_invoice_value | summary | 12 | 0 | 0 |
| cancelled_orders | business_line | 12 | 0 | 0 |
| cancelled_orders | customer | 1,241 | 0 | 0 |
| cancelled_orders | salesperson | 363 | 0 | 0 |
| cancelled_orders | summary | 12 | 0 | 0 |
| credit_balances | summary | 12 | 0 | 0 |
| gross_open_receivable_components | summary | 12 | 0 | 0 |
| invoice_count | business_line | 12 | 0 | 0 |
| invoice_count | customer | 22,374 | 0 | 0 |
| invoice_count | salesperson | 454 | 0 | 0 |
| invoice_count | summary | 12 | 0 | 0 |
| invoiced_revenue | business_line | 12 | 0 | 0 |
| invoiced_revenue | customer | 22,374 | 0 | 0 |
| invoiced_revenue | salesperson | 454 | 0 | 0 |
| invoiced_revenue | summary | 12 | 0 | 0 |
| net_aged_receivable | summary | 12 | 0 | 0 |
| net_invoiced_revenue | business_line | 12 | 0 | 0 |
| net_invoiced_revenue | customer | 22,453 | 0 | 0 |
| net_invoiced_revenue | salesperson | 455 | 0 | 0 |
| net_invoiced_revenue | summary | 12 | 0 | 0 |
| order_count | business_line | 12 | 0 | 0 |
| order_count | customer | 22,258 | 0 | 0 |
| order_count | salesperson | 485 | 0 | 0 |
| order_count | summary | 12 | 0 | 0 |
| order_revenue | business_line | 12 | 0 | 0 |
| order_revenue | customer | 22,258 | 0 | 0 |
| order_revenue | salesperson | 485 | 0 | 0 |
| order_revenue | summary | 12 | 0 | 0 |
| overdue_receivable_percentage | summary | 12 | 0 | 0 |
| refund_count | business_line | 12 | 0 | 0 |
| refund_count | customer | 1,636 | 0 | 0 |
| refund_count | salesperson | 382 | 0 | 0 |
| refund_count | summary | 12 | 0 | 0 |
| refund_value | business_line | 12 | 0 | 0 |
| refund_value | customer | 1,636 | 0 | 0 |
| refund_value | salesperson | 382 | 0 | 0 |
| refund_value | summary | 12 | 0 | 0 |
| total_overdue_receivable | summary | 12 | 0 | 0 |

All appropriate additive group sums and populations equal their summary controls in all twelve months. Ratios use independent exact rational-output certification on both source and target; grouped ratios are never summed. Customer identities are `res_partner.id`; duplicate names remain separate. Order salesperson attribution is `sale_order.user_id`; invoice/refund attribution is `account_move.invoice_user_id`, with governed Unassigned for null. Historical labels use the latest observed authorized label within the selected range.

September exactly reproduced: Net Invoiced Revenue **1,447,166,500**, Posted Invoice Value **1,465,712,000**, Refund Value **18,545,500**, Order Revenue **1,461,335,500** IQD; Order Count **2,895**. Before/after fingerprints prove the original September release, approvals, derived certificates and normal binding unchanged in both local marts.

## Processing cost

| Month | Events seconds | Aging seconds | Total seconds |
|---|---:|---:|---:|
| 2025-10 | 257.7 | 52.8 | 310.5 |
| 2025-11 | 220.7 | 79.3 | 300.0 |
| 2025-12 | 264.7 | 82.2 | 346.9 |
| 2026-01 | 234.9 | 86.1 | 321.0 |
| 2026-02 | 206.2 | 85.3 | 291.5 |
| 2026-03 | 230.2 | 90.8 | 321.0 |
| 2026-04 | 245.7 | 98.2 | 343.9 |
| 2026-05 | 263.3 | 108.6 | 371.9 |
| 2026-06 | 250.2 | 124.9 | 375.1 |
| 2026-07 | 333.7 | 131.8 | 465.5 |
| 2026-08 | 252.3 | 142.2 | 394.4 |
| 2026-09 | 262.0 | 155.6 | 417.6 |

Detailed event source-read/mapping/mart-write/reconciliation durations are in the ledger. Aging has total duration only; phase timing was not captured in the retained aging evidence. Process lifetime peak RSS reached approximately **315 MiB**; it is not an independent monthly peak. Source reads are keyset-paged (500 records); promotion uses ordered 250-record pages with a 512 MiB monthly byte limit. Execution remains sequential for ingestion and concurrency 2 for reports. Planner statistics are refreshed after each bulk promotion before exact ratio guards.

Source quality counts cover all company-dated headers, including ineligible states/document types. Currency/missing-attribution observations in that wider population do not certify eligibility; the approved mapper enforces native IQD and existing attribution. Global null-date observations cannot be assigned to a month. No business-significant anomaly is silently repaired. Aging controls report zero current-residual mismatch, ambiguous components, missing transaction currency and invalid company currency. UOM is irrelevant.

## Deterministic operator and recovery contract

The initial acceptance extraction invoked the retained deterministic runner directly:

```sh
node --env-file-if-exists=.env --env-file-if-exists=.env.local \
  --experimental-transform-types --disable-warning=ExperimentalWarning \
  scripts/integration/historical-backfill.ts /tmp/el-dabboos-history-wave1
```

The reusable explicit operator command for the same job is:

```sh
pnpm odoo:history backfill --tenant el-dabboos-iq \
  --from 2025-10-01 --to 2026-09-30 \
  --checkpoint-dir .local-state/historical-202510-202609
```

1. **Same path:** every event month uses the existing retained Odoo reader/header mapper/writer/reconciliation path; every aging month uses the same signed cutoff reconstruction and snapshot mapper. Dates/cutoffs are inputs. October’s previously completed aging state was reused through the same extractor’s checkpoint. No month-specific SQL, metric definition or corrective transformation was authored.
2. **Durable success:** `YYYY-MM.events.json` / `.aging.json`, complete `mart.extraction_runs`, committed page batches/cursors and immutable reconciliation cases. New successful files are exclusive, atomic and fsynced. Publication adds independent certificate/promotion receipts; activation adds the historical serving receipt. Private evidence is copied byte-for-byte into the Git-ignored durable directory.
3. **Mid-month stop:** committed pages remain unapproved and the success checkpoint is absent. A dead retained MVCC lease cannot be reopened. `--retry-incomplete` restarts only that failed bounded period under a new lease/candidate after the conservative expiry guard, preserves the partial attempt and skips successful counterparts. It never mixes snapshots.
4. **Completed rerun:** checks all immutable file/DB controls and complete runs, then emits `resumed-reconciled` without source extraction or fact writes. The full 12-month command skipped **all 24 checkpoints** with an unusable model endpoint/key; see [rerun evidence](historical-idempotency-acceptance.json). Checkpoint-directory identity must be retained; erasing it is not an idempotent job retry.
5. **Reusable components:** OdooSnapshotLease, deterministic source readers, versioned header/receivable mappers, PostgresMartWriter, PostgresExtractionRuns, exact PostgresReconciliation/evidence persistence and bounded planner/orchestration.
6. **Future scheduling:** a thin invocation wrapper can reuse the job; continuous sync still needs approved write-date overlap/watermarks, late corrections, delete/presence evidence, incremental controls/certification and activation, hardened source credentials, monitoring and checkpoint retention/backup. No scheduler or continuous sync is implemented.
7. **Zero LLM runtime dependency:** ingestion invokes no planner/provider/model, needs no model credentials and uses fixed adapter SQL. The 24-checkpoint invalid-model-endpoint rerun passed.

## Serving and remaining scope

Five historical templates use existing absolute/relative date and identity filters: Historical Executive Trend; Sales vs Invoicing Trend; Business Line Trend; Salesperson Historical Analysis; Customer Historical Analysis. Historical queries have a separate configurable 4,000-group bound (maximum 5,000), preserving all 3,528 invoicing and 3,533 order customer identities in this wave; larger populations fail explicitly. The original September bound is unchanged. Historical filter discovery has a separate bounded 45-second metadata budget and preserves all 3,570 authorized customer identities; report statement deadlines and execution concurrency remain unchanged. Underlying contribution tables remain complete, with aggregate monthly lines unless an identity is selected. MoM and three/six-month averages reuse governed transforms; zero/missing behavior is documented in EN/AR metric help. YoY is unavailable. Snapshots remain company-summary Phase A; customer aging is deferred.

Local staging NOINHERIT logins require the existing staging migration workflow to mirror migration-owned grants. The task owner explicitly approved that read-only grant refresh after automatic approval review initially blocked it. Credentials and authentication flows did not change.

Extend backward to **2024-10** only as the next separately reconciled/certified wave. The deterministic components are reusable, but new data must pass exact controls and new business approval before YoY is enabled. A successor collection also requires a reviewed binding-rollover lifecycle: the current active historical collection is immutable and cannot be expanded in place. Tablet/mobile and visual EN/AR/RTL remain unverified; Luna handoff is prepared and not dispatched.

## Safety confirmation

- existing September certification rewritten = **no**
- historical data assumed certified without reconciliation = **no**
- snapshot treated as event metric = **no**
- historical receivables reconstructed from today's balance = **no**
- refund moved to original invoice date = **no**
- customer identity changed to display name = **no**
- salesperson attribution changed = **no**
- Business Line semantics changed = **no**
- YoY enabled with insufficient history = **no**
- source mutated = **no**
- source schema changed = **no**
- authentication changed = **no**
- online staging created = **no**
- external CD configured = **no**
- continuous sync implemented = **no**
- Sol visual QA run = **no**
- push = **no**
- merge = **no**

## Final functional and automated verification

All five original September reports and all five historical reports returned HTTP 200 with zero failed series. Every new monthly value and every full-population categorical value matched the retained exact controls. Customer history preserves 3,528 invoicing and 3,533 order identities; salesperson history preserves 62 invoicing and 64 order identities. Arabic functional checks passed for the executive and customer historical templates. These are HTTP/data checks, not visual QA.

| Report | HTTP | Failed series | Seconds |
|---|---:|---:|---:|
| executive-sales-invoicing | 200 | 0 | 10.03 |
| business-line-performance | 200 | 0 | 10.01 |
| salesperson-performance | 200 | 0 | 10.04 |
| invoice-refund-operations | 200 | 0 | 13.38 |
| receivables-aging | 200 | 0 | 22.59 |
| historical-executive-trend | 200 | 0 | 24.29 |
| sales-invoicing-trend | 200 | 0 | 11.95 |
| business-line-trend | 200 | 0 | 21.30 |
| salesperson-historical-analysis | 200 | 0 | 21.66 |
| customer-historical-analysis | 200 | 0 | 21.64 |

Read-only real-data checks passed twelve-month MoM, three/six-month moving averages, all twelve signed-aging cutoffs and latest-state annual snapshot selection. YoY was rejected. All required gates passed: frozen install, lint, architecture, quality, typecheck, **675 unit tests**, **135 PostgreSQL tests with zero skips**, build and diff. Five resolved naming-debt baseline entries were removed; no new allowance or access-control blocker was added. The existing web bundle-size warning remains.

See [functional evidence](historical-functional-acceptance.json), [rerun evidence](historical-idempotency-acceptance.json) and [monthly ledger](historical-wave-one-ledger.json). The UI polish is committed separately; historical implementation and documentation remain local working-tree changes alongside preserved pre-existing edits. No push or merge occurred.

The final customer filter endpoint returned HTTP 200 in **30.78 seconds**, with all **3,570** independently verified authorized identities and labels. Discovery includes the union of all approved event measures, so its population is larger than either individual revenue table. Its separate 45-second metadata budget leaves report statement deadlines and execution concurrency unchanged. The one-scan discovery path is covered for latest labels, policy restrictions and explicit population-limit failure.
