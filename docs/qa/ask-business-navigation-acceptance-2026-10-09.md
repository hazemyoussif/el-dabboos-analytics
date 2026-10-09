# Ask Business navigation acceptance — October 9, 2026

Ask Business local staging business testing = ENABLED

This closes the remaining browser acceptance item in the [planner recovery report](ask-business-planner-differential-2026-10-09.md). Enablement is an acceptance classification: the original planner-disabled runtime was restored after the explicitly approved temporary local smoke. No external deployment is implied.

## Observed stall and lifecycle diagnosis

No poisoned Ask Business input state was reproduced. A fresh application page in the existing authenticated administrator browser session accepted unsaved text, navigation to a report, return through main navigation or browser Back, and new keystrokes. Empty drafts, new conversations, existing conversations and submitted conversations passed.

The earlier report described leaving an **unsaved generated Dashboard**, rather than only unsent Ask Business text. That path was exercised by converting a retained answer without Save. Clicking Ask Business produced an in-app browser automation `Input.dispatchMouseEvent` timeout at the existing `window.confirm` discard boundary. The subsequent browser observation showed navigation had completed to `/ask-business`; the textarea accepted sequential keystrokes. No active JavaScript dialog was reported afterward. The observed failure is therefore a browser-control timeout at this boundary, not evidence of a React/router deadlock. The precise internal browser cause of the timeout was not inspected and remains unknown. There is no before/after application fix to claim.

Source inspection: the textarea is disabled only by `useAnalyst.busy` or `loading`; the hook invalidates old responses on unmount/scope changes. The route store uses history events and has no pending-transition/router-blocker object. Unsent question text is component-local presentation state; leaving the Ask Business route discards it through unmount. Conversation creation occurs only on submission. Existing dashboard discard confirmation remains unchanged.

No production implementation change was justified. The focused change expands both EN/AR DOM regression flows to use the actual route store and history Back. React DOM loads after the test window exists so dispatched input events exercise React state; assertions verify the Ask button becomes enabled, rather than merely changing a DOM value. The tests check empty/non-empty drafts, zero provider calls/conversations before submission, submitted history after route unmount/remount, and healthy existing-conversation drafts without duplicate provider calls or conversations.

## Browser evidence

Normal authenticated local staging at `https://localhost:8443`, retained administrator access; no QA identity/session or permission grant was created. Browser observations and safe request logs preceded the test change; no production logging/instrumentation was added. Screenshots remain private in `/tmp/ask-business-lifecycle-en-1440.png` and `/tmp/ask-business-lifecycle-ar-1024.png`.

| Check | Evidence |
| --- | --- |
| Main navigation, unsaved new draft, EN/AR | Return to `/ask-business`, discarded draft, sequential new keystrokes accepted |
| Browser Back, empty/non-empty drafts | Route completed; temporary conversation loading settled |
| Submitted/existing conversation, EN 1024px | Two Finance messages remained; next input accepted text |
| Existing conversation, EN/AR 390px | Mobile drawer closed on report navigation; Back restored two messages and interactive input |
| New conversation, AR 1024px | Unsaved Arabic draft → data-status route → Ask Business → new Arabic text accepted |
| Desktop EN 1440px Dark | Unsaved text → data-status route → Ask Business → interactive composer; Light restored afterward |
| Unsaved generated dashboard | Conversion completed; existing discard boundary caused one automation timeout, then route/input worked |

Settled returned-state observations: textarea `disabled=false`, `readOnly=false`; focus owner `business-question` after typing; zero open modal dialogs; no loading/submission status; no document horizontal overflow at measured 390/1024px. EN/AR browser console error/warning collection was empty. Source inspection found no Ask Business unsaved guard, request abort controller, query cache or persisted unsent draft. Loading is a real request state and settled normally; no conversation-creation request occurred merely from typing/navigation.

Remaining live smoke used the unchanged Bonsai configuration, temporarily enabling only `DASHBOARD_PLANNER=structured` after explicit user approval:

- New Finance scalar question completed with Net Aged Receivable, effective October 8 and the explicitly displayed latest eligible September 30 snapshot.
- Same-date overdue follow-up completed with Total Overdue and the same effective/snapshot dates.
- Retained Finance history reopened after navigation, with both messages intact and fresh input accepted.
- Best salesperson requested clarification; canonical Order revenue choice completed with the existing partial-coverage notice.
- Provenance disclosure showed the definition, filters, period, snapshot, reconciliation and coverage.
- Finance View Details opened the pinned snapshot modal, including 50 loaded rows, then closed normally.
- Create Dashboard completed for a retained supported answer without Save. Saved dashboards were not modified.

Safe API route logs recorded HTTP 200: scalar message 28,819 ms; follow-up 29,759 ms; clarification 27,566 ms; first Finance details request 10 ms. These are individual local observations, not a performance benchmark. The four new messages belong to two conversations at version 3, with four matching tenant/user/conversation audits. Read-only source-operation fingerprints matched the prior acceptance snapshot. No planner differential or full 11-message matrix was repeated.

## Verification and delivery

- Expanded targeted EN/AR DOM flows: 2 passed.
- Unit/contract suite: 817 passed, 0 failed/skipped; test count unchanged because existing flows were expanded.
- Disposable PostgreSQL suite: 180 passed, 0 failed/skipped; synthetic server stopped afterward.
- Frozen install, lint, architecture, quality, typecheck, API/web build and diff gates passed. Existing Vite chunk-size warning remains.
- Initial sandbox npm DNS failure interrupted concurrent tests; dependencies were restored with registry access and both complete suites rerun successfully. Those interrupted runs are not acceptance evidence.
- Engineering review: tests exercise public route/input/persistence behavior; production responsibility, dependencies and transaction/security boundaries are unchanged.
- Dashboard quality AFTER review: no task-related blocker/high finding; keyboard input, mobile focus release, RTL, measured overflow and existing theme presentation checked. No layout/theme implementation changed.
- Base: `c9ca96f` on `codex/production-pilot-lifecycle`. Focused local test/evidence commit only; CI not run remotely. Pre-existing `.archify/` remains untouched.

Restored local runtime: planner disabled, synthesis false, no added diagnostics. User runtime environment file was not edited; a temporary Compose override was removed from the active stack by recreating only API with its original Compose configuration. QA access remained revoked. Source relay remained stopped.

Known non-blocking limits remain: one grouping dimension per analysis; ordinal/per-analysis-context dashboard conversion rejection; investigative “why” unavailable; Product analytics not published.

## Safety confirmation

```text
Bonsai prompt changed = no
Bonsai model settings changed = no
shared planner semantics changed = no
Gemini made required runtime dependency = no
LLM-generated SQL = no
analytics semantics changed = no
Finance semantics changed = no
conversation authorization changed = no
RLS weakened = no
source operations changed = no
Odoo writes = no
push = no
merge = no
external deployment = no
```
