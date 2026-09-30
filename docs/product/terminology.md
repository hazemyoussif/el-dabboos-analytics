# Terminology

| Term | Meaning |
| --- | --- |
| Metric | Stable business measure such as `revenue`; never a source column name. |
| Dimension | Governed grouping/filter key such as `branch` or `month`. |
| DashboardSpec | Versioned, declarative dashboard contract. |
| DashboardPatch | Bounded edit to an existing dashboard. |
| AnalyticsQuery | Canonical request for one metric, filters, grouping, and operation. |
| AnalyticsResult | Adapter-independent rows returned to a renderer. |
| AnalyticsRepository | Tenant-scoped port that executes canonical queries. |
| Fact | Source-normalized dated observation for one metric and tenant. |
| Tenant | Security scope required on every analytics call. |
