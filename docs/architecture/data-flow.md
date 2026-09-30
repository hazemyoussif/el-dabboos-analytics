# Data flow

`tenant header → controlled TenantProfile → market-neutral template or mock planner → DashboardSpec v2 validation → DashboardExecutor → tenant-scoped AnalyticsQuery per series → repository adapter → deterministic engine → AnalyticsResult per series → aligned widget rows → localized React renderer`.

The template path does not call the planner. The planner path produces the same v2 contract and passes the same validation. An edit produces DashboardPatch v2; the patch is applied atomically and the resulting dashboard is re-executed. Unknown planned metrics, SQL, incompatible chart units, and invalid analysis combinations are rejected before repository execution.

SQLite selects canonical source measures using tenant-bound parameters. Derived metrics are calculated from aggregated components; balances choose each entity's latest observation as of the period end. Grouped multi-series rows align on stable canonical dimension keys; no missing value is replaced by zero. A top/bottom N first series anchors the displayed row set. Time keys remain chronological in either UI direction. Source-as-of metadata is computed per tenant from the local fixture's latest event date; that is only a proxy for production ingestion freshness.

`demo-iq` and `demo-eg` have distinct synthetic branches and customer records. The Iraq fixture has 420 customers and 155,232 canonical facts; Egypt has 360 customers and 146,304 facts. Both span October 2024 through September 2026 and share the same formulas, templates, and source-independent IDs. The fixture encodes growth, decline, seasonality, customer concentration, overdue balances, inventory pressure, and equipment/technician patterns. No source transaction currency or FX data is modeled.
