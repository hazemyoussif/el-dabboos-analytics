import assert from 'node:assert/strict';
import test from 'node:test';
import { businessMetricIds,requiredMeasures,semanticCatalog, tenantProfiles, validateDashboardSpec, widgetTypes } from '@el-dabboos/domain';
import { generateSeedFacts, MockAnalyticsRepository } from '@el-dabboos/data';
import { dashboardTemplates, DashboardExecutor, DemoIdentityProvider, DefaultAuthorizationPolicy, instantiateDashboardTemplate } from '@el-dabboos/application';
test('all governed templates validate and execute in EN/AR for both demo markets with authorized metrics', async () => {
  assert.equal(dashboardTemplates.length,46);
  const managementFacts=Object.values(tenantProfiles).flatMap(profile=>(['order_revenue','order_count','net_invoiced_revenue','invoiced_revenue','refund_value'] as const).map(measureId=>({tenantId:profile.id,measureId,date:'2026-08-15',value:10,dimensions:{business_line:'synthetic-line',salesperson:'synthetic-rep',customer:'synthetic-customer',product:'synthetic-product',product_category:'synthetic-category'}})));
  const businessFacts=Object.values(tenantProfiles).flatMap(profile=>[...new Set(businessMetricIds.flatMap(requiredMeasures))].map(measureId=>({tenantId:profile.id,measureId,date:'2026-08-31',value:measureId.endsWith('_date')?20000:10,entityId:'SYNTHETIC BUSINESS ONLY',dimensions:{customer:'synthetic-customer',customer_segment:'synthetic-segment',customer_class:'synthetic-C',product:'synthetic-product',product_category:'synthetic-category',brand:'synthetic-brand',uom:'synthetic-piece',state:'synthetic-state',salesperson:'synthetic-rep',warehouse:'synthetic-warehouse',supplier:'synthetic-supplier',journal:'synthetic-cash'}})));
  const repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'),...generateSeedFacts('demo-eg'),...managementFacts,...businessFacts]);
  const identity = new DemoIdentityProvider(); const policy = new DefaultAuthorizationPolicy(); const executor = new DashboardExecutor(repository, () => new Date('2026-09-30T12:00:00Z'));
  for (const profile of Object.values(tenantProfiles)) for (const locale of ['en','ar'] as const) for (const template of dashboardTemplates) {
    const spec = instantiateDashboardTemplate(template,profile,new Date('2026-09-30T12:00:00Z'),locale); validateDashboardSpec(spec);
    const context = identity.resolve('demo-regional-analyst',profile.id,locale); policy.authorizeDashboard(spec,context);
    for (const w of spec.widgets) { assert.ok(widgetTypes.includes(w.type)); for (const series of w.series) { assert.ok(semanticCatalog[series.metric]); if (w.dimension) assert.ok(semanticCatalog[series.metric].dimensions.includes(w.dimension)); } }
    const executed = await executor.execute(spec,{ tenantId:profile.id,locale }, { timeZone: profile.timeZone }); assert.equal(executed.metadata.failedSeries,0,`${template.id}/${profile.id}/${locale}`);
    assert.ok(Object.values(executed.widgetResults).some(w=>w.alignedRows.length>0));
  }
});
