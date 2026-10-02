---
name: el-dabboos-dashboard-quality
description: "El Dabboos Analytics UI/UX quality gate for dashboard, chart, table, theme, responsive, accessibility, and visual-polish work. Use after UI implementation or when explicitly auditing apps/web. This is a filter, not a redesign brief."
---

# El Dabboos Dashboard Quality

Use this skill for UI/UX review and visual-polish work in `apps/web`.

Default mode: **AFTER**. Review the implemented UI first, report numbered findings, then change only approved or task-required findings. Do not redesign working screens merely to satisfy a generic aesthetic rule.

## Project invariants

These project decisions outrank generic anti-slop advice:

- Preserve the restrained teal/slate identity and semantic tokens in `apps/web/src/styles/tokens.css`.
- Preserve System / Light / Dark behavior and keep presentation preferences out of dashboard specs, analytics requests, and persisted domain state.
- **Lucide is the approved icon library.** Do not replace it merely to look less AI-generated. Remove or avoid icons only when they are decorative or redundant.
- Preserve the centralized chart theme in `apps/web/src/rendering/chart-theme.ts`. Do not introduce one-off chart palettes inside components.
- Preserve deterministic series color assignment, comparison styling, precise tooltips, and accessible chart tables.
- Preserve Inter + Noto Sans Arabic, RTL behavior, English/Arabic parity, and locale-aware formatting.
- Preserve keyboard grid editing, focus behavior, reduced-motion behavior, native control semantics, and mobile modal behavior.
- Do not move presentation concerns into domain/application packages.
- Do not alter metric definitions, query semantics, analytics results, persistence, or authorization as part of a visual cleanup.

If a UI issue appears to require a domain, analytics, or data-contract change, report it separately instead of hiding it in presentation code.

## Dashboard purpose test

Every visible element should do at least one of these:

1. communicate a business metric or trend,
2. support comparison or diagnosis,
3. enable a real user action,
4. communicate state, provenance, or confidence,
5. improve navigation or comprehension.

If it does none of these, remove or simplify it.

A dashboard is not improved by adding more surfaces, badges, shadows, icons, or charts.

## Visual hierarchy

- Prefer information hierarchy over decoration.
- Do not turn every metric or text block into a card.
- Do not wrap an existing grouped surface in another decorative container without a usability reason.
- Keep elevation meaningful. Most content stays flat; modals, menus, and true overlays may elevate.
- Use the existing radius and spacing scales. Avoid arbitrary one-off values without a layout reason.
- Use brand/accent colors to indicate hierarchy, selection, focus, or semantics. Do not paint every interactive element teal.
- Do not add decorative gradients, glowing borders, blurred orbs, glassmorphism, background grids, or neon treatments.
- Dark mode must remain a controlled theme variant, not a separate visual personality.
- Avoid decorative status dots, sparkle/AI symbols, badges, and pills that communicate no state.

## KPI rules

- A KPI must answer a business question, not merely expose an available field.
- Limit top-level KPI density to what can be scanned quickly; secondary values belong in drill-downs, tables, or supporting views.
- Do not fabricate trends, deltas, targets, ranks, confidence, or comparison periods.
- Do not use oversized typography to compensate for weak hierarchy.
- Use semantic positive/negative/warning treatment only when the business meaning is actually known.
- Preserve missing values as missing. Do not substitute zero, arrows, or reassuring copy.

## Chart rules

Before keeping a chart, ask: **what comparison is easier here than in a table or KPI?**

- Use charts for pattern, comparison, composition, distribution, or change over time.
- Use tables when precise inspection across many rows is the primary task.
- Do not add a chart solely because a metric is available.
- Keep chart titles specific to the measure and dimension.
- Keep units, periods, comparison context, and tenant-aware formatting visible where needed.
- Use the centralized `ChartTheme`; no component-local palette.
- Do not use color alone to communicate status or series identity when labels/legend/context are needed.
- Keep legends when multiple/composition/comparison series require them; do not add a legend for a single obvious series.
- Avoid unnecessary data labels when they compete with the marks. Precise values belong in tooltips and accessible tables.
- Do not animate analytical marks decoratively.
- Pie/donut is acceptable only when composition is genuinely the question and category count remains readable.
- Treemap is acceptable only when area comparison adds value beyond a sorted table/bar chart.
- Large category sets may scroll/wrap; never silently drop categories to make the visual look cleaner.
- Repeated palette colors on high-cardinality sets are known debt; do not invent extra ungoverned colors as a local fix.

## Table rules

Tables are first-class analytical UI, not a fallback.

- Keep headers clear and units/meaning unambiguous.
- Preserve readable alignment: labels/text toward the reading edge, numeric values consistently aligned.
- Do not hide precise values behind charts when users need operational inspection.
- Long tables need predictable scrolling and must not force the entire page horizontally when avoidable.
- Empty, loading, partial, and error states must remain distinguishable.
- Do not add zebra striping, badges, icons, or progress bars to every cell unless they improve scanning.
- Color never replaces text for state.
- If sorting/filtering/pagination is shown, the control must really work and its active state must be visible.

## Layout and dashboard builder

- Respect the existing 12-column desktop grid and persisted layout model.
- Mixed widget sizes are valid when they reflect information importance.
- Do not force every widget to identical dimensions merely for visual symmetry.
- Intentional whitespace is acceptable; filling every gap with content is not a goal.
- On narrow screens, prioritise readable reflow over preserving desktop geometry.
- Do not create only two layouts ("desktop grid" and "phone stack") if an intermediate width becomes unusable.
- Editing affordances must remain visually separate from dashboard-reading affordances.
- Drag/drop must have an equivalent keyboard path for essential layout operations.
- Drop targets must clearly distinguish valid and invalid states without relying on color alone.
- Do not reduce hit targets just to make the builder look denser.

## Navigation and controls

- Preserve the expanded/collapsed desktop navigation and mobile dialog model unless a task explicitly changes navigation architecture.
- The active location must be evident without depending only on accent color.
- Icons support labels; they do not replace ambiguous navigation labels.
- Tooltips must not be required to understand common desktop actions.
- Every visible button, menu item, filter, tab, and link must have a working result.
- Disable unavailable actions or explain why they are unavailable; do not leave inert controls.
- Keep primary actions limited. Do not make every action visually primary.

## States and feedback

Every data-bearing or async surface must consider:

- loading,
- empty,
- success,
- partial data,
- recoverable error,
- unrecoverable error,
- stale/refreshing when applicable.

Feedback must communicate meaning with text/icon/structure as well as color. Errors should say what failed and, where possible, what the user can do next.

Do not replace honest empty/error states with synthetic sample data unless the surface is explicitly a demo/template preview.

## Accessibility gate

For changed UI:

- Keyboard reaches every interactive element in a logical order.
- Focus remains visible in Light and Dark themes.
- Modal focus is contained and Escape behavior remains correct.
- Interactive targets remain practically usable on touch.
- Text and essential graphical UI retain adequate contrast.
- ARIA describes state/action where native semantics are insufficient.
- Semantic HTML is preferred over recreating buttons/links with generic elements.
- Reduced-motion preferences remain respected.
- Charts retain an accessible precise-value representation.
- English and Arabic are both exercised when copy/layout changes.

## Responsive gate

Review at minimum:

- narrow phone around 390px,
- tablet around 1024px,
- normal desktop.

Check more widths when the changed layout has a breakpoint-sensitive transition.

At each width verify:

- no accidental page-level horizontal overflow,
- critical actions remain reachable,
- labels do not clip into ambiguity,
- navigation remains usable,
- tables/charts have an intentional overflow or reflow strategy,
- modals fit the viewport,
- builder controls do not overlap data,
- RTL layout remains coherent.

## Density gate

Enterprise analytics should be information-dense, not visually crowded.

Flag:

- repeated card-inside-card structures,
- more than one decorative treatment competing for attention,
- repeated helper copy that users must scan past,
- excessive badges,
- repeated section headings that add no navigation value,
- overly large empty areas caused by presentation rather than the dashboard layout model,
- duplicated legends/labels/tooltips that say the same thing.

Do not solve density by hiding information required for decisions.

## Audit procedure

For AFTER-mode review:

1. Read the relevant UI code plus ADR 022 and existing presentation verification before judging a pattern in isolation.
2. Inspect the affected screen in Light and Dark.
3. Inspect English and Arabic when text, alignment, controls, or layout are involved.
4. Check phone, tablet, and desktop when layout is involved.
5. Exercise every changed interactive control.
6. Separate findings into:
   - **Blocker**: broken interaction, misleading analytics, inaccessible essential flow, missing critical state.
   - **High**: materially harms comprehension, task completion, or responsive use.
   - **Medium**: inconsistent hierarchy, avoidable visual noise, or maintainability drift.
   - **Low**: polish only.
7. Report numbered findings with file/screen evidence and the smallest justified fix.
8. Do not change Low findings unless requested or they are trivial and directly inside the task scope.
9. After fixes, run the relevant tests plus `pnpm check` when practical and re-check changed UI states.

## Delivery gate

A UI task is not complete until these are true:

- [ ] The screen answers a clear business/user need.
- [ ] No analytics meaning was changed by presentation work.
- [ ] Existing theme/token/chart architecture was reused.
- [ ] Lucide remains consistent and non-decorative.
- [ ] KPI/chart/table choice matches the information task.
- [ ] Light and Dark remain coherent.
- [ ] English and Arabic remain coherent where affected.
- [ ] Empty/loading/error/partial states remain honest.
- [ ] Keyboard/focus behavior remains intact.
- [ ] Phone/tablet/desktop remain usable where affected.
- [ ] All changed controls were exercised.
- [ ] No fake data, decorative KPI, dead control, or ungoverned visual treatment was introduced.
- [ ] Automated checks relevant to the change pass, or failures are reported explicitly.

When reporting completion, cite concrete verification performed. Do not say "responsive", "accessible", or "tested" without evidence.
