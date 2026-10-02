# Verification matrix

| Change | Targeted evidence | Human follow-up |
| --- | --- | --- |
| Metric/source/calendar | domain query/analysis and data engine/repository/security | Matching report window, null/ratio/snapshot semantics; future real-data reconciliation |
| Executor | query-execution + application tests | Duplicate widgets, partial/anchor failure, deterministic order |
| Config/health | runtime-config/environment/health API tests | Valid mock/structured startup; invalid safe failure; live/ready |
| Authorization | API api/template-matrix/saved/library + data security | Sales Analyst, Baghdad Manager, tenant/private/shared isolation |
| AI | provider-schema/structured-planner/diagnostics + fake HTTP adapter | Generate/edit unsaved, generic errors, manual↔AI |
| Builder/layout/chart/UI | web builder/metric-drop/layout/visualizations/renderers | Pointer/keyboard/narrow viewport/AR/themes; no layout query; [project UI quality gate](../../.agents/skills/el-dabboos-dashboard-quality/SKILL.md) AFTER review |
| Lifecycle/library | saved record/library API + web lifecycle/product-flow | Save/reopen/rename/Save As/conflict/folders/favorites |
| Documentation | docs sanity tests | Read owning code and check current/proposed labels, Mermaid source and links |

During development use targeted tests to resolve concrete risk. Before push always frozen install, lint, typecheck, all tests and API/web build; [commands](../developer/testing-guide.md). CI must not require live models or customer fixtures. Manual tests are distinct from SSR/unit/fake-provider tests; report blocked/manual-not-run honestly. [QA suite](../qa/manual-test-plan.md).
