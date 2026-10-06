import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles,syntheticCapabilities } from '@el-dabboos/domain';
import { templateCompatibility,getDashboardTemplate,templateRequirements,instantiateDashboardTemplate } from '../src/index.ts';
test('source-neutral requirements distinguish supported, partial and unsupported templates without physical fields',() => {
  const synthetic = syntheticCapabilities({ tenantId: 'demo-iq',locale: 'en' });
  const partial = { ...synthetic,mode: 'certified' as const,releases: synthetic.releases.map(release=>({ ...release,capabilities: release.capabilities.filter(capability=>capability.metric==='order_count') })) };
  const template = getDashboardTemplate('sales-invoicing')!;
  assert.equal(templateCompatibility(template,partial).status,'partially_supported');
  assert.equal(templateCompatibility(template,{ ...partial,releases: [] }).status,'unsupported');
  assert.equal(templateCompatibility(template,synthetic).status,'supported');
  assert.equal(templateCompatibility(getDashboardTemplate('sales-performance')!,partial).status,'partially_supported');
  const requirements = JSON.stringify(templateRequirements(template));
  for (const physical of ['odoo','sale_order','amount_untaxed_signed','netAmount']) assert.ok(!requirements.includes(physical));
  const certified = { ...synthetic,mode: 'certified' as const,releases: synthetic.releases.map(release=>({ ...release,period: { from: '2026-09-01',to: '2026-09-30' } })) };
  const dashboard = instantiateDashboardTemplate(template,tenantProfiles['demo-iq'],new Date('2026-10-06'),'ar',certified);
  assert.deepEqual(dashboard.filters.dateRange,certified.releases[0]!.period);
  assert.deepEqual(dashboard.widgets.flatMap(widget=>widget.series.map(series=>series.metric)),['net_invoiced_revenue','invoiced_revenue','refund_value','order_count']);
});
