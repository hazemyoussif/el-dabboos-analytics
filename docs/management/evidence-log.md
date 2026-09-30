# Evidence log

These are prototype observations, not a final management report. Evidence was recorded 2026-09-30.

| Capability | Artifact and method | Observation | Limitation / next evidence |
| --- | --- | --- | --- |
| Same template, two markets | `packages/application/test/application.test.ts`; API/browser Sales Performance check | One template ID/widget definition executes for Iraq and Egypt; the browser shows distinct branches and values. | Geography and customers are synthetic; validate against operational data. |
| Currency and locale presentation | Tenant profile and web formatting tests; browser tenant switch | Iraqi values display IQD with ar-IQ/en-IQ; Egyptian values display EGP with ar-EG/en-EG. | No transaction/base currency, FX conversion, or approved monetary policy. |
| Arabic strategy | MSA UI labels, dialect synonyms, mock planner tests, provider-neutral evaluation cases | Iraqi and Egyptian sales phrases work in the mock path; cases cover dialect/mixed language and digit styles. | No real provider quality or user-language evaluation yet. |
| Ready-made library | Ten template definitions and instantiation tests; browser sidebar | Templates are discoverable and manually usable with planning disabled. | Templates are code-governed and not persisted or user authored. |
| Multi-metric visuals | v2 validation/executor tests; browser line, bar, and table | Compatible series render together; mixed-unit charts reject; table columns format separately; partial series failures are isolated. | No dual-axis chart; broader usability testing needed. |
| Deterministic analytics | Shared mock/SQLite tests and two-tenant seed tests | Additive, ratio, snapshot, comparison, and tenant isolation checks pass. | Malik must approve formulas and reconcile production samples. |
| Source/coverage metadata | Shared adapter and API tests; browser metadata | Results expose metric-specific tenant `dataThrough`; `sourceAsOf` appears only if configured. | No ingestion or synchronization timestamp is available from the synthetic fixture. |
| Productivity/provider claims | No measurement | No speed, LLM accuracy, cost, or latency claim made. | Run controlled tasks and provider evaluations. |
