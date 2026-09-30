export type Locale = 'en' | 'ar';
export type MetricId =
  | 'revenue' | 'net_revenue' | 'order_count' | 'units_sold' | 'average_order_value'
  | 'gross_profit' | 'gross_margin' | 'sales_growth' | 'opportunity_count'
  | 'pipeline_value' | 'weighted_pipeline' | 'win_rate' | 'invoiced_amount'
  | 'collected_amount' | 'outstanding_amount' | 'overdue_amount'
  | 'stock_on_hand' | 'inventory_value' | 'low_stock_count'
  | 'maintenance_requests' | 'failure_count' | 'mtbf' | 'mttr' | 'maintenance_cost';
export type DerivedMetricId = 'average_order_value' | 'gross_margin' | 'sales_growth' | 'win_rate' | 'mtbf' | 'mttr';
export type InternalMeasureId = 'won_opportunity_count' | 'closed_opportunity_count' | 'operating_hours' | 'repair_hours' | 'completed_repair_count';
export type FactMeasureId = Exclude<MetricId, DerivedMetricId> | InternalMeasureId;
export type DimensionId = 'date' | 'month' | 'quarter' | 'year' | 'customer' | 'branch'
  | 'region' | 'salesperson' | 'product' | 'product_category' | 'warehouse'
  | 'equipment' | 'equipment_category' | 'technician';
export type AdditiveAggregation = 'sum' | 'count' | 'average' | 'min' | 'max';
export type MetricType = 'currency' | 'number' | 'percentage' | 'duration';
export type MetricSemantics =
  | { kind: 'additive'; measure: FactMeasureId }
  | { kind: 'ratio'; numerator: FactMeasureId; denominator: FactMeasureId; scale: number }
  | { kind: 'snapshot'; measure: FactMeasureId }
  | { kind: 'comparison_derived'; base: MetricId; defaultComparison: ComparisonPeriod }
  | { kind: 'duration_derived'; numerator: FactMeasureId; denominator: FactMeasureId; scale: number };
export interface LocalizedText { en: string; ar: string }
export interface SemanticMetric {
  id: MetricId;
  labels: LocalizedText;
  descriptions: LocalizedText;
  synonyms: { en: readonly string[]; ar: readonly string[] };
  dialectSynonyms?: { iq?: readonly string[]; eg?: readonly string[] };
  type: MetricType;
  semantics: MetricSemantics;
  dimensions: readonly DimensionId[];
  presentation: { decimals: number; unit?: string };
}
export interface TenantProfile {
  id: 'demo-iq' | 'demo-eg';
  countryCode: 'IQ' | 'EG';
  defaultLocale: Locale;
  arabicDialect: 'iq' | 'eg';
  reportingCurrency: 'IQD' | 'EGP';
  timeZone: 'Asia/Baghdad' | 'Africa/Cairo';
  labels: LocalizedText;
  branchLabels: Readonly<Record<string, LocalizedText>>;
  exampleBranchIds: readonly [string, string];
}
export interface AnalyticsContext { tenantId: string; locale: Locale }
export interface DateRange { from: string; to: string }
export interface AnalyticsFilter { dimension: DimensionId; values: string[] }
export type ComparisonPeriod = 'previous_period' | 'month_over_month' | 'year_over_year';
/** A fixed pipeline of named analyses, not an expression language. */
export interface AnalysisSpec {
  comparison?: ComparisonPeriod;
  movingAverage?: { window: number };
  runningTotal?: true;
  percentageContribution?: true;
  ranking?: true;
  topN?: { direction: 'top' | 'bottom'; limit: number };
}
export interface AnalyticsQuery {
  metric: MetricId;
  aggregation?: AdditiveAggregation;
  groupBy?: DimensionId;
  dateRange?: DateRange;
  filters?: AnalyticsFilter[];
  analysis?: AnalysisSpec;
}
export interface AnalyticsRow {
  key: string | null;
  value: number | null;
  rank?: number;
  comparisonValue?: number | null;
  absoluteChange?: number | null;
  percentageChange?: number | null;
}
export interface AnalyticsResult {
  metric: MetricId;
  groupBy: DimensionId | null;
  rows: AnalyticsRow[];
  metadata: {
    sourceId: string;
    executedAt: string;
    /** Latest event date among tenant facts needed for this metric, independent of the query period. */
    dataThrough?: string;
    /** Source extraction/synchronization timestamp, only when supplied by the adapter. */
    sourceAsOf?: string;
    metricType: MetricType;
    unit?: string;
    semantics: MetricSemantics['kind'];
  };
}
export interface AnalyticsRepository {
  execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult>;
}
export type WidgetType = 'kpi' | 'line' | 'bar' | 'table';
export interface DashboardGridItem { widgetId: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }
/** Explicit items use a canonical 12-column desktop grid; older v2 layouts may omit them. */
export interface DashboardLayout { columns: 1 | 2 | 3 | 4 | 12; items?: DashboardGridItem[] }
/** In a multi-series widget, only the first series may use topN; its keys select the displayed rows. */
export interface DashboardSeries { id: string; metric: MetricId; analysis?: AnalysisSpec }
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title?: LocalizedText;
  series: DashboardSeries[];
  dimension?: DimensionId;
}
/** v2 replaces v1 widget.metric with stable, independently executable series. */
export interface DashboardSpec {
  schemaVersion: 2;
  id: string;
  title: LocalizedText;
  locale: Locale;
  filters: { dateRange?: DateRange; dimensions?: AnalyticsFilter[] };
  layout: DashboardLayout;
  widgets: DashboardWidget[];
}
export type DashboardPatch = {
  schemaVersion: 2;
  operations: Array<
    | { op: 'add'; widget: DashboardWidget }
    | { op: 'remove'; widgetId: string }
    | { op: 'replace'; widgetId: string; widget: DashboardWidget }
    | { op: 'set_title'; title: LocalizedText }
    | { op: 'set_filters'; filters: DashboardSpec['filters'] }
    | { op: 'set_layout'; layout: DashboardLayout }
  >;
};
export interface DashboardGenerationRequest { prompt: string; locale: Locale; context: AnalyticsContext; tenantProfile: TenantProfile }
export interface DashboardPlanner {
  generate(request: DashboardGenerationRequest): Promise<DashboardSpec>;
  edit(current: DashboardSpec, instruction: string, tenantProfile: TenantProfile): Promise<DashboardPatch>;
}
export interface StructuredOutputRequest {
  messages: readonly { role: 'system' | 'user'; content: string }[];
  locale: Locale;
  responseFormat: { name: string; jsonSchema: Readonly<Record<string, unknown>>; strict: true };
}
export interface StructuredOutputResponse {
  output: unknown;
  providerId: string;
  latencyMs: number;
  attempts: number;
}
/** Output remains unknown until schema and semantic validation succeed. */
export interface LLMProvider {
  generateStructured(request: StructuredOutputRequest): Promise<StructuredOutputResponse>;
}
