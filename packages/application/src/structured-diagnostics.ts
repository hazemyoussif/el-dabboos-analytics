import type { DashboardSchemaIssue } from '@el-dabboos/domain';

export interface StructuredPlannerDiagnostic {
  operation: 'generation' | 'edit';
  attempt: number;
  schemaName: string;
  providerId: string;
  stage: 'schema' | 'semantic' | 'authorization';
  details: DashboardSchemaIssue[];
  outputPreview: string;
}

const visibleFields = new Set(['id', 'widgetId', 'seriesId', 'metric', 'type', 'locale', 'dimension', 'comparison', 'direction', 'op', 'from', 'to']);
const knownFields = new Set(['schemaVersion', 'id', 'title', 'locale', 'filters', 'dateRange', 'dimensions', 'layout', 'columns', 'items',
  'widgets', 'widget', 'widgetId', 'seriesId', 'changes', 'presentation', 'series', 'metric', 'type', 'dimension', 'analysis', 'comparison', 'movingAverage', 'window',
  'runningTotal', 'percentageContribution', 'ranking', 'topN', 'direction', 'limit', 'operations', 'op', 'en', 'ar', 'from', 'to',
  'titleEn', 'titleAr', 'datePreset', 'dateFrom', 'dateTo', 'movingAverageWindow', 'topNDirection', 'topNLimit', 'mark', 'requestedPresentation', 'palette', 'orientation', 'pieVariant', 'legend', 'dataLabels', 'curve', 'values', 'x', 'y', 'w', 'h', 'minW', 'minH']);
function safeShape(value: unknown, field = '', depth = 0): unknown {
  if (depth > 8) return '[depth limit]';
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (visibleFields.has(field) && /^[a-zA-Z0-9_.-]{1,80}$/.test(value)) return value;
    return `[redacted string, ${value.length} chars]`;
  }
  if (Array.isArray(value)) return value.slice(0, 30).map(item => safeShape(item, field, depth + 1));
  if (typeof value !== 'object') return '[unsupported value]';
  const entries = Object.entries(value).slice(0, 40).map(([key, child]) =>
    [knownFields.has(key) ? key : '[unexpected field]', safeShape(child, key, depth + 1)]);
  return Object.fromEntries(entries);
}
/** A bounded shape of model output. Free-text fields and unexpected keys are never echoed. */
export function structuredOutputPreview(output: unknown): string {
  const serialized = JSON.stringify(safeShape(output)) ?? 'null';
  return serialized.length > 4096 ? `${serialized.slice(0, 4096)}...[truncated]` : serialized;
}
