import type { SourceScope } from './production-data.ts';
import { validDateRange } from './validation.ts';

/** Immutable scope of one logical extraction; source-specific cursor tokens stay opaque. */
export interface ExtractionRun extends SourceScope {
  extractionId: string;
  datasetId: string;
  mappingId: string;
  mappingVersion: string;
  sourceObjects: readonly string[];
  from: string;
  to: string;
  sourceAsOf: string;
  frozenRevision: string;
  /** Certified repeatable source freeze, not merely an upper write timestamp. */
  freezeReference: string;
  initialCursor?: string;
  completeness: 'incremental' | 'complete_scope';
  watermarkStart?: string;
}
export interface ExtractionCheckpoint {
  extractionId: string;
  status: 'running' | 'complete';
  pageCount: number;
  rowCount: number;
  cursor?: string;
  completedAt?: string;
}
export interface ExtractionPage {
  extractionId: string;
  pageNumber: number;
  cursorEnd?: string;
}
const identity = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200;
function validateExtractionShape(run: ExtractionRun): void {
  const required = ['tenantId','sourceId','extractionId','datasetId','mappingId','mappingVersion','sourceObjects','companyIds','from','to','sourceAsOf','frozenRevision','freezeReference','completeness'];
  const optional = ['initialCursor','watermarkStart'];
  if (Object.keys(run).some(key => ![...required,...optional].includes(key)) || required.some(key => !Object.hasOwn(run,key))) throw new Error('Invalid extraction shape');
}
export function validateExtractionRun(run: ExtractionRun): void {
  validateExtractionShape(run);
  for (const key of ['tenantId','sourceId','extractionId','datasetId','mappingId','mappingVersion','frozenRevision','freezeReference'] as const) {
    if (!identity(run[key])) throw new Error('Invalid extraction identity');
  }
  for (const values of [run.companyIds,run.sourceObjects]) {
    if (!Array.isArray(values) || !values.length || values.length > 64 || !values.every(identity) || new Set(values).size !== values.length) throw new Error('Invalid extraction scope');
  }
  if (!validDateRange({ from: run.from,to: run.to }) || !/^\d{4}-\d{2}-\d{2}T/.test(run.sourceAsOf) || !Number.isFinite(Date.parse(run.sourceAsOf)) || new Date(run.sourceAsOf).toISOString() !== run.sourceAsOf) throw new Error('Invalid extraction date');
  validateExtractionBounds(run);
}
function validateExtractionBounds(run: ExtractionRun): void {
  if (!['incremental','complete_scope'].includes(run.completeness) || [run.initialCursor,run.watermarkStart].some(value => value !== undefined && !identity(value))) throw new Error('Invalid extraction bounds');
}
