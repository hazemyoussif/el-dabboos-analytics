import type { AnalyticsFact } from './facts.ts';
import { tenantProfiles } from '@el-dabboos/domain';
import type { TenantProfile } from '@el-dabboos/domain';

const categories = Array.from({ length: 18 }, (_, i) => `category_${String(i + 1).padStart(2, '0')}`);
const products = Array.from({ length: 160 }, (_, i) => `product_${String(i + 1).padStart(3, '0')}`);
const equipment = Array.from({ length: 150 }, (_, i) => `equipment_${String(i + 1).padStart(3, '0')}`);
const technicians = Array.from({ length: 8 }, (_, i) => `technician_${i + 1}`);
const monetaryMeasures = new Set<AnalyticsFact['measureId']>(['revenue', 'net_revenue', 'gross_profit', 'pipeline_value', 'weighted_pipeline', 'invoiced_amount', 'collected_amount', 'outstanding_amount', 'overdue_amount', 'inventory_value', 'maintenance_cost']);

/** Two years of canonical source measures with fixed, discoverable business patterns. */
export function generateSeedFacts(tenantId: TenantProfile['id'] = 'demo-iq', seed = 20261003): AnalyticsFact[] {
  const profile = tenantProfiles[tenantId];
  if (!profile) throw new Error('Synthetic seed requires a known demo tenant profile.');
  const branches = Object.keys(profile.branchLabels);
  const warehouses = branches.slice(0, 5).map(branch => `${branch}-main`);
  const customersPerBranch = tenantId === 'demo-iq' ? 70 : 60;
  const customers = Array.from({ length: branches.length * customersPerBranch }, (_, i) => `customer_${String(i + 1).padStart(3, '0')}`);
  let state = seed >>> 0;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
  const facts: AnalyticsFact[] = [];
  const add = (measureId: AnalyticsFact['measureId'], date: string, value: number, dimensions: AnalyticsFact['dimensions'], entityId?: string) => {
    facts.push({ tenantId, measureId, date, value: Math.round(value * (tenantId === 'demo-iq' && monetaryMeasures.has(measureId) ? 100 : 1) * 100) / 100, dimensions,
      ...(entityId ? { entityId } : {}) });
  };
  for (let month = 0; month < 24; month++) {
    const year = 2024 + Math.floor((month + 9) / 12);
    const m = (month + 9) % 12 + 1;
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const season = 1 + 0.22 * Math.sin((m - 2) * Math.PI / 6);
    for (let b = 0; b < branches.length; b++) {
      const branch = branches[b]!;
      const trend = b === 0 ? 1 + month * 0.035 : b === 1 ? 1 - month * 0.018 : 1 + month * 0.004;
      const region = tenantId === 'demo-iq' ? (b < 2 ? 'central_south' : b === 4 ? 'north' : 'central') : (b < 2 ? 'greater_cairo' : b === 5 ? 'upper_egypt' : 'delta_coast');
      for (let order = 0; order < (tenantId === 'demo-iq' ? 54 : 48); order++) {
        const date = `${ym}-${String(1 + (order * 7 + b) % 28).padStart(2, '0')}`;
        const customerIndex = (b * customersPerBranch + order * 11 + month * 7) % customers.length;
        const customer = customers[customerIndex]!;
        const productIndex = (order * 13 + month * 5 + b * 17) % products.length;
        const product = products[productIndex]!;
        const premium = customerIndex < 12 ? 2.8 : 1;
        const highMargin = productIndex >= 120;
        const lowMargin = productIndex < 32;
        const units = highMargin ? 1 + Math.floor(random() * 2) : lowMargin ? 9 + Math.floor(random() * 11) : 2 + Math.floor(random() * 7);
        const unitPrice = highMargin ? 3200 : lowMargin ? 160 : 650;
        const revenue = units * unitPrice * premium * trend * season * (0.9 + random() * 0.2);
        const net = revenue * 0.94;
        const margin = highMargin ? 0.56 : lowMargin ? 0.12 : 0.32;
        const dims = { branch, region, customer, product,
          product_category: categories[productIndex % categories.length]!, salesperson: `salesperson_${b * 2 + order % 2 + 1}` };
        add('revenue', date, revenue, dims);
        add('net_revenue', date, net, dims);
        add('gross_profit', date, net * margin, dims);
        add('order_count', date, 1, dims);
        add('units_sold', date, units, dims);
        add('invoiced_amount', date, net * 0.98, dims);
        add('collected_amount', date, net * (customerIndex < 6 ? 0.48 : 0.78 + random() * 0.18), dims);
      }
      for (let rep = 0; rep < 2; rep++) {
        const date = `${ym}-18`;
        const count = 16 + Math.floor(random() * 7);
        const closed = 8 + Math.floor(random() * 6);
        const won = Math.min(closed, 3 + Math.floor(random() * 5));
        const dims = { branch, region, salesperson: `salesperson_${b * 2 + rep + 1}` };
        add('opportunity_count', date, count, dims);
        add('closed_opportunity_count', date, closed, dims);
        add('won_opportunity_count', date, won, dims);
        add('pipeline_value', date, count * 3300 * trend, dims);
        add('weighted_pipeline', date, count * 3300 * trend * (0.35 + won / closed * 0.2), dims);
      }
    }
    for (let c = 0; c < customers.length; c++) {
      const customer = customers[c]!;
      const b = Math.floor(c / customersPerBranch);
      const branch = branches[b]!;
      const growth = c < 8 ? 1 + month * 0.065 : 1 + month * 0.003;
      const balance = (c < 12 ? 16000 : 1800 + (c % 13) * 160) * growth * (0.9 + random() * 0.2);
      const dims = { customer, branch, region: tenantId === 'demo-iq' ? (b < 2 ? 'central_south' : b === 4 ? 'north' : 'central') : (b < 2 ? 'greater_cairo' : b === 5 ? 'upper_egypt' : 'delta_coast') };
      add('outstanding_amount', `${ym}-25`, balance, dims, `receivable:${customer}`);
      add('overdue_amount', `${ym}-25`, balance * (c < 8 ? 0.68 : c < 36 ? 0.3 : 0.09), dims, `overdue:${customer}`);
    }
    for (let p = 0; p < products.length; p++) {
      const product = products[p]!;
      const category = categories[p % categories.length]!;
      for (let w = 0; w < warehouses.length; w++) {
        const warehouse = warehouses[w]!;
        const branch = branches[w]!;
        const pressured = p < 18 && w < 2;
        const qty = Math.max(0, Math.round((pressured ? 24 - month * 0.8 : 80 + p % 25) * (0.85 + random() * 0.3)));
        const dims = { product, product_category: category, warehouse, branch };
        const identity = `inventory:${product}:${warehouse}`;
        add('stock_on_hand', `${ym}-26`, qty, dims, identity);
        add('inventory_value', `${ym}-26`, qty * (p >= 120 ? 1500 : p < 32 ? 90 : 360), dims, identity);
        add('low_stock_count', `${ym}-26`, qty < 18 ? 1 : 0, dims, identity);
      }
    }
    for (let e = 0; e < equipment.length; e++) {
      const asset = equipment[e]!;
      const b = e % branches.length;
      const category = e < 50 ? 'compressor' : e < 100 ? 'vehicle' : 'production_line';
      const technicianIndex = e % technicians.length;
      const failures = category === 'compressor' ? (month < 8 ? 1 : month < 16 ? 2 : 3) + (e % 5 === 0 ? 1 : 0) : (e + month) % 4 === 0 ? 1 : 0;
      const requests = failures + ((e + month) % 3 === 0 ? 1 : 0);
      const completed = Math.max(0, requests - ((e + month) % 11 === 0 ? 1 : 0));
      const repairHours = completed * (technicianIndex < 2 ? 5 : technicianIndex > 5 ? 16 : 9) * (0.9 + random() * 0.2);
      const dims = { equipment: asset, equipment_category: category, technician: technicians[technicianIndex]!, branch: branches[b]! };
      const date = `${ym}-20`;
      add('failure_count', date, failures, dims);
      add('maintenance_requests', date, requests, dims);
      add('completed_repair_count', date, completed, dims);
      add('operating_hours', date, 600 - failures * 20, dims);
      add('repair_hours', date, repairHours, dims);
      add('maintenance_cost', date, repairHours * 120 + failures * 350, dims);
    }
  }
  return facts;
}
