# Ai Tests

Current synthetic-demo regression cases. Use the setup and evidence rules in [manual test plan](manual-test-plan.md). Cases requiring a fake provider/repository are operator-run integration rehearsals; they are not faults injected into customer systems.

## TC-AI-001

**ID:** TC-AI-001
**Title:** Generate an unsaved dashboard
**Priority:** P0
**Area:** AI
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Choose Create with AI; request a sales dashboard.
**Expected result:** Authorized valid DashboardSpec executes and begins unsaved. Unsupported mock intent gives explicit feedback and no pretend success.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-001](../product/user-stories.md#us-ai-001) / [AC-AI-001](../product/acceptance-criteria.md#ac-ai-001).


## TC-AI-002

**ID:** TC-AI-002
**Title:** Edit through a patch
**Priority:** P0
**Area:** AI
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Open an owned dashboard; Edit with AI; request a three-month moving average.
**Expected result:** Validated patch modifies working draft only; saved record remains unchanged until Save. Invalid patch is rejected atomically.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-002](../product/user-stories.md#us-ai-002) / [AC-AI-002](../product/acceptance-criteria.md#ac-ai-002).


## TC-AI-003

**ID:** TC-AI-003
**Title:** Move manual draft into AI editing
**Priority:** P0
**Area:** AI
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Build a sales draft manually; switch to Edit with AI; request an edit.
**Expected result:** The current working spec is the edit context; edits remain unsaved. Cancel abandonment if a new creation flow would replace the draft.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-003](../product/user-stories.md#us-ai-003) / [AC-AI-003](../product/acceptance-criteria.md#ac-ai-003).


## TC-AI-004

**ID:** TC-AI-004
**Title:** Move generated dashboard into manual editing
**Priority:** P0
**Area:** AI
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Generate sales dashboard; choose Edit; replace a metric.
**Expected result:** Builder edits the generated draft with existing validation/history. No implicit Save occurs when entering or leaving manual mode.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-004](../product/user-stories.md#us-ai-004) / [AC-AI-004](../product/acceptance-criteria.md#ac-ai-004).


## TC-AI-005

**ID:** TC-AI-005
**Title:** Reject unsupported mock intent
**Priority:** P0
**Area:** AI
**Persona:** Analyst
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; an accessible sales template or owned saved dashboard.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** In mock mode ask for an unsupported complex dashboard.
**Expected result:** A bounded unsupported-intent error appears. Existing draft remains recoverable.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-005](../product/user-stories.md#us-ai-005) / [AC-AI-005](../product/acceptance-criteria.md#ac-ai-005).


## TC-AI-006

**ID:** TC-AI-006
**Title:** Reject invalid structured output
**Priority:** P0
**Area:** AI
**Persona:** Developer/Operator
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Use fake provider returning invalid generation/edit plans (or canonically incompatible compiled intent) after bounded repair attempts.
**Expected result:** Browser receives INVALID_STRUCTURED_OUTPUT without raw provider output. Opt-in API diagnostics identify stage safely; default diagnostics stay off.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-006](../product/user-stories.md#us-ai-006) / [AC-AI-006](../product/acceptance-criteria.md#ac-ai-006).


## TC-AI-007

**ID:** TC-AI-007
**Title:** Handle provider outage or timeout
**Priority:** P0
**Area:** AI
**Persona:** Developer/Operator
**Tenant:** demo-iq; repeat tenant-sensitive steps in demo-eg
**Locale:** EN, repeat AR
**Theme:** Light, repeat Dark for visual steps; System for preference checks
**Preconditions:** API and web started with fresh synthetic fixtures; validated demo membership; fake provider/repository harness enabled.
**Test data:** Synthetic sales fixture; use uniquely named QA records/folders; no customer data.
**Steps:** Configure fake endpoint to fail or delay past timeout; request generation.
**Expected result:** Upstream/timeout feedback is safe; analytics and library remain usable. No unbounded retry; no secrets or prompts in browser errors.
**Cleanup:** Discard unsaved changes; restore identity, tenant, filters and preferences; remove test folders/associations. Saved QA records may remain because record deletion is not implemented; use a disposable metadata DB.
**Automation coverage:** [packages/application/test/structured-planner.test.ts](../../packages/application/test/structured-planner.test.ts) covers the related contract; human interaction and appearance still require this case.
**Story / acceptance:** [US-AI-007](../product/user-stories.md#us-ai-007) / [AC-AI-007](../product/acceptance-criteria.md#ac-ai-007).

## TC-AI-008

**ID:** TC-AI-008
**Title:** Preserve explicit presentation and target the described widget
**Priority:** P1
**Area:** AI
**Persona:** Analyst
**Tenant:** Authorized demo-iq identity; repeat demo-eg where permitted
**Locale:** EN; repeat Arabic equivalent
**Theme:** Light; repeat Dark to inspect palette intent
**Preconditions:** Synthetic facts and disposable dashboard records; configured structured endpoint for live acceptance, or fake provider for deterministic boundary rehearsal.
**Test data:** Revenue KPI, monthly Revenue MA3 Line, and Top-5 branch gross-profit horizontal blue Bar.
**Steps:** Generate the explicit three-widget request. Inspect that Bar palette is Blue and orientation horizontal. Edit “Change the Revenue line to purple”; check the Line rather than KPI changes. Edit “make the branch gross profit chart green”; check the branch Bar changes. Verify metric/dimension/analysis/filter/layout preservation. With a fake provider omitting palette from an explicit presentation, verify plan validation rejects it; with palette default, verify the compiler preserves default even if the prompt says Blue. Inspect bilingual metric/dimension labels and only existing explicit widget titles in the target index. Recheck a one-widget palette edit.
**Expected result:** Model-selected canonical references target the described widget; sparse edits preserve everything else and remain unsaved. Explicit presentation should survive live generation; every explicit presentation requires a governed palette token; missing palette fails validation and default is preserved without prompt parsing. The target index precedes full current spec, distinguishing both Revenue widgets without analytics/customer values.
**Cleanup:** Discard drafts; retain disposable saved records only until the test metadata DB is replaced; restore preferences.
**Automation coverage:** [planner adherence tests](../../packages/application/test/planner-adherence.test.ts) exercise deterministic/fake-provider boundaries, not live model understanding. Live acceptance of this follow-up is pending the user's final endpoint run.
