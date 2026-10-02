import type { DimensionId, FactMeasureId } from '@el-dabboos/domain';
/** A dated canonical source measure. Derived metrics never appear as facts. */
export interface AnalyticsFact {
  tenantId: string;
  measureId: FactMeasureId;
  date: string;
  value: number;
  /** Stable source-independent entity key required for point-in-time measures. */
  entityId?: string;
  dimensions: Partial<Record<DimensionId, string>>;
}
