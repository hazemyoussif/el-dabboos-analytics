# Evidence log

These are prototype observations, not the final management report. All evidence below is dated 2026-09-30.

| Capability | Artifact and method | Observation | Limitation / next evidence |
| --- | --- | --- | --- |
| Deterministic analytics | `packages/data/test` mock/SQLite contract and seed tests; `pnpm test` | Canonical additive, ratio, snapshot, and comparison calculations run against tenant-scoped adapters; two-year seed includes intentional patterns. | Malik must approve formulas and validate against production samples. |
| Source-independent rendering | `apps/web/src/Renderer.tsx`, `apps/api/src/app.ts`; browser check of all three manual demos | KPI, line, bar, and table widgets render from DashboardSpec and AnalyticsResult; React contains no SQLite access. | A third operational source adapter is still needed. |
| Manual spec execution | `packages/application/test/application.test.ts`; browser checks | Executive Sales, Finance/Receivables, and Maintenance specs work without the planner. | No dashboard persistence or user-defined authoring UI. |
| English/Arabic prompt flow | Mock planner unit/API tests and browser checks | Both demo sales prompts generated an executed dashboard through the planner abstraction. | Prompt coverage is intentionally bounded; no LLM accuracy claim. |
| Conversational edits | Planner/API tests and browser checks | Arabic removal changed eight widgets to seven; English moving-average edit re-executed the dashboard. | Other edit intents remain outside the mock planner. |
| Bilingual presentation | Browser language switch and `apps/web/test/i18n.test.ts` | Arabic RTL mirrored navigation/layout and localized labels, dates, and values; charts retained chronological order. | Usability review with Arabic-speaking stakeholders is pending. |
| Source and freshness | SQLite API response and browser metadata strip | Results show source `sqlite` and an as-of date from the local fixture. | Fixture event date is only a proxy for source freshness; production ingestion timing must be defined. |
| Manual vs assisted time | No measurement | No speed claim made. | Run timed comparable tasks. |
| Provider portability | `packages/domain` structured-output port | A provider-neutral interface exists. | No real provider evaluation, local/cloud comparison, or cost/latency measurement yet. |
