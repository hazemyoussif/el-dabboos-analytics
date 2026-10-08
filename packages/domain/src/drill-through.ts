import type { AnalyticsContext, AnalyticsQuery, AnalyticsFilter, DimensionId, MetricId } from './contracts.ts';
import { semanticCatalog } from './catalog.ts';
import { validateQuery } from './validation.ts';

export const drillDimensions: readonly DimensionId[] = ['business_line','salesperson','customer','branch','region'];
export const drillMetrics: readonly MetricId[] = ['order_revenue','order_count','invoiced_revenue','refund_value','net_invoiced_revenue','invoice_count','refund_count','average_confirmed_order_value','average_invoice_value','net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','gross_open_receivable_components','credit_balances','overdue_receivable_percentage'];
export interface DrillRequest {
  query: AnalyticsQuery;
  /** Exact datasetId from the originating successful series metadata. */
  release: string;
  sourceAsOf: string;
  clicked?: AnalyticsFilter;
  cursor?: string;
  limit?: number;
  sort?: { field: 'date'|'amount'|'customer'|'salesperson'; direction: 'asc'|'desc' };
  search?: string;
}
export interface DrillRow {
  date: string;
  customer: string|null;
  salesperson: string|null;
  businessLine: string|null;
  documentType: string|null;
  status: string|null;
  measure: string;
  amount: string;
  currency: string|null;
}
export interface DrillPage {
  rows: DrillRow[];
  nextCursor?: string;
  hasMore: boolean;
  release: string;
  snapshotAsOf?: string;
  grain: 'canonical_measure_fact'|'customer_snapshot';
  /** Unsearched full context bases; decimal text, never sum page-level ratios. */
  bases: Record<string,string>;
  value: string|null;
}
export interface DrillThroughRepository { drill(request: DrillRequest, context: AnalyticsContext): Promise<DrillPage> }
export class DrillUnavailableError extends Error {
  constructor(readonly code: 'DRILL_RELEASE_CHANGED'|'DRILL_NOT_READY'|'DRILL_CONTEXT_INVALID') { super(code); }
}
export function validateDrillRequest(value: unknown, context: AnalyticsContext): asserts value is DrillRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  const request = value as DrillRequest;
  if (Object.keys(value).some(key=>!['query','release','sourceAsOf','clicked','cursor','limit','sort','search'].includes(key))) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  validateDrillLineage(request);
  validateQuery(request.query,context);
  if (!drillMetrics.includes(request.query.metric) || request.query.groupBy || request.query.analysis || request.query.aggregation) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  validateDrillPeriod(request.query);
  validateDrillPaging(request);
  validateDrillSort(request);
  validateClickedContext(request,context);
}
export function drillQuery(request: DrillRequest): AnalyticsQuery {
  return {...request.query,filters:[...(request.query.filters??[]),...(request.clicked?[request.clicked]:[])]};
}

function validateDrillPaging(request:DrillRequest) {
  if (request.limit!==undefined && (!Number.isInteger(request.limit)||request.limit<1||request.limit>100)) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  if (request.cursor!==undefined && (typeof request.cursor!=='string'||request.cursor.length>2000)) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  if (request.search!==undefined && (typeof request.search!=='string'||request.search.length>100)) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
}
function validateDrillSort(request:DrillRequest) {
  if (!request.sort) return;
  if (Object.keys(request.sort).some(key=>!['field','direction'].includes(key)) || !['date','amount','customer','salesperson'].includes(request.sort.field) || !['asc','desc'].includes(request.sort.direction)) throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
}

function validateClickedContext(request:DrillRequest,context:AnalyticsContext) {
  if(!request.clicked)return;
  if(Object.keys(request.clicked).some(key=>!['dimension','values'].includes(key)))throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  if(!drillDimensions.includes(request.clicked.dimension)||request.clicked.values?.length!==1)throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
  validateQuery(drillQuery(request),context);
}

function validateDrillLineage(request:DrillRequest) {
 if(typeof request.release!=='string'||!request.release||request.release.length>200)throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
 if(typeof request.sourceAsOf!=='string'||request.sourceAsOf.length>40||!Number.isFinite(Date.parse(request.sourceAsOf)))throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
}

/** Trusted event summaries require a concrete resolved period; never invent an all-time total. */
function validateDrillPeriod(query:AnalyticsQuery) {
 const semantics=semanticCatalog[query.metric].semantics;
 const snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
 if(!snapshot&&!query.dateRange)throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
}
