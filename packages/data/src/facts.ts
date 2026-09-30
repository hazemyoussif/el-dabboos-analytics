import type { DimensionId, MetricId } from '@el-dabbous/domain';
export interface AnalyticsFact {
  tenantId: string;
  metricId: MetricId;
  date: string;
  value: number;
  dimensions: Partial<Record<DimensionId, string>>;
}
