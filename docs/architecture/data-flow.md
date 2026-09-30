# Data flow

`tenant + canonical AnalyticsQuery → repository adapter → canonical source measures → deterministic metric recipe → bounded analysis pipeline → AnalyticsResult`.

SQLite selects required measure IDs for one tenant using parameters. An adapter never stores or returns a standalone gross margin, order average, growth rate, win rate, MTBF, or MTTR fact. The engine aggregates numerator and denominator first, then divides. A zero denominator returns null. Snapshot metrics select each entity's latest observation on or before the requested as-of date; grouping by time carries balances forward through periods without new observations.

A comparison computes the current and aligned baseline period. Grouped monthly YoY aligns January with prior January; quarterly YoY aligns the same quarter a year earlier. Moving averages can smooth both series before change is recomputed. Calendar arithmetic uses UTC and clamps leap days and month ends.

The seed is repeatable from a fixed integer seed. It supplies a small 24-month, six-branch canonical-measure fixture with growth, decline, seasonality, and failures. It is not a validated operational model or a large-scale load fixture. SQLite indexes tenant, measure, and date; larger data and preaggregation remain future performance work.
