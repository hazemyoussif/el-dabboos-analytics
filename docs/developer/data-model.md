# Current data model

## Semantic metrics vs source facts

[Catalog](../../packages/domain/src/catalog.ts) owns source-independent formulas, supported dimensions and presentation type/unit. [Product registry](../../packages/domain/src/metric-registry.ts) owns available/planned status and authorization domains. [Facts](../../packages/data/src/facts.ts) accepts canonical **measure** rows: tenantId, measureId, date, finite value, optional entityId and dimensions. It does not currently carry operational currency/watermark/version; those are future source-envelope requirements, not silently implemented fields.

| Meaning | Calculation |
| --- | --- |
| Additive | Aggregate eligible event facts; supported aggregation overrides apply only to additive metrics |
| Ratio | Divide aggregated numerator and denominator; zero denominator yields null; apply catalog scale |
| Snapshot | Latest entity/measure at cutoff, then sum entities; do not sum dates |
| Comparison-derived | Sales growth is calculated against an aligned comparison period |
| Duration-derived | MTBF from operating_hours/failure_count; MTTR from repair_hours/completed_repair_count |

AOV uses revenue/order_count; gross margin uses gross_profit/net_revenue; win rate uses won_opportunity_count/closed_opportunity_count. Never insert these derived output metrics as independent summable facts. requiredMeasures maps metrics to inputs. An empty builder document is not yet an executable spec: canonical DashboardSpec requires at least one widget. Snapshot entity identity is mandatory and ambiguous same entity/measure/date is rejected. Latest selection precedes dimension filtering to prevent an older branch assignment from resurfacing when an entity moves.

Tenant and policy filters are applied with user filters by intersection. Event date/calendar comparisons use deterministic UTC helpers; MoM/YoY align temporal keys and leap/month-end ranges. Missing aligned series is null; successful additive empty totals may be zero by semantics, not by renderer invention. Bounded analysis pipeline implements comparisons, moving average, running totals, contribution, ranking and top N with compatibility validation.

## Spec, record and personal library

DashboardSpec v2 stores bilingual title, locale, filters, widgets/series and canonical layout (12-column grid items; accepted legacy columns remain validator-supported). It contains no SQL, identity policy, source table, Recharts/RGL object, theme, folder or favorite.

DashboardRecord stores spec plus tenant, owner, private/tenant scope, version and timestamps. Owner/expected-version predicates protect updates. Private inaccessible records return 404; accessible records still undergo metric policy. DashboardFolder and DashboardLibraryPreference are separate personal tenant/user entities; deleting a folder clears associations and leaves records intact.

## Result metadata

sourceId identifies adapter/source; executedAt is execution time; metricType/unit/semantics describe result meaning. dataThrough is latest authorized relevant measure business date, not query-window end or ingestion watermark. sourceAsOf is optional known synchronization/extraction time, supplied explicitly by adapter configuration; mock/SQLite synthetic default omits it. Multi-series alignment retains rank and comparison/change metadata per series. UI may display Data through separately from Source updated.

[Future real-data contract](../integration/real-data-contract.md) defines operational currency/version requirements and approval gates without changing today's domain contracts.
