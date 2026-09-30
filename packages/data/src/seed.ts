import type { MetricId } from '@el-dabbous/domain';
import { semanticCatalog } from '@el-dabbous/domain';
import type { AnalyticsFact } from './facts.ts';

const branches = ['cairo', 'giza', 'alexandria', 'mansoura', 'tanta', 'aswan'];
const metricBase: Partial<Record<MetricId, number>> = {
  revenue: 120000, net_revenue: 112000, order_count: 120, units_sold: 350,
  average_order_value: 1000, gross_profit: 42000, gross_margin: 35, sales_growth: 8,
  opportunity_count: 35, pipeline_value: 85000, weighted_pipeline: 40000, win_rate: 28,
  invoiced_amount: 115000, collected_amount: 88000, outstanding_amount: 27000, overdue_amount: 9500,
  stock_on_hand: 1300, inventory_value: 75000, low_stock_count: 7,
  maintenance_requests: 12, failure_count: 4, mtbf: 460, mttr: 11, maintenance_cost: 3500,
};
/** Fixed seed and business patterns; source-specific tables can later normalize into this fact contract. */
export function generateSeedFacts(tenantId = 'demo', seed = 20261003): AnalyticsFact[] {
  let state = seed >>> 0;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
  const facts: AnalyticsFact[] = [];
  for (const metricId of Object.keys(semanticCatalog) as MetricId[]) {
    for (let month = 0; month < 24; month++) {
      const year = 2024 + Math.floor((month + 9) / 12);
      const m = (month + 9) % 12 + 1;
      const date = `${year}-${String(m).padStart(2, '0')}-15`;
      const season = 1 + 0.19 * Math.sin((m - 2) * Math.PI / 6);
      for (let branch = 0; branch < branches.length; branch++) {
        const trend = branch === 0 ? 1 + month * 0.018 : branch === 1 ? 1 - month * 0.012 : 1 + month * 0.003;
        const highValue = branch === 0 ? 1.35 : 1;
        const failures = metricId === 'failure_count' && branch === 2 ? 1 + month * 0.025 : 1;
        const value = Number(((metricBase[metricId] ?? 1) * season * trend * highValue * failures * (0.93 + random() * 0.14)).toFixed(2));
        facts.push({ tenantId, metricId, date, value, dimensions: {
          branch: branches[branch]!, region: branch < 2 ? 'greater_cairo' : 'other',
          customer: `customer_${String(branch * 3 + month % 3 + 1).padStart(3, '0')}`,
          salesperson: `salesperson_${branch + 1}`, product: `product_${month % 12 + 1}`,
          product_category: month % 3 === 0 ? 'premium' : 'standard',
          warehouse: `warehouse_${branch % 5 + 1}`, equipment: `equipment_${branch + 1}`,
          equipment_category: branch % 2 ? 'compressor' : 'vehicle', technician: `technician_${branch + 1}`,
        } });
      }
    }
  }
  return facts;
}
