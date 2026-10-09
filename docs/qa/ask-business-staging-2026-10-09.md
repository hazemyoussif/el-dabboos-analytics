# Ask Business local staging acceptance — 2026-10-09

**Ask Business local staging business testing = BLOCKED.**

The initial acceptance and the subsequent provider differential are recorded separately.
The [current differential and recovery report](ask-business-planner-differential-2026-10-09.md)
supersedes the initial interpretation failures and provider-approval status below.
Bonsai interpretation recovered in bounded live tests without changing model settings.
Full business enablement remains blocked by incomplete final administrator/browser
checks. The original planner-disabled runtime is restored after validation.

## Initial acceptance phase (historical evidence)

The following sections describe the first acceptance pass, before the approved
Gemini reference and historical Dashboard investigation. Counts and failed cases
in this section are phase-specific, not the final recovery results.

## Repository and local runtime

Branch `codex/production-pilot-lifecycle`; starting HEAD
`e45056ef03bdf00fc0de1d3d0819f6f5c278b4a2`. Implementation commits `623ed75`,
`c5883e5`, `e45056e` were present. Focused fixes and this report are committed
locally; final SHA is supplied in the delivery response. No push, merge or external
deployment. Existing untracked `.archify/` is untouched.

Production-style persistent staging at https://localhost:8443 was rebuilt from
API/web Docker images. Protected runtime files remain outside Git, mode 0600.
Runtime auth/database/source settings were retained. Only the existing model
configuration was copied and its verified Bonsai host updated to 192.168.1.16.
Discovery of existing port/path returned `/v1/models` HTTP 200 on port 8080,
confirming the configured Ternary-Bonsai-2-27B-PTQ1_0.gguf model. No port/path/model
fallback was guessed. Synthesis and structured-output debug logging were disabled.

The pre-acceptance planner was disabled. Acceptance temporarily enabled the same
structured adapter. Business enablement must remain disabled because required
live semantic scenarios failed; ordinary trusted analytics remain ready.

## Migration governance and readiness

Applied `008_analyst_conversations.sql` through the normal staging operator
mechanism, after stopping API and taking a protected control backup. Exact SHA-256:
`020a078cc2f653ad7f28376c9ffa0214f51c973f558bad26d9d6fcec396bfe02`.
Control versions 001–007 were preserved; control is now 008 and mart remains 036.
The manifest/checksum/advisory-lock/transactional mechanism was reviewed. A second
migration run and exact-schema/runtime-role verification passed without pending
schema changes. No mart migration, volume reset, source activation or ad hoc
application table creation was used. Readiness returned 200 with persistence and
analytics available. Nginx syntax passed.

Conversation indexes support owner history and expiry; audit has separate retention
index and immutable message identity. Owner FK constraints retain normal no-action
semantics. Conversation update, expected-version CAS and safe question audit are
one transaction. Runtime may update conversations but cannot UPDATE audit or write
the migration ledger. Forced-RLS mart runtime cannot connect to the control DB
(actual PostgreSQL error 42501). New control tables use existing trusted service
ownership/explicit tenant-user predicates, **not control-table RLS**. All 39 mart
RLS tables remain FORCE ROW LEVEL SECURITY; mart runtime is neither superuser nor
BYPASSRLS. No policy or grant was weakened.

## Persistence, audit and authenticated privacy

The user performed a fresh staging sign-in. Created conversations and answers were
retrieved after refresh, navigation and API/web image recreation. Existing admin
session also survived. Conversation display/history is private to tenant + user.
Final restart verification found 29 retained messages and 29 matching safe audits.
Saved-record count remained one; the converted draft was not persisted. An actual duplicate
audit insert raised 23505 and rolled back the conversation/version update exactly.
No question, result rows, provider output, reasoning or credentials entered safe
question audit. No display transcript entered the planner prompt.

User explicitly approved the existing temporary QA placeholder with only
`dashboard:view`, `analytics:query`, `ai:generate`, Sales domain, and one existing
salesperson scope. Provisioned credentials were generated in memory, never printed
or shared. Real HTTPS login returned 200. Authenticated cross-user read returned
404, cross-user history excluded admin sessions, wrong tenant returned 403,
unauthenticated valid request returned 401, and revoked session returned 401.
Scope change returned 403 for old semantic state. Actual live ranking applied the
scope before ranking: a globally ninth-ranked salesperson became first within
that allowed scope, and the global leader was excluded. Independent trusted
repository controls confirmed the value. [Safe scoped evidence](ask-business-staging-2026-10-09/scoped-security.json).

After each QA run: all QA sessions revoked, temporary local identity disabled,
viewer membership suspended, original viewer role and empty scopes restored,
custom acceptance role removed. The disabled local binding/auth record and safe
governance audit remain; no reusable credential was shared. Product user activation
is retained under its governed lifecycle, but it has no active identity/membership.

## Core live scenarios

These were real normal HTTPS Ask Business UI/API requests with live Bonsai, not
fixture-intent injections. Independent repository controls are separate evidence.
Exact business values and source identities are kept in the private local acceptance
report rather than committed customer-data extracts.

| Scenario | Actual result | Acceptance |
| --- | --- | --- |
| Net invoiced revenue in September, EN | Correct canonical metric and September 1–30. Initial admin answer had unnecessary month grouping but correct one-month total; final scoped replay returned a scalar matching trusted control. | Passed measure/value/period; final admin scalar UI replay blocked by browser |
| Highest order revenue in September, original EN wording | Baseline exhausted 2,048 tokens, no JSON. Profile restore returned an unnecessary metric clarification. Final guidance returned Top-N limit without dimension/direction, rejected as Invalid analytics Top-N anchor, no analytics execution. | **Failed live interpretation** |
| Explicit top 1 salesperson by order revenue in September | Correct salesperson + canonical metric + top=1 + September period, exact trusted leader. | Passed additional diagnostic; does not replace failed original question |
| What about second place? after valid top-one result | FOLLOW_UP rank=2; deterministic unrestricted ranking then ordinal selection, same metric/dimension/September, correct stable ID/value. | Passed |
| Compare those two over last six months | FOLLOW_UP compare_entities count=2. Application reused exact prior stable IDs, May 1–Oct 9; partial coverage visible, missing dates not zero. Correct two values and difference. | Passed |
| General vs No Sugar order revenue in September | Missing categorical grouping/Top-N anchor in model output; schema rejection, no execution. Independent business-line control has only one published group. | **Failed live interpretation**; no invented No Sugar value |
| Net receivables as of October 8, admin EN | Correct net_aged_receivable, requested cutoff Oct 8, actual snapshot Sep 30. Model unnecessarily grouped by customer. Existing Finance report total matched independent trusted control. | Snapshot behavior passed; requested direct total not accepted |
| Best salesperson, scoped EN | AMBIGUOUS offered canonical authorized metric choices. Selecting order_revenue produced a Top-N plan without categorical grouping; capability resolution rejected it. | Initial clarification passed; **resume failed** |
| Trending products this month, scoped EN | UNSUPPORTED_CAPABILITY, no execution. | Passed safe limitation |
| Arabic net invoiced revenue in September | Canonical scalar, same September period and scoped trusted value. | Passed authenticated API language smoke |
| Arabic highest order revenue in September | Salesperson, order_revenue, top=1, correct scoped ID/value/rank. | Passed authenticated API language smoke |
| Ordinal after scalar | INVALID_PLAN with zero execution and zero panels. | Passed live safety regression |

Scoped user cannot provide an admin-wide Finance acceptance claim. Arabic API results
are not represented as an Arabic browser/RTL pass. Highest→second→comparison succeeded
only from the explicitly qualified top-one probe; exact original wording remains a
blocker. Model/capability rejection is separate from deterministic engine behavior.

## Focused fixes and provenance/actions

1. Nginx default 60-second read timeout caused 504 while the API later persisted the
   answer. Added only `/api/ai-analyst/` 300-second read timeout in repository and
   protected HTTPS staging configuration. This transport fix does not solve latency.
2. Restore existing optional Bonsai thinking budget 512 and seed 42 in protected
   runtime; keep max_tokens 2048, temperature 0, same schema/prompt for matched test.
3. Ordinals require categorical entity references. Planner state cannot cross a
   failed or unresolved latest turn unless its canonical clarification is supplied.
   Regression exercises scalar, pending clarification and malformed latest plans,
   asserting no extra execution. Valid first/second/stable-ID continuation remains.
4. Shared instructions clarify explicit metric meaning and unrequested grouping;
   direct instructions specify categorical selection and complete Top-N intent.
   Guidance did not make the failing English scenarios pass. Strict validators,
   provider neutrality, executor authorization and canonical compilation are unchanged.

Expanded How-was-this-calculated on the actual comparison: canonical definition,
formula/date basis/aggregation, effective period, Salesperson grouping, hydrated
business filters, no invented analysis, reconciliation Not supplied, source check
time and coverage visible. Snapshot answer explicitly separated cutoff/balance date.
Normal authenticated saved-answer details and drill routes returned 200, 50 rows,
exact pinned release, correct full-context value, 138 ms combined client time; no
planner call or prose reconstruction. Browser drill-modal action could not be
completed after the browser stopped accepting clicks, so API evidence is distinct.

Comparison conversion returned 200 in 237 ms without a provider call and opened
an Unsaved draft with identical May 1–Oct 9 period and two stable entity filters.
Explicit Save remained available and was not clicked. Second-place conversion was
disabled with a visible meaning-preservation explanation; automated route checks
verify its 409 rejection. No new saved record was created by conversion.

## Latency regression and before/after evidence

Original uninstrumented scalar took 70.561 s pipeline and hit the proxy's 60 s
limit. The controlled warm profile experiment kept identical prompts/schema and
compared three normal questions before and after restoring the existing settings.
[Per-question stage tables](ask-business-staging-2026-10-09/timing-tables.md) and
[sanitized traces](ask-business-staging-2026-10-09/performance.json) contain request
origin, state load, context/schema preparation interval, provider start, HTTP headers,
response completion, parsing, validation/capability, trusted execution, rendering,
optional synthesis gate, audit transaction and HTTP completion.

| Matched question | Before HTTP | After profile HTTP | Tokens before → after | Meaning after |
| --- | ---: | ---: | ---: | --- |
| September invoice scalar | 58.662 s | 20.577 s | 1744 → 594 | Same correct total |
| Highest order revenue | 68.661 s | 20.142 s | 2048 → 561 | Unnecessary clarification; not a pass |
| Second after unresolved ranking | 47.158 s | 19.236 s | 1396 → 542 | Reused stale monthly state; subsequently guarded |

The matched scalar server generation fell from 56.853 to 18.883 seconds. Prompt
processing remained about 1.5 seconds. Profile drift, especially omitted bounded
thinking, explains the dominant measured regression; changing the already tested
budget and seed together is the measured intervention. Separate reasoning-token
counts are not exposed, so no exact reasoning-token attribution is claimed.
The truncated ranking spent 67.668 seconds generating 2048 tokens and returned no
answer content. Parser, schema checking, execution and save/audit did not cause it.

Final probes: explicit top-one HTTP 21.818 s; valid second 19.400 s; stable-ID
comparison 20.231 s. The final original highest wording failed safely in 30.549 s;
that cold request spent 9.714 s processing its uncached prompt. These are individual
samples, not SLAs or repeatability distributions.

Provider calls per measured simple question = 1. Calls per measured referenced-entity
comparison = 1. Planner retries = 0. Synthesis calls/retries = 0 (disabled). There
is no second planner to resolve the ordinal after interpretation: deterministic
code consumes validated FOLLOW_UP. Ordinal interpretation itself still uses one
provider call and takes about 19 seconds; zero-LLM arbitrary-language interpretation
was not added. Optional multi-panel synthesis-on performance was not measured.

Initial scalar prompt 22,789 characters / 5,946 tokens; schema 5,533 characters.
System 22,685, catalog context 19,938, semantic-language context 499, state 2 empty
characters. Matched follow-ups send 464-character semantic state, no transcript.
Final qualified chain state 561–598 characters; prompt 23,613–24,206 characters.
Final scalar calls use roughly 590 completion tokens; ordinal 542; comparison 557.
No 48-question evaluation list, dashboard presentation metadata or full transcript
was sent. Prompt catalog is substantial, but measured warm generation dominated;
no speculative context truncation or cross-user cache was introduced.
Nonstream HTTP header arrival is observable; first generated token is not.

Create Dashboard uses the same adapter/shared semantic vocabulary. Live old-path
comparison could not be executed because browser input became unresponsive before
its generation smoke. No fake reduced-catalog comparison is reported as evidence.
Automated generation/edit/parity coverage passed; manual AI generation remains
not run in this acceptance.

## Source independence, regressions and presentation review

Source relay remained stopped. No Odoo/Teleport start, source extraction, sync,
refresh-source, reconciliation operation or Odoo writes occurred. Published event
and Finance serving worked while source status was unavailable. Actual source
operation/ingestion table fingerprints were unchanged through the measured checks.
Readiness is independent of source health; coverage/snapshot staleness remain visible.

Fresh login, Executive report, existing Finance report, history/reopen, provenance,
conversion and API drill passed. A transient 502/HTML error during the planned API
recreation cleared after readiness/reload; existing Finance then rendered normally.
Existing saved-record and live AI-generation browser smoke remain not run after
browser input stopped working. Full automated saved lifecycle, generation/edit,
manual builder, shared filters and drill suites passed.

Project dashboard-quality skill was used in AFTER mode. English Light rendering
was observed at 390/1024/1440 with clientWidth=scrollWidth 375/1009/1425 respectively.
Screenshots are private local artifacts, not committed customer screenshots. Mobile
controls reflowed; no page-level horizontal overflow. Initial desktop Dark answer
also rendered. Arabic API smoke passed; final Arabic RTL, theme-switch, keyboard,
modal and saved-dashboard actions could not be finished while browser clicks were
unresponsive. Do not substitute prior synthetic 12-case visual matrix for this
real staging acceptance. No web presentation code was changed.

## Gates and limits

Frozen install, lint, architecture, baseline-aware quality, typecheck, full tests,
production API/web builds and diff gate passed on the focused source changes.
Unit/contract: 814 passed, 0 failed, 0 skipped. Disposable PostgreSQL: 180 passed,
0 failed, 0 skipped. Targeted analyst/intent checks: 53 passed. A preliminary
unconfigured PostgreSQL invocation skipped tests; it is not the reported result.
The configured isolated PostgreSQL 18.6 suite replaced it. Existing >500 kB web
chunk warning remains. No CI or remote final-SHA validation claimed.

Optional Gemini was configured (gemini-3.8-flash). Automatic approval review rejected
execution because the governed staging context would leave for an external Google
endpoint without payload/destination-specific approval. No Gemini inference result
is claimed. Bonsai was restored immediately; bounded fresh semantic-catalog/date/
market-context EN/AR requests await approval. This optional block alone is not the
business acceptance blocker; the reachable Bonsai English failures are.

Final cleanup: the original planner-disabled setting is restored, existing tested
Bonsai budget/seed retained, debug logging false, temporary observer preload/mount
removed, API healthy/readiness 200, API/web restarted, persisted four-turn admin
conversation visibly reopened, temporary QA has zero active identities and sessions,
viewer membership suspended. Disposable synthetic PostgreSQL server was stopped.

Remaining blockers: original highest wording, General/No Sugar interpretation,
canonical clarification resume, requested direct Finance total verification and
unfinished browser Arabic/action/regression checks. Next smallest step: validate
these exact prompts against the configured model and complete the browser checks;
do not loosen schema/capability/security checks to make acceptance green.

## Safety confirmation

```text
new Ask Business feature scope added = no
investigative analysis added = no
metadata/control migration applied = yes
RLS weakened = no
Bonsai/local-provider support removed = no
provider-specific architecture introduced = no
LLM-generated SQL = no
LLM calculates authoritative values = no
LLM queries Odoo = no
LLM directly queries PostgreSQL = no
authorization bypassed = no
conversation privacy bypassed = no
Finance semantics changed = no
snapshot semantics changed = no
dashboard conversion silently drops semantics = no
drill-through reconstructed from prose = no
Ask Business requires live Odoo/source access = no
Odoo writes = no
push = no
merge = no
external deployment = no
```
