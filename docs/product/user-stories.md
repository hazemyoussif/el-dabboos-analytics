# Current product user stories

Current behavior, checked against domain, application, API and web implementations. Production authentication is future work. [Personas](personas-and-roles.md) define demo identities; [acceptance criteria](acceptance-criteria.md) describe invariants.

## US-WORK-001

**Title:** Select a tenant
**Persona:** Regional Analyst
**Goal:** select a tenant using governed workspace state.
**Business value:** Only the validated Egypt membership and EGP results are active.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view.
**Main flow:** Select Egypt from the workspace selector; inspect profile currency and branch labels.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Attempt an unassigned tenant header: 403, no data.
**Acceptance criteria:** [AC-WORK-001](acceptance-criteria.md#ac-work-001): Only the validated Egypt membership and EGP results are active.
**Related human tests:** [TC-VIS-101](../qa/visualization-tests.md#tc-vis-101).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-WORK-002

**Title:** Use multi-tenant membership
**Persona:** Regional Analyst
**Goal:** use multi-tenant membership using governed workspace state.
**Business value:** The current tenant changes; old builder history is cleared after abandonment confirmation.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view.
**Main flow:** Switch Iraq to Egypt and back.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel abandonment: retain the current draft and tenant.
**Acceptance criteria:** [AC-WORK-002](acceptance-criteria.md#ac-work-002): The current tenant changes; old builder history is cleared after abandonment confirmation.
**Related human tests:** [TC-VIS-102](../qa/visualization-tests.md#tc-vis-102).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-WORK-003

**Title:** Switch UI language
**Persona:** Analyst
**Goal:** switch ui language using governed workspace state.
**Business value:** RTL and translated labels persist; DashboardSpec and dirty state do not change.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view.
**Main flow:** Open a saved dashboard; switch EN to AR; refresh.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** An unsupported stored locale falls back to a supported preference.
**Acceptance criteria:** [AC-WORK-003](acceptance-criteria.md#ac-work-003): RTL and translated labels persist; DashboardSpec and dirty state do not change.
**Related human tests:** [TC-VIS-103](../qa/visualization-tests.md#tc-vis-103).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-WORK-004

**Title:** Switch presentation theme
**Persona:** Analyst
**Goal:** switch presentation theme using governed workspace state.
**Business value:** Presentation follows the preference without analytics execution or a spec edit.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view.
**Main flow:** Select Light, Dark and System; refresh.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** System follows OS preference; the chosen explicit mode overrides it.
**Acceptance criteria:** [AC-WORK-004](acceptance-criteria.md#ac-work-004): Presentation follows the preference without analytics execution or a spec edit.
**Related human tests:** [TC-VIS-104](../qa/visualization-tests.md#tc-vis-104).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-TPL-001

**Title:** Browse templates
**Persona:** Analyst
**Goal:** browse templates using governed workspace state.
**Business value:** Market-neutral definitions show localized names and availability.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Open Templates and inspect the list in both markets.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** A restricted template is visible with a reason and cannot open.
**Acceptance criteria:** [AC-TPL-001](acceptance-criteria.md#ac-tpl-001): Market-neutral definitions show localized names and availability.
**Related human tests:** [TC-DASH-101](../qa/dashboard-lifecycle-tests.md#tc-dash-101).
**Related automated tests or test area:** [template/eval application tests](../../packages/application/test/application.test.ts).


## US-TPL-002

**Title:** Filter template category and search
**Persona:** Analyst
**Goal:** filter template category and search using governed workspace state.
**Business value:** Only matching templates remain and clearing restores the list.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Choose Sales category; search a localized title or tag; clear both.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No match displays an empty state.
**Acceptance criteria:** [AC-TPL-002](acceptance-criteria.md#ac-tpl-002): Only matching templates remain and clearing restores the list.
**Related human tests:** [TC-DASH-102](../qa/dashboard-lifecycle-tests.md#tc-dash-102).
**Related automated tests or test area:** [template/eval application tests](../../packages/application/test/application.test.ts).


## US-TPL-003

**Title:** Handle a restricted template
**Persona:** Sales Analyst
**Goal:** handle a restricted template using governed workspace state.
**Business value:** A restriction is explained and opening is unavailable.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Inspect inventory or maintenance templates.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Handcrafted instantiate request is rejected by metric authorization.
**Acceptance criteria:** [AC-TPL-003](acceptance-criteria.md#ac-tpl-003): A restriction is explained and opening is unavailable.
**Related human tests:** [TC-DASH-103](../qa/dashboard-lifecycle-tests.md#tc-dash-103).
**Related automated tests or test area:** [template/eval application tests](../../packages/application/test/application.test.ts).


## US-TPL-004

**Title:** Open a template preview
**Persona:** Analyst
**Goal:** open a template preview using governed workspace state.
**Business value:** Preview uses the selected tenant profile and bounded date preset.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Open Sales Performance in Iraq then Egypt.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** A metric failure produces partial/error feedback rather than invented values.
**Acceptance criteria:** [AC-TPL-004](acceptance-criteria.md#ac-tpl-004): Preview uses the selected tenant profile and bounded date preset.
**Related human tests:** [TC-DASH-104](../qa/dashboard-lifecycle-tests.md#tc-dash-104).
**Related automated tests or test area:** [template/eval application tests](../../packages/application/test/application.test.ts).


## US-TPL-005

**Title:** Use a template as a draft
**Persona:** Analyst
**Goal:** use a template as a draft using governed workspace state.
**Business value:** A separate unsaved working draft is editable; the catalog template is unchanged.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Open a template; choose Use template; change a title.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel dirty-draft abandonment: retain the existing draft.
**Acceptance criteria:** [AC-TPL-005](acceptance-criteria.md#ac-tpl-005): A separate unsaved working draft is editable; the catalog template is unchanged.
**Related human tests:** [TC-DASH-105](../qa/dashboard-lifecycle-tests.md#tc-dash-105).
**Related automated tests or test area:** [template/eval application tests](../../packages/application/test/application.test.ts).


## US-DASH-001

**Title:** Create a blank dashboard
**Persona:** Analyst
**Goal:** create a blank dashboard using governed workspace state.
**Business value:** An empty manual builder draft (not an executable DashboardSpec until a widget is added) starts without a persisted record.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Choose New dashboard then Blank dashboard.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel abandonment of an existing dirty draft: keep it.
**Acceptance criteria:** [AC-DASH-001](acceptance-criteria.md#ac-dash-001): An empty manual builder draft (not an executable DashboardSpec until a widget is added) starts without a persisted record.
**Related human tests:** [TC-DASH-001](../qa/dashboard-lifecycle-tests.md#tc-dash-001).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-002

**Title:** First Save with bilingual naming
**Persona:** Analyst
**Goal:** first save with bilingual naming using governed workspace state.
**Business value:** A private DashboardRecord with version 1 is created; localized titles reopen.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Add revenue; Save; enter English and Arabic names; confirm.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Blank primary or overlong title is rejected; secondary blank uses primary.
**Acceptance criteria:** [AC-DASH-002](acceptance-criteria.md#ac-dash-002): A private DashboardRecord with version 1 is created; localized titles reopen.
**Related human tests:** [TC-DASH-002](../qa/dashboard-lifecycle-tests.md#tc-dash-002).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-003

**Title:** Rename a dashboard
**Persona:** Analyst
**Goal:** rename a dashboard using governed workspace state.
**Business value:** Rename changes the working draft; persistence changes only on Save.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Open an owned record; Rename; change both titles; inspect library before Save; Save.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel naming: retain original titles.
**Acceptance criteria:** [AC-DASH-003](acceptance-criteria.md#ac-dash-003): Rename changes the working draft; persistence changes only on Save.
**Related human tests:** [TC-DASH-003](../qa/dashboard-lifecycle-tests.md#tc-dash-003).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-004

**Title:** Save an existing draft
**Persona:** Analyst
**Goal:** save an existing draft using governed workspace state.
**Business value:** The same record is updated with an incremented version and clean state.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Edit an owned saved dashboard; choose Save; reopen.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Transport failure retains the unsaved working draft.
**Acceptance criteria:** [AC-DASH-004](acceptance-criteria.md#ac-dash-004): The same record is updated with an incremented version and clean state.
**Related human tests:** [TC-DASH-004](../qa/dashboard-lifecycle-tests.md#tc-dash-004).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-005

**Title:** Save As a separate record
**Persona:** Analyst
**Goal:** save as a separate record using governed workspace state.
**Business value:** New record ID and version 1; original remains unchanged.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Open a saved record; Save As; enter another name; reopen both.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel naming creates no new record.
**Acceptance criteria:** [AC-DASH-005](acceptance-criteria.md#ac-dash-005): New record ID and version 1; original remains unchanged.
**Related human tests:** [TC-DASH-005](../qa/dashboard-lifecycle-tests.md#tc-dash-005).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-006

**Title:** Discard changes
**Persona:** Analyst
**Goal:** discard changes using governed workspace state.
**Business value:** Saved draft restores the loaded version; new draft is abandoned.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Edit a saved record; Discard; repeat on an unsaved draft.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel abandonment retains modifications.
**Acceptance criteria:** [AC-DASH-006](acceptance-criteria.md#ac-dash-006): Saved draft restores the loaded version; new draft is abandoned.
**Related human tests:** [TC-DASH-006](../qa/dashboard-lifecycle-tests.md#tc-dash-006).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-007

**Title:** Protect against a version conflict
**Persona:** Analyst
**Goal:** protect against a version conflict using governed workspace state.
**Business value:** Tab B receives conflict feedback; tab A version is not overwritten.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Open the same owned record in two tabs; save in tab A; edit and save in tab B.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Reload latest intentionally before retrying; do not retry with a fabricated version.
**Acceptance criteria:** [AC-DASH-007](acceptance-criteria.md#ac-dash-007): Tab B receives conflict feedback; tab A version is not overwritten.
**Related human tests:** [TC-DASH-007](../qa/dashboard-lifecycle-tests.md#tc-dash-007).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-DASH-008

**Title:** Reopen a deep link
**Persona:** Analyst
**Goal:** reopen a deep link using governed workspace state.
**Business value:** Accessible record is reloaded under a validated tenant membership.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit; Save As needs create; tenant sharing needs dashboard:share.
**Main flow:** Save; copy /dashboards/:recordId; open in another tab and refresh.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Wrong tenant/private non-owner receives not-found without record leakage.
**Acceptance criteria:** [AC-DASH-008](acceptance-criteria.md#ac-dash-008): Accessible record is reloaded under a validated tenant membership.
**Related human tests:** [TC-DASH-008](../qa/dashboard-lifecycle-tests.md#tc-dash-008).
**Related automated tests or test area:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## US-BUILD-001

**Title:** Add a widget
**Persona:** Analyst
**Goal:** add a widget using governed workspace state.
**Business value:** Validated widget appears and a semantic preview executes.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Start blank; add KPI; choose revenue.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Invalid/incomplete selection is rejected with feedback.
**Acceptance criteria:** [AC-BUILD-001](acceptance-criteria.md#ac-build-001): Validated widget appears and a semantic preview executes.
**Related human tests:** [TC-BUILD-001](../qa/builder-tests.md#tc-build-001).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-002

**Title:** Drag a metric onto canvas
**Persona:** Analyst
**Goal:** drag a metric onto canvas using governed workspace state.
**Business value:** A validated widget is created at the snapped position.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** On desktop drag revenue from palette to an empty canvas position.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Outside-canvas or unsupported drop makes no change.
**Acceptance criteria:** [AC-BUILD-002](acceptance-criteria.md#ac-build-002): A validated widget is created at the snapped position.
**Related human tests:** [TC-BUILD-002](../qa/builder-tests.md#tc-build-002).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-003

**Title:** Add a series to an existing widget
**Persona:** Analyst
**Goal:** add a series to an existing widget using governed workspace state.
**Business value:** Compatible second series shares grouping and presentation unit.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Create a revenue line by month; drop gross profit on Add series.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Percentage or incompatible dimension is rejected; original widget remains.
**Acceptance criteria:** [AC-BUILD-003](acceptance-criteria.md#ac-build-003): Compatible second series shares grouping and presentation unit.
**Related human tests:** [TC-BUILD-003](../qa/builder-tests.md#tc-build-003).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-004

**Title:** Replace a metric
**Persona:** Analyst
**Goal:** replace a metric using governed workspace state.
**Business value:** The series metric changes only after compatibility validation.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Drop order count on a KPI replace target.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Invalid replacement leaves the prior series intact.
**Acceptance criteria:** [AC-BUILD-004](acceptance-criteria.md#ac-build-004): The series metric changes only after compatibility validation.
**Related human tests:** [TC-BUILD-004](../qa/builder-tests.md#tc-build-004).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-005

**Title:** Select visualization
**Persona:** Analyst
**Goal:** select visualization using governed workspace state.
**Business value:** Only governed compatible choices apply; variants remain schema-valid.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Choose line, area, bar, pie/donut, treemap, combo and table on suitable widgets.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** An incompatible visualization cannot be committed.
**Acceptance criteria:** [AC-BUILD-005](acceptance-criteria.md#ac-build-005): Only governed compatible choices apply; variants remain schema-valid.
**Related human tests:** [TC-BUILD-005](../qa/builder-tests.md#tc-build-005).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-006

**Title:** Select grouping dimension
**Persona:** Analyst
**Goal:** select grouping dimension using governed workspace state.
**Business value:** Preview and labels use the supported dimension.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Change revenue grouping from month to branch.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** A dimension unsupported by any selected metric is rejected.
**Acceptance criteria:** [AC-BUILD-006](acceptance-criteria.md#ac-build-006): Preview and labels use the supported dimension.
**Related human tests:** [TC-BUILD-006](../qa/builder-tests.md#tc-build-006).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-007

**Title:** Resize widget
**Persona:** Analyst
**Goal:** resize widget using governed workspace state.
**Business value:** Canonical grid bounds hold; no analytics call or auto-save.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Drag a resize edge/corner; inspect width/height; use Shift+arrow on focused handle.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Narrow screens disable direct grid manipulation.
**Acceptance criteria:** [AC-BUILD-007](acceptance-criteria.md#ac-build-007): Canonical grid bounds hold; no analytics call or auto-save.
**Related human tests:** [TC-BUILD-007](../qa/builder-tests.md#tc-build-007).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-008

**Title:** Move widget
**Persona:** Analyst
**Goal:** move widget using governed workspace state.
**Business value:** Placement snaps to a valid non-overlapping canonical grid.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Move using handle; repeat with arrow keys.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Out-of-bounds moves are constrained; no query is executed.
**Acceptance criteria:** [AC-BUILD-008](acceptance-criteria.md#ac-build-008): Placement snaps to a valid non-overlapping canonical grid.
**Related human tests:** [TC-BUILD-008](../qa/builder-tests.md#tc-build-008).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-009

**Title:** Duplicate widget
**Persona:** Analyst
**Goal:** duplicate widget using governed workspace state.
**Business value:** Unique stable widget/series IDs and a valid placement are produced.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Select a widget; Duplicate; Undo; Redo.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No available placement reports feedback instead of overlapping invalid layout.
**Acceptance criteria:** [AC-BUILD-009](acceptance-criteria.md#ac-build-009): Unique stable widget/series IDs and a valid placement are produced.
**Related human tests:** [TC-BUILD-009](../qa/builder-tests.md#tc-build-009).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-010

**Title:** Delete widget
**Persona:** Analyst
**Goal:** delete widget using governed workspace state.
**Business value:** Widget is removed locally and Undo restores it.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Delete a selected widget; Undo.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Deletion does not delete the saved record.
**Acceptance criteria:** [AC-BUILD-010](acceptance-criteria.md#ac-build-010): Widget is removed locally and Undo restores it.
**Related human tests:** [TC-BUILD-010](../qa/builder-tests.md#tc-build-010).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-011

**Title:** Reset widget size
**Persona:** Analyst
**Goal:** reset widget size using governed workspace state.
**Business value:** Type-specific default size applies with valid placement.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Resize a widget; Reset size.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Undo restores previous geometry.
**Acceptance criteria:** [AC-BUILD-011](acceptance-criteria.md#ac-build-011): Type-specific default size applies with valid placement.
**Related human tests:** [TC-BUILD-011](../qa/builder-tests.md#tc-build-011).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-012

**Title:** Auto arrange and reset layout
**Persona:** Analyst
**Goal:** auto arrange and reset layout using governed workspace state.
**Business value:** Auto arrange retains sizes; reset returns default layout; changes are undoable.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Move/resize widgets; Auto arrange; Reset layout; Undo.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No analytics request or save accompanies layout-only changes.
**Acceptance criteria:** [AC-BUILD-012](acceptance-criteria.md#ac-build-012): Auto arrange retains sizes; reset returns default layout; changes are undoable.
**Related human tests:** [TC-BUILD-012](../qa/builder-tests.md#tc-build-012).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-013

**Title:** Undo and Redo semantic edits
**Persona:** Analyst
**Goal:** undo and redo semantic edits using governed workspace state.
**Business value:** Draft history restores coherent spec and semantic preview.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Replace a metric; Undo; Redo.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** A new edit after Undo clears the redo branch.
**Acceptance criteria:** [AC-BUILD-013](acceptance-criteria.md#ac-build-013): Draft history restores coherent spec and semantic preview.
**Related human tests:** [TC-BUILD-013](../qa/builder-tests.md#tc-build-013).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-014

**Title:** Apply dashboard filters
**Persona:** Analyst
**Goal:** apply dashboard filters using governed workspace state.
**Business value:** Results match user filter intersected with enforced policy.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Choose an available branch filter; execute preview; clear it.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** User filter never overrides branch membership restrictions.
**Acceptance criteria:** [AC-BUILD-014](acceptance-criteria.md#ac-build-014): Results match user filter intersected with enforced policy.
**Related human tests:** [TC-BUILD-014](../qa/builder-tests.md#tc-build-014).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-BUILD-015

**Title:** Configure analysis
**Persona:** Analyst
**Goal:** configure analysis using governed workspace state.
**Business value:** Only bounded compatible combinations execute; top N belongs to first series.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:create/edit, analytics:query.
**Main flow:** Choose monthly revenue with YoY and moving average; then grouping and top N.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Running total on an unordered dimension and top N on a later series are rejected.
**Acceptance criteria:** [AC-BUILD-015](acceptance-criteria.md#ac-build-015): Only bounded compatible combinations execute; top N belongs to first series.
**Related human tests:** [TC-BUILD-015](../qa/builder-tests.md#tc-build-015).
**Related automated tests or test area:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## US-AI-001

**Title:** Generate an unsaved dashboard
**Persona:** Analyst
**Goal:** generate an unsaved dashboard using governed workspace state.
**Business value:** Authorized valid DashboardSpec executes and begins unsaved.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** Choose Create with AI; request a sales dashboard.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Unsupported mock intent gives explicit feedback and no pretend success.
**Acceptance criteria:** [AC-AI-001](acceptance-criteria.md#ac-ai-001): Authorized valid DashboardSpec executes and begins unsaved.
**Related human tests:** [TC-AI-001](../qa/ai-tests.md#tc-ai-001).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-AI-002

**Title:** Edit through a patch
**Persona:** Analyst
**Goal:** edit through a patch using governed workspace state.
**Business value:** Validated patch modifies working draft only; saved record remains unchanged until Save.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** Open an owned dashboard; Edit with AI; request a three-month moving average.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Invalid patch is rejected atomically.
**Acceptance criteria:** [AC-AI-002](acceptance-criteria.md#ac-ai-002): Validated patch modifies working draft only; saved record remains unchanged until Save.
**Related human tests:** [TC-AI-002](../qa/ai-tests.md#tc-ai-002).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-AI-003

**Title:** Move manual draft into AI editing
**Persona:** Analyst
**Goal:** move manual draft into ai editing using governed workspace state.
**Business value:** The current working spec is the edit context; edits remain unsaved.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** Build a sales draft manually; switch to Edit with AI; request an edit.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Cancel abandonment if a new creation flow would replace the draft.
**Acceptance criteria:** [AC-AI-003](acceptance-criteria.md#ac-ai-003): The current working spec is the edit context; edits remain unsaved.
**Related human tests:** [TC-AI-003](../qa/ai-tests.md#tc-ai-003).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-AI-004

**Title:** Move generated dashboard into manual editing
**Persona:** Analyst
**Goal:** move generated dashboard into manual editing using governed workspace state.
**Business value:** Builder edits the generated draft with existing validation/history.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** Generate sales dashboard; choose Edit; replace a metric.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No implicit Save occurs when entering or leaving manual mode.
**Acceptance criteria:** [AC-AI-004](acceptance-criteria.md#ac-ai-004): Builder edits the generated draft with existing validation/history.
**Related human tests:** [TC-AI-004](../qa/ai-tests.md#tc-ai-004).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-AI-005

**Title:** Reject unsupported mock intent
**Persona:** Analyst
**Goal:** reject unsupported mock intent using governed workspace state.
**Business value:** A bounded unsupported-intent error appears.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** In mock mode ask for an unsupported complex dashboard.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Existing draft remains recoverable.
**Acceptance criteria:** [AC-AI-005](acceptance-criteria.md#ac-ai-005): A bounded unsupported-intent error appears.
**Related human tests:** [TC-AI-005](../qa/ai-tests.md#tc-ai-005).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-AI-006

**Title:** Reject invalid structured output
**Persona:** Developer/Operator
**Goal:** reject invalid structured output using governed workspace state.
**Business value:** Browser receives INVALID_STRUCTURED_OUTPUT without raw provider output.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** Use fake provider returning invalid spec/patch after bounded repair attempts.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Opt-in API diagnostics identify stage safely; default diagnostics stay off.
**Acceptance criteria:** [AC-AI-006](acceptance-criteria.md#ac-ai-006): Browser receives INVALID_STRUCTURED_OUTPUT without raw provider output.
**Related human tests:** [TC-AI-006](../qa/ai-tests.md#tc-ai-006).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-AI-007

**Title:** Handle provider outage or timeout
**Persona:** Developer/Operator
**Goal:** handle provider outage or timeout using governed workspace state.
**Business value:** Upstream/timeout feedback is safe; analytics and library remain usable.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Permissions:** ai:generate/edit plus dashboard:create/edit and analytics:query.
**Main flow:** Configure fake endpoint to fail or delay past timeout; request generation.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No unbounded retry; no secrets or prompts in browser errors.
**Acceptance criteria:** [AC-AI-007](acceptance-criteria.md#ac-ai-007): Upstream/timeout feedback is safe; analytics and library remain usable.
**Related human tests:** [TC-AI-007](../qa/ai-tests.md#tc-ai-007).
**Related automated tests or test area:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## US-LIB-001

**Title:** Browse All saved dashboards
**Persona:** Analyst
**Goal:** browse all saved dashboards using governed workspace state.
**Business value:** Only accessible records for this tenant appear, separately from templates.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Save a dashboard; open All.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Foreign tenant/private records never appear.
**Acceptance criteria:** [AC-LIB-001](acceptance-criteria.md#ac-lib-001): Only accessible records for this tenant appear, separately from templates.
**Related human tests:** [TC-LIB-001](../qa/library-tests.md#tc-lib-001).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-002

**Title:** Favorite a dashboard
**Persona:** Analyst
**Goal:** favorite a dashboard using governed workspace state.
**Business value:** Personal tenant-scoped favorite persists; record itself is unchanged.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Favorite a record; open Favorites; refresh; un-favorite.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Other users do not inherit the preference.
**Acceptance criteria:** [AC-LIB-002](acceptance-criteria.md#ac-lib-002): Personal tenant-scoped favorite persists; record itself is unchanged.
**Related human tests:** [TC-LIB-002](../qa/library-tests.md#tc-lib-002).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-003

**Title:** Browse My dashboards
**Persona:** Analyst
**Goal:** browse my dashboards using governed workspace state.
**Business value:** Only records owned by current identity appear.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Open My dashboards with an owned and shared record available.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Switching identity recomputes ownership.
**Acceptance criteria:** [AC-LIB-003](acceptance-criteria.md#ac-lib-003): Only records owned by current identity appear.
**Related human tests:** [TC-LIB-003](../qa/library-tests.md#tc-lib-003).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-004

**Title:** Browse Shared dashboards
**Persona:** Analyst
**Goal:** browse shared dashboards using governed workspace state.
**Business value:** Accessible shared non-owned record appears and can be viewed or copied.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Prepare a tenant-shared record owned by admin via API; open Shared as analyst.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Editing original remains owner-controlled; no sharing management UI is implied.
**Acceptance criteria:** [AC-LIB-004](acceptance-criteria.md#ac-lib-004): Accessible shared non-owned record appears and can be viewed or copied.
**Related human tests:** [TC-LIB-004](../qa/library-tests.md#tc-lib-004).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-005

**Title:** Create and rename folder
**Persona:** Analyst
**Goal:** create and rename folder using governed workspace state.
**Business value:** Flat personal folder name persists within tenant/user scope.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Create a folder; rename it; refresh.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Blank or overlong name rejected; duplicate names are not assumed forbidden.
**Acceptance criteria:** [AC-LIB-005](acceptance-criteria.md#ac-lib-005): Flat personal folder name persists within tenant/user scope.
**Related human tests:** [TC-LIB-005](../qa/library-tests.md#tc-lib-005).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-006

**Title:** Search dashboards
**Persona:** Analyst
**Goal:** search dashboards using governed workspace state.
**Business value:** Client-side localized title filtering is correct.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Search an English then Arabic title; clear search.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No result produces an empty state.
**Acceptance criteria:** [AC-LIB-006](acceptance-criteria.md#ac-lib-006): Client-side localized title filtering is correct.
**Related human tests:** [TC-LIB-006](../qa/library-tests.md#tc-lib-006).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-007

**Title:** Sort dashboard library
**Persona:** Analyst
**Goal:** sort dashboard library using governed workspace state.
**Business value:** Visible records reorder deterministically with stable ID ties.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Select updated, A–Z, Z–A, oldest and newest sorting.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Sorting does not change persisted dashboard contents.
**Acceptance criteria:** [AC-LIB-007](acceptance-criteria.md#ac-lib-007): Visible records reorder deterministically with stable ID ties.
**Related human tests:** [TC-LIB-007](../qa/library-tests.md#tc-lib-007).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-008

**Title:** Move dashboards between folders
**Persona:** Analyst
**Goal:** move dashboards between folders using governed workspace state.
**Business value:** Personal folder preference persists; DashboardRecord is unchanged.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Move a record to a folder; refresh; move to another; remove folder association.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Inaccessible record or foreign folder is rejected.
**Acceptance criteria:** [AC-LIB-008](acceptance-criteria.md#ac-lib-008): Personal folder preference persists; DashboardRecord is unchanged.
**Related human tests:** [TC-LIB-008](../qa/library-tests.md#tc-lib-008).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-LIB-009

**Title:** Delete a folder
**Persona:** Analyst
**Goal:** delete a folder using governed workspace state.
**Business value:** Personal associations clear; saved records remain accessible in All.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view; saved-record access required.
**Main flow:** Create folder and associate a saved record; delete folder.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Other users folders and associations remain unchanged.
**Acceptance criteria:** [AC-LIB-009](acceptance-criteria.md#ac-lib-009): Personal associations clear; saved records remain accessible in All.
**Related human tests:** [TC-LIB-009](../qa/library-tests.md#tc-lib-009).
**Related automated tests or test area:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## US-AUTH-001

**Title:** Reject unauthorized metrics
**Persona:** Sales Analyst
**Goal:** reject unauthorized metrics using governed workspace state.
**Business value:** Unauthorized metric is absent/disabled and direct request receives 403.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** Valid membership plus requested route and metric-domain permissions.
**Main flow:** Request inventory_value through builder and handcrafted analytics endpoint.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No inventory value leaks in result or error.
**Acceptance criteria:** [AC-AUTH-001](acceptance-criteria.md#ac-auth-001): Unauthorized metric is absent/disabled and direct request receives 403.
**Related human tests:** [TC-AUTH-001](../qa/authorization-tests.md#tc-auth-001).
**Related automated tests or test area:** [API authorization integration tests](../../apps/api/test/api.test.ts).


## US-AUTH-002

**Title:** Enforce branch scope
**Persona:** Branch-scoped Manager
**Goal:** enforce branch scope using governed workspace state.
**Business value:** Enforced Baghdad policy is ANDed with user filters; Basra-only request returns no Basra data.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** Valid membership plus requested route and metric-domain permissions.
**Main flow:** Use Baghdad manager; request all branches then explicitly Basra.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Clearing user filters never clears enforced filters.
**Acceptance criteria:** [AC-AUTH-002](acceptance-criteria.md#ac-auth-002): Enforced Baghdad policy is ANDed with user filters; Basra-only request returns no Basra data.
**Related human tests:** [TC-AUTH-002](../qa/authorization-tests.md#tc-auth-002).
**Related automated tests or test area:** [API authorization integration tests](../../apps/api/test/api.test.ts).


## US-AUTH-003

**Title:** Isolate private records
**Persona:** Analyst
**Goal:** isolate private records using governed workspace state.
**Business value:** Non-owner cannot list or read it; access returns 404.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** Valid membership plus requested route and metric-domain permissions.
**Main flow:** Save private dashboard; switch to another identity and try its deep link.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No title or record metadata leaks.
**Acceptance criteria:** [AC-AUTH-003](acceptance-criteria.md#ac-auth-003): Non-owner cannot list or read it; access returns 404.
**Related human tests:** [TC-AUTH-003](../qa/authorization-tests.md#tc-auth-003).
**Related automated tests or test area:** [API authorization integration tests](../../apps/api/test/api.test.ts).


## US-AUTH-004

**Title:** Read tenant-shared records
**Persona:** Analyst
**Goal:** read tenant-shared records using governed workspace state.
**Business value:** View is allowed only within membership and metric permissions.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** Valid membership plus requested route and metric-domain permissions.
**Main flow:** Use API-created tenant-shared record owned by admin; open as analyst.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** An unauthorized metric still prevents reading a shared dashboard.
**Acceptance criteria:** [AC-AUTH-004](acceptance-criteria.md#ac-auth-004): View is allowed only within membership and metric permissions.
**Related human tests:** [TC-AUTH-004](../qa/authorization-tests.md#tc-auth-004).
**Related automated tests or test area:** [API authorization integration tests](../../apps/api/test/api.test.ts).


## US-AUTH-005

**Title:** Reject handcrafted unauthorized spec
**Persona:** Sales Analyst
**Goal:** reject handcrafted unauthorized spec using governed workspace state.
**Business value:** Post-schema metric policy rejects it with 403 before repository execution.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** Valid membership plus requested route and metric-domain permissions.
**Main flow:** POST a valid v2 spec containing a maintenance KPI to execute.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** LLM-generated and patched outputs face the same post-validation policy.
**Acceptance criteria:** [AC-AUTH-005](acceptance-criteria.md#ac-auth-005): Post-schema metric policy rejects it with 403 before repository execution.
**Related human tests:** [TC-AUTH-005](../qa/authorization-tests.md#tc-auth-005).
**Related automated tests or test area:** [API authorization integration tests](../../apps/api/test/api.test.ts).


## US-AUTH-006

**Title:** Reject foreign tenant context
**Persona:** Analyst
**Goal:** reject foreign tenant context using governed workspace state.
**Business value:** 403 membership denial before metric execution.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** Valid membership plus requested route and metric-domain permissions.
**Main flow:** Send Egypt tenant header with Iraq-only identity.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Changing browser local storage does not grant membership.
**Acceptance criteria:** [AC-AUTH-006](acceptance-criteria.md#ac-auth-006): 403 membership denial before metric execution.
**Related human tests:** [TC-AUTH-006](../qa/authorization-tests.md#tc-auth-006).
**Related automated tests or test area:** [API authorization integration tests](../../apps/api/test/api.test.ts).


## US-VIS-001

**Title:** Render partial series
**Persona:** Developer/Operator
**Goal:** render partial series using governed workspace state.
**Business value:** Usable series remains visible with partial feedback; failed cells are null.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Use fake repository with one successful and one failed compatible series.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** If required first-series top N fails, no unrestricted union is rendered.
**Acceptance criteria:** [AC-VIS-001](acceptance-criteria.md#ac-vis-001): Usable series remains visible with partial feedback; failed cells are null.
**Related human tests:** [TC-VIS-001](../qa/visualization-tests.md#tc-vis-001).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-VIS-002

**Title:** Render failed widget
**Persona:** Developer/Operator
**Goal:** render failed widget using governed workspace state.
**Business value:** Widget error state is visible; other widgets remain usable.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Fail every series of a widget with a controlled fake repository.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No fabricated zero or stale success is shown.
**Acceptance criteria:** [AC-VIS-002](acceptance-criteria.md#ac-vis-002): Widget error state is visible; other widgets remain usable.
**Related human tests:** [TC-VIS-002](../qa/visualization-tests.md#tc-vis-002).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-VIS-003

**Title:** Render empty and missing results
**Persona:** Analyst
**Goal:** render empty and missing results using governed workspace state.
**Business value:** Additive empty totals use semantic zero; missing ratio/snapshot remains null.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Choose a valid window with no facts; inspect additive, ratio and snapshot widgets.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No invented zero for missing aligned keys.
**Acceptance criteria:** [AC-VIS-003](acceptance-criteria.md#ac-vis-003): Additive empty totals use semantic zero; missing ratio/snapshot remains null.
**Related human tests:** [TC-VIS-003](../qa/visualization-tests.md#tc-vis-003).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-VIS-004

**Title:** Present Light and Dark charts
**Persona:** Analyst
**Goal:** present light and dark charts using governed workspace state.
**Business value:** Central palette, axes, tooltips and tables remain readable.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Render all supported chart types in Light and Dark.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Theme switch does not execute analytics or save spec.
**Acceptance criteria:** [AC-VIS-004](acceptance-criteria.md#ac-vis-004): Central palette, axes, tooltips and tables remain readable.
**Related human tests:** [TC-VIS-004](../qa/visualization-tests.md#tc-vis-004).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-VIS-005

**Title:** Present Arabic RTL
**Persona:** Analyst
**Goal:** present arabic rtl using governed workspace state.
**Business value:** Professional labels use MSA; RTL shell works; temporal order remains chronological.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Switch AR; inspect shell, chart, filters, table and naming dialog.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Market examples use selected IQ/EG conversational phrasing.
**Acceptance criteria:** [AC-VIS-005](acceptance-criteria.md#ac-vis-005): Professional labels use MSA; RTL shell works; temporal order remains chronological.
**Related human tests:** [TC-VIS-005](../qa/visualization-tests.md#tc-vis-005).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-VIS-006

**Title:** Use responsive navigation
**Persona:** Analyst
**Goal:** use responsive navigation using governed workspace state.
**Business value:** Stacked cards and reachable controls; direct grid drag disabled on narrow view.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** At narrow width open navigation, library and builder; return desktop.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No horizontal loss of essential controls.
**Acceptance criteria:** [AC-VIS-006](acceptance-criteria.md#ac-vis-006): Stacked cards and reachable controls; direct grid drag disabled on narrow view.
**Related human tests:** [TC-VIS-006](../qa/visualization-tests.md#tc-vis-006).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-VIS-007

**Title:** Retain analytics metadata
**Persona:** Developer/Operator
**Goal:** retain analytics metadata using governed workspace state.
**Business value:** Rank, comparisonValue, absoluteChange, percentageChange remain available without re-query.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Execute ranking and comparison widgets; inspect aligned application rows and charts.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Missing values retain null; renderer consumes structured series values.
**Acceptance criteria:** [AC-VIS-007](acceptance-criteria.md#ac-vis-007): Rank, comparisonValue, absoluteChange, percentageChange remain available without re-query.
**Related human tests:** [TC-VIS-007](../qa/visualization-tests.md#tc-vis-007).
**Related automated tests or test area:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## US-DATA-001

**Title:** Distinguish data coverage
**Persona:** Analyst
**Goal:** distinguish data coverage using governed workspace state.
**Business value:** Latest relevant business/event date is dataThrough, independent of ingestion freshness.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Inspect result metadata and UI Data through label.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** Do not relabel max(event_date) as source updated.
**Acceptance criteria:** [AC-DATA-001](acceptance-criteria.md#ac-data-001): Latest relevant business/event date is dataThrough, independent of ingestion freshness.
**Related human tests:** [TC-VIS-201](../qa/visualization-tests.md#tc-vis-201).
**Related automated tests or test area:** [data engine tests](../../packages/data/test/engine.test.ts).


## US-DATA-002

**Title:** Show known source freshness
**Persona:** Developer/Operator
**Goal:** show known source freshness using governed workspace state.
**Business value:** Source updated appears only when known; default mock/SQLite omits it.
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Permissions:** dashboard:view, analytics:query.
**Main flow:** Configure adapter sourceAsOf explicitly; compare default synthetic metadata.
**Alternative flows:** Repeat with Arabic labels and the other authorized market where applicable; keyboard/click controls can replace supported drag interactions.
**Failure/error flows:** No fabricated synchronization timestamp.
**Acceptance criteria:** [AC-DATA-002](acceptance-criteria.md#ac-data-002): Source updated appears only when known; default mock/SQLite omits it.
**Related human tests:** [TC-VIS-202](../qa/visualization-tests.md#tc-vis-202).
**Related automated tests or test area:** [data engine tests](../../packages/data/test/engine.test.ts).
