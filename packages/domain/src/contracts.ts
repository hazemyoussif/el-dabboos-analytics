export type Locale = 'en' | 'ar';
export type MetricId =
  | 'revenue' | 'net_revenue' | 'order_count' | 'units_sold' | 'average_order_value'
  | 'gross_profit' | 'gross_margin' | 'sales_growth' | 'opportunity_count'
  | 'pipeline_value' | 'weighted_pipeline' | 'win_rate' | 'invoiced_amount'
  | 'collected_amount' | 'outstanding_amount' | 'overdue_amount'
  | 'stock_on_hand' | 'inventory_value' | 'low_stock_count'
  | 'maintenance_requests' | 'failure_count' | 'mtbf' | 'mttr' | 'maintenance_cost';
export type DimensionId = 'date' | 'month' | 'quarter' | 'year' | 'customer' | 'branch'
  | 'region' | 'salesperson' | 'product' | 'product_category' | 'warehouse'
  | 'equipment' | 'equipment_category' | 'technician';
export type Aggregation = 'sum' | 'count' | 'average' | 'min' | 'max';
export type AnalyticsOperation = 'top_n' | 'bottom_n' | 'previous_period' | 'month_over_month'
  | 'year_over_year' | 'absolute_change' | 'percentage_change' | 'running_total'
  | 'percentage_contribution' | 'moving_average' | 'ranking';
export interface LocalizedText { en: string; ar: string }
export interface SemanticMetric {
  id: MetricId;
  labels: LocalizedText;
  descriptions: LocalizedText;
  synonyms: { en: readonly string[]; ar: readonly string[] };
  type: 'currency' | 'number' | 'percentage' | 'duration';
  defaultAggregation: Aggregation;
  dimensions: readonly DimensionId[];
  operations: readonly AnalyticsOperation[];
  presentation: { decimals: number; unit?: string };
}
export interface AnalyticsContext { tenantId: string; locale: Locale }
export interface DateRange { from: string; to: string }
export interface AnalyticsFilter { dimension: DimensionId; values: string[] }
export interface AnalyticsQuery {
  metric: MetricId;
  aggregation?: Aggregation;
  groupBy?: DimensionId;
  dateRange?: DateRange;
  filters?: AnalyticsFilter[];
  operation?: { kind: AnalyticsOperation; n?: number; window?: number };
}
export interface AnalyticsRow {
  key: string | null;
  value: number;
  rank?: number;
  comparisonValue?: number;
  absoluteChange?: number;
  percentageChange?: number | null;
}
export interface AnalyticsResult {
  metric: MetricId;
  groupBy: DimensionId | null;
  rows: AnalyticsRow[];
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
  operation?: AnalyticsQuery['operation'];
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
export interface LLMProvider {
  complete(request: { system: string; user: string; locale: Locale }): Promise<{ text: string; latencyMs: number }>;
}
