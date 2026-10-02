# Release and demo smoke suite

Run these 30 cases before demos, releases, adapter changes and deployments. P0 blocks release; P1 requires a documented owner and disposition. Operator fixtures are required for controlled partial/structured failures. [Setup and recording](manual-test-plan.md).

## TC-SMOKE-001

**ID:** TC-SMOKE-001
**Title:** API startup
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Run dev:api with valid mock configuration; GET /health/live and /health/ready.
**Expected result:** Live and ready return 200 with safe status fields.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-002

**ID:** TC-SMOKE-002
**Title:** Web startup
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Run dev:web; open the app.
**Expected result:** Workspace loads without an uncaught error.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-003

**ID:** TC-SMOKE-003
**Title:** Select a tenant
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Select Egypt from the workspace selector; inspect profile currency and branch labels.
**Expected result:** Only the validated Egypt membership and EGP results are active. Attempt an unassigned tenant header: 403, no data.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-004

**ID:** TC-SMOKE-004
**Title:** Use multi-tenant membership
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Switch Iraq to Egypt and back.
**Expected result:** The current tenant changes; old builder history is cleared after abandonment confirmation. Cancel abandonment: retain the current draft and tenant.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-005

**ID:** TC-SMOKE-005
**Title:** Switch UI language
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Open a saved dashboard; switch EN to AR; refresh.
**Expected result:** RTL and translated labels persist; DashboardSpec and dirty state do not change. An unsupported stored locale falls back to a supported preference.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-006

**ID:** TC-SMOKE-006
**Title:** Switch presentation theme
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Select Light, Dark and System; refresh.
**Expected result:** Presentation follows the preference without analytics execution or a spec edit. System follows OS preference; the chosen explicit mode overrides it.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-007

**ID:** TC-SMOKE-007
**Title:** Open a template preview
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Open Sales Performance in Iraq then Egypt.
**Expected result:** Preview uses the selected tenant profile and bounded date preset. A metric failure produces partial/error feedback rather than invented values.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-008

**ID:** TC-SMOKE-008
**Title:** Create a blank dashboard
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Choose New dashboard then Blank dashboard.
**Expected result:** An empty manual builder draft (not an executable DashboardSpec until a widget is added) starts without a persisted record. Cancel abandonment of an existing dirty draft: keep it.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-009

**ID:** TC-SMOKE-009
**Title:** Drag a metric onto canvas
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** On desktop drag revenue from palette to an empty canvas position.
**Expected result:** A validated widget is created at the snapped position. Outside-canvas or unsupported drop makes no change.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-010

**ID:** TC-SMOKE-010
**Title:** Move widget
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Move using handle; repeat with arrow keys.
**Expected result:** Placement snaps to a valid non-overlapping canonical grid. Out-of-bounds moves are constrained; no query is executed.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-011

**ID:** TC-SMOKE-011
**Title:** Resize widget
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Drag a resize edge/corner; inspect width/height; use Shift+arrow on focused handle.
**Expected result:** Canonical grid bounds hold; no analytics call or auto-save. Narrow screens disable direct grid manipulation.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-012

**ID:** TC-SMOKE-012
**Title:** First Save with bilingual naming
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Add revenue; Save; enter English and Arabic names; confirm.
**Expected result:** A private DashboardRecord with version 1 is created; localized titles reopen. Blank primary or overlong title is rejected; secondary blank uses primary.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-013

**ID:** TC-SMOKE-013
**Title:** Reopen a deep link
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Save; copy /dashboards/:recordId; open in another tab and refresh.
**Expected result:** Accessible record is reloaded under a validated tenant membership. Wrong tenant/private non-owner receives not-found without record leakage.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-014

**ID:** TC-SMOKE-014
**Title:** Rename a dashboard
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Open an owned record; Rename; change both titles; inspect library before Save; Save.
**Expected result:** Rename changes the working draft; persistence changes only on Save. Cancel naming: retain original titles.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-015

**ID:** TC-SMOKE-015
**Title:** Save As a separate record
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Open a saved record; Save As; enter another name; reopen both.
**Expected result:** New record ID and version 1; original remains unchanged. Cancel naming creates no new record.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-016

**ID:** TC-SMOKE-016
**Title:** Favorite a dashboard
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Favorite a record; open Favorites; refresh; un-favorite.
**Expected result:** Personal tenant-scoped favorite persists; record itself is unchanged. Other users do not inherit the preference.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-017

**ID:** TC-SMOKE-017
**Title:** Create and rename folder
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Create a folder; rename it; refresh.
**Expected result:** Flat personal folder name persists within tenant/user scope. Blank or overlong name rejected; duplicate names are not assumed forbidden.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-018

**ID:** TC-SMOKE-018
**Title:** Generate an unsaved dashboard
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Choose Create with AI; request a sales dashboard.
**Expected result:** Authorized valid DashboardSpec executes and begins unsaved. Unsupported mock intent gives explicit feedback and no pretend success.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-019

**ID:** TC-SMOKE-019
**Title:** Edit through a patch
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Open an owned dashboard; Edit with AI; request a three-month moving average.
**Expected result:** Validated patch modifies working draft only; saved record remains unchanged until Save. Invalid patch is rejected atomically.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-020

**ID:** TC-SMOKE-020
**Title:** Move manual draft into AI editing
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Build a sales draft manually; switch to Edit with AI; request an edit.
**Expected result:** The current working spec is the edit context; edits remain unsaved. Cancel abandonment if a new creation flow would replace the draft.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-021

**ID:** TC-SMOKE-021
**Title:** Move generated dashboard into manual editing
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Generate sales dashboard; choose Edit; replace a metric.
**Expected result:** Builder edits the generated draft with existing validation/history. No implicit Save occurs when entering or leaving manual mode.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-022

**ID:** TC-SMOKE-022
**Title:** Reject unauthorized metrics
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Request inventory_value through builder and handcrafted analytics endpoint.
**Expected result:** Unauthorized metric is absent/disabled and direct request receives 403. No inventory value leaks in result or error.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-023

**ID:** TC-SMOKE-023
**Title:** Enforce branch scope
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Use Baghdad manager; request all branches then explicitly Basra.
**Expected result:** Enforced Baghdad policy is ANDed with user filters; Basra-only request returns no Basra data. Clearing user filters never clears enforced filters.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-024

**ID:** TC-SMOKE-024
**Title:** Isolate private records
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Save private dashboard; switch to another identity and try its deep link.
**Expected result:** Non-owner cannot list or read it; access returns 404. No title or record metadata leaks.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-025

**ID:** TC-SMOKE-025
**Title:** Render partial series
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Use fake repository with one successful and one failed compatible series.
**Expected result:** Usable series remains visible with partial feedback; failed cells are null. If required first-series top N fails, no unrestricted union is rendered.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-026

**ID:** TC-SMOKE-026
**Title:** Reject handcrafted unauthorized spec
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** POST a valid v2 spec containing a maintenance KPI to execute.
**Expected result:** Post-schema metric policy rejects it with 403 before repository execution. LLM-generated and patched outputs face the same post-validation policy.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-027

**ID:** TC-SMOKE-027
**Title:** Distinguish data coverage
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Inspect result metadata and UI Data through label.
**Expected result:** Latest relevant business/event date is dataThrough, independent of ingestion freshness. Do not relabel max(event_date) as source updated.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-028

**ID:** TC-SMOKE-028
**Title:** Show known source freshness
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Configure adapter sourceAsOf explicitly; compare default synthetic metadata.
**Expected result:** Source updated appears only when known; default mock/SQLite omits it. No fabricated synchronization timestamp.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-029

**ID:** TC-SMOKE-029
**Title:** Protect against a version conflict
**Priority:** P0
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** Open the same owned record in two tabs; save in tab A; edit and save in tab B.
**Expected result:** Tab B receives conflict feedback; tab A version is not overwritten. Reload latest intentionally before retrying; do not retry with a fabricated version.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.


## TC-SMOKE-030

**ID:** TC-SMOKE-030
**Title:** Use responsive navigation
**Priority:** P1
**Area:** Release smoke
**Persona:** Analyst; use restricted/branch/operator identity named by the steps
**Tenant:** demo-iq, demo-eg for market-dependent steps
**Locale:** EN and AR
**Theme:** Light and Dark; System for theme preference
**Preconditions:** Follow [manual test plan](manual-test-plan.md); synthetic data and disposable metadata DB; required owned/shared records or fake harness prepared.
**Test data:** Seeded demo facts; QA-prefixed names; no operational data.
**Steps:** At narrow width open navigation, library and builder; return desktop.
**Expected result:** Stacked cards and reachable controls; direct grid drag disabled on narrow view. No horizontal loss of essential controls.
**Cleanup:** Discard drafts, clear filters and restore default identity/preferences; use disposable metadata DB for saved test records.
**Automation coverage:** [API](../../apps/api/test/), [web](../../apps/web/test/), [application](../../packages/application/test/) cover contracts; execute this human smoke case for end-to-end evidence.

## Palette smoke extension

Include [TC-BUILD-016](builder-tests.md#tc-build-016): Blue → Green previews immediately; Undo/Redo, explicit Save and refresh restore the correct palette. Check Arabic labels and Dark mode without changed metrics/filters/layout or additional analytics execution. The extension is a documented gate, not evidence of all manual cases having been run.
