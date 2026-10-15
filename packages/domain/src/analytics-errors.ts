import type { DimensionId } from './contracts.ts';
export class AnalyticsResultLimitError extends Error {
  constructor(readonly dimension:DimensionId){super('Governed result limit exceeded');this.name='AnalyticsResultLimitError';}
}
/** Discovery metadata only. This never authorizes a filter, grouping or query. */
export class UncertifiedDimensionError extends Error {
  constructor(readonly dimension: DimensionId) { super('Uncertified discovery dimension'); }
}

/** Bounded discovery cannot provide a complete option set. Queries retain their own limits. */
export class DimensionDiscoveryLimitError extends Error {
  constructor(readonly dimension: DimensionId) { super('Discovery exceeds technical bound'); }
}

/** Safe execution category; adapter details never enter dashboard results. */
export class AnalyticsQueryTimeoutError extends Error {
 constructor(){super('Analytics query timed out');this.name='AnalyticsQueryTimeoutError';}
}
