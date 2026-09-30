# ADR 016: DashboardSpec v2 multi-series widgets

Status: Accepted for the prototype (2026-09-30).

## Decision

DashboardSpec v2 replaces each v1 widget's single `metric` and `analysis` fields with one to eight stable-ID series, each holding an available metric and optional bounded analysis. The v1 JSON Schema remains in the repository as the historical initial prototype contract. All new application and API behavior validates v2; there is no runtime migration because no production dashboards have been persisted.

KPI widgets require exactly one series. Line/bar widgets require a shared grouping dimension and identical presentation type/unit across series; no dual axes are implemented. Tables may mix metric types, and each column is formatted using its own metric metadata. Dashboard-level filters and date range apply to every series. DashboardExecutor creates one tenant-scoped AnalyticsQuery per series, records failures independently, and aligns grouped results by canonical key. Missing observations remain null. For multi-series widgets, top/bottom N is valid only on the first series. That first series selects the widget keys; other series are aligned only to those keys. If selection fails, the widget is an error even when later series succeed, because its requested row set is unknown. Aligned rows retain per-series rank and comparison/change metadata as well as null values. Time keys are sorted chronologically regardless of RTL layout.

## Consequences

Compatible currency, number, percentage, and duration series can share a chart. Currency plus percentage on one single-axis chart is rejected; planners must split the request or ask for clarification. Recharts configuration stays inside the renderer. Individual series failures can produce a partial widget without hiding other series.
