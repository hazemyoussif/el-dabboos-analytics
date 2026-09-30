# Architecture overview

The domain package defines stable contracts and source-independent metric recipes. A future planner maps natural language to a DashboardSpec or DashboardPatch; it cannot emit application code, SQL, or arbitrary chart configuration. JSON Schema validates structure, semantic validation checks metric/dimension/analysis compatibility, and the deterministic engine performs calculations.

The SQLite adapter reads only canonical source measures required by a tenant-scoped query. The mock adapter reads the same fact shape. Additive values aggregate normally; ratios and durations divide aggregated components; sales growth derives from a revenue comparison; balances select the latest observation per entity as of the period end. Derived metrics are never persisted as independent facts.

Analysis is a bounded pipeline rather than an expression language. Time comparisons align each date/month/quarter/year to a prior calendar bucket with UTC leap-year and month-end rules. The repository port shields domain and future UI code from source-specific data. Every AnalyticsResult carries source, execution, optional freshness, and metric presentation metadata.

Current package dependency: `data → domain`. The planned API and UI depend on domain contracts; neither may import SQLite internals. The LLMProvider port requests strict JSON Schema structured output and returns an unknown value for validation. No API, UI, or model adapter is implemented here.
