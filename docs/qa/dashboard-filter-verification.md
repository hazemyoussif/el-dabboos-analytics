# Dashboard filter verification — 2026-10-03

Scope: [ADR 026](../architecture/adr/026-relative-dates-and-viewer-filters.md), layered on the Appearance milestone. Browser verification used an isolated local web/API preview, generated synthetic IQ/EG facts and a disposable SQLite dashboard database. No developer environment files or customer/model service were used by automated tests.

## Automated evidence

Baseline: 445 tests passed. Focused date/execution/AI/security suite: 186 passed. Focused web rendering/history/client suite: 24 passed. Full regression and build results are included in the delivery handoff.

Coverage includes all eleven presets, tenant-local day/year transitions, leap days, month/quarter edges and Cairo DST; strict v2 date exclusivity and absolute compatibility; rolling/fixed execution, concrete query identity, Top-N after filtering, comparison baselines and snapshot carry-forward/cutoffs in Mock/SQLite; policy-constrained All and dimension discovery; API trusted timezone and payload rejection; saved JSON/version isolation, Save As and existing conflicts; sparse AI omission/null/mode switches and one fake-provider call per valid request; authoring semantic Undo/Redo and presentation-only history; viewer request separation and governed dimension intersection.

## Prior Astra browser evidence (before controller extraction)

- Template and blank drafts show This year. A compatible revenue KPI accepted All time and saved normally.
- Authoring Previous month resolved to September 1–30, 2026. Relative → Fixed prefilled those exact dates; Undo restored the preset and Redo restored fixed dates. Fixed → Relative explicitly selected This year; Last 30 days resolved to September 4–October 3.
- Explicit Save, reopen and Save As preserved the selected canonical mode. Viewer date/branch selections changed results while saved status remained unchanged. Reset restored defaults.
- Entering manual Edit after a temporary Last 30 days view restored the saved September fixed dates, without adopting the viewer selection.
- Real app generation/edit paths were exercised with StructuredDashboardPlanner plus a deterministic **fake QA provider**: relative generation, relative → historical fixed edit, and fixed → relative edit. These checks verify wiring/compilation/lifecycle, not live-model natural-language adherence.
- Expanded viewer filters were visually checked in English/Light desktop, English/Dark tablet, Arabic/Dark phone and Arabic/Light tablet. Phone/tablet DOM measurements showed no page-level horizontal overflow. Native labels, select controls, details disclosure and focus behavior are retained.

## Quality-gate findings addressed

1. **High — refreshing period/results:** the newly selected label briefly appeared with the previous range/results. The metadata and viewer canvas now show loading until matching execution completes; Save/Edit/View are guarded while the relevant preview is busy.
2. **Medium — duplicate date heading:** removed a redundant visible legend while retaining its accessible group name; viewer date controls now sit alongside dimension controls and wrap at narrow widths.
3. **High — existing multi-value defaults:** a single-select could display only the first persisted value (or All for a missing discovery value). Shared dimension controls display the full preserved default until the user explicitly replaces it.

Appearance, chart themes, palette inheritance, explicit Save, builder history and existing source/tenant policy architecture remain intact. No unrelated mobile builder redesign was attempted. Relative rolling is verified with injected clocks, not by changing the workstation clock. Source fixture coverage remains September 2026 and does not anchor relative dates.

## Completion follow-up

The controller extraction was reviewed without changing the settled architecture. A deterministic product-flow regression exposed Save starting persistence before the viewer-default reset completed; Save now awaits that reset so persistence cannot invalidate its execution response. The temporary `vite.semantics-qa.config.ts` was removed; reported QA session/process IDs 13738 and 37974 were no longer running.

Final automated verification: focused follow-up **40/40**; full suite **469/469**, with zero failures/skips. Frozen install, lint, typecheck, API/web build and `git diff --check` passed. The build retains the existing large-chunk warning. Tests used synthetic/fake services only; local socket tests and dependency installation required execution outside the restricted sandbox.

No browser or visual verification was performed in this follow-up. Exhaustive visual/manual verification is **PENDING**, deferred to a separate lower-usage QA pass. Date-input typing and real-browser navigation/tenant transitions remain pending; controller/SSR tests provide automated evidence only. Prior browser evidence above predates the final lifecycle extraction and does not certify the final UI.
