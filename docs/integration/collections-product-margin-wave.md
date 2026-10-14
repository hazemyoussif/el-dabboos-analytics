# Collections, Product contributions and Order Margin

User-authorized scope: October 13, 2026. Implement eight metrics and Customer/Product breakdowns, exposing technically sound results before Finance reviews them. [ADR 036](../architecture/adr/036-post-exposure-finance-review.md) owns the new review policy. Existing history and Finance approvals are preserved.

## Definitions

| Metric | Calculation and date |
| --- | --- |
| Customer Cash Collected | Posted inbound customer receipts with posted accounting moves, by payment date; count each receipt once |
| Cash Applied to Invoices | Receipt cash allocated to posted customer invoices at extraction cutoff, for the same payment-date cohort |
| Unallocated Customer Receipts | Cash collected minus invoice-applied cash; includes amounts applied to non-invoice receivable entries |
| Collections / Sales % | Period customer cash receipts / same-period net invoiced revenue × 100; can exceed 100%; zero denominator is null |
| Weighted Collection Days | Sum(applied cash × payment date minus invoice issue date) / sum(applied cash); days, not hours or DSO; unpaid invoices excluded; advances may produce negative days |
| Receivables Due for Collection | Positive reconstructed receivable components with known maturity on/before complete month-end cutoff; excludes credits and unknown maturity |
| Order Margin | Stored margin of confirmed orders, by order date in business timezone; separate from accounting gross profit |
| Order Margin % | Aggregate stored order margin / matching aggregate untaxed confirmed order value × 100; zero denominator is null |

The existing generic Collected Amount is not silently redefined. Payment states for this Odoo 18 recipe are `in_process` and `paid`, with a posted journal move required. Cancelled, draft, outbound, supplier, missing-move and non-cash credit/offset-only settlements are excluded. Multiple payment records sharing one move, unsupported currency and inconsistent allocation/source amounts fail quality checks. Native currency is required; no FX recipe is guessed.

Product/Product Category reporting uses untaxed posted invoice product lines, signed separately for invoices/refunds. Every invoice's lines must agree with its header and the full source header totals. No repeated header amount per product, no inferred units conversion, and no Product permission for invoice counts/averages or order counts. Null product/category identities retain Unassigned. Stable Customer IDs are preserved across cash, invoices and order margins; names are display evidence only. Label/search paths honor tenant/policy scope and preserve selected identities.

## Exposure operation

Migration **044** adds the review family and exact controls to the existing trusted manifest. Forward migration **045** compares independently supplied summary and tuple controls against grouped facts, preserving exact value/count, completeness and lineage checks without rescanning every fact for every control. Apply only through the immutable migration runner against the intended configured mart. The existing trusted tenant baseline must exist and match source/currency. Do not use an empty/older developer mart or rewrite historical Finance approvals.

```bash
pnpm analytics expose --tenant el-dabboos-iq --month 2026-09
```

Use the intended protected operator configuration; developer defaults may target a different mart. API composition resolves source credentials; the reader imports one retained read-only snapshot for extraction and independently grouped controls. Each input family uses a transaction-local read-only cursor with bounded fetches and rollback on completion, error or early consumer termination, avoiding repeated historical reconstruction per page. This creates no source schema objects or records. It loads all four input families: payments, confirmed order margin/untaxed value, invoice product lines, and historic due receivable components. Exact header controls prevent omissions and fanout. The source lease must remain alive through the operation.

The transaction uses the existing tenant writer lock, bounded pages (maximum 1,000), maximum 250,000 canonical facts and 100,000 controls. A failed, partial, duplicate, mismatched or interrupted candidate rolls back facts, evidence and the serving pointer. Complete source tuple controls and matching totals/counts are required. Exposed contents cannot be appended to or altered; re-extraction with a newer source cutoff produces a new immutable partition. Older or replayed cutoffs cannot overwrite current data. Runtime accounts cannot write or call the source.

The command exposes the eight metrics and three invoice monetary measures at their actually mapped dimensions. Builder, authorized catalogs, Ask Business and templates consume that capability projection. New management templates are Customer Cash Collections, Confirmed Order Margin and Product Invoice Performance. Existing Customer Performance still uses its existing exact capabilities; new cash/order Customer breakdowns use the review family.

## Scope and freshness

One complete reporting month per release; unsupported ranges or dimensions fail explicitly. Allocations for a historical receipt cohort are known at source extraction cutoff, which is distinct from the payment date and the receivable month-end cutoff. Rerun the complete month operation to refresh payment allocation/correction history. Ordinary operational sync does not refresh this family in this first implementation. Snapshot positions are never summed across cutoffs. Technical exposure does not imply Finance acceptance. Table/Excel results are available through the normal authorized renderer; record-level drill-through is not offered for the new review family.

The default Collections report labels its separate due-customer table **Top 100 Customers Due for Collection** in English and Arabic. It does not present that subset as the company total; the summary KPI retains the complete total. Complete unfiltered historical Customer results remain subject to the existing result limit; filtered queries and explicit Top N are supported. Categorical execution caches exact same-order operands per measure/range, selecting latest snapshot assignments before policy filters. Zero/null, prior-period comparisons, ratio operands and time-series semantics are preserved.

## Delivery evidence

Synthetic integration tests exercise real source SQL, paging, credit offsets, cancelled/outbound/missing-move exclusion, header-line equality, zero denominators, days, snapshot scope, policy filters, Customer/Product search, immutable evidence, RLS, read-only runtime and rollback. EN/AR tests cover pending review status and canonical help. Tests do not load developer environment files or contact real model/customer services.

Live source preflight on October 13: the existing laptop staging relay accepted a TCP connection but reset PostgreSQL connections (`ECONNRESET`); the saved developer fallback was refused (`ECONNREFUSED`). No live source query, extraction or new-wave exposure completed. The default developer mart is migration 27 without a trusted tenant baseline; the actual laptop staging mart is migration 37 with an existing baseline. Neither was migrated or rewritten by this task. Protected configuration values and raw business/customer rows are not included here.

Later October 13 recovery: the user authorized protected SSH credential setup after changing the SSH password. The existing relay now uses a user-scoped encrypted systemd credential entered through a local password dialog; configuration is outside the repository, mode 0600, with the previous setup backed up. A read-only PostgreSQL `SELECT 1` through the actual staging API succeeded. Extraction then stopped at the configured least-privilege source identity check: the existing database login has `CREATEDB`. No source privileges were changed, staging exception enabled, source control totals calculated, mart migration applied, or new metrics exposed. A dedicated read-only source login is required for the configured policy before loading can resume.

The user subsequently explicitly authorized proceeding with the existing account while enforcing read-only access and prohibiting database changes. The existing scoped `staging_read_only` policy was selected **in memory for the bounded September/company-1 source check only**; protected runtime configuration was not changed. Every source connection retains `default_transaction_read_only=on`; source reads use retained repeatable-read/read-only snapshot transactions. No source or mart database objects, privileges or records were created or changed.

Live aggregate checks initially flagged 47 zero-value receipts. Read-only diagnostics proved all 47 have zero ledger cash and zero payment amount, with no duplicate payment moves, partner mismatch, precision mismatch, allocation mismatch or mixed currency. The adapter now accepts zero receivable balances while still rejecting debit receivable balances and mismatched amounts. A synthetic zero-value receipt regression fixture was added; its PostgreSQL execution remains pending under the current no-database-change constraint. Complete live grouped controls and invoice header/line checks then passed across **85,957 control records**. This is source calculation evidence, not source-to-mart reconciliation or Finance acceptance.

### Read-only results — September 2026, company 1, IQD

Observed October 13, 2026, using the restored existing relay. Receipt allocations reflect the extraction cutoff; due receivables reflect September 30. Ratios below are derived from exact operands and rounded to two decimal places for display.

| Metric | Source-calculated result |
| --- | ---: |
| Customer Cash Collected | 1,368,717,250.00 IQD |
| Cash Applied to Invoices | 1,351,755,500.02 IQD |
| Unallocated Customer Receipts | 16,961,749.98 IQD |
| Collections / Sales % | 94.58% |
| Weighted Collection Days | 24.18 days |
| Receivables Due for Collection | 574,565,359.12 IQD |
| Order Margin | 694,076,775.44 IQD |
| Order Margin % | 47.71% |

Matching operands: net invoiced revenue **1,447,213,000.00 IQD**, invoiced revenue **1,465,758,500.00 IQD**, refunds **18,545,500.00 IQD**, untaxed confirmed order value **1,454,635,000.00 IQD**, cash-weighted day numerator **32,678,828,587.62 IQD-days**. Cohorts: 3,724 receipt records (including 47 zero-value receipts), 2,889 confirmed orders, 2,892 posted invoices, 120 posted refunds and 35,392 product lines. The current net invoice result exceeds the earlier saved September figure by **46,500 IQD**; this fresh read does not overwrite or reinterpret historical certified releases.

The user clarified that Odoo alone must remain read-only and explicitly authorized analytics database updates for publication. Encrypted local backups of the analytics and control staging databases were taken with the app stopped, then decrypted in memory and verified as PostgreSQL archives without restoring them.

Staging migration exposed a pre-existing version-040 compatibility case: operational/historical datasets use mapping version 1, while the separately published customer Finance anchor uses version 6. The migration runner now temporarily stages only a standalone, differently versioned Finance anchor that is outside the operational/historical datasets and has exact published snapshots. The released SQL/companion bytes and checksums remain unchanged. On the same migration transaction it verifies all those snapshots survive unified adoption and restores the exact original binding through its unchanged certification trigger. Missing/inexact snapshots or incomplete adopted membership fail and roll back, including the staged binding. Synthetic tests cover this case, unchanged approval/snapshot payloads and refusal without exact snapshot evidence.

Final verification results and UI evidence are recorded in the delivery response. Unrelated pre-existing proposal documents remain untouched; their missing link to `docs/qa/multi-source-task3a.md` is a known documentation-sanity failure.

### Verification — October 13, 2026

- Frozen dependency installation, lint, types, architecture, baseline-aware quality (zero diagnostics), API/web build and diff gates passed. Existing web bundle-size warning remains.
- Full unit/API suite: **875 passed / 876 total**, zero skips. The sole failure is the pre-existing missing proposal-document link above; it is not a calculation, API or new UI regression.
- Full disposable PostgreSQL suite: **228 passed**, zero skips. After the final cutoff/routing safeguards, the five affected source/exposure/migration tests were rerun and passed.
- Manual UI evidence is a static preview of the actual metric-help component with explicitly synthetic metadata, not live staging acceptance: EN Light at 390px, AR Light at 390px, AR Dark at 1024px and EN Dark at 1280px; no page overflow in those views. Pending Finance review, Arabic days, technical-check reference disclosure and native Escape close were observed. Existing tokens/layout were reused. Full production dashboard interaction and real-data browser acceptance remain pending.
- Task-required quality findings resolved: pending review must not display Certified; duration values must use days rather than Arabic hours; invoice Customer capability routing must match exposure; unsupported review record drill-through must not show a dead affordance. No unrelated redesign was introduced.
- Read-only check confirms the actual laptop staging baseline fingerprint is compatible with the preserved pre-wave definition. No live mart migration, exposure, image rollout, push or merge occurred.
- The 30-minute relay follow-up was paused after SSH restoration revealed the source identity blocker described above, in accordance with its instruction to stop after notifying the user of required intervention. Finance sign-off is not reintroduced as a prerequisite.

### Final local publication — October 13, 2026

- The intended local staging mart is now **045**, with control **009**. Final API/web images are deployed; `/health/ready` returned HTTP 200 with persistence and analytics available. No company-hosted rollout, push or merge occurred.
- September review partition `20c1cdf1-e296-4ce4-b898-772f828d9b17` committed under trusted revision `6e8b8437-67d7-48c3-bd7e-f109b865cbb7`: **244,562 facts / 85,957 independently matched controls**, Finance review pending. Source cutoff: **2026-10-13T15:18:05.967Z**. The successful read-only extraction/exposure completed in approximately **199 seconds**. Earlier interrupted attempts rolled back; no partial release was served.
- Read-only runtime verification confirmed all eight summaries above, every new metric's Customer reporting (explicit Top 100 for Due), both margin measures by 40 salespeople, and all three invoice monetary measures by Product and Product Category. Cash has **2,006 Customer groups**; margin has **1,918**; net/invoiced Product results have **398**, net/invoiced Categories **36**. Product totals match the independent invoice headers. The Top 100 Due subset totals **440,849,106.63 IQD**, against the complete KPI **574,565,359.12 IQD**.
- All three default reports were executed through the application `DashboardExecutor`, with the actual configured tenant profile and read-only database accounts: Collections **9 widgets / 12 series**, Margin **4 / 6**, Product **2 / 6**; **zero failed or partial widgets/series**. Observed local durations were approximately **8.9 / 1.6 / 2.9 seconds**. No dashboards were auto-saved.
- The trusted manifest retains **13 existing fact months and 12 Finance snapshot months**, plus the September review month. All **12 existing Finance publications** and the original `el-dabboos-finance-202609-v6` binding remain intact.
- Odoo schema, records and privileges were never changed. Source sessions used connection-level default read-only plus repeatable-read/read-only transactions. Automatic approval review rejected persisting a source-policy exception for the existing account's `CREATEDB` permission; the successful load used only the explicitly authorized in-memory, task-scoped exception. Protected runtime source policy remains unchanged. The follow-up remains paused after completion.
- Final unit/API suite: **879 passed / 880 total**, zero skips; the only failure remains the unrelated pre-existing missing proposal-document link. Full PostgreSQL suite passed **230 tests** before the final forward optimization; afterwards the **22 affected forward-migration tests**, the real-sized control regression, **9 final source/exposure/adoption tests**, and **2 existing receivables tests** passed without skips. A **144,000-fact / 12,000-Customer** engine regression confirms bounded categorical snapshot ranking while preserving reassignment, policy, null/zero and ratio behavior. Final lint, types, architecture, quality (zero diagnostics), diff and frozen image builds passed.
- Quality AFTER findings resolved: an unbounded due-Customer default table exceeded the configured limit; it is now a separately labelled explicit Top 100 table. Repeated categorical aggregation stalled that view; operand caching preserves the same semantics and result limits. Prior EN/AR Light/Dark synthetic component evidence remains valid; the actual local browser reached the sign-in page, so authenticated visual/keyboard/responsive acceptance was not performed. Report **execution** was verified as described above and is not claimed as authenticated browser interaction.

### Company staging preparation — October 14, 2026

The user selected the normal repository pull/build/migrate/restart workflow. Company staging still runs `6012c8688bd860469310d23978e47540f4e36342`; the new review wave has not been deployed there. Operator-supplied read-only evidence identifies trusted revision `9b0f6aab-f31b-413a-b2e6-5eebba48c8c0`, 29 daily/monthly aggregate partitions with zero pending partitions, June 2024–October 2026 coverage and 28 Finance month ends (June 2024–September 2026). Preserve this broader hosted history; never restore or copy the laptop mart over it. The last successful sync cutoff remains October 12; the recorded sync failure/freshness issue is separate from application deployment. No analytics timers or services were loaded.

With API/web briefly stopped, the operator captured fresh protected custom-format backups of both hosted staging databases using the existing complete backup identity, then restarted the original images. Both checksums passed. Both archives restored successfully into the new PostgreSQL 18.6 container `el-dabboos-review-restore-20261014T095000Z`, with no network or published ports and independent persistent storage. Read-only comparisons against hosted staging returned MATCH for both databases: all application table counts, control/auth and migration-ledger fingerprints, and the selected Finance/serving history fingerprints. Large fact tables received count checks, not full content fingerprints. The prior October 12 restore container and existing hosted data/configuration/checkpoints remain untouched. These are operator-reported manual recovery results, separate from automated coverage and laptop archive-list verification.

The release is prepared in an isolated checkout excluding the unrelated untracked source-governance proposals. Its complete unit/API suite passes **880/880**, zero skips; the original-checkout proposal-link failure is outside the release. Frozen install, lint, architecture, quality, typecheck, diff and API/web builds passed. Hosted rollout still requires exact release selection, immutable migrations/role verification, original protected configuration, health/session/report checks, and separately bounded read-only source controls for hosted September exposure labelled Finance review pending. No merge or hosted migration is inferred from preparing the release.

Repository-release PostgreSQL verification covers all **231 tests**, zero skips: the first full run passed 229 and failed two scale tests solely on the disposable 2 GiB tmpfs running out of space (`53100`). Both affected files were rerun unchanged against a fresh disk-backed synthetic PostgreSQL 18.6 instance and passed. No application, assertion, timeout, source policy or staging change was made to accommodate the retry.
