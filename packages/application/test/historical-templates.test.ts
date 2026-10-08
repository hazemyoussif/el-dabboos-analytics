import assert from 'node:assert/strict';
import test from 'node:test';
import { historicalTemplates } from '../src/historical-templates.ts';
import { instantiateDashboardTemplate } from '../src/templates.ts';
import { supportedTemplatePeriod } from '../src/management-templates.ts';
import { tenantProfiles,validateDashboardSpec } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities,MetricId } from '@el-dabboos/domain';
const metrics: MetricId[] = ['net_invoiced_revenue','order_revenue','order_count','refund_value'];
const published: PublishedAnalyticsCapabilities = {tenantId:'demo-iq',mode:'certified',releases:[{datasetId:'synthetic-history',sourceId:'synthetic',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC ONLY',period:{from:'2025-10-01',to:'2026-09-30'},capabilities:metrics.map(metric=>({metric,summary:true,dimensions:['month','business_line','salesperson','customer'],analyses:[]}))}]};
test('historical templates use canonical monthly queries, existing filters and bilingual help metrics; no YoY or many-person line plot',()=>{
  for (const template of historicalTemplates) {
    assert.ok(template.name.en && template.name.ar);
    for (const locale of ['en','ar'] as const) validateDashboardSpec(instantiateDashboardTemplate(template,tenantProfiles['demo-iq']!,new Date('2026-10-07T00:00:00Z'),locale,published));
    assert.ok(template.widgets.filter(widget=>widget.type==='line').every(widget=>widget.dimension==='month' && widget.series.length<=2));
    assert.ok(template.widgets.every(widget=>widget.series.every(series=>!series.analysis?.comparison)));
  }
});
test('September alone cannot make a historical trend available; existing single-month reports are unaffected',()=>{
  const september={...published,releases:published.releases.map(release=>({...release,period:{from:'2026-09-01',to:'2026-09-30'}}))};
  for (const template of historicalTemplates) {
    assert.equal(supportedTemplatePeriod(template,september),undefined);
    assert.deepEqual(supportedTemplatePeriod(template,published),{from:'2025-10-01',to:'2026-09-30'});
  }
});
