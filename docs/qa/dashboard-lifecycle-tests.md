# Dashboard Lifecycle Tests

Current synthetic-demo regression cases. Use the setup and evidence rules in [manual test plan](manual-test-plan.md). Cases requiring a fake provider/repository are operator-run integration rehearsals; they are not faults injected into customer systems.

## TC-DASH-101

**ID:** TC-DASH-101
**Title:** Browse templates
**Priority:** P1
**Area:** TPL
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open Templates and inspect the list in both markets.
**Expected result:** Market-neutral definitions show localized names and availability. A restricted template is visible with a reason and cannot open.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [template/eval application tests](../../packages/application/test/application.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-TPL-001](../product/user-stories.md#us-tpl-001) / [AC-TPL-001](../product/acceptance-criteria.md#ac-tpl-001).


## TC-DASH-102

**ID:** TC-DASH-102
**Title:** Filter template category and search
**Priority:** P1
**Area:** TPL
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose Sales category; search a localized title or tag; clear both.
**Expected result:** Only matching templates remain and clearing restores the list. No match displays an empty state.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [template/eval application tests](../../packages/application/test/application.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-TPL-002](../product/user-stories.md#us-tpl-002) / [AC-TPL-002](../product/acceptance-criteria.md#ac-tpl-002).


## TC-DASH-103

**ID:** TC-DASH-103
**Title:** Handle a restricted template
**Priority:** P1
**Area:** TPL
**Persona:** Sales Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Inspect inventory or maintenance templates.
**Expected result:** A restriction is explained and opening is unavailable. Handcrafted instantiate request is rejected by metric authorization.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [template/eval application tests](../../packages/application/test/application.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-TPL-003](../product/user-stories.md#us-tpl-003) / [AC-TPL-003](../product/acceptance-criteria.md#ac-tpl-003).


## TC-DASH-104

**ID:** TC-DASH-104
**Title:** Open a template preview
**Priority:** P1
**Area:** TPL
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open Sales Performance in Iraq then Egypt.
**Expected result:** Preview uses the selected tenant profile and bounded date preset. A metric failure produces partial/error feedback rather than invented values.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [template/eval application tests](../../packages/application/test/application.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-TPL-004](../product/user-stories.md#us-tpl-004) / [AC-TPL-004](../product/acceptance-criteria.md#ac-tpl-004).


## TC-DASH-105

**ID:** TC-DASH-105
**Title:** Use a template as a draft
**Priority:** P1
**Area:** TPL
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open a template; choose Use template; change a title.
**Expected result:** A separate unsaved working draft is editable; the catalog template is unchanged. Cancel dirty-draft abandonment: retain the existing draft.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [template/eval application tests](../../packages/application/test/application.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-TPL-005](../product/user-stories.md#us-tpl-005) / [AC-TPL-005](../product/acceptance-criteria.md#ac-tpl-005).


## TC-DASH-001

**ID:** TC-DASH-001
**Title:** Create a blank dashboard
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose New dashboard then Blank dashboard.
**Expected result:** An empty manual builder draft (not an executable DashboardSpec until a widget is added) starts without a persisted record. Cancel abandonment of an existing dirty draft: keep it.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-001](../product/user-stories.md#us-dash-001) / [AC-DASH-001](../product/acceptance-criteria.md#ac-dash-001).


## TC-DASH-002

**ID:** TC-DASH-002
**Title:** First Save with bilingual naming
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Add revenue; Save; enter English and Arabic names; confirm.
**Expected result:** A private DashboardRecord with version 1 is created; localized titles reopen. Blank primary or overlong title is rejected; secondary blank uses primary.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-002](../product/user-stories.md#us-dash-002) / [AC-DASH-002](../product/acceptance-criteria.md#ac-dash-002).


## TC-DASH-003

**ID:** TC-DASH-003
**Title:** Rename a dashboard
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open an owned record; Rename; change both titles; inspect library before Save; Save.
**Expected result:** Rename changes the working draft; persistence changes only on Save. Cancel naming: retain original titles.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-003](../product/user-stories.md#us-dash-003) / [AC-DASH-003](../product/acceptance-criteria.md#ac-dash-003).


## TC-DASH-004

**ID:** TC-DASH-004
**Title:** Save an existing draft
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Edit an owned saved dashboard; choose Save; reopen.
**Expected result:** The same record is updated with an incremented version and clean state. Transport failure retains the unsaved working draft.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-004](../product/user-stories.md#us-dash-004) / [AC-DASH-004](../product/acceptance-criteria.md#ac-dash-004).


## TC-DASH-005

**ID:** TC-DASH-005
**Title:** Save As a separate record
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open a saved record; Save As; enter another name; reopen both.
**Expected result:** New record ID and version 1; original remains unchanged. Cancel naming creates no new record.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-005](../product/user-stories.md#us-dash-005) / [AC-DASH-005](../product/acceptance-criteria.md#ac-dash-005).


## TC-DASH-006

**ID:** TC-DASH-006
**Title:** Discard changes
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Edit a saved record; Discard; repeat on an unsaved draft.
**Expected result:** Saved draft restores the loaded version; new draft is abandoned. Cancel abandonment retains modifications.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-006](../product/user-stories.md#us-dash-006) / [AC-DASH-006](../product/acceptance-criteria.md#ac-dash-006).


## TC-DASH-007

**ID:** TC-DASH-007
**Title:** Protect against a version conflict
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open the same owned record in two tabs; save in tab A; edit and save in tab B.
**Expected result:** Tab B receives conflict feedback; tab A version is not overwritten. Reload latest intentionally before retrying; do not retry with a fabricated version.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-007](../product/user-stories.md#us-dash-007) / [AC-DASH-007](../product/acceptance-criteria.md#ac-dash-007).


## TC-DASH-008

**ID:** TC-DASH-008
**Title:** Reopen a deep link
**Priority:** P0
**Area:** DASH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Save; copy /dashboards/:recordId; open in another tab and refresh.
**Expected result:** Accessible record is reloaded under a validated tenant membership. Wrong tenant/private non-owner receives not-found without record leakage.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/saved-dashboards.test.ts](../../apps/api/test/saved-dashboards.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DASH-008](../product/user-stories.md#us-dash-008) / [AC-DASH-008](../product/acceptance-criteria.md#ac-dash-008).
