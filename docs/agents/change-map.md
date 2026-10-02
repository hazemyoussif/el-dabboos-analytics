# Agent change map

Inspect current code/tests first. Choose the smallest correct layer. A feature request does not imply permission to redesign established contracts.

## Metric / Add DSO

**Likely touch:** domain IDs/catalog/semantics → canonical input measures → registry/domain authorization → source mapping/tests → optional templates/presentation.
**Do NOT start in:** React renderer; first approve definition/available-vs-planned status.
**Checklist:** [add-metric](../developer/change-guides/add-metric.md).

## Dimension

**Likely touch:** domain IDs/schemas/support → canonical fact mapping/DimensionValueRepository → policy-aware metadata → builder/planner → tests.
**Do NOT start in:** UI-only labels without stable source identity.
**Checklist:** [add-dimension](../developer/change-guides/add-dimension.md).

## Chart

**Likely touch:** domain visualization/schema rules → builder/drop → renderer/presentation → planner vocabulary/tests.
**Do NOT start in:** Recharts configuration inside spec.
**Checklist:** [add-visualization](../developer/change-guides/add-visualization.md).

## Dashboard builder

**Likely touch:** web builder/model, metric-drop, grid-map and feature hook → domain validation → product-flow/history/layout tests.
**Do NOT start in:** Source SQL or new arbitrary expression language.
**Checklist:** [repository map](../architecture/repository-map.md) and [handbook](../developer/handbook.md).

## Template

**Likely touch:** application templates → capabilities/policy → API matrix → browser preview/Use template tests.
**Do NOT start in:** Market-specific forks of template strategy.
**Checklist:** [add-template](../developer/change-guides/add-template.md).

## User permission

**Likely touch:** domain/security → application AuthorizationPolicy → route/post-planning checks → authorized catalog/capabilities → direct API tests.
**Do NOT start in:** UI visibility as the sole permission authority.
**Checklist:** [add-role-permission](../developer/change-guides/add-role-permission.md).

## Source adapter

**Likely touch:** domain repository ports → data/source adapter → composition → contract/reconciliation tests.
**Do NOT start in:** Browser database access or guessed Odoo tables.
**Checklist:** [add-source-adapter](../developer/change-guides/add-source-adapter.md).

## AI planner/provider

**Likely touch:** LLMProvider adapter → root config → structured planner projection/full validators → post-output auth → fake transport tests.
**Do NOT start in:** Provider-specific fields in DashboardSpec.
**Checklist:** [add-llm-provider](../developer/change-guides/add-llm-provider.md).

## Dashboard persistence

**Likely touch:** domain record port → application saved service → data metadata adapter → API routes → lifecycle/version tests.
**Do NOT start in:** Folder/favorite embedded in record or auto-save.
**Checklist:** [repository map](../architecture/repository-map.md) and [handbook](../developer/handbook.md).

## Library/folders

**Likely touch:** domain library port → application library service → personal metadata adapter → web model/hook → isolation tests.
**Do NOT start in:** Modifying DashboardSpec to move/favorite a record.
**Checklist:** [repository map](../architecture/repository-map.md) and [handbook](../developer/handbook.md).

## Theme/UI

**Likely touch:** web ThemeProvider/preferences/tokens/chart-theme/shell → SSR and browser checks.
**Do NOT start in:** Application/domain or arbitrary injected styles.
**Checklist:** [repository map](../architecture/repository-map.md) and [handbook](../developer/handbook.md).

For Theme/UI changes, read the [project UI quality skill](../../.agents/skills/el-dabboos-dashboard-quality/SKILL.md): AFTER by default; apply pre-flight constraints as well when the user explicitly requests the gate as part of implementation delivery.
