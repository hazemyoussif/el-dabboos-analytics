# Event serving aggregates delivery — 8 October 2026, Cairo

Implemented and locally populated trusted daily event bases, exact monthly
rollups and deterministic hybrid range serving. Finance semantics remain unchanged.
No source writes, production/external deployment, push or merge occurred.

## Commits and scope

Branch `codex/production-pilot-lifecycle`, starting HEAD `526bf32`.

- `869559a`: preserved the accepted pre-existing historical, Finance, discovery and
  presentation work separately. Existing `.archify/` remains untouched/untracked.
- `83dc0cd`: migration 034, daily/monthly exact guards, range planner, affected-day
  refresh, operator commands/status, tests and owning documentation.
- The final local QA commit records the successful same-day correction fixture
  and this sanitized acceptance evidence; see the Git log for its resulting SHA.

## Storage and population

Daily bases reuse `analytics_aggregate_bases`: numeric additive value/count,
business date, measure and full governed dimension tuple under immutable tenant
partition lineage. Migration `034_event_serving_rollups.sql` adds relational
`analytics_monthly_bases` and `analytics_aggregate_proofs`, forced tenant RLS,
restrictive trusted-manifest policies, immutable/freeze guards and deferred
promotion checks. Proofs inherit baseline definition/mapping/timezone semantics.
No speculative index was added.

Backfill committed 13 trusted partition containers: October 2025–October 2026.
The twelve months through September are complete; October is available through
the October 8 trusted operational cutoff and remains partial. Persisted rows:
**171,527 daily event tuples; 117,394 monthly event tuples; 13 exact proofs**.
All 13 partitions were recognized as already proved on restart/rerun, with no
pointer/cursor advancement. Empty days are governed zeros inside coverage, never
proof that future days are loaded. October's stored rollup cannot serve a full
October request: the final operator plan clips it to October 1–8 and uses daily.

Backfill is atomic per month under the existing tenant job lock. Proof insertion
checks canonical vs daily, then daily vs monthly with bidirectional EXCEPT,
including identities, values, counts and observed dates. Proof freezes both
representations. Reviewed staging privileges were applied through the existing
non-inheriting-login privilege copier, including restrictive runtime policies.
Direct other-tenant monthly/proof reads returned zero rows.

## Planner, lifecycle and equality

Full exact months prefer compatible, proved monthly bases. Partial edges and day
output use trusted daily bases. Missing/incompatible monthly proof falls back to
trusted daily. Missing daily coverage preserves governed unavailable/partial
results. Operational runtime has no canonical-head query permission; its raw
fallback is closed. The existing independently certified repository fallback
remains available when no operational manifest exists.

Definition, mapping and business timezone must match the immutable baseline.
Inherited unchanged partitions can come from earlier physical refreshes, but only
through the current trusted manifest and compatible frozen proof. Filters and
policy scopes intersect against full tuples at both grains. Reads use the existing
repeatable-read transaction; no global result cache was introduced.

Exact local proof: **117,394 month/measure/tuple cases, zero mismatches** between
canonical, daily and monthly bases. Six selected-range proofs add **95,060 cases,
zero mismatches**, comparing canonical, daily-only and hybrid values/counts/dates
for exact May, May 7–23, 90 days, six months, twelve months and April 17–July 12.
This covers full tuples, preserving each supported dimension and intersections.
Ratios use summed operands; a synthetic two-month AOV is 250 rather than the
unweighted monthly average of 200. Zero denominators remain null. Moving average,
running total, policy-scoped contribution, ranking and Top-N regressions pass.
Existing approved monthly analysis restrictions remain intact.

Incremental sync/sweep retain old and new business dates. Unchanged days are copied;
changed days and their old/new tuples are rebuilt, then affected month rollups are
reconciled. New months get full seeds. Canonical equality checks scan only affected
months, never full history for a small correction. The scheduler still invokes
AnalyticsOperations, without separate daily/monthly refresh knowledge.

Successful October fixture: January 15 changes **100 → 200**, while January 20
remains **100**; January's daily sum/monthly result becomes **300**. Moving the
corrected fact to February 3 and Cairo → Baghdad leaves January **100**, February
**200**, and preserves earlier immutable proofs. Existing presence-sweep fixtures
remove the tombstoned identity from daily/monthly results and preserve old revisions.
Injected daily corruption, monthly corruption and refresh failure prevent promotion
and preserve the prior trusted pointer and cursor. Failed source controls retain
immutable evidence under the existing lifecycle.

## Query plans and performance

Actual staging runtime role, annual Order Revenue by salesperson, 64 groups,
identical total `17,690,355,501`:

| Path | EXPLAIN execution | Shared hits | Temporary reads |
|---|---:|---:|---:|
| Canonical operator comparison | 1,539.098 ms | 881,793 | 7,049 |
| Trusted daily-only | 79.561 ms | 4,472 | 0 |
| Trusted hybrid/monthly | 45.804 ms | 23,647 | 0 |

The raw comparison uses the permitted operator identity, not the runtime role.
Plans are measured with ANALYZE/BUFFERS. Before removing categorical range fan-out,
annual runtime order-revenue salesperson queries took about 1.22 seconds; the final
planned statement takes about 42 ms including adapter overhead. The planner now
scans each range/partition once and groups selected identities, instead of repeating
the range for every salesperson. No timeout was increased.

Authenticated `https://localhost:8443`, seconds; already running database, no
cold-cache claim. Sanitized Nginx elapsed includes API/proxy/body transfer, excludes
TLS connection setup and rendering. Four event families each passed September,
partial month, 90 days, six months, twelve months and mixed range; six/annual had
warm repeats. Receivables passed September and six/annual first/warm selections.

| Report | September | Six months first / warm | Annual first / warm |
|---|---:|---:|---:|
| Executive | 0.216 | 0.212 / 0.129 | 0.415 / 0.167 |
| Business Line | 0.433 | 0.616 / 0.512 | 0.778 / 0.619 |
| Salesperson | 0.488 | 0.638 / 0.650 | 0.856 / 0.857 |
| Invoice & Refund | 0.415 | 0.571 / 0.596 | 0.783 / 0.799 |
| Receivables | 0.422 | 0.415 / 0.324 | 0.338 / 0.313 |

Against the accepted earlier warm annual samples, Salesperson improves 4.967 →
0.857 seconds (about 83%); Invoice/Refund 3.693 → 0.799 (about 78%). Executive,
Business Line and Finance remain within the requested approximate guardrails and
ordinary machine variance. These are local samples, not load/cold-cache tests.

Monthly Executive trends return 1/6/12 points per series. An unsaved manual daily
invoice trend returns 30/17/183/365 points for September/partial/six/annual, totaling
`1,447,166,500` / `1,091,435,250` / `8,443,871,500` / `17,453,365,250` respectively.
Daily trend HTTP samples: 0.049 / 0.050 / 0.065 / 0.107 seconds. Monthly trend samples:
0.043 / 0.062 / 0.077 seconds. No dashboard was saved or model invoked.

The main matrix comprised **44 manual selections, 46 HTTP 200 executions** (the
two extra executions adopted/edited the unsaved trend). There were zero displayed
failed widgets and zero analytics-series-failure log records. The final coverage
bound repair passed 35 affected tests, a local operator mixed-range proof and a
final-image daily HTTPS smoke: 30 points, exact September total, no failures.
Coverage clipping cannot change the already covered September/annual/mixed values.
The API image's planner hash matches this checkout exactly. Final readiness is
HTTP 200; original Nginx logging configuration was restored.

## Regression, verification and limits

September event anchors remain exact: Net Invoiced Revenue **1,447,166,500**;
Posted Invoice Value **1,465,712,000**; Refund Value **18,545,500**; Order Revenue
**1,461,335,500**; Order Count **2,895**. All ten previously certified September
Finance monetary anchors match exactly, including Net Aged **1,359,461,092.61**,
Gross Components **1,532,751,636.39**, Credit Balances **−173,290,543.78** and
Overdue **600,440,611.46** IQD. Twelve independent Finance snapshot points take
107.620 / 50.919 ms first/warm at the runtime adapter.

Trusted serving revision, source cursor cutoff, original September binding and
historical collection remained unchanged across backfill/report acceptance.
No live source sync or source extraction was needed; correction/delete evidence
uses deterministic disposable fixtures rather than writing source data.

All nine required gates ran once at stable completion: frozen install, lint,
architecture, quality, typecheck, unit/API/web tests, PostgreSQL tests, build and
diff. Full unit run: **713 passed, zero skipped**. One final coverage planner test
adds a verified unique total of **714 unit/API/web cases**. Full PostgreSQL run:
168 passed and one obsolete migration-fixture exclusion failed; that fixture was
repaired and passed in isolation. **169 unique PostgreSQL cases verified, zero
skipped**. Final affected run: **35 passed** (28 PostgreSQL + 7 planner); the expanded
same-day correction fixture additionally passed. Final lint, architecture/quality
(zero diagnostics), typecheck and diff verification passed. No full-suite repeat.
Existing web build chunk-size warning remains; it was not hidden or reconfigured.
No CI run was triggered because nothing was pushed.

Actual limits: current October coverage is partial, and moving-average/comparison
permissions remain the existing governed monthly scopes. PostgreSQL/materialized
proof checks still scan affected months and copy unchanged daily rows inside a new
immutable month container. Broader scale/load and production backup/restore are
separate future gates. Browser automation stalled at the confirmation to discard
the temporary unsaved daily trend draft; that prompt/tab may need user cleanup.
No record was saved, so this does not leave persistent analytics/dashboard changes.

**Next milestone:** ready for Operational UX, then scheduler orchestration, then
governed drill-through/source verification. Reuse AnalyticsOperations/status and
existing cursor/failure guarantees; do not turn report reads into sync/proof jobs.

## Safety confirmation

```text
Finance/Receivables semantics changed = no
Receivables snapshots summed = no
event ratios averaged across daily/monthly ratios = no
untrusted aggregate used = no
monthly aggregate required for correctness = no
raw canonical facts deleted = no
historical certification overwritten = no
immutable reconciliation evidence rewritten = no
full history rebuilt for every small correction = no
historical correction propagation ignored = no
delete/tombstone propagation ignored = no
RLS bypassed = no
authorization weakened = no
timeouts increased to hide slow queries = no
LLM used in runtime calculation/reconciliation = no
Odoo/source writes = no
credentials exposed/committed = no
production/external deployment = no
external CD configured = no
push = no
merge = no
```

[Sanitized machine-readable evidence](event-serving-aggregates-20261008.json).
[Operator runbook](../integration/event-serving-aggregates.md).
