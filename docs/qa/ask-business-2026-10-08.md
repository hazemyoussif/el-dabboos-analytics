# Ask Business delivery — 2026-10-08

Branch `codex/production-pilot-lifecycle`; base `ecd5b40`. This milestone adds
conversation orchestration, persistence, deterministic answers, API and bilingual
web UI above the shared core. Local commits only; no push, merge or deployment.
Implementation commits: `623ed75` (governed conversations/answers/API) and
`c5883e5` (bilingual Ask Business UI). The documentation commit containing this
report is final HEAD; its exact SHA is reported in the delivery response.
`.archify/` remains untouched. No existing customer, staging or development database
was migrated. Operator action: explicitly apply metadata migration 005 or control
migration 008 before enabling this release. The mart needs no new migration.

## API, persistence and audit

Authenticated `/api/ai-analyst/conversations` creates/lists private sessions;
`/:id` reopens one, and `/:id/messages` accepts a bounded question, page context,
canonical clarification choice and expectedVersion. AI-generation and analytics
permissions are required. Ownership uses both tenant and user. A scope change
invalidates historical semantic reuse. Fresh identity is checked after planning,
during executor capability preflight and before saving; the write transaction also
checks live membership, role permissions, domains and exact enforced scope.

Conversation update and question audit are one CAS transaction. Audit contains
actor, tenant, conversation/message IDs, effective executed periods, SHA-256 intent
identity, capability/execution statuses and release/snapshot references. It contains
no question text, result rows, provider response, reasoning or secrets. Duplicate
audit insertion rolls back the conversation update. SQLite rejects audit UPDATE;
PostgreSQL control runtime lacks UPDATE on this audit table, and mart runtime
identities cannot read control conversations.

Retention: 30-day private sessions, 20 sessions per owner, 20 display turns/session,
1 MiB display-record budget (oldest turns evicted), 30 rows/panel and 600 rows/answer,
visible truncation, separate bounded semantic memory, 90-day safe audits.
Cleanup runs opportunistically on create/append. No scheduled purge was added.

## Direct answers and semantic continuity

All quantities below are **synthetic fixture results**, not production business data.
September order revenue is 425 IQD. Noor Hassan (`rep:b`) is first at 250 IQD;
second is Ahmed Ali (`rep:a`) at 100 IQD. The follow-up retains IDs in order b,a;
“compare those two over the last six months” executes May 1–Oct 8 with a,b filters,
using 100 and 250 rather than reconstructing names. A new unrelated lowest-ranking
question resets these references to Sara Omar (`rep:c`). Comparison difference,
previous-period values and nulls come from structured execution. May–August trend
points are 5 IQD each; September is 425 IQD.

A date-free question inherits the visible September page context; an explicit
August plan executes August. Ambiguous “best salesperson” offers canonical metric
buttons; a choice resumes the original question/context and records the resolved
metric. Unoffered choices fail before planning. No full transcript or ownership
signature is sent to the model. Malformed plans and provider failures are safe
INVALID_PLAN / AI_UNAVAILABLE outcomes. Product-unavailable questions produce a
capability limitation without source access.

Scalar, top-one, pair difference and period comparison summaries are deterministic
EN/AR templates. Rankings and grouped answers use exact tables; trends use existing
chart theme plus a precise-value table. Comparison charts distinguish the second
series with label and dashed line; nulls remain gaps. Multi-analysis results render
separate panels. Optional synthesis (`ANALYST_SYNTHESIS`, default false) selects
bounded validated evidence indices only; deterministic summaries own numbers.
Invalid/down synthesis leaves the structured answer intact.

Snapshot rendering explicitly separates requested cutoff from balance date. Unit
coverage retains an Oct 8 request with Sep 30 snapshotAsOf. The full trusted
PostgreSQL suite also verifies latest snapshot <= cutoff, scoped customer ranking,
immutable snapshot drill lineage and partial/event coverage. These Finance
semantics were not changed. No real-data Finance browser claim is made.

## UX, provenance and actions

English Ask Business / Arabic اسأل عن أعمالك is a first-class destination. Workspace,
visible period, editable question, real loading state, private history and new
conversation are available. Latest answers appear first. Each answer exposes its
executed period; source entity labels use governed metadata. Provenance separates
metric definition/formula/date basis, filters, grouping, analysis, certification,
reconciliation, source check time, coverage and snapshot date. Missing reconciliation
is “Not supplied”; a demo is labelled demo rather than certified. The repository
contract supplies no reconciliation timestamp, so none is invented.

Create dashboard reuses saved validated intent, deterministically resolves canonical
presentation, performs full validation/authorization/publication checks and opens
an **unsaved draft** with the executed period and explicit Save. Tests assert no
extra planner call and zero saved records. Ordinal/per-analysis context conversion
remains rejected with an explanation; no semantics are dropped.

View details derives query, stable key and immutable release from the saved panel,
then opens the existing governed drill-through modal. API tests pin `test-release`
and `rep:b`; guessed keys fail. DOM tests exercise the actual detail dialog in EN/AR.
Selection-only ranking/Top-N is drillable; transformed, partial and time-group
answers remain unavailable when raw-detail equivalence is unsupported.

## Manual browser evidence and quality review

Disposable synthetic Fastify API + Vite preview; synthetic IQ admin identity;
SQLite control and mock canonical facts; no Odoo/Teleport/model connection.
EN/AR input, clarification, highest→second→those-two continuation, scalar/ranking,
provenance, detail modal and conversion were exercised. Saved trend was reopened
through the history selector after navigating away. Conversion visibly showed
Unsaved draft, explicit Save and May 1–Oct 8 period. Save was not clicked.
The deliberately minimal fixture does not provide dashboard-library endpoints;
its converted dashboard shows that fixture limitation independently of the answer.

Both Light and Dark were reviewed at 390, 1024 and 1440 pixels for both languages.
The final trend matrix has one chart and five exact table rows in all 12 cases;
page scrollWidth equals clientWidth in all settled cases. Browser resizing briefly
produced one stale desktop-width frame; its settled phone geometry and screenshot
were rechecked. This is browser fixture timing, not a persistent layout overflow.

AFTER quality findings:

1. High: latest answers were buried beneath old answers. Fixed newest-first order.
2. High: stable entity IDs appeared when evidence lacked hydrated labels. Fixed
   retained metadata labels and governed filter/detail label hydration.
3. Medium: chart component responsibility exceeded complexity ceiling. Extracted
   chart renderer, reused central theme, labelled/dashed comparison series.
4. Medium: All time was incompatible with this bounded intent context. Removed it
   from available Ask Business choices through an optional shared-control flag.

Native textarea/select/button/details semantics, visible theme focus rules and the
existing focus-contained Escape-capable drill modal are reused. Automated DOM
coverage exercises input examples, canonical choices, provenance, detail close and
conversion in both languages. This is representative coverage, not a certification
of every assistive technology. No unrelated dashboard redesign was introduced.

Evidence: [desktop](ask-business-2026-10-08/ask-business-final-desktop.jpg),
[Arabic dark phone](ask-business-2026-10-08/trend-ar-dark-390.jpg),
[12-case geometry matrix](ask-business-2026-10-08/trend-matrix.json).

## Evaluations, provider conformance and performance

The original 32 balanced semantic cases remain; 16 balanced conversational cases
add clarification, resolution, ordinal, entity reference, period override, page
inheritance, dashboard action and drill action: **48 cases, 24 EN / 24 AR**.
API tests run all 16 new cases. Existing representative direct-vs-canonical-dashboard
parity and shared semantic tests pass. Fake-provider results prove contract and
execution behavior, not real language interpretation accuracy.

Bonsai/local and Gemini-compatible OpenAI-compatible transport/schema projection
remain covered by loopback conformance tests in the full suite. Optional live smoke
was kept outside tests and used only synthetic context: configured endpoint returned
UNAVAILABLE on its first question; Gemini-compatible endpoint was NOT_CONFIGURED.
No live latency, semantic accuracy or success claim is available. Completion does
not require a live endpoint. [Smoke outcomes](ask-business-2026-10-08/live-smoke.jsonl).

Ten samples per case, in-process HTTP injection, fake structured planner, seven
synthetic order facts, SQLite control, synthesis disabled. Medians (milliseconds):

| Case | Planner | Capability | Execution | Synthesis | Pipeline total | HTTP incl. save/audit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Scalar | 0.83 | 0.52 | 0.15 | 0 | 2.71 | 4.91 |
| Ranking | 0.63 | 0.40 | 0.12 | 0 | 2.17 | 3.72 |
| Trend | 0.63 | 0.61 | 0.15 | 0 | 2.45 | 3.98 |
| Comparison | 0.65 | 0.47 | 0.13 | 0 | 2.66 | 4.88 |

[Raw samples](ask-business-2026-10-08/performance.json). These are synthetic engine
and orchestration measurements, not network/live-model or production-scale SLAs.
Total pipeline is measured before persistence; HTTP includes persistence/audit.
Actual stage sums may be below total because total includes other orchestration.

## Gates and security evidence

- Frozen install, lint, architecture, baseline-aware quality, typecheck: passed.
- Full unit/contract suite: **813 passed, 0 failed, 0 skipped**.
- Full disposable PostgreSQL suite: **180 passed, 0 failed, 0 skipped**.
- API/web production builds: passed; existing >500 kB web chunk warning remains.
- Targeted post-review API/DOM/answer tests: 13 passed; final diff gate: 0 diagnostics.
- CI was not run; no remote final-SHA status is claimed.

Full coverage includes dashboard generation/edit, manual builder, saved lifecycle,
shared filters, drill-through, forced-RLS trusted serving, operational aggregation,
Finance, publication and migrations. A synthetic scoped Baghdad manager with an
explicit fixture-only analyst role sees Ahmed Ali at 100 IQD, excluding global
leader Noor in Basra before ranking. Production role grants were not expanded.
Unauthenticated, wrong tenant, private cross-user, stale version, revoked membership,
invalid choices and guessed drill keys are rejected. PostgreSQL checks verify
control isolation, exact snapshot semantics, forced RLS and transactional revocation.

Ask Business composes only the configured analytics repository/capability port.
Tests and browser fixture have no source adapter. Trusted PostgreSQL reads succeed
from published serving without Odoo/Teleport. No live customer source was contacted. The disposable preview was stopped, its QA
tab closed, viewport override reset and the dedicated PostgreSQL test containers
stopped after verification.

## Remaining limits and safety confirmation

One grouping per analysis remains: simultaneous Salesperson × Month is unsupported;
separate analyses can show separate perspectives. Ordinal and per-analysis contexts
cannot currently become a canonical dashboard. Unsupported detail transformations
are explained rather than fabricated. Mock/disabled planner runtime returns
AI_UNAVAILABLE; a structured configured provider is required to interpret questions.
Live-model language quality remains unverified. Retention cleanup is opportunistic.
History picker identifies sessions by update time; identical timestamps can be
ambiguous. Real customer browser validation and remote CI/deployment are not claimed.

All requested safety confirmations are **no**: second incompatible semantic planner;
loss of Create Dashboard analytical parity; removal of Bonsai/local support;
provider-specific architecture; LLM SQL; LLM direct PostgreSQL/Odoo access;
LLM authoritative calculations; hallucinated unsupported capability; silently guessed
ambiguity; entity references derived from display strings; lossy dashboard conversion;
prose-derived drill; authorization/RLS bypass; changed Finance/snapshot semantics;
source-connectivity requirement; Odoo writes; push; merge; external deployment.

Next safe step: apply the explicit control migration in the intended environment,
configure the existing structured provider, then run the optional live EN/AR
language smoke and real-data browser acceptance with an authorized business owner.
