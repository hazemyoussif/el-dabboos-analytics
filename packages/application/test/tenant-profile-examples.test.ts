import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles, validateTenantConfiguration, applyDashboardPatch } from '@el-dabboos/domain';
import type { TenantProfile } from '@el-dabboos/domain';
import { MockAnalyticsRepository } from '../../data/src/mock.ts';
import { AuthorizedAnalyticsService, DefaultAuthorizationPolicy, MockDashboardPlanner, UnsupportedDemoIntentError, resolveTenantAccess } from '../src/index.ts';
import { tenantSnapshot } from './fixtures/access-control.ts';
const dynamic: TenantProfile = { ...tenantProfiles['demo-iq'], id: 'dynamic-no-data', labels: { en: 'New workspace', ar: 'مساحة جديدة' }, branchLabels: {}, exampleBranchIds: [] };
const planner = new MockDashboardPlanner(() => new Date('2026-10-04T00:00:00Z'));
const generate = (profile: TenantProfile) => planner.generate({ prompt: 'sales this month', tenantProfile: profile, locale: 'en', context: { tenantId: profile.id, locale: 'en' } });
test('demo profiles retain their trusted examples and valid market configuration', async () => {
    assert.deepEqual(tenantProfiles['demo-iq'].exampleBranchIds, ['baghdad', 'basra']);
    assert.deepEqual(tenantProfiles['demo-eg'].exampleBranchIds, ['cairo', 'alexandria']);
    for (const p of Object.values(tenantProfiles)) {
        validateTenantConfiguration({ ...tenantSnapshot().tenant, id: p.id, configuration: p });
        await generate(p);
    }
});
test('required zero-or-more example list accepts a dynamic profile without organization data', () => {
    validateTenantConfiguration({ ...tenantSnapshot().tenant, id: dynamic.id, configuration: dynamic });
    assert.deepEqual(dynamic.exampleBranchIds, []);
    assert.ok(Object.hasOwn(dynamic, 'exampleBranchIds'));
});
test('empty examples generate safely and neither fabricate branches nor match branch edits', async () => {
    const current = await generate(dynamic);
    assert.equal(current.filters.dimensions, undefined);
    await assert.rejects(planner.edit(current, 'Show only Baghdad and Cairo', dynamic), UnsupportedDemoIntentError);
    const patch = await planner.edit(current, 'Use a moving average', dynamic);
    const edited = applyDashboardPatch(current, patch);
    assert.deepEqual(edited.filters, current.filters);
    assert.ok(!JSON.stringify(edited).includes('baghdad'));
    assert.ok(!JSON.stringify(edited).includes('cairo'));
});
test('one or many examples use only supplied known IDs', async () => {
    const current = await generate(dynamic);
    for (const ids of [['branch-a'], ['branch-a', 'branch-b', 'branch-c']]) {
        const profile = { ...dynamic, exampleBranchIds: ids, branchLabels: Object.fromEntries(ids.map(id => [id, { en: id, ar: id }])) };
        const result = applyDashboardPatch(current, await planner.edit(current, `Show only ${ids.join(' and ')}`, profile));
        assert.deepEqual(result.filters.dimensions, [{ dimension: 'branch', values: ids }]);
    }
});
test('presentation examples never broaden or replace membership authorization scope', async () => {
    const snapshot = tenantSnapshot();
    const before = resolveTenantAccess(snapshot, snapshot.identity.id, snapshot.tenant.id, 'en');
    const current = await generate(dynamic);
    const patch = await planner.edit(current, 'Use a moving average', dynamic);
    applyDashboardPatch(current, patch);
    const after = resolveTenantAccess(snapshot, snapshot.identity.id, snapshot.tenant.id, 'en');
    assert.deepEqual(after, before);
    const repository = new MockAnalyticsRepository([{ tenantId: snapshot.tenant.id, measureId: 'revenue', date: '2026-10-01', value: 10, dimensions: { branch: 'baghdad', salesperson: 'synthetic-agent-17' } }, { tenantId: snapshot.tenant.id, measureId: 'revenue', date: '2026-10-01', value: 999, dimensions: { branch: 'basra', salesperson: 'synthetic-agent-17' } }, { tenantId: snapshot.tenant.id, measureId: 'revenue', date: '2026-10-01', value: 888, dimensions: { branch: 'baghdad', salesperson: 'unassigned' } }]);
    const result = await new AuthorizedAnalyticsService(repository, new DefaultAuthorizationPolicy()).execute({ metric: 'revenue', groupBy: 'branch' }, after.context);
    assert.deepEqual(result.rows, [{ key: 'baghdad', value: 10 }]);
    assert.deepEqual(after.context.authorization.enforcedFilters, [{ dimension: 'branch', values: ['baghdad'] }, { dimension: 'salesperson', values: ['synthetic-agent-17', 'synthetic-agent-21'] }]);
});
