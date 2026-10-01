# Library Tests

Current synthetic-demo regression cases. Use the setup and evidence rules in [manual test plan](manual-test-plan.md). Cases requiring a fake provider/repository are operator-run integration rehearsals; they are not faults injected into customer systems.

## TC-LIB-001

**ID:** TC-LIB-001
**Title:** Browse All saved dashboards
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Save a dashboard; open All.
**Expected result:** Only accessible records for this tenant appear, separately from templates. Foreign tenant/private records never appear.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-001](../product/user-stories.md#us-lib-001) / [AC-LIB-001](../product/acceptance-criteria.md#ac-lib-001).


## TC-LIB-002

**ID:** TC-LIB-002
**Title:** Favorite a dashboard
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Favorite a record; open Favorites; refresh; un-favorite.
**Expected result:** Personal tenant-scoped favorite persists; record itself is unchanged. Other users do not inherit the preference.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-002](../product/user-stories.md#us-lib-002) / [AC-LIB-002](../product/acceptance-criteria.md#ac-lib-002).


## TC-LIB-003

**ID:** TC-LIB-003
**Title:** Browse My dashboards
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open My dashboards with an owned and shared record available.
**Expected result:** Only records owned by current identity appear. Switching identity recomputes ownership.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-003](../product/user-stories.md#us-lib-003) / [AC-LIB-003](../product/acceptance-criteria.md#ac-lib-003).


## TC-LIB-004

**ID:** TC-LIB-004
**Title:** Browse Shared dashboards
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Prepare a tenant-shared record owned by admin via API; open Shared as analyst.
**Expected result:** Accessible shared non-owned record appears and can be viewed or copied. Editing original remains owner-controlled; no sharing management UI is implied.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-004](../product/user-stories.md#us-lib-004) / [AC-LIB-004](../product/acceptance-criteria.md#ac-lib-004).


## TC-LIB-005

**ID:** TC-LIB-005
**Title:** Create and rename folder
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Create a folder; rename it; refresh.
**Expected result:** Flat personal folder name persists within tenant/user scope. Blank or overlong name rejected; duplicate names are not assumed forbidden.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-005](../product/user-stories.md#us-lib-005) / [AC-LIB-005](../product/acceptance-criteria.md#ac-lib-005).


## TC-LIB-006

**ID:** TC-LIB-006
**Title:** Search dashboards
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Search an English then Arabic title; clear search.
**Expected result:** Client-side localized title filtering is correct. No result produces an empty state.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-006](../product/user-stories.md#us-lib-006) / [AC-LIB-006](../product/acceptance-criteria.md#ac-lib-006).


## TC-LIB-007

**ID:** TC-LIB-007
**Title:** Sort dashboard library
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Select updated, A–Z, Z–A, oldest and newest sorting.
**Expected result:** Visible records reorder deterministically with stable ID ties. Sorting does not change persisted dashboard contents.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-007](../product/user-stories.md#us-lib-007) / [AC-LIB-007](../product/acceptance-criteria.md#ac-lib-007).


## TC-LIB-008

**ID:** TC-LIB-008
**Title:** Move dashboards between folders
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Move a record to a folder; refresh; move to another; remove folder association.
**Expected result:** Personal folder preference persists; DashboardRecord is unchanged. Inaccessible record or foreign folder is rejected.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-008](../product/user-stories.md#us-lib-008) / [AC-LIB-008](../product/acceptance-criteria.md#ac-lib-008).


## TC-LIB-009

**ID:** TC-LIB-009
**Title:** Delete a folder
**Priority:** P1
**Area:** LIB
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Create folder and associate a saved record; delete folder.
**Expected result:** Personal associations clear; saved records remain accessible in All. Other users folders and associations remain unchanged.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [apps/api/test/dashboard-library.test.ts](../../apps/api/test/dashboard-library.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-LIB-009](../product/user-stories.md#us-lib-009) / [AC-LIB-009](../product/acceptance-criteria.md#ac-lib-009).
