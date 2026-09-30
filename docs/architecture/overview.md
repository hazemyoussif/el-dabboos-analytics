# Architecture overview

The domain package defines the stable contracts. A future planner maps natural language to a DashboardSpec and DashboardPatch; it cannot emit application code, SQL, or chart configuration. Schema validation checks structure, semantic validation checks catalog IDs and metric/dimension compatibility, and the deterministic analytics layer handles calculations. The repository port shields domain and UI from source-specific data.

The first SQLite adapter reads normalized facts with a parameterized tenant/metric query. The mock adapter reads the same fact shape. Both feed the shared calculation engine, which makes results portable and contract-testable. A future operational adapter may translate Odoo/PostgreSQL/HTTP data into facts or implement the same canonical query behavior directly.

Current package dependency: `data → domain`. The planned API and UI depend on domain contracts; neither may import SQLite internals.
