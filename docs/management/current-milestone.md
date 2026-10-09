# Current analytics milestone — 9 October 2026

Repository finalization, with no new product functionality or external deployment.
Accepted implementation HEAD before finalization: `988f6e6` on
`codex/production-pilot-lifecycle`. All preceding accepted work is committed;
`.archify/` is intentional local-only untracked state and remains untouched.

## Completed local milestone

Governed bilingual dashboards support manual and AI drafts, canonical validation,
explicit versioned Save and multi-tenant authorization. The production analytics
foundation includes historical backfill, trusted serving, daily/monthly event
aggregates, Finance snapshots, forced RLS, operational UX and governed drill-through
with verified performance improvements. Completion here describes the accepted
repository/local staging scope, not unrestricted production launch approval.

Create Dashboard with AI and Ask Business share Analytics Intent semantics.
Ask Business includes EN/AR, clarification, semantic follow-ups, deterministic
direct answers, durable private conversation history, atomic audit, provenance,
View Details and supported Create Dashboard from Answer. See the
[shared AI core](../architecture/shared-ai-analyst.md),
[system design](../architecture/system-design.md),
[Finance operations](../integration/receivables-aging-v1.md) and
[drill-through contract](../integration/governed-drill-through.md).

## AI authority and provider acceptance

```text
Natural language
    ↓
provider-neutral Analytics Intent Planner
    ↓
validated Analytics Intent
    ↓
capability + authorization validation
    ↓
deterministic trusted analytics execution
    ↓
Dashboard / Ask Business / Drill-through
```

Dashboard generation also deterministically compiles compact generation intent
into canonical DashboardSpec v2; sparse AI edits compile into DashboardPatch v2.
Drill-through uses validated governed requests and pinned lineage, rather than a
new model query. Conversation memory is validated semantic state, rather than
transcript-only memory. The LLM does not own business truth.

```text
LLM-generated SQL = no
LLM directly queries Odoo = no
LLM directly queries PostgreSQL = no
LLM calculates authoritative business values = no
```

Live Bonsai planning and the authenticated Sales acceptance matrix passed after
prompt/schema orchestration regressions were corrected in the accepted feature
work, without changing Bonsai model settings. The Gemini diagnostic comparison
obtained no valid canonical plan/result comparison and supplied no evidence
requiring provider replacement; it is neither a required runtime dependency nor
an automatic fallback. [Differential evidence](../qa/ask-business-planner-differential-2026-10-09.md)
records those limits precisely.

**Ask Business local staging business testing = ENABLED.** This is the accepted
business-testing classification. The original planner-disabled runtime was
restored after temporary approved smoke; this document does not enable services.
[Final browser/navigation acceptance](../qa/ask-business-navigation-acceptance-2026-10-09.md)
supersedes earlier blocked handoffs.

## Validation and evidence

Accepted application coverage at `988f6e6`: **817 unit/contract tests and 180
PostgreSQL tests, zero failures/skips**, with frozen install, lint, architecture,
quality, typecheck, build and diff gates passed. This finalization changes only
repository documentation and safe example comments, so that full application
acceptance is retained, not regenerated. Finalization checks are recorded below
separately from accepted automated coverage and manual evidence.

The [QA evidence index](../qa/README.md) links the original reports. It does not
re-run or copy accepted QA. Local staging is reproducible through the
[shared staging runbook](../integration/shared-staging.md); the
[migration inventory](../architecture/database-migrations.md) owns schema heads.

## Intentional limits

- One grouping dimension per analysis.
- Ordinal-selection answers cannot always be converted to dashboards.
- Per-analysis-context answers cannot always be converted to dashboards.
- Product analytics is not yet published.
- Order Margin is not yet published as governed production analytics.
- Inventory is not yet published as governed production analytics.
- Procurement is not yet published as governed production analytics.
- Investigative “why” analysis is not implemented.

These are not blockers for this milestone. No new metrics, multi-grouping,
features, provider behavior, model tuning or scheduled source sync are added.

## Hosted deployment dependency

The initial target is one Linux staging server with HTTPS ingress, Web, API and
persistent PostgreSQL. The company LLM runs separately on the private network;
its OpenAI-compatible URL/model/authentication are runtime configuration. Local
Bonsai endpoint addresses are development-only, never hosted deployment defaults.
See the [deployment contract](../architecture/runtime-and-deployment.md).

```text
company LLM server access/URL = pending
architecture support = ready
runtime configured through environment = yes
```

Images, environment examples, explicit migrations and health/readiness boundaries
are available now. Company hosting/access, protected configuration, TLS, employee
activation, approved LLM access and operational backup/restore evidence remain
external gates. Build artifacts and server environment have independent lifecycles;
a release must never overwrite a protected server `.env`.

Next external steps (not performed):

1. Receive staging server/access.
2. Receive/build company LLM server.
3. Configure protected staging environment.
4. Perform first controlled manual deployment.
5. Verify staging.
6. Then activate GitHub main → staging automation.

## Finalization verification

- Documentation links/stable IDs and synthetic environment/runtime/staging tests: 20 passed, zero failed/skipped.
- Root and staging runtime examples parsed through the current configuration parser, without opening connections.
- Compose configuration validated with example env files and no real environment loading; services were not started.
- Manifest inspection confirmed contiguous SHA-256 entries and heads mart 037, control 008, SQLite metadata 005; no live migrations executed.
- Architecture, baseline-aware quality and diff gates: zero diagnostics; whitespace check passed.
- Initial sandbox child-process restrictions interrupted focused checks; successful reruns outside that restriction supersede those attempts.
- Hygiene review: existing env/database/runtime/build state is ignored; no ignore changes needed. Diff gate checks forbidden credential filenames; human review found only safe example comments/placeholders. No dedicated secret scanner is configured in this repository.
- No live QA regenerated, remote CI run, source operation or deployment performed.

Finalization file classification: README and architecture/integration/current-state
Markdown are repository documentation; `docs/qa/README.md` is a QA evidence index;
`.env.example` and `infra/staging/runtime.env.example` are deployment/configuration
examples (comments only). `.archify/` is untouched local-only state. Ignored real
env files, local databases, `.local-state`, dependencies and build outputs are
runtime/local artifacts and excluded from the commit. No source, test or migration
files change. Existing AI architecture and the updated deployment reference cover
the material decisions; no duplicate ADR is needed.
