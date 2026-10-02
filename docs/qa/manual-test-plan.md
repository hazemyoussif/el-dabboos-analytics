# Human QA plan

## Current baseline and setup

Use Node 24 and pnpm 12.6.0. Follow [local development](../developer/local-development.md). Use a fresh seeded analytics DB and a disposable dashboard metadata DB. Start with demo-iq-analyst, Iraq, English and Light. Do not use customer data. Admin-created tenant-shared records are API fixtures; the UI does not expose sharing controls. Record deletion is future work, so clean up by replacing the disposable metadata DB after stopping the API.

Use Iraq admin to prepare shared records, Sales Analyst for restricted metrics, Baghdad Manager for policy intersections, Regional Analyst for switching markets and Egypt Analyst for tenant isolation. Their exact IDs and rights are in [personas](../product/personas-and-roles.md). Use desktop and narrow viewport, keyboard and pointer, EN/AR and Light/Dark. System mode should be tested against an OS preference change.

## Suites

- [30 smoke cases](smoke-tests.md): release/demo gate.
- [Lifecycle and templates](dashboard-lifecycle-tests.md): explicit Save, naming, conflicts and deep links.
- [Builder](builder-tests.md): governed semantic and layout edits.
- [AI](ai-tests.md): mock and fake structured endpoint, safe failures.
- [Authorization](authorization-tests.md): route, metric, tenant and row policy.
- [Library](library-tests.md): personal preferences separate from records.
- [Visualization/workspace/freshness](visualization-tests.md): presentation, null and result states.
- [Future real-data acceptance](real-data-acceptance-tests.md): specifications only, not a current release gate.

For layout/theme/locale cases, monitor the browser Network panel while performing the specific action: check that execute/save requests are not introduced by presentation-only changes. Use the disposable synthetic preview only; do not export request payloads containing real identifiers.

## Evidence and triage

Record commit, runtime modes, Node/pnpm versions, test ID, actual steps/result, tenant/identity, locale/theme/viewport and pass/fail/blocked. Attach screenshots of UI failures and safe request status codes; never attach credentials, real result rows or raw prompts. Record blocked fake-harness tests explicitly rather than claiming manual coverage from automated tests. P0 authorization, data correctness and persistence failures block release. P1 visible defects require disposition; P2 usability improvements may be deferred with an owner.

For partial/error rehearsals use an injected fake repository with one successful and one failed series in a compatible line/table widget; also fail the first top-N anchor. For structured-output rehearsals use a fake OpenAI-compatible endpoint returning known compact DashboardGenerationPlan/DashboardEditPlan fixtures, invalid JSON, invalid plan schemas or delayed responses; compilation and full canonical validation remain required. Keep this outside customer deployments. Automated fault harnesses exist in application and API tests; a human rendering rehearsal needs a test API composed with that fake repository.

## Planner and palette additions

Include implicit Arabic sales/branch/profit generation, explicit horizontal-blue revenue Top-5, explicit three-widget dashboards and the hard KPI/monthly-moving-average/gross-profit-Top-5 fixture. Exercise sparse AI palette-only edits and [TC-BUILD-016](builder-tests.md#tc-build-016). Test missing grouping as schema rejection and deeper incompatibility as canonical rejection. Live endpoint observations and controlled/fake verification are separately attributed in [planner verification](ai-planner-provider-ux-verification.md); this plan does not certify their execution.
