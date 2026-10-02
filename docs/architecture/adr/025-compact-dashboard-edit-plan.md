# ADR-025: Sparse dashboard edit intent and deterministic patch compilation

Status: Accepted (October 2026)

Context: Live generation works with the compact plan. A palette-only AI edit using a full canonical replacement repeatedly omitted branch grouping. Asking an endpoint to reconstruct unchanged widget IDs, series, metrics, analyses and presentation creates avoidable failure opportunities. Canonical validation correctly rejected those replacements.

Decision: The application owns transient DashboardEditPlan, requested through strict `dashboard_edit_plan` JSON Schema. It is never persisted, returned as the dashboard API contract, or executed directly. The existing DashboardPlanner port still returns canonical DashboardPatch v2. Generation contracts and inference/provider modes are unchanged.

Supported operations:

| Intent operation | Deterministic canonical operation |
| --- | --- |
| update_widget: widgetId + sparse type/dimension/title/presentation | clone current widget, merge supplied fields, replace |
| update_series: widgetId + seriesId + sparse metric/analysis | clone current widget, update only referenced series, replace |
| add_widget: bounded business intent, optional type/presentation/analysis | code-owned IDs, existing visualization defaults/Combo marks, add |
| remove_widget: widgetId | remove |
| set_title: titleEn/titleAr | set_title |
| set_filters: sparse dateRange/dimensions | merge user filters, set_filters |
| update_layout: widgetId + sparse x/y/w/h | merge canonical grid item, set_layout |

Omitted fields preserve current values. Presentation fields merge independently; null clears an explicitly targeted optional field or entire presentation. Widget dimension/title can also be cleared with null. Analysis uses comparison, movingAverageWindow, runningTotal, percentageContribution, ranking, topNDirection and topNLimit. Null clears comparison/moving average/Top-N or the entire analysis; false clears boolean flags. Top-N changes preserve an omitted counterpart, require a complete pair when adding selection and reject contradictory clear/set intent. Existing Top-N anchor restrictions remain canonical.

Type changes do not silently remove inherited fields or business intent. A conversion with incompatible inherited presentation must explicitly clear those fields; canonical validation rejects the final invalid combination. Existing series IDs/presentation remain untouched by sparse edits. Explicit update_series presentation:null can clear an existing Combo mark when converting type; the edit schema never lets the model invent series marks. Newly added widgets may select a type; the existing resolver supplies unspecified defaults and Combo marks. IDs use the first available widget-N suffix, reserved across the whole plan, with widget-N-series-M IDs; removed IDs are not reused within that plan. Add/remove placement uses existing domain layout functions. Normal edits emit no layout operation. The separate explicit position/size operation preserves other grid items and constraints; it does not invent a new layout language.

Compilation processes operations in order on an isolated clone and validates the complete patch atomically, allowing coordinated changes that are temporarily incompatible. Unknown widget/series references fail safely. The compiler invokes original patch/application/spec validation; the structured planner checks allowed metrics before provider invocation and after compilation/application, and API authorization remains in place. Raw colors, renderer properties, arbitrary fields/expressions, SQL and security infrastructure are excluded. Current bounded DashboardSpec remains context only, never a required model reconstruction.

The provider schema uses existing portable object/enum/oneOf/$defs/$ref and nullable type forms. Metric/dimension membership is enforced by canonical validation and authorization, as for the prior direct patch edit path; only authorized metadata is sent. Projected edit schema is 4,165 serialized bytes versus 4,196 for projected canonical patch, with reference-expanded depth 16 versus 18. The serialized reduction is modest; sparse model output and reduced reconstruction are the principal benefit. Tests guard both size and depth without claiming live endpoint compatibility.

Repair limits stay 0–2; edit repairs name DashboardEditPlan. Development diagnostics identify its schema/stage and retain bounded/redacted previews; browser errors remain safe and generic. Transport failures bypass repair. Fake-provider/HTTP/compiler tests verify preservation and rejection, without live model services or developer environment files. Live edit adherence remains a separate endpoint verification gate.

This supersedes ADR-024's initial provider-facing direct-patch edit decision. DashboardPatch v2 and its canonical schemas/validators remain unchanged internally, including manual builder and MockDashboardPlanner use.

## Manual palette parity

Manual and sparse AI palette edits converge on `WidgetPresentation.palette`; generation can supply the same governed token. The centralized web ChartTheme resolves actual Light/Dark colors. Builder and provider plans never store resolved colors, CSS or chart-library options. Global theme/locale remain preferences outside saved content. Palette-only sparse edits preserve business intent and layout. This follow-up does not change the edit schema: projected 4,165 bytes/depth 16 versus canonical patch 4,196 bytes/depth 18.

## Compact edit target index

Sparse edits receive an `Editable widget index` before the unchanged full current DashboardSpec context and edit instruction. Each entry contains `widgetId`, `type`, optional `dimension`, unique ordered `metrics`, and `series: [{seriesId, metric}]`. The index is a deterministic projection of the already validated/authorized current spec. It excludes titles, result values/rows, business filter values, SQL and new authorization data; titles remain available in the full spec when needed. It is transient prompt context only, never an edit selector, schema or persisted record. Guidance resolves all supplied type/metric/dimension/title descriptors, preferring the complete description over the first shared metric: Revenue Line is distinct from Revenue KPI; branch gross profit identifies gross_profit grouped by branch. The model still outputs canonical widgetId/seriesId references; the compiler performs the deterministic sparse mutation. No fuzzy matching or natural-language selector enters application mutation code or DashboardEditPlan. Full current-spec context is retained for broader sparse edits; response schemas, repair bounds, validators and authorization are unchanged.
