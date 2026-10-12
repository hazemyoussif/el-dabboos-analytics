# Hosted single-mart historical parity

## Current scope and evidence

The twelve dashboard templates are Sales & Invoicing plus these eleven dashboard reports: Executive Sales & Invoicing, Business Line Performance, Salesperson Performance, Customer Performance, Invoice & Refund Operations, Receivables & Aging, Historical Executive Trend, Sales vs Invoicing Trend, Business Line Trend, Salesperson Historical Analysis, Customer Historical Analysis. Data & Certification Status is a separate information page.

A read-only company-1 source probe on 2026-10-12 observed orders from 2024-08-03 through 2026-10-12 (69,195 headers), and posted customer invoices/refunds from 2024-06-26 through 2026-10-12 (70,943 headers). This establishes June 2024 as the first required historical month; it does not certify any source totals. Target closed-month coverage is June 2024–September 2026 (28 months), plus existing current October reporting. The previously accepted October 2025–September 2026 range and its 2026-10-11 approval remain immutable evidence.

Staging currently trusts October 2025–October 2026 facts. Load the sixteen absent months June 2024–September 2025 explicitly, including July 2024 even if its event population is empty. Publish independent customer Finance evidence for all 28 closed month ends; company summary evidence never grants customer grouping. Hosted execution and report acceptance remain separate from synthetic tests.

## Current publication contract

Migration 040 replaced separate historical activation with one trusted revision. Do not run `historical-activate.ts`, restore legacy serving bindings, or re-bootstrap an established baseline to extend coverage. The legacy activation code remains compatibility/recovery evidence.

1. `history-inventory.ts` discovers company-scoped source month metadata in a retained read-only snapshot. It prints only dates/counts, never customer records or credentials.
2. `historical-backfill.ts backfill --tenant el-dabboos-iq --from ... --to ... --checkpoint-dir ...` extracts complete monthly event and aging candidates and performs independent exact source/mart reconciliation. It does not certify or serve them. Event extraction prints bounded page progress with cumulative source-read, mapping, mart-write and reconciliation timings. Source statement and lease limits remain unchanged.
3. `historical-publish.ts` validates checkpoints, records explicit authorized business approval, approves mappings, certifies derived ratios, and writes in-place immutable promotion receipts. Existing approvals/receipts must agree on replay. Approval files are operator evidence of actual human authorization, never fabricated Finance approval.
4. `historical-import.ts` imports each certified month directly into the current trusted manifest. It requires dedicated migrator authority, exact whole-month certification and matching business approval. It copies normalized canonical facts using the existing operational recipes, compares complete daily dimension tuples and counts, rebuilds exact aggregates/drill lineage, checks every existing trusted month against current heads one month per SQL statement, checks the trusted parent and commits an immutable database checkpoint in the same transaction. Unchanged partitions and the operational cursor are preserved. Trusted revision changes are intentional. An interruption or mismatch rolls everything back; retry resumes from the database checkpoint. Conflicting checkpoint datasets/approval are refused.
5. `finance-snapshots.ts` requires the same explicit range flags as the backfill command. Each month end reads customer vectors and independent company controls from one retained source snapshot, then uses the current unified snapshot promotion contract. An already trusted snapshot is skipped; replacing existing customer evidence is a separate deliberate operation. Empty/invalid populations and any signed-bucket mismatch remain blockers, not invented zeros.

Each invocation is bounded to 1–24 complete months. Use one month for the initial measured canary. Finance's 28 cutoffs require two bounded invocations. Never copy local checkpoints into staging or overwrite an existing job approval.

## Incremental coverage behavior

Incremental source discovery still bypasses business-date limits to discover corrections and retirements. Ingestion applies those changes only to trusted fact months and deliberate forward catch-up months. Unseen identities in absent older months are deferred to complete monthly loading instead of causing accidental backfill. A record moving outside coverage retires its previous footprint at the original business date; a move back into coverage can reactivate it. Covered older months remain eligible for exact reconciliation and updates.

The immutable baseline recipes and approved end date remain unchanged. The oldest trusted fact month supplies the incremental historical dependency start, and summary aging reconstruction iterates only covered months through the approved snapshot end. Operational replacement partitions inherit their prior trusted capabilities, including narrower historical restrictions. Historical event queries and drill-through honor imported month coverage rather than clipping to the initial baseline start. Holes retain missing/partial semantics.

Existing-head parity compares the same complete measure/date/dimension/value/count tuples in both directions for every trusted fact month. Each statement binds one month to the existing partition index instead of hashing/sorting the entire history at once. Drift in an untouched month still blocks import; source/statement limits and immutable migration artifacts are unchanged.

A historical import refuses an already covered month or current heads that conflict with the certified full month. Resolve those through reviewed operational reconciliation; do not overwrite heads, reset the cursor, disable guards or weaken tolerances. A source lease loss never authorizes continuing an incomplete extraction with a different snapshot.

## Staging execution and acceptance

Use [the controlled rollout](staging-loading-rollout.md) for current pinned-image preparation, backup requirements, protected paths and per-month operator commands. Keep the stopped sync evidence until loading is verified. No scheduler is introduced.

Require all 28 closed fact months plus existing October coverage, zero pending aggregate partitions, unchanged operational cursor during historical imports, and independent exact customer snapshots for the intended cutoffs. Each trusted revision change must correspond to passing monthly or customer evidence. Verify all twelve reports in English and Arabic, company 1 / IQD, date and dimension filters, drill-through, saved dashboard lifecycle and role-scoped denial. Record real source equality, month timings and browser acceptance as hosted evidence; synthetic fixtures alone do not prove staging parity.
