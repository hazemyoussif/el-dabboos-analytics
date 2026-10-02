# AI planner provider compatibility and progress verification

## Scope and automated evidence

Base main: `2ead49d4ec7a787656d23147ac5329350745963e`; feature branch `fix/ai-planner-provider-ux`. Generation alone moves to an application-owned compact plan and deterministic compiler. Domain DashboardSpec/Patch v2 schemas, analytics/security contracts and edit architecture are unchanged.

Baseline: 195 tests. Closeout suite: 256 passing tests. Frozen install, lint, typecheck, API/web builds and diff whitespace checks pass. The existing Vite >500 kB chunk advisory remains. CI uses deterministic providers and fake loopback HTTP, with no endpoint credentials or live model requirement.

Coverage includes plan shape/limits, bilingual titles, stable IDs/layout, all date presets/timezone boundary/leap-day/invalid date combinations, filters without aliasing, analysis flags, top-N pairs, combo marks, presentation/visualization compatibility, full canonical validation, authorized metadata and post-output metric rejection. Exact Arabic regression intent is covered in both the evaluation targets/demo planner and the structured planner with a fake plan response. Repair counts 0/1/2 remain bounded; HTTP failures never enter semantic repair. Tests prove safe API errors, opt-in/redacted/bounded diagnostics and actual startup timeout/repair fields.

The unrestricted portable plan schema is approximately 2,518 characters versus 3,378 for the canonical spec projection. Resolved schema-object depth (including properties/items/enum containers and following local refs, excluding unused definition containers) is 10 versus 14. Actual requests restrict the metric enum to authorized capabilities. The guard checks infrastructure exclusion plus relative size/depth, not an exact byte count.

Web tests exercise request ownership, truthful elapsed clock, success/failure cleanup, reset/stale/duplicate requests, no draft application after failure, localized provider codes, preservation of existing non-provider API explanations, relocalization on language changes, rendered generation/edit states, instructions, quiet timer, polite live region and reduced-motion CSS.

## Performed live preview checks

A disposable API used synthetic mock facts, a temporary dashboard DB, structured planner, and a delayed fake OpenAI-compatible HTTP endpoint. No developer env files were loaded; no external model/key was used. The actual API startup showed structured mode, configured fake model/endpoint, 120000 ms timeout, one repair and enabled diagnostics.

The actual Create with AI workflow was exercised with `اريد ان ارى المبيعات و اداء الفروع مع الارباح`. Its prompt remained visible while disabled, the button changed to Generating, the timer advanced from 00:00 through 00:44, and success opened an unsaved governed sales/branch/profitability draft. Desktop 1280 and tablet 1024 generation were observed in Light/Dark and English/Arabic; mobile 390 generation was observed in English in both themes, with Arabic RTL observed on the resulting unsaved dashboard. Theme/language controls and the mobile theme drawer were exercised during the request. Observed DOM measurements showed no page overflow.

A subsequent browser-native discard confirmation stalled the automation surface. Its documented dialog/close controls could not recover the session. This is a verification-tool limitation, not evidence of an application error. Live edit completion, live provider-failure interaction, complete keyboard traversal and live reduced-motion preference emulation were **not** completed in that session. Do not interpret rendering/unit/API coverage as those manual interactions having been executed.

## Performed visual AFTER review

To complete visual inspection without relying on the stalled JavaScript session, temporary server-rendered fixtures used the actual DashboardCreationPanel, DashboardAiEditor, AiProgress, error copy and existing styles with a minimal shell. These are visual fixtures, not interactive end-to-end evidence. The fixture timer was fixed at 00:12; truthful timing was verified separately in the live request and clock tests.

All 36 combinations were captured and reviewed: generation/edit/provider-error × 1280/1024/390 × English/Arabic × Light/Dark. DOM overflow checks were false in every case. Full-size spot inspection covered mobile Arabic edit, desktop English edit and mobile English error. Existing tokens, Lucide, typography, scoped branding and RTL were retained. Progress uses a logical start border, one waiting state and a wrapping timer; no fabricated stages/percentages, decorative surface or chart change was introduced. Error text remains safe and actions/instructions fit the narrow layout. Focus outline on the instruction was observed; disabled controls and status roles were inspected. Reduced-motion handling was verified by CSS inspection and a focused test, not preference emulation.

AFTER findings:

1. No visual blocker or high-severity issue was found in the inspected progress/error layouts. Arabic status text wraps; timer digits retain LTR isolation; no page-level overflow was found.
2. Live interaction coverage remains limited as described above. Re-run AI edit success/failure, keyboard traversal and reduced-motion preference checks after clearing the browser dialog.
3. Real configured-endpoint generation remains the user's post-push manual gate. This branch does not claim live Gemini schema acceptance or model output quality. Canonical DashboardPatch compatibility is intentionally a separate follow-up if actual endpoint evidence requires it.

Temporary preview servers/files are outside the repository and are not product/demo fixtures. No plan is persisted or returned as a domain dashboard; generated/edited specs still require explicit Save.

## Explicit-intent refinement closeout (October 2, 2026)

The sections above preserve the previous `05517b656f34aedcd3b1f7754608b4bf82fb23a8` closeout and its manual limitations. This follow-up starts there on the same feature branch, with main remaining `2ead49d4ec7a787656d23147ac5329350745963e`. Baseline is 256 tests; the refined suite has **325 passing tests (69 added)**. Frozen install, lint, typecheck, API/web builds and diff whitespace checks pass. The existing Vite chunk-size advisory remains. Remote CI is a separate post-push gate reported against final HEAD.

Generation widgets now omit root type/style properties and optionally supply sparse `requestedPresentation` only for explicit user requests. Analysis is likewise explicit. The pure resolver chooses KPI/Line/Bar/Table using grouping and current metric type/unit compatibility, supplies presentation defaults, and retains incompatible explicit intent for canonical rejection/repair. Canonical v2 spec/patch schemas gain only the governed palette enum; existing semantic, layout, metric and tenant authorization constraints remain. Editing stays canonical patch replacement; manual visualization changes retain governed palette intent through Undo/Redo without requerying. Actual colors stay in centralized web rendering; global UI theme remains independent of spec state.

Added automated coverage establishes optional/bounded presentation, legacy root-property rejection, raw color/renderer exclusion, analysis bounds, all time-dimension defaults, mixed-unit Table fallback, explicit categorical Line, governed palettes, combo/pie defaults and hard presentation rules. Controlled fake responses cover the exact Arabic sales/branch/profit request, explicit blue Line request and top-five horizontal blue Bar request. These tests establish the contract/compiler/prompt boundary, **not live model understanding or proof that an endpoint never invents intent**.

API tests cover temperature/max-token defaults, optional thinking budget/seed omission and configured values (including zero), invalid/bounded config, safe startup summaries, strict schema envelopes, ignored reasoning content, object/array diagnostics and distinct 429 classification. Transport failures bypass repair; rate-limit UI tests preserve the draft. Domain normal patch tests preserve business intent/layout with palette changes. Theme tests check deterministic colors and >=3:1 graphic / >=4.5:1 on-mark label contrast in both themes; SSR tests preserve legends, reference styling, missing values and accessible tables.

### Performed controlled preview and AFTER review

A disposable loopback API/web preview used existing synthetic IQ/EG facts, in-memory dashboard/library storage and a fake HTTP provider. No local env file, credential or real model endpoint was read/contacted. Actual generation opened an unsaved blue categorical Line dashboard. A normal AI patch changed its palette to purple; a subsequent HTTP 429 preserved the purple draft and instruction and displayed the safe English message, then its MSA translation after switching UI language. Chart values were opened and inspected in Arabic, retaining precise IQD formatting.

DOM checks covered EN/Arabic × Light/Dark × 1280/1024/390: no page-level horizontal overflow; strokes matched centralized Light/Dark blue palettes and bilingual legends. Settled screenshot spot review covered desktop English Light, mobile Arabic Dark (including rate-limit state), and tablet Arabic Light after the purple edit. Temporary screenshots are under `/tmp/planner-refinement-ui/`, outside the repository; rapid resize captures are not substitutes for these settled spot inspections. Temporary tabs/servers were closed and the viewport override reset.

AFTER findings:

1. **No new blocker/high finding** in the reviewed palette/error states: distinguishable series plus labels, safe wrapping error copy, appropriate theme colors, preserved value-table access and draft state.
2. **Low, existing shell debt:** the collapsed tablet sidebar's empty-library text wraps narrowly. No unrelated shell redesign was made.
3. **Verification limits:** no new real Bonsai/Gemini call or model benchmark, full keyboard traversal, reduced-motion emulation, or complete lifecycle manual suite was performed in this pass. Existing focused tests remain the evidence for unaffected contracts. Re-run live endpoint intent adherence with the documented inference controls separately.

## Top-N / generation-series mark follow-up

Starting feature HEAD: `2684f557ceba326f3575271b3486147e85a1c28d`; baseline 325 tests. Final suite: **332 passing tests (7 added)**. Frozen install, lint, typecheck, API/web builds and diff whitespace checks pass; the existing Vite chunk-size advisory remains. The reported live Bonsai Top-5 failure contained unnecessary per-series marks and omitted explicit Top-N selection. GenerationSeries/schema/compiler now exclude mark entirely; legacy mark input fails plan validation even for Combo. Canonical combo marks remain code-owned (first Bar/rest Line), and canonical DashboardSpec/Patch schemas and visualization validation are untouched.

Prompt guidance maps explicit top/bottom N to the existing direction/limit fields on the first selection series, includes one compact horizontal blue Top-5 example and states concrete presentation compatibility/omission rules. Explicit invalid presentation remains rejected and repair remains bounded. At most four fixed domain visualization reasons (800 characters) now reach generation repair and opt-in terminal diagnostics; public API errors keep their existing generic message.

New coverage proves the TypeScript/schema mark exclusion, rejects legacy valid-enum marks, checks code-owned Combo and mark-free Bar, asserts strict schema and Top-N guidance, preserves the minimal explicit fixture, and exercises Top-5 through fake HTTP/API/execution with eight synthetic branches and exactly five highest results in one provider call. Repair tests prove safe specific reasons, no copied private title/prompt/filter values, and unchanged generic API errors after failure.

This pass does not contact Bonsai or read developer environment files. The user's live prompt/latency observations are the motivating evidence; fake-provider tests do not claim a new live model success or latency improvement. Re-run the exact Top-5 prompt against the configured endpoint separately. Inference controls, provider transport/architecture, edit behavior, authorization and deterministic analytics remain unchanged.
