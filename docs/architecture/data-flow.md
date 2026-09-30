# Data flow

`tenant + canonical AnalyticsQuery → repository adapter → normalized facts → deterministic grouping/aggregation/operation → AnalyticsResult`. The SQLite adapter only selects rows for the given tenant and metric. Shared calculation logic enforces filters and the selected operation. No prompt reaches a database driver.

The seed is repeatable from a fixed integer seed. It creates 24 monthly observations for each of six branches and each of 24 metrics. Branch-specific trends, seasonality, and failures create testable signals. The schema has a tenant/metric/date index; larger data and preaggregation are future performance work.
