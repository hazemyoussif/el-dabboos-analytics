# Builder Tests

Current synthetic-demo regression cases. Use the setup and evidence rules in [manual test plan](manual-test-plan.md). Cases requiring a fake provider/repository are operator-run integration rehearsals; they are not faults injected into customer systems.

## TC-BUILD-001

**ID:** TC-BUILD-001
**Title:** Add a widget
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Start blank; add KPI; choose revenue.
**Expected result:** Validated widget appears and a semantic preview executes. Invalid/incomplete selection is rejected with feedback.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-001](../product/user-stories.md#us-build-001) / [AC-BUILD-001](../product/acceptance-criteria.md#ac-build-001).


## TC-BUILD-002

**ID:** TC-BUILD-002
**Title:** Drag a metric onto canvas
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** On desktop drag revenue from palette to an empty canvas position.
**Expected result:** A validated widget is created at the snapped position. Outside-canvas or unsupported drop makes no change.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-002](../product/user-stories.md#us-build-002) / [AC-BUILD-002](../product/acceptance-criteria.md#ac-build-002).


## TC-BUILD-003

**ID:** TC-BUILD-003
**Title:** Add a series to an existing widget
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Create a revenue line by month; drop gross profit on Add series.
**Expected result:** Compatible second series shares grouping and presentation unit. Percentage or incompatible dimension is rejected; original widget remains.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-003](../product/user-stories.md#us-build-003) / [AC-BUILD-003](../product/acceptance-criteria.md#ac-build-003).


## TC-BUILD-004

**ID:** TC-BUILD-004
**Title:** Replace a metric
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Drop order count on a KPI replace target.
**Expected result:** The series metric changes only after compatibility validation. Invalid replacement leaves the prior series intact.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-004](../product/user-stories.md#us-build-004) / [AC-BUILD-004](../product/acceptance-criteria.md#ac-build-004).


## TC-BUILD-005

**ID:** TC-BUILD-005
**Title:** Select visualization
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose line, area, bar, pie/donut, treemap, combo and table on suitable widgets.
**Expected result:** Only governed compatible choices apply; variants remain schema-valid. An incompatible visualization cannot be committed.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-005](../product/user-stories.md#us-build-005) / [AC-BUILD-005](../product/acceptance-criteria.md#ac-build-005).


## TC-BUILD-006

**ID:** TC-BUILD-006
**Title:** Select grouping dimension
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Change revenue grouping from month to branch.
**Expected result:** Preview and labels use the supported dimension. A dimension unsupported by any selected metric is rejected.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-006](../product/user-stories.md#us-build-006) / [AC-BUILD-006](../product/acceptance-criteria.md#ac-build-006).


## TC-BUILD-007

**ID:** TC-BUILD-007
**Title:** Resize widget
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Drag a resize edge/corner; inspect width/height; use Shift+arrow on focused handle.
**Expected result:** Canonical grid bounds hold; no analytics call or auto-save. Narrow screens disable direct grid manipulation.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-007](../product/user-stories.md#us-build-007) / [AC-BUILD-007](../product/acceptance-criteria.md#ac-build-007).


## TC-BUILD-008

**ID:** TC-BUILD-008
**Title:** Move widget
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Move using handle; repeat with arrow keys.
**Expected result:** Placement snaps to a valid non-overlapping canonical grid. Out-of-bounds moves are constrained; no query is executed.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-008](../product/user-stories.md#us-build-008) / [AC-BUILD-008](../product/acceptance-criteria.md#ac-build-008).


## TC-BUILD-009

**ID:** TC-BUILD-009
**Title:** Duplicate widget
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Select a widget; Duplicate; Undo; Redo.
**Expected result:** Unique stable widget/series IDs and a valid placement are produced. No available placement reports feedback instead of overlapping invalid layout.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-009](../product/user-stories.md#us-build-009) / [AC-BUILD-009](../product/acceptance-criteria.md#ac-build-009).


## TC-BUILD-010

**ID:** TC-BUILD-010
**Title:** Delete widget
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Delete a selected widget; Undo.
**Expected result:** Widget is removed locally and Undo restores it. Deletion does not delete the saved record.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-010](../product/user-stories.md#us-build-010) / [AC-BUILD-010](../product/acceptance-criteria.md#ac-build-010).


## TC-BUILD-011

**ID:** TC-BUILD-011
**Title:** Reset widget size
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Resize a widget; Reset size.
**Expected result:** Type-specific default size applies with valid placement. Undo restores previous geometry.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-011](../product/user-stories.md#us-build-011) / [AC-BUILD-011](../product/acceptance-criteria.md#ac-build-011).


## TC-BUILD-012

**ID:** TC-BUILD-012
**Title:** Auto arrange and reset layout
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Move/resize widgets; Auto arrange; Reset layout; Undo.
**Expected result:** Auto arrange retains sizes; reset returns default layout; changes are undoable. No analytics request or save accompanies layout-only changes.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-012](../product/user-stories.md#us-build-012) / [AC-BUILD-012](../product/acceptance-criteria.md#ac-build-012).


## TC-BUILD-013

**ID:** TC-BUILD-013
**Title:** Undo and Redo semantic edits
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Replace a metric; Undo; Redo.
**Expected result:** Draft history restores coherent spec and semantic preview. A new edit after Undo clears the redo branch.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-013](../product/user-stories.md#us-build-013) / [AC-BUILD-013](../product/acceptance-criteria.md#ac-build-013).


## TC-BUILD-014

**ID:** TC-BUILD-014
**Title:** Apply dashboard filters
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose an available branch filter; execute preview; clear it.
**Expected result:** Results match user filter intersected with enforced policy. User filter never overrides branch membership restrictions.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-014](../product/user-stories.md#us-build-014) / [AC-BUILD-014](../product/acceptance-criteria.md#ac-build-014).


## TC-BUILD-015

**ID:** TC-BUILD-015
**Title:** Configure analysis
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose monthly revenue with YoY and moving average; then grouping and top N.
**Expected result:** Only bounded compatible combinations execute; top N belongs to first series. Running total on an unordered dimension and top N on a later series are rejected.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/web/test/builder.test.ts](../../apps/web/test/builder.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-BUILD-015](../product/user-stories.md#us-build-015) / [AC-BUILD-015](../product/acceptance-criteria.md#ac-build-015).

## TC-BUILD-016

**ID:** TC-BUILD-016
**Title:** Governed palette preview, history and saved reopening
**Priority:** P1
**Area:** BUILD
**Persona:** Analyst
**Tenant:** demo-iq; repeat with authorized demo-eg identity
**Locale:** EN and AR/RTL
**Theme:** Light and Dark
**Preconditions:** Disposable synthetic API/web and editable chart; record initial metric, dimension, analysis, filters, layout and unrelated presentation.
**Test data:** Branch gross-profit Top-5 horizontal Bar; Blue/Green/Default choices.
**Steps:** Create/edit chart; choose Blue then Green. Verify preview after each selection without Apply. Inspect Network for no analytics execution or save. Undo to Blue; Redo to Green. Save explicitly, refresh and reopen from library. Verify persisted palette. Repeat themes/locales at 1280/1024/390; use keyboard on native select. Also select a palette before applying a new widget.
**Expected result:** Only governed palette changes; business/query intent and layout remain identical. Preview is immediate, Undo/Redo work, and unsaved choices do not persist before Save. Saved palette survives reopening; Light/Dark centrally resolves colors. No raw color input exists.
**Cleanup:** Discard remaining unsaved changes; use disposable metadata DB for records; restore preferences.
**Automation coverage:** [builder tests](../../apps/web/test/builder.test.ts), [native control rendering](../../apps/web/test/presentation-ui.test.ts), [theme tests](../../apps/web/test/chart-palette.test.ts), [saved API tests](../../apps/api/test/saved-dashboards.test.ts). Human steps here are a plan, not a claim all were performed; performed evidence is in [planner closeout](ai-planner-provider-ux-verification.md).
**Story / acceptance:** [US-BUILD-016](../product/user-stories.md#us-build-016) / [AC-BUILD-016](../product/acceptance-criteria.md#ac-build-016).
