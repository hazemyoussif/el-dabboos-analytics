# Acceptance criteria catalog

Current criteria. Each links a product story and a human regression case. Schema, authorization and adapter tests remain the executable authority.

## AC-WORK-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when select Egypt from the workspace selector; inspect profile currency and branch labels,
then only the validated Egypt membership and EGP results are active.
And attempt an unassigned tenant header: 403, no data.
Trace: [US-WORK-001](user-stories.md#us-work-001); [TC-VIS-101](../qa/visualization-tests.md#tc-vis-101); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-WORK-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when switch Iraq to Egypt and back,
then the current tenant changes; old builder history is cleared after abandonment confirmation.
And cancel abandonment: retain the current draft and tenant.
Trace: [US-WORK-002](user-stories.md#us-work-002); [TC-VIS-102](../qa/visualization-tests.md#tc-vis-102); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-WORK-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open a saved dashboard; switch EN to AR; refresh,
then rTL and translated labels persist; DashboardSpec and dirty state do not change.
And an unsupported stored locale falls back to a supported preference.
Trace: [US-WORK-003](user-stories.md#us-work-003); [TC-VIS-103](../qa/visualization-tests.md#tc-vis-103); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-WORK-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when select Light, Dark and System; refresh,
then presentation follows the preference without analytics execution or a spec edit.
And system follows OS preference; the chosen explicit mode overrides it.
Trace: [US-WORK-004](user-stories.md#us-work-004); [TC-VIS-104](../qa/visualization-tests.md#tc-vis-104); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-TPL-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open Templates and inspect the list in both markets,
then market-neutral definitions show localized names and availability.
And a restricted template is visible with a reason and cannot open.
Trace: [US-TPL-001](user-stories.md#us-tpl-001); [TC-DASH-101](../qa/dashboard-lifecycle-tests.md#tc-dash-101); automation area [template/eval application tests](../../packages/application/test/application.test.ts).


## AC-TPL-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose Sales category; search a localized title or tag; clear both,
then only matching templates remain and clearing restores the list.
And no match displays an empty state.
Trace: [US-TPL-002](user-stories.md#us-tpl-002); [TC-DASH-102](../qa/dashboard-lifecycle-tests.md#tc-dash-102); automation area [template/eval application tests](../../packages/application/test/application.test.ts).


## AC-TPL-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when inspect inventory or maintenance templates,
then a restriction is explained and opening is unavailable.
And handcrafted instantiate request is rejected by metric authorization.
Trace: [US-TPL-003](user-stories.md#us-tpl-003); [TC-DASH-103](../qa/dashboard-lifecycle-tests.md#tc-dash-103); automation area [template/eval application tests](../../packages/application/test/application.test.ts).


## AC-TPL-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open Sales Performance in Iraq then Egypt,
then preview uses the selected tenant profile and bounded date preset.
And a metric failure produces partial/error feedback rather than invented values.
Trace: [US-TPL-004](user-stories.md#us-tpl-004); [TC-DASH-104](../qa/dashboard-lifecycle-tests.md#tc-dash-104); automation area [template/eval application tests](../../packages/application/test/application.test.ts).


## AC-TPL-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open a template; choose Use template; change a title,
then a separate unsaved working draft is editable; the catalog template is unchanged.
And cancel dirty-draft abandonment: retain the existing draft.
Trace: [US-TPL-005](user-stories.md#us-tpl-005); [TC-DASH-105](../qa/dashboard-lifecycle-tests.md#tc-dash-105); automation area [template/eval application tests](../../packages/application/test/application.test.ts).


## AC-DASH-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose New dashboard then Blank dashboard,
then an empty manual builder draft (not an executable DashboardSpec until a widget is added) starts without a persisted record.
And cancel abandonment of an existing dirty draft: keep it.
Trace: [US-DASH-001](user-stories.md#us-dash-001); [TC-DASH-001](../qa/dashboard-lifecycle-tests.md#tc-dash-001); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when add revenue; Save; enter English and Arabic names; confirm,
then a private DashboardRecord with version 1 is created; localized titles reopen.
And blank primary or overlong title is rejected; secondary blank uses primary.
Trace: [US-DASH-002](user-stories.md#us-dash-002); [TC-DASH-002](../qa/dashboard-lifecycle-tests.md#tc-dash-002); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open an owned record; Rename; change both titles; inspect library before Save; Save,
then rename changes the working draft; persistence changes only on Save.
And cancel naming: retain original titles.
Trace: [US-DASH-003](user-stories.md#us-dash-003); [TC-DASH-003](../qa/dashboard-lifecycle-tests.md#tc-dash-003); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when edit an owned saved dashboard; choose Save; reopen,
then the same record is updated with an incremented version and clean state.
And transport failure retains the unsaved working draft.
Trace: [US-DASH-004](user-stories.md#us-dash-004); [TC-DASH-004](../qa/dashboard-lifecycle-tests.md#tc-dash-004); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open a saved record; Save As; enter another name; reopen both,
then new record ID and version 1; original remains unchanged.
And cancel naming creates no new record.
Trace: [US-DASH-005](user-stories.md#us-dash-005); [TC-DASH-005](../qa/dashboard-lifecycle-tests.md#tc-dash-005); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-006

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when edit a saved record; Discard; repeat on an unsaved draft,
then saved draft restores the loaded version; new draft is abandoned.
And cancel abandonment retains modifications.
Trace: [US-DASH-006](user-stories.md#us-dash-006); [TC-DASH-006](../qa/dashboard-lifecycle-tests.md#tc-dash-006); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-007

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open the same owned record in two tabs; save in tab A; edit and save in tab B,
then tab B receives conflict feedback; tab A version is not overwritten.
And reload latest intentionally before retrying; do not retry with a fabricated version.
Trace: [US-DASH-007](user-stories.md#us-dash-007); [TC-DASH-007](../qa/dashboard-lifecycle-tests.md#tc-dash-007); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-DASH-008

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when save; copy /dashboards/:recordId; open in another tab and refresh,
then accessible record is reloaded under a validated tenant membership.
And wrong tenant/private non-owner receives not-found without record leakage.
Trace: [US-DASH-008](user-stories.md#us-dash-008); [TC-DASH-008](../qa/dashboard-lifecycle-tests.md#tc-dash-008); automation area [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts).


## AC-BUILD-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when start blank; add KPI; choose revenue,
then validated widget appears and a semantic preview executes.
And invalid/incomplete selection is rejected with feedback.
Trace: [US-BUILD-001](user-stories.md#us-build-001); [TC-BUILD-001](../qa/builder-tests.md#tc-build-001); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when on desktop drag revenue from palette to an empty canvas position,
then a validated widget is created at the snapped position.
And outside-canvas or unsupported drop makes no change.
Trace: [US-BUILD-002](user-stories.md#us-build-002); [TC-BUILD-002](../qa/builder-tests.md#tc-build-002); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when create a revenue line by month; drop gross profit on Add series,
then compatible second series shares grouping and presentation unit.
And percentage or incompatible dimension is rejected; original widget remains.
Trace: [US-BUILD-003](user-stories.md#us-build-003); [TC-BUILD-003](../qa/builder-tests.md#tc-build-003); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when drop order count on a KPI replace target,
then the series metric changes only after compatibility validation.
And invalid replacement leaves the prior series intact.
Trace: [US-BUILD-004](user-stories.md#us-build-004); [TC-BUILD-004](../qa/builder-tests.md#tc-build-004); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose line, area, bar, pie/donut, treemap, combo and table on suitable widgets,
then only governed compatible choices apply; variants remain schema-valid.
And an incompatible visualization cannot be committed.
Trace: [US-BUILD-005](user-stories.md#us-build-005); [TC-BUILD-005](../qa/builder-tests.md#tc-build-005); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-006

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when change revenue grouping from month to branch,
then preview and labels use the supported dimension.
And a dimension unsupported by any selected metric is rejected.
Trace: [US-BUILD-006](user-stories.md#us-build-006); [TC-BUILD-006](../qa/builder-tests.md#tc-build-006); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-007

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when drag a resize edge/corner; inspect width/height; use Shift+arrow on focused handle,
then canonical grid bounds hold; no analytics call or auto-save.
And narrow screens disable direct grid manipulation.
Trace: [US-BUILD-007](user-stories.md#us-build-007); [TC-BUILD-007](../qa/builder-tests.md#tc-build-007); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-008

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when move using handle; repeat with arrow keys,
then placement snaps to a valid non-overlapping canonical grid.
And out-of-bounds moves are constrained; no query is executed.
Trace: [US-BUILD-008](user-stories.md#us-build-008); [TC-BUILD-008](../qa/builder-tests.md#tc-build-008); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-009

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when select a widget; Duplicate; Undo; Redo,
then unique stable widget/series IDs and a valid placement are produced.
And no available placement reports feedback instead of overlapping invalid layout.
Trace: [US-BUILD-009](user-stories.md#us-build-009); [TC-BUILD-009](../qa/builder-tests.md#tc-build-009); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-010

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when delete a selected widget; Undo,
then widget is removed locally and Undo restores it.
And deletion does not delete the saved record.
Trace: [US-BUILD-010](user-stories.md#us-build-010); [TC-BUILD-010](../qa/builder-tests.md#tc-build-010); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-011

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when resize a widget; Reset size,
then type-specific default size applies with valid placement.
And undo restores previous geometry.
Trace: [US-BUILD-011](user-stories.md#us-build-011); [TC-BUILD-011](../qa/builder-tests.md#tc-build-011); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-012

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when move/resize widgets; Auto arrange; Reset layout; Undo,
then auto arrange retains sizes; reset returns default layout; changes are undoable.
And no analytics request or save accompanies layout-only changes.
Trace: [US-BUILD-012](user-stories.md#us-build-012); [TC-BUILD-012](../qa/builder-tests.md#tc-build-012); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-013

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when replace a metric; Undo; Redo,
then draft history restores coherent spec and semantic preview.
And a new edit after Undo clears the redo branch.
Trace: [US-BUILD-013](user-stories.md#us-build-013); [TC-BUILD-013](../qa/builder-tests.md#tc-build-013); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-014

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose an available branch filter; execute preview; clear it,
then results match user filter intersected with enforced policy.
And user filter never overrides branch membership restrictions.
Trace: [US-BUILD-014](user-stories.md#us-build-014); [TC-BUILD-014](../qa/builder-tests.md#tc-build-014); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-BUILD-015

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose monthly revenue with YoY and moving average; then grouping and top N,
then only bounded compatible combinations execute; top N belongs to first series.
And running total on an unordered dimension and top N on a later series are rejected.
Trace: [US-BUILD-015](user-stories.md#us-build-015); [TC-BUILD-015](../qa/builder-tests.md#tc-build-015); automation area [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts).


## AC-AI-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose Create with AI; request a sales dashboard,
then authorized valid DashboardSpec executes and begins unsaved.
And unsupported mock intent gives explicit feedback and no pretend success.
Trace: [US-AI-001](user-stories.md#us-ai-001); [TC-AI-001](../qa/ai-tests.md#tc-ai-001); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-AI-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open an owned dashboard; Edit with AI; request a three-month moving average,
then validated patch modifies working draft only; saved record remains unchanged until Save.
And invalid patch is rejected atomically.
Trace: [US-AI-002](user-stories.md#us-ai-002); [TC-AI-002](../qa/ai-tests.md#tc-ai-002); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-AI-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when build a sales draft manually; switch to Edit with AI; request an edit,
then the current working spec is the edit context; edits remain unsaved.
And cancel abandonment if a new creation flow would replace the draft.
Trace: [US-AI-003](user-stories.md#us-ai-003); [TC-AI-003](../qa/ai-tests.md#tc-ai-003); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-AI-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when generate sales dashboard; choose Edit; replace a metric,
then builder edits the generated draft with existing validation/history.
And no implicit Save occurs when entering or leaving manual mode.
Trace: [US-AI-004](user-stories.md#us-ai-004); [TC-AI-004](../qa/ai-tests.md#tc-ai-004); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-AI-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when in mock mode ask for an unsupported complex dashboard,
then a bounded unsupported-intent error appears.
And existing draft remains recoverable.
Trace: [US-AI-005](user-stories.md#us-ai-005); [TC-AI-005](../qa/ai-tests.md#tc-ai-005); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-AI-006

Given api and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled,
when use fake provider returning invalid generation/edit plans (or canonically incompatible compiled intent) after bounded repair attempts,
then browser receives INVALID_STRUCTURED_OUTPUT without raw provider output.
And opt-in API diagnostics identify stage safely; default diagnostics stay off.
Trace: [US-AI-006](user-stories.md#us-ai-006); [TC-AI-006](../qa/ai-tests.md#tc-ai-006); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-AI-007

Given api and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled,
when configure fake endpoint to fail or delay past timeout; request generation,
then upstream/timeout feedback is safe; analytics and library remain usable.
And no unbounded retry; no secrets or prompts in browser errors.
Trace: [US-AI-007](user-stories.md#us-ai-007); [TC-AI-007](../qa/ai-tests.md#tc-ai-007); automation area [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts).


## AC-LIB-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when save a dashboard; open All,
then only accessible records for this tenant appear, separately from templates.
And foreign tenant/private records never appear.
Trace: [US-LIB-001](user-stories.md#us-lib-001); [TC-LIB-001](../qa/library-tests.md#tc-lib-001); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when favorite a record; open Favorites; refresh; un-favorite,
then personal tenant-scoped favorite persists; record itself is unchanged.
And other users do not inherit the preference.
Trace: [US-LIB-002](user-stories.md#us-lib-002); [TC-LIB-002](../qa/library-tests.md#tc-lib-002); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when open My dashboards with an owned and shared record available,
then only records owned by current identity appear.
And switching identity recomputes ownership.
Trace: [US-LIB-003](user-stories.md#us-lib-003); [TC-LIB-003](../qa/library-tests.md#tc-lib-003); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when prepare a tenant-shared record owned by admin via API; open Shared as analyst,
then accessible shared non-owned record appears and can be viewed or copied.
And editing original remains owner-controlled; no sharing management UI is implied.
Trace: [US-LIB-004](user-stories.md#us-lib-004); [TC-LIB-004](../qa/library-tests.md#tc-lib-004); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when create a folder; rename it; refresh,
then flat personal folder name persists within tenant/user scope.
And blank or overlong name rejected; duplicate names are not assumed forbidden.
Trace: [US-LIB-005](user-stories.md#us-lib-005); [TC-LIB-005](../qa/library-tests.md#tc-lib-005); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-006

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when search an English then Arabic title; clear search,
then client-side localized title filtering is correct.
And no result produces an empty state.
Trace: [US-LIB-006](user-stories.md#us-lib-006); [TC-LIB-006](../qa/library-tests.md#tc-lib-006); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-007

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when select updated, A–Z, Z–A, oldest and newest sorting,
then visible records reorder deterministically with stable ID ties.
And sorting does not change persisted dashboard contents.
Trace: [US-LIB-007](user-stories.md#us-lib-007); [TC-LIB-007](../qa/library-tests.md#tc-lib-007); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-008

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when move a record to a folder; refresh; move to another; remove folder association,
then personal folder preference persists; DashboardRecord is unchanged.
And inaccessible record or foreign folder is rejected.
Trace: [US-LIB-008](user-stories.md#us-lib-008); [TC-LIB-008](../qa/library-tests.md#tc-lib-008); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-LIB-009

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when create folder and associate a saved record; delete folder,
then personal associations clear; saved records remain accessible in All.
And other users folders and associations remain unchanged.
Trace: [US-LIB-009](user-stories.md#us-lib-009); [TC-LIB-009](../qa/library-tests.md#tc-lib-009); automation area [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts).


## AC-AUTH-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when request inventory_value through builder and handcrafted analytics endpoint,
then unauthorized metric is absent/disabled and direct request receives 403.
And no inventory value leaks in result or error.
Trace: [US-AUTH-001](user-stories.md#us-auth-001); [TC-AUTH-001](../qa/authorization-tests.md#tc-auth-001); automation area [API authorization integration tests](../../apps/api/test/api.test.ts).


## AC-AUTH-002

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when use Baghdad manager; request all branches then explicitly Basra,
then enforced Baghdad policy is ANDed with user filters; Basra-only request returns no Basra data.
And clearing user filters never clears enforced filters.
Trace: [US-AUTH-002](user-stories.md#us-auth-002); [TC-AUTH-002](../qa/authorization-tests.md#tc-auth-002); automation area [API authorization integration tests](../../apps/api/test/api.test.ts).


## AC-AUTH-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when save private dashboard; switch to another identity and try its deep link,
then non-owner cannot list or read it; access returns 404.
And no title or record metadata leaks.
Trace: [US-AUTH-003](user-stories.md#us-auth-003); [TC-AUTH-003](../qa/authorization-tests.md#tc-auth-003); automation area [API authorization integration tests](../../apps/api/test/api.test.ts).


## AC-AUTH-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when use API-created tenant-shared record owned by admin; open as analyst,
then view is allowed only within membership and metric permissions.
And an unauthorized metric still prevents reading a shared dashboard.
Trace: [US-AUTH-004](user-stories.md#us-auth-004); [TC-AUTH-004](../qa/authorization-tests.md#tc-auth-004); automation area [API authorization integration tests](../../apps/api/test/api.test.ts).


## AC-AUTH-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when pOST a valid v2 spec containing a maintenance KPI to execute,
then post-schema metric policy rejects it with 403 before repository execution.
And lLM-generated and patched outputs face the same post-validation policy.
Trace: [US-AUTH-005](user-stories.md#us-auth-005); [TC-AUTH-005](../qa/authorization-tests.md#tc-auth-005); automation area [API authorization integration tests](../../apps/api/test/api.test.ts).


## AC-AUTH-006

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when send Egypt tenant header with Iraq-only identity,
then 403 membership denial before metric execution.
And changing browser local storage does not grant membership.
Trace: [US-AUTH-006](user-stories.md#us-auth-006); [TC-AUTH-006](../qa/authorization-tests.md#tc-auth-006); automation area [API authorization integration tests](../../apps/api/test/api.test.ts).


## AC-VIS-001

Given api and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled,
when use fake repository with one successful and one failed compatible series,
then usable series remains visible with partial feedback; failed cells are null.
And if required first-series top N fails, no unrestricted union is rendered.
Trace: [US-VIS-001](user-stories.md#us-vis-001); [TC-VIS-001](../qa/visualization-tests.md#tc-vis-001); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-VIS-002

Given api and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled,
when fail every series of a widget with a controlled fake repository,
then widget error state is visible; other widgets remain usable.
And no fabricated zero or stale success is shown.
Trace: [US-VIS-002](user-stories.md#us-vis-002); [TC-VIS-002](../qa/visualization-tests.md#tc-vis-002); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-VIS-003

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when choose a valid window with no facts; inspect additive, ratio and snapshot widgets,
then additive empty totals use semantic zero; missing ratio/snapshot remains null.
And no invented zero for missing aligned keys.
Trace: [US-VIS-003](user-stories.md#us-vis-003); [TC-VIS-003](../qa/visualization-tests.md#tc-vis-003); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-VIS-004

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when render all supported chart types in Light and Dark,
then central palette, axes, tooltips and tables remain readable.
And theme switch does not execute analytics or save spec.
Trace: [US-VIS-004](user-stories.md#us-vis-004); [TC-VIS-004](../qa/visualization-tests.md#tc-vis-004); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-VIS-005

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when switch AR; inspect shell, chart, filters, table and naming dialog,
then professional labels use MSA; RTL shell works; temporal order remains chronological.
And market examples use selected IQ/EG conversational phrasing.
Trace: [US-VIS-005](user-stories.md#us-vis-005); [TC-VIS-005](../qa/visualization-tests.md#tc-vis-005); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-VIS-006

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when at narrow width open navigation, library and builder; return desktop,
then stacked cards and reachable controls; direct grid drag disabled on narrow view.
And no horizontal loss of essential controls.
Trace: [US-VIS-006](user-stories.md#us-vis-006); [TC-VIS-006](../qa/visualization-tests.md#tc-vis-006); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-VIS-007

Given api and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled,
when execute ranking and comparison widgets; inspect aligned application rows and charts,
then rank, comparisonValue, absoluteChange, percentageChange remain available without re-query.
And missing values retain null; renderer consumes structured series values.
Trace: [US-VIS-007](user-stories.md#us-vis-007); [TC-VIS-007](../qa/visualization-tests.md#tc-vis-007); automation area [web preference/presentation tests](../../apps/web/test/presentation.test.ts).


## AC-DATA-001

Given api and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard,
when inspect result metadata and UI Data through label,
then latest relevant business/event date is dataThrough, independent of ingestion freshness.
And do not relabel max(event_date) as source updated.
Trace: [US-DATA-001](user-stories.md#us-data-001); [TC-VIS-201](../qa/visualization-tests.md#tc-vis-201); automation area [data engine tests](../../packages/data/test/engine.test.ts).


## AC-DATA-002

Given api and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled,
when configure adapter sourceAsOf explicitly; compare default synthetic metadata,
then source updated appears only when known; default mock/SQLite omits it.
And no fabricated synchronization timestamp.
Trace: [US-DATA-002](user-stories.md#us-data-002); [TC-VIS-202](../qa/visualization-tests.md#tc-vis-202); automation area [data engine tests](../../packages/data/test/engine.test.ts).

## AC-BUILD-016

Given an editable dashboard with a selected chart,
when the analyst selects Blue then Green,
then only its palette changes, preview updates immediately, and metrics, grouping, analyses, filters, layout and unrelated presentation are preserved.
And Undo restores Blue, Redo restores Green, the draft remains unsaved until Save, and reopening restores the saved palette.
And EN/Arabic labels and Light/Dark presentation remain usable; Default restores the governed default; AI and manual choices agree without exposing arbitrary colors.
Trace: [US-BUILD-016](user-stories.md#us-build-016); [TC-BUILD-016](../qa/builder-tests.md#tc-build-016); automation [builder tests](../../apps/web/test/builder.test.ts), [saved API tests](../../apps/api/test/saved-dashboards.test.ts).
