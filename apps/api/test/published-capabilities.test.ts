import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';
const period = { from: '2026-09-01',to: '2026-09-30' };
const headers = { 'x-demo-user-id': 'demo-iq-admin','x-tenant-id': 'demo-iq','x-locale': 'en' };
test('server filters catalog, preflights templates and rejects forged requests with fresh published authority',async () => {
  const repository = new MockAnalyticsRepository([{ tenantId: 'demo-iq',measureId: 'order_count',date: '2026-09-15',value: 2895,dimensions: { business_line: 'official' } }]);
  let published: PublishedAnalyticsCapabilities = { tenantId: 'demo-iq',mode: 'certified',releases: [{ datasetId: 'r1',sourceId: 'rest-or-postgres',mappingId: 'approved-definition',mappingVersion: '1',certificationReference: 'approved',period,capabilities: (['net_invoiced_revenue','invoiced_revenue','refund_value','order_count'] as const).map(metric=>({ metric,summary: true,dimensions: ['business_line'],analyses: [] })) }] };
  const app = await buildApi({ analyticsRepository: repository,dimensionValues: repository,publishedCapabilities: { async getPublishedCapabilities(){ return published; } },clock: ()=>new Date('2026-10-06T12:00:00Z') });
  try {
    const catalog = (await app.inject({ url: '/api/semantic-catalog',headers })).json();
    assert.equal(catalog.metrics.length,4); assert.ok(!catalog.registry.some((metric: { id: string })=>metric.id==='revenue'));
    assert.deepEqual(catalog.metrics.find((metric: { id: string })=>metric.id==='order_count').dimensions,['business_line']);
    const templates = (await app.inject({ url: '/api/dashboard-templates',headers })).json().templates;
    assert.equal(templates.find((template: { id: string })=>template.id==='sales-invoicing').availability,'available');
    assert.equal(templates.find((template: { id: string })=>template.id==='sales-performance').compatibility.status,'partially_supported');
    assert.equal((await app.inject({ url: '/api/dashboard-templates/sales-performance/instantiate',headers })).statusCode,409);
    const result = await app.inject({ url: '/api/dashboard-templates/sales-invoicing/instantiate',headers });
    assert.equal(result.statusCode,200); assert.equal(result.json().execution.metadata.failedSeries,0);
    const dashboard = result.json().dashboard;
    assert.deepEqual(dashboard.filters.dateRange,period);
    for (const payload of [{ metric: 'revenue',dateRange: period },{ metric: 'order_count',groupBy: 'customer',dateRange: period },{ metric: 'order_count',aggregation: 'average',dateRange: period }]) assert.equal((await app.inject({ method: 'POST',url: '/api/analytics/query',headers,payload })).statusCode,403);
    assert.equal((await app.inject({ method: 'POST',url: '/api/analytics/query',headers,payload: { metric: 'order_count',groupBy: 'business_line',dateRange: period } })).statusCode,200);
    assert.deepEqual((await app.inject({ url: '/api/dimensions/customer/values',headers })).json().values,[]);
    const invalid = structuredClone(dashboard); invalid.widgets[0].series[0].metric='revenue';
    assert.equal((await app.inject({ method: 'POST',url: '/api/dashboards/execute',headers,payload: { dashboard: invalid } })).statusCode,403);
    published = { ...published,releases: [] };
    assert.equal((await app.inject({ method: 'POST',url: '/api/dashboards/execute',headers,payload: { dashboard } })).statusCode,403);
    assert.equal((await app.inject({ url: '/api/semantic-catalog',headers })).json().metrics.length,0);
    published = { ...published,tenantId: 'other' };
    assert.equal((await app.inject({ url: '/api/semantic-catalog',headers })).statusCode,403);
  } finally { await app.close(); }
});
