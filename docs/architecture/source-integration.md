# Source integration boundary

## Current

AnalyticsRepository and DimensionValueRepository hide source details. Canonical semantic catalog owns formulas and dimensions, independent of providers/tables. Mock and SQLite facts are synthetic; no Odoo/company dataset is integrated. Metadata repositories persist saved dashboards and personal organization separately from analytics source facts.

## Proposed / pending source confirmation

Odoo or operational systems → existing/company Python processing → approved canonical mart or PostgreSQL source → repository adapter → governed queries and deterministic semantics. This is a hypothesis, not a confirmed Odoo schema or direct-database permission. Ask whether Python produces aggregated mart facts or normalized source tables, and who owns updates, indexes and credentials. No specific Odoo tables are assumed.

Start with approved revenue/net revenue/order count, one tenant and monthly/branch grouping. Adapter contract tests must compare event aggregation, derived ratios, latest-entity snapshots, calendar alignment, tenant/policy filters and source metadata against canonical fixtures. Real-data reconciliation is an independent acceptance gate, not satisfied by passing mock tests. [Contract](../integration/real-data-contract.md), [reconciliation](../integration/reconciliation-plan.md), [questions](../integration/questions-for-malik.md).

## LLM privacy boundary

The configured endpoint receives authorized semantic/template metadata and user instructions; edits also send the working DashboardSpec. It does not automatically receive analytics result rows or operational database access. However a spec can contain bilingual dashboard titles, filter values and branch/customer/product identifiers; user prompts may themselves include sensitive content. Authorization to view data is not automatically authorization to send those identifiers to an external model.

| Conceptual deployment policy | Required approval |
| --- | --- |
| External SaaS model | Only explicitly approved metadata/identifiers may leave the system; review working spec and free-text instructions before enabling |
| Company-hosted model | Broader context only according to company data handling, residency, logging and retention policy |
| Tenant-local/self-hosted endpoint | Customer-specific context subject to tenant policy, endpoint access controls and retention |

These are governance policies, not runtime-specific DashboardSpec fields. The extension point is an approved context/export policy at planner composition before LLMProvider invocation, plus provider deployment controls. No arbitrary masking or privacy-enforcement implementation is added here; until the policy is approved, real-data external-model use is a P0 blocker. Prompt/content logging remains prohibited by default; diagnostics require development opt-in and still redact free text and secrets.
