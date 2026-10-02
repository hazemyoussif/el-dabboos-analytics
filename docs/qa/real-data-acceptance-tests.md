# Future real-data acceptance specifications

**Future / pending source and business confirmation.** No actual customer data or source integration is required in this branch. All numeric tolerances are **TBD by business approval**; do not pick arbitrary percentages. Execute these when a canonical source adapter and signed mapping exist. [Contract](../integration/real-data-contract.md), [reconciliation plan](../integration/reconciliation-plan.md).

## TC-DATA-001

**ID:** TC-DATA-001
**Title:** Revenue reconciliation
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Monthly revenue and net revenue match an approved source report with matching states, dates and currency; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-002

**ID:** TC-DATA-002
**Title:** Gross profit reconciliation
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Revenue costs and gross profit reconcile; margin is sum(gross_profit)/sum(net_revenue); absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-003

**ID:** TC-DATA-003
**Title:** Order count
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Counted business orders and eligible states match; multiple order lines do not multiply order_count; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-004

**ID:** TC-DATA-004
**Title:** Customer grouping
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Customer IDs map stably and grouped totals reconcile to authorized control total; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-005

**ID:** TC-DATA-005
**Title:** Branch grouping
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Branch assignments and totals match the agreed report; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-006

**ID:** TC-DATA-006
**Title:** Product grouping
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Product/category mapping and units reconcile without multiplying monetary facts; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-007

**ID:** TC-DATA-007
**Title:** Snapshot balances
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Latest eligible entity snapshot at cutoff matches balance report; never sum dates; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-008

**ID:** TC-DATA-008
**Title:** Freshness and watermark
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Business dataThrough and extraction sourceAsOf reflect separate approved watermarks; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-009

**ID:** TC-DATA-009
**Title:** Missing records
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Missing IDs/required measures are detected and reported; no silent drop; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-010

**ID:** TC-DATA-010
**Title:** Duplicate records
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Duplicate event identities or same entity/measure/date snapshots are detected and handled by approved rule; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-011

**ID:** TC-DATA-011
**Title:** Backdated corrections
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Corrected events restate appropriate periods and preserve approved reconciliation history; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-012

**ID:** TC-DATA-012
**Title:** Tenant isolation
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Foreign tenant rows and metadata are absent under every authorized query; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-013

**ID:** TC-DATA-013
**Title:** Branch policy intersection
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Requested filters intersect enforced policy; a disallowed branch returns no disallowed values; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.


## TC-DATA-014

**ID:** TC-DATA-014
**Title:** Currency checks
**Priority:** P0
**Area:** Future source acceptance
**Persona:** Business metric owner and integration engineer
**Tenant:** Approved pilot tenant, plus a second isolation control tenant
**Locale:** EN/AR report labels with identical numeric semantics
**Theme:** Light/Dark presentation, no effect on calculation
**Preconditions:** Approved source mapping, eligible-state rules, currency policy, watermark and business reference report.
**Test data:** Agreed source extract with known edge cases; access and handling approved before use.
**Steps:** Freeze source/report watermark; transform canonical rows; execute matching tenant/date/grouping through adapter and semantic engine; compare totals and exception records; document tolerance approval.
**Expected result:** Transaction/base/reporting currencies follow approved conversion; incompatible currencies never silently sum; absolute/relative tolerances TBD and signed off, otherwise acceptance is blocked.
**Cleanup:** Remove approved temporary extracts per retention policy; retain redacted reconciliation evidence.
**Automation coverage:** Future source contract/reconciliation tests; current [engine tests](../../packages/data/test/) provide semantic behavior only, not operational source certification.
