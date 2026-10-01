import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticCatalog, tenantProfiles, validateDashboardSpec, widgetTypes } from '@el-dabbous/domain';
import { generateSeedFacts, MockAnalyticsRepository } from '@el-dabbous/data';
import { dashboardTemplates, DashboardExecutor, DemoIdentityProvider, DefaultAuthorizationPolicy, instantiateDashboardTemplate } from '../src/index.ts';
test('all 19 governed templates validate and execute in EN/AR for both demo markets with authorized metrics', async () => {
  assert.equal(dashboardTemplates.length,19);
  const repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'),...generateSeedFacts('demo-eg')]);
  const identity = new DemoIdentityProvider(); const policy = new DefaultAuthorizationPolicy(); const executor = new DashboardExecutor(repository);
  for (const profile of Object.values(tenantProfiles)) for (const locale of ['en','ar'] as const) for (const template of dashboardTemplates) {
    const spec = instantiateDashboardTemplate(template,profile,new Date('2026-09-30T12:00:00Z'),locale); validateDashboardSpec(spec);
    const context = identity.resolve('demo-regional-analyst',profile.id,locale); policy.authorizeDashboard(spec,context);
    for (const w of spec.widgets) { assert.ok(widgetTypes.includes(w.type)); for (const series of w.series) { assert.ok(semanticCatalog[series.metric]); if (w.dimension) assert.ok(semanticCatalog[series.metric].dimensions.includes(w.dimension)); } }
    const executed = await executor.execute(spec,{ tenantId:profile.id,locale }); assert.equal(executed.metadata.failedSeries,0,`${template.id}/${profile.id}/${locale}`);
    assert.ok(Object.values(executed.widgetResults).some(w=>w.alignedRows.length>0));
  }
});
