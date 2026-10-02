# Authorization Tests

Current synthetic-demo regression cases. Use the setup and evidence rules in [manual test plan](manual-test-plan.md). Cases requiring a fake provider/repository are operator-run integration rehearsals; they are not faults injected into customer systems.

## TC-AUTH-001

**ID:** TC-AUTH-001
**Title:** Reject unauthorized metrics
**Priority:** P0
**Area:** AUTH
**Persona:** Sales Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Request inventory_value through builder and handcrafted analytics endpoint.
**Expected result:** Unauthorized metric is absent/disabled and direct request receives 403. No inventory value leaks in result or error.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [API authorization integration tests](../../apps/api/test/api.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AUTH-001](../product/user-stories.md#us-auth-001) / [AC-AUTH-001](../product/acceptance-criteria.md#ac-auth-001).


## TC-AUTH-002

**ID:** TC-AUTH-002
**Title:** Enforce branch scope
**Priority:** P0
**Area:** AUTH
**Persona:** Branch-scoped Manager
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Use Baghdad manager; request all branches then explicitly Basra.
**Expected result:** Enforced Baghdad policy is ANDed with user filters; Basra-only request returns no Basra data. Clearing user filters never clears enforced filters.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [API authorization integration tests](../../apps/api/test/api.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AUTH-002](../product/user-stories.md#us-auth-002) / [AC-AUTH-002](../product/acceptance-criteria.md#ac-auth-002).


## TC-AUTH-003

**ID:** TC-AUTH-003
**Title:** Isolate private records
**Priority:** P0
**Area:** AUTH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Save private dashboard; switch to another identity and try its deep link.
**Expected result:** Non-owner cannot list or read it; access returns 404. No title or record metadata leaks.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [API authorization integration tests](../../apps/api/test/api.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AUTH-003](../product/user-stories.md#us-auth-003) / [AC-AUTH-003](../product/acceptance-criteria.md#ac-auth-003).


## TC-AUTH-004

**ID:** TC-AUTH-004
**Title:** Read tenant-shared records
**Priority:** P0
**Area:** AUTH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Use API-created tenant-shared record owned by admin; open as analyst.
**Expected result:** View is allowed only within membership and metric permissions. An unauthorized metric still prevents reading a shared dashboard.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [API authorization integration tests](../../apps/api/test/api.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AUTH-004](../product/user-stories.md#us-auth-004) / [AC-AUTH-004](../product/acceptance-criteria.md#ac-auth-004).


## TC-AUTH-005

**ID:** TC-AUTH-005
**Title:** Reject handcrafted unauthorized spec
**Priority:** P0
**Area:** AUTH
**Persona:** Sales Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** POST a valid v2 spec containing a maintenance KPI to execute.
**Expected result:** Post-schema metric policy rejects it with 403 before repository execution. LLM-generated and patched outputs face the same post-validation policy.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [API authorization integration tests](../../apps/api/test/api.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AUTH-005](../product/user-stories.md#us-auth-005) / [AC-AUTH-005](../product/acceptance-criteria.md#ac-auth-005).


## TC-AUTH-006

**ID:** TC-AUTH-006
**Title:** Reject foreign tenant context
**Priority:** P0
**Area:** AUTH
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Send Egypt tenant header with Iraq-only identity.
**Expected result:** 403 membership denial before metric execution. Changing browser local storage does not grant membership.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [API authorization integration tests](../../apps/api/test/api.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AUTH-006](../product/user-stories.md#us-auth-006) / [AC-AUTH-006](../product/acceptance-criteria.md#ac-auth-006).
