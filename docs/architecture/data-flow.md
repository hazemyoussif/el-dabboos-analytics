# Data flow

`prompt or manual DashboardSpec → schema and semantic validation → DashboardExecutor → tenant-scoped AnalyticsQuery per widget → repository adapter → deterministic engine → AnalyticsResult per widget → localized React renderer`. The demo planner first translates a supported request to a spec or patch; it does not compute analytics. Each widget result reports success or a bounded error, allowing partial dashboards.

SQLite selects required canonical measure IDs for one tenant using parameters. The adapter never stores a standalone gross margin, order average, growth rate, win rate, MTBF, or MTTR fact. The engine aggregates numerator and denominator first, then divides. A zero denominator returns null. Snapshot metrics select each entity's latest observation on or before the requested period end; grouping by time carries balances forward through periods without new observations.

A comparison computes the current and aligned baseline period. Grouped monthly YoY aligns January with prior January; quarterly YoY aligns the same quarter a year earlier. Moving averages can smooth both series before change is recomputed. Calendar arithmetic uses UTC and clamps leap days and month ends.

The fixed seed spans October 2024 through September 2026, six branches, twelve salespeople, 360 customers, 160 products, five warehouses, and 150 assets. It supplies growth/decline, seasonality, customer concentration, overdue balances, stock pressure, and equipment/technician patterns. It is synthetic and not validated accounting. SQLite indexes tenant, measure, and date; larger data and preaggregation remain future performance work.
