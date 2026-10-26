import type { Permission } from './security.ts';
export type Locale = 'en' | 'ar';
export type InventoryAvailabilityMetricId = 'reserved_stock_quantity' | 'free_stock_quantity' | 'free_stock_value';
export type CustomerCoverageMetricId = 'coverage_forecast_quantity' | 'coverage_customer_population' | 'coverage_net_quantity' | 'coverage_tag_membership' | 'coverage_excluded_product_count';
export type SalesCommandMetricId = 'command_invoice_total' | 'command_invoice_count' | 'command_invoice_residual' | 'command_invoice_settled' | 'command_document_count' | 'command_document_value' | 'command_invoice_refunds' | 'command_net_invoices' | 'command_cash_received' | 'command_receipt_count' | 'command_receipt_value' | 'command_order_count' | 'command_order_value' | 'command_order_status_count' | 'command_order_status_value' | 'command_cancelled_count' | 'command_cancelled_value' | 'command_cancellation_rate' | 'command_customers' | 'command_same_day_cash' | 'command_same_day_rate' | 'command_customer_balance' | 'command_overdue_balance' | 'command_future_balance' | 'command_unknown_maturity' | 'command_overdue_days';
export type BusinessMetricId =
  'invoice_refund_sales_percentage' | 'delivered_customer_quantity' | 'physical_return_rate_quantity' |
  'observed_customer_count' |
  'supplier_payable_next_month' | 'receivables_due_next_month' |
  'invoiced_product_quantity' |
  'period_net_sales' | 'period_invoice_sales' | 'period_invoice_refunds' | 'period_cash_collections' | 'period_collection_percentage' | 'customer_period_sales' | 'customer_average_monthly_sales' | 'customer_observed_orders' | 'observed_new_customers' | 'observed_single_order_customers' | 'observed_inactive_customers' | 'customer_last_invoice_date' | 'customer_last_collection_date' | 'review_customer_balance' | 'customer_balance_sales_percentage' | 'receivable_unknown_due' | 'positive_receivable_not_due' | 'positive_due_0_30' | 'positive_due_31_60' | 'positive_due_61_90' | 'positive_due_over_90' | 'internal_stock_quantity' | 'expired_stock_quantity' | 'near_expiry_stock_quantity' | 'unknown_expiry_stock_quantity' | 'negative_stock_positions' | 'physical_return_quantity' | 'internal_transfer_quantity' | 'delivered_unbilled_quantity' | 'received_unbilled_quantity' | 'order_age_exceptions' | 'book_cash_balance' | 'supplier_payable_due' | 'supplier_payable_unknown_due' | 'supplier_advance_balance';
export type MetricId =
  | CustomerCoverageMetricId
  | InventoryAvailabilityMetricId
  | BusinessMetricId
  | SalesCommandMetricId
  | 'revenue' | 'net_revenue' | 'order_count' | 'units_sold' | 'average_order_value'
  | 'gross_profit' | 'gross_margin' | 'sales_growth' | 'opportunity_count'
  | 'pipeline_value' | 'weighted_pipeline' | 'win_rate' | 'invoiced_amount'
  | 'net_aged_receivable' | 'aged_at_date' | 'aged_1_30' | 'aged_31_60' | 'aged_61_90' | 'aged_91_120' | 'aged_over_120' | 'total_overdue_receivable' | 'overdue_receivable_percentage' | 'gross_open_receivable_components' | 'credit_balances'
  | 'customer_cash_collected' | 'cash_applied_to_invoices' | 'unallocated_customer_receipts' | 'customer_collection_ratio'
  | 'weighted_collection_days' | 'receivables_due_for_collection' | 'order_margin' | 'order_margin_percentage'
  | 'collected_amount' | 'outstanding_amount' | 'overdue_amount'
  | 'stock_on_hand' | 'inventory_value' | 'low_stock_count'
  | 'maintenance_requests' | 'failure_count' | 'mtbf' | 'mttr' | 'maintenance_cost'
  | 'customers_served' | 'order_revenue' | 'net_invoiced_revenue' | 'invoiced_revenue' | 'refund_value'
  | 'invoice_count' | 'refund_count' | 'cancelled_orders' | 'average_invoice_value' | 'average_confirmed_order_value';
export type DerivedMetricId = 'command_cancellation_rate' | 'command_customers' | 'command_same_day_rate' | 'invoice_refund_sales_percentage' | 'physical_return_rate_quantity' | 'period_collection_percentage' | 'customer_balance_sales_percentage' | 'customer_collection_ratio' | 'weighted_collection_days' | 'order_margin_percentage' | 'overdue_receivable_percentage' | 'average_order_value' | 'gross_margin' | 'sales_growth' | 'win_rate' | 'mtbf' | 'mttr' | 'average_invoice_value' | 'average_confirmed_order_value' | 'customers_served';
export type InternalMeasureId = 'command_decided_orders' | 'period_collection_sales' | 'collection_amount_days' | 'collection_applied_amount' | 'order_untaxed_value' | 'won_opportunity_count' | 'closed_opportunity_count' | 'operating_hours' | 'repair_hours' | 'completed_repair_count';
export type FactMeasureId = Exclude<MetricId, DerivedMetricId> | InternalMeasureId;
export type DimensionId = 'date' | 'week' | 'month' | 'quarter' | 'year' | 'customer' | 'branch'
  | 'invoice_document_state' | 'invoice_payment_state' | 'receipt_state' | 'order_state'
  | 'region' | 'salesperson' | 'product' | 'product_category' | 'warehouse'
  | 'brand' | 'customer_segment' | 'customer_class' | 'uom' | 'journal' | 'supplier'
  | 'customer_salesperson' | 'customer_state' | 'customer_tag' | 'coverage_year'
  | 'equipment' | 'equipment_category' | 'technician' | 'business_line' | 'city' | 'state';
export type AdditiveAggregation = 'sum' | 'count' | 'average' | 'min' | 'max';
export type MetricType = 'currency' | 'number' | 'percentage' | 'duration' | 'date';
export type MetricSemantics =
  | { kind: 'distinct_count'; measure: FactMeasureId; dimension: DimensionId }
  | { kind: 'additive'; measure: FactMeasureId }
  | { kind: 'ratio'; numerator: FactMeasureId; denominator: FactMeasureId; scale: number; basis?: 'snapshot' }
  | { kind: 'snapshot'; measure: FactMeasureId; aggregation?: 'max' }
  | { kind: 'comparison_derived'; base: MetricId; defaultComparison: ComparisonPeriod }
  | { kind: 'duration_derived'; numerator: FactMeasureId; denominator: FactMeasureId; scale: number };
export interface LocalizedText { en: string; ar: string }
export interface MetricHelp {
  shortDefinition: LocalizedText;
  definition: LocalizedText;
  formula: LocalizedText;
  inclusionSummary: LocalizedText;
  exclusionSummary: LocalizedText;
  dateBasis: LocalizedText;
  metricType: 'event' | 'snapshot' | 'derived';
  aggregationBehavior: LocalizedText;
  refundCreditBehavior: LocalizedText;
  definitionVersion: number;
}
export interface SemanticMetric {
  id: MetricId;
  labels: LocalizedText;
  descriptions: LocalizedText;
  help: MetricHelp;
  synonyms: { en: readonly string[]; ar: readonly string[] };
  dialectSynonyms?: { iq?: readonly string[]; eg?: readonly string[] };
  type: MetricType;
  semantics: MetricSemantics;
  dimensions: readonly DimensionId[];
  presentation: { decimals: number; unit?: string };
}
export interface TenantProfile {
  id: string;
  /** Trusted business preferences, never source conditions or authorization. */
  preferredMetrics?: Partial<Record<MetricId,MetricId>>;
  countryCode: 'IQ' | 'EG';
  defaultLocale: Locale;
  arabicDialect: 'iq' | 'eg';
  reportingCurrency: 'IQD' | 'EGP';
  timeZone: 'Asia/Baghdad' | 'Africa/Cairo';
  labels: LocalizedText;
  branchLabels: Readonly<Record<string, LocalizedText>>;
  /** Trusted presentation/planner examples only. [] means none available; never authorization or source certification. */
  exampleBranchIds: readonly string[];
}
/** The repository receives resolved constraints, never a user or role. */
export interface AnalyticsContext { tenantId: string; locale: Locale; enforcedFilters?: readonly AnalyticsFilter[] }
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
  /** Cumulative share of positive grouped contributions, ordered descending with stable ties. */
  pareto?: true;
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
/** Transient output selection. It never changes business filters or analysis populations. */
export interface AnalyticsReadOptions {
  /** Delivery order is independent of full-population metric analysis. Rank requires Pareto. */
  window?: { limit: number; cursor?: AnalyticsResultCursor; search?: string; queries?: readonly AnalyticsQuery[]; order?: 'identity' | 'rank' };
  outputKeys?: readonly string[];
  revision?: string;
}
/** Scope is an opaque fingerprint; the after-key is only an output position, never authorization. */
export interface AnalyticsResultCursor { scope: string; after: string; position?: number }
export interface AnalyticsResultWindow {
  total: number;
  scope: string;
  nextCursor?: AnalyticsResultCursor;
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
    window?: AnalyticsResultWindow;
    servingRevision?: string;
    /** Effective governed cutoff; snapshots are never added across this date. */
    snapshotAsOf?: string;
    /** Per-point immutable lineage for historical Finance trends. */
    drillReleases?: Record<string,string>;
    reconciliation?: {status:'exact';reference:string;definitionReference:string};
    coverage?: {status:'complete'|'partial'|'unavailable';from:string;through:string;cutoff?:string};
    availability?: {state:'DATA_NOT_READY'|'PARTIAL_COVERAGE';reason:'outside_coverage'|'missing_partition'|'no_snapshot'};
    sourceId: string;
    /** Display labels only; row keys remain the stable canonical identity. */
    dimensionLabels?: Record<string,string>;
    executedAt: string;
    release?: import('./published-capabilities.ts').AnalyticsReleaseProvenance;
    /** Latest event date among tenant facts needed for this metric, independent of the query period. */
    dataThrough?: string;
    /** Source extraction/synchronization timestamp, only when supplied by the adapter. */
    sourceAsOf?: string;
    /** Receipt time and repeated checks; no shared source snapshot is claimed. */
    sourceConsistency?: 'api_observed';
    metricType: MetricType;
    unit?: string;
    semantics: MetricSemantics['kind'];
    /** Governed executed transformations, used by the same metric-definition popup. */
    analysis?: AnalysisSpec;
  };
}
export interface DimensionValueRepository {
  listDimensionValues(dimension: DimensionId, context: AnalyticsContext): Promise<string[]>;
  /** Governed labels are presentation evidence; identities remain unchanged. */
  listDimensionOptions?(dimension: DimensionId, context: AnalyticsContext): Promise<Array<{id:string;label?:string}>>;
  searchDimensionOptions?(dimension:DimensionId,context:AnalyticsContext,request:DimensionDiscoveryRequest):Promise<DimensionDiscoveryPage>;
}
export interface DimensionDiscoveryRequest {search?:string;cursor?:string;limit?:number;selectedIds?:readonly string[];metric?:MetricId;asOf?:string;dateRange?:DateRange}
export interface DimensionDiscoveryPage {values:Array<{id:string;label?:string}>;selected:Array<{id:string;label?:string}>;nextCursor?:string}
export interface AnalyticsRepository {
  readonly supportsResultWindows?: true;
  /** Optional fresh adapter scope for one execution; shared operands never outlive it. */
  createExecutionScope?(context:AnalyticsContext): Promise<AnalyticsExecutionScope>;
  execute(query: AnalyticsQuery, context: AnalyticsContext, read?: AnalyticsReadOptions): Promise<AnalyticsResult>;
}
/** Verification runs after every read has settled, before the attempt is returned. */
export interface AnalyticsExecutionScope extends AnalyticsRepository {
  readonly servingRevision?: string;
  verifyExecution?(): Promise<void>;
}
export const widgetTypes = ['kpi', 'line', 'area', 'bar', 'pie', 'treemap', 'combo', 'table'] as const;
export type WidgetType = typeof widgetTypes[number];
export const governedPalettes = ['default', 'blue', 'green', 'orange', 'purple', 'red', 'neutral'] as const;
export type GovernedPalette = typeof governedPalettes[number];
/** Shared dashboard design; personal Light/Dark/System stays outside saved content. */
export interface DashboardPresentation { palette?: GovernedPalette }
export interface WidgetPresentation {
  palette?: GovernedPalette;
  orientation?: 'vertical' | 'horizontal';
  pieVariant?: 'pie' | 'donut';
  legend?: 'auto' | 'show' | 'hide';
  dataLabels?: 'auto' | 'show' | 'hide';
  curve?: 'straight' | 'smooth';
}
export interface DashboardGridItem { widgetId: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }
/** Explicit items use a canonical 12-column desktop grid; older v2 layouts may omit them. */
export interface DashboardLayout { columns: 1 | 2 | 3 | 4 | 12; items?: DashboardGridItem[] }
/** In a multi-series widget, only the first series may use topN; its keys select the displayed rows. */
export interface DashboardSeries { id: string; metric: MetricId; analysis?: AnalysisSpec; presentation?: { mark?: 'bar' | 'line' } }
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  presentation?: WidgetPresentation;
  title?: LocalizedText;
  series: DashboardSeries[];
  dimension?: DimensionId;
}
/** v2 replaces v1 widget.metric with stable, independently executable series. */
export const relativeDatePresets = ['today', 'yesterday', 'current_month', 'previous_month', 'last_30_days', 'last_90_days', 'current_quarter', 'previous_quarter', 'current_year', 'previous_year', 'last_6_months', 'last_12_months'] as const;
export type RelativeDatePreset = typeof relativeDatePresets[number];

export interface DashboardSpec {
  schemaVersion: 2;
  id: string;
  title: LocalizedText;
  locale: Locale;
  presentation?: DashboardPresentation;
  /** User-requested filters. Future policy-enforced filters belong outside DashboardSpec. */
  filters: { dateRange?: DateRange; datePreset?: RelativeDatePreset; dimensions?: AnalyticsFilter[] };
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
    | { op: 'set_presentation'; presentation: DashboardPresentation | null }
  >;
};
export interface PlannerCapabilities { metricIds: readonly MetricId[]; templateIds: readonly string[]; actions: readonly Permission[]; published?: import('./published-capabilities.ts').PublishedAnalyticsCapabilities }
export interface DashboardGenerationRequest { prompt: string; locale: Locale; context: AnalyticsContext; tenantProfile: TenantProfile; capabilities?: PlannerCapabilities }
export interface DashboardPlanner {
  generate(request: DashboardGenerationRequest): Promise<DashboardSpec>;
  edit(current: DashboardSpec, instruction: string, tenantProfile: TenantProfile, capabilities?: PlannerCapabilities): Promise<DashboardPatch>;
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
