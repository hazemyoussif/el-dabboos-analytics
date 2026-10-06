# Published capabilities and certified default handoff

Branch: `codex/production-pilot-lifecycle`; base: `0874648ecb18159d3c740c28b1aa3507798bc84e`. Final commit is recorded in the delivery response. Existing Odoo work, environment examples and `.archify/` are preserved outside this change. No push, merge, external deployment, source mutation, synchronization, backfill or authentication change.

## Actual published inventory

Staging runtime release: `el-dabboos-iq` / `el-dabboos-staging-comparison-202609-v1`, source `el-dabboos-odoo18-pg`, mapping `odoo18-staging-comparison` v1, certification `FIN-OIA-STAGING-2026-09-V1`, period 2026-09-01 through 2026-09-30.

| Metric | September summary | Business Line | Salesperson |
| --- | --- | --- | --- |
| order_revenue | Published | Published | Published |
| order_count | Published | Published | Published |
| cancelled_orders | Published | Published | Published |
| net_invoiced_revenue | Published | Published | Published |
| invoiced_revenue | Published | Published | Published |
| refund_value | Published | Published | Published |
| invoice_count | Published | Published | Published |
| refund_count | Published | Published | Published |

Eight summary capabilities and sixteen exact grouped pairs derive from the 308 approval-linked September cases. No time grain, comparison, Top-N, ranking, contribution, cumulative or moving-average permission is projected. Semantic catalog possibilities and the eleven-metric immutable mapping declaration are broader; they are not consumer authorization. Averages and distinct customers remain absent because input/independent dimension certification does not approve those outputs. Sum follows the additive semantics; alternative aggregation overrides are blocked.

The new default requests Net Invoiced Revenue, Posted Invoice Value (`invoiced_revenue`), Refund Value and Orders (`order_count`) with runtime values 1,447,166,500 IQD; 1,465,712,000 IQD; 18,545,500 IQD; 2,895. No values are hardcoded. No additional business approval event or recertification was fabricated: the new projection narrows the already approved release.

## Preservation evidence

Read-only before/after pilot and staging snapshots are identical, including mapping specification fingerprint `d5b9efe036d50c6cc4a39c22037b9592`, all eight retained lifecycle table fingerprints, 24,335 fact revisions/heads, 308 reconciliation cases and the existing composite serving binding. Pilot remains unbound. Staging runtime is ready; unrelated tenant is not ready and sees zero facts. Existing publication receipt and certification are untouched. Migration 010 adds only safe summary access; it changes no approved mapping or customer fact. Per-series result metadata includes release provenance without physical formulas.

## Compatibility and backlog

Generic Sales Performance is partially supported (Orders only) and cannot instantiate in staging. Its requirements remain exact canonical revenue, gross margin, average order value, gross profit and outstanding balance metrics; month/YoY revenue, branch revenue/profit, customer Top-N revenue/profit and latest receivable snapshot semantics. Missing requirements are retained in the canonical template requirements and shown before execution.

Future work needs an explicit tenant business decision for executive revenue; approved cost inputs and profit/margin semantics; explicit average numerator/denominator controls; customer grouped reconciliation; governed branch mapping and grouped controls; certified current/prior-year monthly history for YoY; governed outstanding/open-receivable snapshots; separately proven analyses and transformations. Existing net invoice, order value and generic revenue concepts remain distinct. No global alias or large policy subsystem was necessary for this four-exact-metric template.

## Verification

Frozen install, lint, architecture, baseline-aware quality, TypeScript, unit/API tests, PostgreSQL tests, production API/web builds and diff checks are run locally. Full unit/API suite: 608 passes, zero skips. Full PostgreSQL suite: 108 passes, zero skips, plus targeted per-series provenance and v1/v2 history checks. New tests cover different physical recipes producing the same canonical capability, exact pairs, unproven analyses/aggregations, template classifications, planner rejection, forged manual/HTTP requests, fresh capability changes, tenant isolation and actual synthetic v2 certification/binding without v1 mutation. Existing EN/AR matrix executes all twenty templates across both synthetic markets.

Manual production-built staging verification uses the existing authenticated tenant-admin and unchanged serving binding. English/Arabic, Light/Dark, phone/tablet/desktop and the incompatible template message/palette are checked. No dashboard is saved for QA. Separate synthetic browser preview is blocked by browser client policy; it is not a manual pass. Heavy concurrent PostgreSQL tests caused honest statement-timeout errors during one browser check; final verification is repeated after that workload ends. Grouped salesperson queries retain the known runtime performance limit; no grouped chart is added to the default and no timeout/error is suppressed. The existing Vite large-chunk warning remains non-blocking.

UI quality review: (1) High — the longer authenticated tenant title squeezed the header breadcrumb into a narrow vertical column; fixed header/control wrapping in the existing shell tokens. (2) Medium — unsupported templates and builder choices implied globally available capabilities; fixed preflight, narrowed palette/groupings and disabled unproven analyses. (3) Low — English missing-capability punctuation used Arabic commas; corrected inside the affected component. Pointer drag/drop and live external-model generation are not manually rerun; deterministic builder and fake-provider coverage pass. CI is not run: no push is performed.
