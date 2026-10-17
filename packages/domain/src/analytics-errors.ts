import type { DimensionId } from './contracts.ts';
export class AnalyticsResultLimitError extends Error {
  constructor(readonly dimension:DimensionId){super('Governed result limit exceeded');this.name='AnalyticsResultLimitError';}
}
export class AnalyticsResultWindowError extends Error {
  constructor(){super('Result window is invalid or stale');this.name='AnalyticsResultWindowError';}
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

/** A whole execution must be discarded; independently successful widgets cannot be returned. */
export class AnalyticsPublicationChangedError extends Error {
 constructor(){super('Data changed while this report loaded. Please refresh.');this.name='AnalyticsPublicationChangedError';}
}
