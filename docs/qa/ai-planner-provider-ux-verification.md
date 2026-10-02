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
