# Proven grouped-result corrections — 2026-10-16

## Scope and base

Branch: `codex/fix-grouped-result-execution`. Base HEAD: `89ad19f` (the original grouped-result implementation). This follow-up contains two proved fixes. There are no metric-definition, database-migration, ingestion, web-presentation or staging changes. Broader batching, caching and rollups remain outside this patch.

1. A valid table with an ordinary first series and a secondary Pareto series selected different page populations: ordinary reads used identity order while the secondary read used rank order. A six-customer synthetic SQL fixture returned `c,d` instead of `a,b` on page one, and continuation could fail because the shared identity cursor lacked a Pareto rank position.
2. A published operational grouped query computed authorized labels with its values, then discarded them and queried labels again. Instrumentation observed two label queries for a single read while the expected labels were already present.

## Corrections

The transient repository window has an explicit identity/rank delivery order. The application selects one order for the widget. The shared SQL selector calculates all global analyses before selecting an output page and binds continuation to delivery order. Rank delivery requires Pareto. Default direct single-query behavior remains compatible. Canonical DashboardSpec and HTTP viewer window inputs do not gain an order control. A cursor from the previous release must be refreshed because its fingerprint did not include delivery order.

The operational repository reuses the grouped read's labels. Existing fallback behavior for other query paths is retained. Both corrections use existing tenant/policy and immutable-serving boundaries.

## Before/after evidence

The focused PostgreSQL run before production edits executed three tests: one passed and two failed. The failures demonstrated the skipped identities and duplicate label lookup. After the corrections, four focused tests passed with no failures or skips:

- Complete six-identity traversal with Pareto as a secondary series, correct global ranks and rational percentages, and null cells for absent ordinary-series values.
- First-series Pareto retains global rank continuation and missing peer cells.
- Published operational customer detail still traverses beyond its configured complete-response bound; labels match exactly and require one query instead of two.
- Identity versus rank delivery remains bound to continuation scope; incompatible rank delivery is rejected.

The percentage fixture uses exact integer numerators divided by the full-population denominator before final floating-point conversion. This avoids introducing intermediate floating-point noise into the independent expected values.

## Verification status

Completed local verification:

- Frozen dependency installation and lint passed.
- Architecture, baseline-aware quality and TypeScript checks passed; architecture and quality reported zero diagnostics.
- Complete unit/API/web/engineering suite: **910 passed, zero failed/skipped**.
- Complete PostgreSQL 18.6 suite: **301 passed, zero failed/skipped**, approximately 628 seconds. This includes the original 298 tests and three new regressions. An earlier broader run was interrupted; only the completed rerun is counted.
- API and web production builds passed. The existing large-chunk warning remains; concurrent web tests also printed non-failing development WebSocket port notices.
- Diff and whitespace checks passed.

The full database run includes exact ratios, snapshot and currency behavior, policy/RLS isolation, immutable publication history, and the original operational and historical query workloads. Its 300,000-fact history fixture remained exact and completed five queries in approximately 2.24 seconds locally; this is regression evidence, not a hosted latency claim.

Tests used only the owned disposable PostgreSQL 18.6 fixture on localhost port 55436, which was removed after verification; the separate laptop staging database remained untouched. Local verification was completed on base `89ad19f` before publication. The pull request records the final commit and remote CI status. No staging deployment was performed during verification.

## Limits and next step

This patch does not claim new hosted latency measurements or verification of downloaded Excel contents. Earlier browser evidence remains in the [original implementation record](grouped-result-execution-2026-10-15.md); this follow-up changes backend execution only. Review these corrections before any publication or company-staging deployment. Existing migration and manual-deployment requirements from [ADR 038](../architecture/adr/038-grouped-result-windows.md) still apply to the original implementation.
