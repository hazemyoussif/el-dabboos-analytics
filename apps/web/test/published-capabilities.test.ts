import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { tenantProfiles } from '@el-dabboos/domain';
import { blankDashboardDraft } from '../src/builder/model.ts';
import { publishedWidgetAllowed } from '../src/builder/published-capabilities.ts';
const period = { from: '2026-09-01',to: '2026-09-30' };
const published: PublishedAnalyticsCapabilities = { tenantId: 'demo-iq',mode: 'certified',releases: [{ datasetId: 'r1',sourceId: 'any',mappingId: 'm',mappingVersion: '1',certificationReference: 'approved',period,capabilities: [{ metric: 'order_count',summary: true,dimensions: ['business_line'],analyses: [] }] }] };
test('manual editor initializes the certified period and blocks forged metrics, pairs and analyses',() => {
  const base = blankDashboardDraft(tenantProfiles['demo-iq'],'en',undefined,period).base;
  const widget = { id: 'one',type: 'kpi' as const,series: [{ id: 'orders',metric: 'order_count' as const }] };
  assert.deepEqual(base.filters,{ dateRange: period });
  assert.equal(publishedWidgetAllowed(widget,base,published),true);
  assert.equal(publishedWidgetAllowed({ ...widget,series: [{ id: 'revenue',metric: 'revenue' }] },base,published),false);
  assert.equal(publishedWidgetAllowed({ ...widget,type: 'bar',dimension: 'customer' },base,published),false);
  assert.equal(publishedWidgetAllowed({ ...widget,series: [{ ...widget.series[0]!,analysis: { ranking: true } }] },base,published),false);
});
