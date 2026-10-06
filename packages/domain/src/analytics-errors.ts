import type { DimensionId } from './contracts.ts';
/** Discovery metadata only. This never authorizes a filter, grouping or query. */
export class UncertifiedDimensionError extends Error {
  constructor(readonly dimension: DimensionId) { super('Uncertified discovery dimension'); }
}

/** Bounded discovery cannot provide a complete option set. Queries retain their own limits. */
export class DimensionDiscoveryLimitError extends Error {
  constructor(readonly dimension: DimensionId) { super('Discovery exceeds technical bound'); }
}
