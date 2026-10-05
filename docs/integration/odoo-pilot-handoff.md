# September pilot implementation handoff — 5 October 2026

Branch: `codex/production-pilot-lifecycle`. Base/main: `3a574affdbc00f09df28aab5f5ac74ea3566be3a`. Final review commit is reported in the task response. No push or merge is authorized/performed. The pre-existing untracked `.archify/` artifacts are preserved.

The user approved immutable pre-approval mapping ingestion/reconciliation, resumable bounded page writes, one combined comparison mapping with separate order/invoice recipes, and company `1` under `el-dabboos-iq` / `el-dabboos-odoo18-pg`. [ADR 029](../architecture/adr/029-ingestion-certification-lifecycle.md) records these focused decisions; ADR 027's other boundaries remain. No broader ETL/query/serving redesign or source write was introduced.

The resulting lifecycle is immutable candidate → candidate paged ingestion → terminal completion evidence → reconciliation of every page at the exact mapping release → metadata-only approval → separately authorized serving binding. Approval must include passing evidence for every mapped input, preventing order-only certification of the combined release. Partial histories cannot replace completed served revisions. Tests use synthetic bindings only; no production mapping approval or serving binding exists from this work.

## Changes and verification

Domain owns extraction/transaction evidence, bilingual transaction metrics, Business Line/city/state and bounded trusted tenant semantic preferences. Data owns migrations 006–007, immutable candidate registration, checkpoint transactions, completed-run reconciliation, runtime RLS visibility, read-only Odoo transport/mapper and independent DB controls. API owns the explicit `odoo:pilot` operator composition. Existing writer/query responsibilities were split into focused helpers to meet engineering gates. Historical debt entries were removed only where resolved; no allowances were added. [Operator procedure](odoo-postgres-pilot.md) describes configuration, commands and release gates.

Automated evidence uses disposable PostgreSQL 18.6, generated Odoo-shaped source rows and a dedicated synthetic SELECT-only role. It includes 2,893 rows split 1,000 + 1,000 + 893, atomic mid-page failure/rollback/resume, idempotent replay, terminal empty pages, partial-run rejection/RLS invisibility, completed correction visibility, mapping immutability/approval/binding gates, company isolation, source read-only identity checks, composite timestamp ties, lookup renames, incremental moved-date tombstones, decimal/tax/sign/date semantics, distinct customer counting and tenant preference compilation. Tests never load developer env files or use real customer/model services.

The synthetic source → mapping → mart → independent SQL control pipeline passes the supplied September candidate values:

| Control | Synthetic expected = actual |
| --- | --- |
| Confirmed orders | 2,893 |
| Order Revenue | 1,460,597,500.000000 IQD |
| Posted invoice value | 1,465,712,000.000000 IQD |
| Refund value | 18,545,500.000000 IQD |
| Net Invoiced Revenue | 1,447,166,500.000000 IQD |

Overall, Business Line General and salesperson controls pass; unassigned refunds retain company totals. The fixture has no September No Sugar activity, so no history is fabricated. These are synthetic controls, **not live September results or Odoo Invoice Analysis sign-off**.

Final verification: `pnpm install --frozen-lockfile`, lint, typecheck, API/web build, architecture, baseline-aware quality and diff gates passed. `pnpm test`: 583 passed, 0 failed/skipped. Full `test:postgres`: 77 passed, 0 failed/skipped. After the final page retry fingerprint correction, the lifecycle/writer PostgreSQL tests passed again (5 tests, 0 failed/skipped), including retry with a changed attempt timestamp; the prior successful committed timestamps are returned. Snapshot reconciliation also passed its targeted check. No test/quality suppression or new debt allowance was added. The disposable PostgreSQL environment was shut down after verification.

Current main CI was checked again after the retained snapshot extension for exact SHA `3a574affdbc00f09df28aab5f5ac74ea3566be3a`: push CI run 81 succeeded ([run](https://github.com/hazemyoussif/el-dabboos-analytics/actions/runs/37216467026)). That is main's status, not CI for this unpushed review branch.

The dashboard quality skill was applied in AFTER mode to bilingual catalog/filter contracts and generated semantic choices. No web renderer or screen implementation changed. Browser QA with served production data remains gated on the future authorized binding. Existing Vite chunk-size warning remains; no unrelated bundle work was undertaken.

## Live gates and next action

Live September extraction/reconciliation remains blocked. At the configuration check, all `ODOO_SOURCE_*` variables and `MART_INGESTOR_URL` / `MART_MIGRATOR_URL` were absent from shell, `.env.local` and `.env`; only presence was inspected and no values were printed. The initial configuration request preceded the retained PostgreSQL snapshot extension below. No live source or mart connection was attempted.

Operator: configure the local tunnel/dedicated read-only source identity and separately owned mart credentials; supply the actual candidate identity/version and confirmed owner. The retained operation now derives source snapshot evidence and source-as-of directly from PostgreSQL. Verify real schema/custom stored geography names, then run the narrow September commands. No source DDL/indexes/extensions/role provisioning are performed by application code. Null geography remains valid; exact custom GPS names cannot be certified from synthetic fixtures.

Business owner: capture authoritative Odoo Invoice Analysis company, date range, active filters, measure, invoice/refund/tax basis and overall/Business Line/salesperson totals. Investigate any difference before approval. No unresolved numerical difference is claimed because that report has not been supplied or accessed.

User: explicitly approve the serving step only after authoritative reconciliation passes. Live tenant profile/preferences, membership/configuration and browser/product QA belong to that later governed step. No additional architecture conflict is known after the approved extensions.

## Retained PostgreSQL snapshot extension

The subsequent approved scope extends ADR 029 and source orchestration only. A dedicated read-only repeatable-read owner transaction supplies PostgreSQL transaction time, a runtime-only export capability and its actual transaction-visibility descriptor. Every order page, posted invoice/refund page and source DB control imports and verifies that same snapshot. Durable evidence fingerprints the descriptor under source identity; an independent lease reference prevents reuse of an old run under a new owner. No snapshot token is persisted, and no caller-provided snapshot description is accepted.

One logical extraction owns both object streams. Its final bounded page, completion checkpoint and candidate reconciliation commit atomically in the existing mart transaction. Earlier pages remain incomplete until that commit. Tests exercise source mutations during extraction, in-process checkpoint resume, owner termination, old-run rejection under a new lease, terminal certification rollback and duration expiry/cleanup. Owner loss or process exit requires a new extraction ID; this is not cross-process resume. The lease defaults to 120 seconds and cannot exceed 600 seconds. CLI cleanup closes it before returning results; no approval/report wait occurs inside it.

Current local configuration presence checks still show required source and mart identities absent. No live source/mart connection, ingestion, mapping approval, serving binding, push or merge was performed. Synthetic test totals are not live results; authoritative Invoice Analysis remains the next reconciliation gate after the configured live DB pilot.

Extension verification: frozen install, lint, typecheck, build, architecture, baseline-aware quality and diff gates passed. Unit tests: 583 passed, none failed/skipped. PostgreSQL tests: 81 passed, none failed/skipped, including all four retained-snapshot lifecycle scenarios. The first full PostgreSQL run encountered a reconciliation statement timeout while unit/build checks also ran; the isolated full rerun passed without increasing timeouts or changing reconciliation SQL/indexes. The existing Vite chunk-size warning remains. No new architecture conflict is known.
