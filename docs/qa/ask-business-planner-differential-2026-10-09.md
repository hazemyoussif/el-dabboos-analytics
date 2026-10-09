# Bonsai planner differential and recovery — October 9, 2026

**Overall local staging acceptance remains BLOCKED.** This continuation supersedes
the interpretation/provider-approval status in the initial acceptance report.
Required final administrator browser checks remain incomplete. The tested Sales
questions recovered with Bonsai; this evidence does not support an inherent model
incapability claim or ordinary Gemini fallback.

## Controlled comparison

Starting HEAD: `f296f2027c3377c35ece9f98bb8a55c9fe9df2ed`, branch
`codex/production-pilot-lifecycle`. Historical Dashboard prompt construction was
read from `git show 47d1ebb`, copied into a private temporary diagnostic module,
and replayed against current authorized published metadata. No reset, rewritten
history, source activation or change to the existing `.archify/` was performed.
This is a historical prompt replay, not an old runtime/environment reconstruction.
Current strict compilation, authorization and deterministic execution remained
authoritative. All exact requests/outputs and actual results stay outside Git.

Matched Bonsai service probes used temperature 0, seed 42, thinking budget 512,
max output 2,048 and deadline 240 seconds. The same existing configured local
endpoint/model were retained. Ask Business makes one planner call, no retry and
no synthesis call in these cases. Dashboard permits one bounded semantic repair;
the successful highest UI example used one call. No hidden Gemini fallback exists.

| Representative question | Historical Dashboard replay | Current Dashboard baseline | Current Ask Business baseline |
| --- | --- | --- | --- |
| Show me the salesperson with the highest order revenue in September. | Correct grouping, Top-1 and September; 32.8 s | Correct; 44.7 s service, independently 35.4 s normal UI | Invalid ordinal/selection structure; 48.8 s |
| Compare General and No Sugar revenue. | 22.1 s; used display names as filter IDs, zero matches: **not a valid business pass** | Grouped net invoice measure, certified default period; 60.7 s; unspecified measure default not accepted | Invalid Top/bottom and rank; 62.5 s |
| Show September net invoiced revenue. | Correct fixed September; 22.3 s | Omitted explicit period, therefore wrong; 58.5 s | Correct September; 55.3 s |
| Show receivables as of October 8. | Correct scalar balance and cutoff; 22.4 s | Correct scalar; 60.6 s | Unnecessary measure clarification; 50.5 s |

Highest success through normal Create Dashboard with AI demonstrates a concrete
Ask Business regression on the same analytical intent. Dashboard's own missing
September period shows a shared instruction defect too. The old display-name
filter error must not be carried forward as successful analytical behavior.

## Request construction and interpretation

The same 21 authorized published admin metrics were used for request-size capture.
Counts are characters, not token measurements. The schema is transmitted separately.

| Request | Instructions/language | Semantic context | User message | Total messages | Projected schema |
| --- | ---: | ---: | ---: | ---: | ---: |
| Historical Dashboard | 2,741 | 18,651 | 68 | 21,470 | 3,786 |
| Shared Dashboard at starting HEAD | 4,290 | 20,953 | 68 | 25,321 | 3,786 |
| Ask Business at starting HEAD | 3,547 | 19,938 | 129 | 23,624 | 5,533 |
| Recovered Dashboard | 3,880 | 20,953 | 68 | 24,911 | 3,786 |
| Recovered Ask Business | 4,820 | 19,938 | 129 | 24,897 | 6,515 |

Dashboard sends a plain question; Ask Business sends JSON with question/pageContext
and, when applicable, canonical clarification or bounded semantic state. No display
conversation transcript or full 48-case evaluation set is replayed. Ask Business
omits Dashboard presentation/template metadata. It nevertheless has additional
outcome, follow-up, ordinal and per-analysis context concerns and a larger schema.
The baseline root-shape wording was ambiguous, and Ask Business lacked the compact
valid selection example that helped Dashboard. Ambiguity instructions were too
conservative for explicit measures and already resolved canonical choices.

Normalization stays provider-neutral: parse JSON, validate the compact outcome,
resolve references and trusted defaults, authorize/publish-check, then execute
locally. No malformed plan is coerced by dropping filters or adding guessed
grouping. No model business values, IDs, layouts, SQL or security objects become
canonical results. Dates are interpreted using the tenant's local date; named
months use explicit fixed ranges, relative dates remain symbolic, and snapshot
cutoffs select the latest eligible trusted snapshot without summing dates.

## Focused recovery

* Made the supported root shape explicit and added four small contract-valid
  examples, filtered by authorized metrics and published grouping/selection.
* Distinguished highest/lowest Top-1, ordinal ranking, grouped comparison and
  scalar balance; canonical clarification resolves measure ambiguity. Bare
  revenue still requires a measure choice unless a trusted preference resolves it.
* Made named historical dates mandatory instead of inheriting a default period.
  Follow-up instructions are conditional on supplied semantic state.
* Projected disjoint grouped/summary alternatives so selection requires a
  dimension. Removed unused nested definitions; narrowed every series metric
  enum. The final schema is **larger**, because stronger grouping constraints are
  explicit; this is not a schema-size reduction claim.
* Kept entity vocabulary distinct from values. Added a local, tenant/policy-scoped
  dimension-value check after authorization/capability validation. Unknown model
  filter values return INVALID_PLAN before analytics execution. No discovered
  values are sent back to a provider.

Prompt-only trials improved several cases but retained grouping/selection errors.
Combined prompt/schema trials recovered both highest wordings, canonical best
choice and scalar receivables; bare revenue returned appropriate clarification.
An intermediate normal HTTP trial still invented a generic salesperson filter.
The guard rejected it; a final positive grouping example/instruction then recovered
that exact question in an admin service probe (23.9 s) and fresh authenticated
scoped HTTP replay (14.0 s total). Failed intermediate runs are retained privately.

This classifies the principal regression as shared/Ask Business prompt and schema
orchestration, with model sensitivity to that contract. Prompt growth alone is
not a demonstrated cause: the recovered Ask Business prompt is longer. Timings
are individual local observations, affected by warm state and catalog/scope;
admin and scoped HTTP timings are not a controlled cross-identity benchmark.

## Gemini reference boundary and result

The user approved only bounded Sales definitions, coverage dates, tenant market
metadata and fresh EN/AR questions to the existing Google endpoint. No result
rows, entity identities, history, source records, raw SQL, connection information,
secrets in prompts/logs, or actual Finance values were sent. Finance execution
remained local. No Google-specific application architecture was added.

The strict normal application reference returned six HTTP 400 failures and one
429, with zero execution. Exact replay reported generic INVALID_ARGUMENT without
an offending schema keyword. A separately labeled JSON-object diagnostic saw
503s and one HTTP 200, but the output put analyses outside intent and used a null
dimension; canonical validation rejected it. A separately labeled flat-schema
diagnostic returned six 400s and one 503. These were transport/schema probes, not
normal runtime fallbacks or successful semantic comparisons.

No valid Gemini canonical plan/result comparison was obtained. Consequently it
cannot establish that a stronger model is needed. Exact identity-free inputs and
outputs remain in private local files for comparison; no model response/results
are added to safe audit or the public evidence.

## Acceptance and remaining work

The final normal authenticated Sales replay and cleanup are recorded in the
[sanitized recovery matrix](ask-business-staging-2026-10-09/planner-recovery.json).
Successful answers must match independent deterministic scoped controls, not
merely return HTTP 200/SUPPORTED. Clarifications and unsupported capability must
execute zero analytics panels. Explicit business-line comparison does not invent
a missing No Sugar result or replace missing coverage with zero.

Additional manual evidence this continuation: correct unsaved highest Dashboard
generated through the normal UI; saved report reopened; Arabic RTL and Dark/Light
themes; actual Arabic drill modal and Escape dismissal; mobile navigation drawer
and Escape; Arabic mobile/tablet widths with no document overflow. Screenshots
remain private. The draft was not saved. Browser observation later recovered,
but leaving that unsaved draft again stalled input; the final administrator
Finance scalar/follow-up UI replay remains blocked. The final Dashboard September
date correction passed a service probe (33.9 s), not a new browser generation.

Automated coverage remains separate from live evidence: 817 unit/contract tests
and 180 disposable PostgreSQL tests passed with no failures/skips; frozen install,
lint, architecture, baseline-aware quality, typecheck, API/web build and diff
gates are required. No dependency changes or developer env/model services are
loaded by automated tests. Existing web chunk-size warning remains. CI for the
final local SHA is pending; no remote validation is claimed.

Cleanup restores the original planner-disabled Bonsai runtime, disables debug
and synthesis, revokes all temporary QA sessions, disables its identity, suspends
viewer membership and restores roles/scopes. Persistent staging and saved records
are preserved. Source relay stays stopped; ingestion/source-operation fingerprints
remain unchanged. No push, merge, external deployment or business enablement.
Final probes found 41 retained messages with 41 matching immutable safe audits
(78 audits retained overall), zero QA sessions/active identities, the original
four-message administrator conversation at version 5, and one saved dashboard.
TLS-verified readiness returned persistence/analytics available; API was healthy.
The disposable synthetic test PostgreSQL server was stopped separately.

Next smallest step: complete the final administrator normal-UI Finance total and
follow-up replay once browser input recovers, then decide local enablement from
the full acceptance record. Do not treat schema or HTTP success alone as business
acceptance.
