# Terminology

| Term | Meaning |
| --- | --- |
| Metric | Stable business measure such as `revenue`; never a source column name. |
| Source measure | Canonical observed value used to calculate a metric; derived metrics are not source measures. |
| Entity ID | Stable identity of one balance or stock series across snapshot dates. |
| Dimension | Governed grouping/filter key such as `branch` or `month`. |
| DashboardSpec | Versioned, declarative dashboard contract. |
| DashboardPatch | Bounded edit to an existing dashboard. |
| AnalysisSpec | Fixed set of compatible comparison, time-series, ranking, and selection options. |
| AnalyticsQuery | Canonical request for one metric, filters, grouping, and analysis. |
| AnalyticsResult | Adapter-independent rows and source/execution/metric metadata. |
| AnalyticsRepository | Tenant-scoped port that executes canonical queries. |
| Tenant | Security scope required on every analytics call. |
