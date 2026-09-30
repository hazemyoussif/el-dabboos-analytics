export type Locale = 'en' | 'ar';
export type MetricId =
  | 'revenue' | 'net_revenue' | 'order_count' | 'units_sold' | 'average_order_value'
  | 'gross_profit' | 'gross_margin' | 'sales_growth' | 'opportunity_count'
  | 'pipeline_value' | 'weighted_pipeline' | 'win_rate' | 'invoiced_amount'
  | 'collected_amount' | 'outstanding_amount' | 'overdue_amount'
  | 'stock_on_hand' | 'inventory_value' | 'low_stock_count'
  | 'maintenance_requests' | 'failure_count' | 'mtbf' | 'mttr' | 'maintenance_cost';
export type DerivedMetricId = 'average_order_value' | 'gross_margin' | 'sales_growth' | 'win_rate' | 'mtbf' | 'mttr';
export type InternalMeasureId = 'won_opportunity_count' | 'operating_hours' | 'repair_hours' | 'completed_repair_count';
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
  type: MetricType;
  semantics: MetricSemantics;
  dimensions: readonly DimensionId[];
  presentation: { decimals: number; unit?: string };
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
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title?: LocalizedText;
  metric: MetricId;
  dimension?: DimensionId;
  analysis?: AnalysisSpec;
}
export interface DashboardSpec {
  schemaVersion: 1;
  id: string;
  title: LocalizedText;
  locale: Locale;
  filters: { dateRange?: DateRange; dimensions?: AnalyticsFilter[] };
  layout: { columns: 1 | 2 | 3 | 4 };
  widgets: DashboardWidget[];
}
export type DashboardPatch = {
  schemaVersion: 1;
  operations: Array<
    | { op: 'add'; widget: DashboardWidget }
    | { op: 'remove'; widgetId: string }
    | { op: 'replace'; widgetId: string; widget: DashboardWidget }
    | { op: 'set_title'; title: LocalizedText }
    | { op: 'set_filters'; filters: DashboardSpec['filters'] }
  >;
};
export interface DashboardGenerationRequest { prompt: string; locale: Locale; context: AnalyticsContext }
export interface DashboardPlanner {
  generate(request: DashboardGenerationRequest): Promise<DashboardSpec>;
  edit(current: DashboardSpec, instruction: string): Promise<DashboardPatch>;
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
