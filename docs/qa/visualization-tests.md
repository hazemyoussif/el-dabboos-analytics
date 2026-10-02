# Visualization Tests

Current synthetic-demo regression cases. Use the setup and evidence rules in [manual test plan](manual-test-plan.md). Cases requiring a fake provider/repository are operator-run integration rehearsals; they are not faults injected into customer systems.

## TC-VIS-101

**ID:** TC-VIS-101
**Title:** Select a tenant
**Priority:** P1
**Area:** WORK
**Persona:** Regional Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Select Egypt from the workspace selector; inspect profile currency and branch labels.
**Expected result:** Only the validated Egypt membership and EGP results are active. Attempt an unassigned tenant header: 403, no data.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-WORK-001](../product/user-stories.md#us-work-001) / [AC-WORK-001](../product/acceptance-criteria.md#ac-work-001).


## TC-VIS-102

**ID:** TC-VIS-102
**Title:** Use multi-tenant membership
**Priority:** P1
**Area:** WORK
**Persona:** Regional Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Switch Iraq to Egypt and back.
**Expected result:** The current tenant changes; old builder history is cleared after abandonment confirmation. Cancel abandonment: retain the current draft and tenant.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-WORK-002](../product/user-stories.md#us-work-002) / [AC-WORK-002](../product/acceptance-criteria.md#ac-work-002).


## TC-VIS-103

**ID:** TC-VIS-103
**Title:** Switch UI language
**Priority:** P1
**Area:** WORK
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open a saved dashboard; switch EN to AR; refresh.
**Expected result:** RTL and translated labels persist; DashboardSpec and dirty state do not change. An unsupported stored locale falls back to a supported preference.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-WORK-003](../product/user-stories.md#us-work-003) / [AC-WORK-003](../product/acceptance-criteria.md#ac-work-003).


## TC-VIS-104

**ID:** TC-VIS-104
**Title:** Switch presentation theme
**Priority:** P1
**Area:** WORK
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Select Light, Dark and System; refresh.
**Expected result:** Presentation follows the preference without analytics execution or a spec edit. System follows OS preference; the chosen explicit mode overrides it.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-WORK-004](../product/user-stories.md#us-work-004) / [AC-WORK-004](../product/acceptance-criteria.md#ac-work-004).


## TC-VIS-001

**ID:** TC-VIS-001
**Title:** Render partial series
**Priority:** P1
**Area:** VIS
**Persona:** Developer/Operator
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Use fake repository with one successful and one failed compatible series.
**Expected result:** Usable series remains visible with partial feedback; failed cells are null. If required first-series top N fails, no unrestricted union is rendered.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-001](../product/user-stories.md#us-vis-001) / [AC-VIS-001](../product/acceptance-criteria.md#ac-vis-001).


## TC-VIS-002

**ID:** TC-VIS-002
**Title:** Render failed widget
**Priority:** P1
**Area:** VIS
**Persona:** Developer/Operator
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Fail every series of a widget with a controlled fake repository.
**Expected result:** Widget error state is visible; other widgets remain usable. No fabricated zero or stale success is shown.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-002](../product/user-stories.md#us-vis-002) / [AC-VIS-002](../product/acceptance-criteria.md#ac-vis-002).


## TC-VIS-003

**ID:** TC-VIS-003
**Title:** Render empty and missing results
**Priority:** P1
**Area:** VIS
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose a valid window with no facts; inspect additive, ratio and snapshot widgets.
**Expected result:** Additive empty totals use semantic zero; missing ratio/snapshot remains null. No invented zero for missing aligned keys.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-003](../product/user-stories.md#us-vis-003) / [AC-VIS-003](../product/acceptance-criteria.md#ac-vis-003).


## TC-VIS-004

**ID:** TC-VIS-004
**Title:** Present Light and Dark charts
**Priority:** P1
**Area:** VIS
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Render all supported chart types in Light and Dark.
**Expected result:** Central palette, axes, tooltips and tables remain readable. Theme switch does not execute analytics or save spec.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-004](../product/user-stories.md#us-vis-004) / [AC-VIS-004](../product/acceptance-criteria.md#ac-vis-004).


## TC-VIS-005

**ID:** TC-VIS-005
**Title:** Present Arabic RTL
**Priority:** P1
**Area:** VIS
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Switch AR; inspect shell, chart, filters, table and naming dialog.
**Expected result:** Professional labels use MSA; RTL shell works; temporal order remains chronological. Market examples use selected IQ/EG conversational phrasing.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-005](../product/user-stories.md#us-vis-005) / [AC-VIS-005](../product/acceptance-criteria.md#ac-vis-005).


## TC-VIS-006

**ID:** TC-VIS-006
**Title:** Use responsive navigation
**Priority:** P1
**Area:** VIS
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** At narrow width open navigation, library and builder; return desktop.
**Expected result:** Stacked cards and reachable controls; direct grid drag disabled on narrow view. No horizontal loss of essential controls.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-006](../product/user-stories.md#us-vis-006) / [AC-VIS-006](../product/acceptance-criteria.md#ac-vis-006).


## TC-VIS-007

**ID:** TC-VIS-007
**Title:** Retain analytics metadata
**Priority:** P1
**Area:** VIS
**Persona:** Developer/Operator
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Execute ranking and comparison widgets; inspect aligned application rows and charts.
**Expected result:** Rank, comparisonValue, absoluteChange, percentageChange remain available without re-query. Missing values retain null; renderer consumes structured series values.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [web preference/presentation tests](../../apps/web/test/presentation.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-VIS-007](../product/user-stories.md#us-vis-007) / [AC-VIS-007](../product/acceptance-criteria.md#ac-vis-007).


## TC-VIS-201

**ID:** TC-VIS-201
**Title:** Distinguish data coverage
**Priority:** P1
**Area:** DATA
**Persona:** Analyst
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Inspect result metadata and UI Data through label.
**Expected result:** Latest relevant business/event date is dataThrough, independent of ingestion freshness. Do not relabel max(event_date) as source updated.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [data engine tests](../../packages/data/test/engine.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DATA-001](../product/user-stories.md#us-data-001) / [AC-DATA-001](../product/acceptance-criteria.md#ac-data-001).


## TC-VIS-202

**ID:** TC-VIS-202
**Title:** Show known source freshness
**Priority:** P1
**Area:** DATA
**Persona:** Developer/Operator
**Tenant:** demo-iq and demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Configure adapter sourceAsOf explicitly; compare default synthetic metadata.
**Expected result:** Source updated appears only when known; default mock/SQLite omits it. No fabricated synchronization timestamp.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [data engine tests](../../packages/data/test/engine.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-DATA-002](../product/user-stories.md#us-data-002) / [AC-DATA-002](../product/acceptance-criteria.md#ac-data-002).
