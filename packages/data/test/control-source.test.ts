import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSourceDefinition, validateControlMapping } from '@el-dabboos/domain';
import { SourceConnectionResolver, localSourceResolver } from '../../../apps/api/src/source-connections.ts';
import { parseRuntimeConfig } from '../../../apps/api/src/startup-config.ts';
const source = { sourceId: 'source-a',tenantId: 'tenant-a',type: 'odoo-postgres' as const,connectionRef: 'external-a',enabled: true,companyIds: ['1'] };
test('source scope and connection references reject credentials, duplicates and implicit scope', () => {
    validateSourceDefinition(source);
    for (const change of [{ companyIds: [] },{ companyIds: ['1','1'] },{ connectionRef: 'postgres://user:secret@host/db' },{ connectionRef: ' password ' },{ type: 'sql' }]) assert.throws(() => validateSourceDefinition({ ...source,...change } as typeof source));
    assert.throws(() => validateSourceDefinition({ ...source,password: 'secret' } as typeof source));
    const resolver = new SourceConnectionResolver(new Map([['external-a',{ host: '127.0.0.1',port: 1234,user: 'reader',password: 'external-secret',database: 'fixture' }]]));
    const first = resolver.resolve(source);
    first.password='changed';
    assert.equal(resolver.resolve(source).password,'external-secret');
    assert.throws(() => resolver.resolve({ ...source,connectionRef: 'unknown' }));
    assert.throws(() => resolver.resolve({ ...source,enabled: false }));
    assert.throws(() => localSourceResolver({},source));
    assert.ok(!JSON.stringify(source).includes('external-secret'));
});
test('mapping authoring accepts only governed recipe, measures and attribution', () => {
    const mapping = { mappingId: 'mapping',sourceId: 'source',tenantId: 'tenant',datasetId: 'dataset',version: 1,recipe: 'odoo-comparison-v1' as const,businessBasis: 'Approved header basis',reportingCurrency: 'IQD' as const,businessOwner: 'owner',measures: ['order_count' as const],dimensions: ['customer' as const] };
    validateControlMapping(mapping);
    assert.throws(() => validateControlMapping({ ...mapping,sql: 'SELECT 1' } as typeof mapping));
    assert.throws(() => validateControlMapping({ ...mapping,recipe: 'javascript' } as unknown as typeof mapping));
    assert.throws(() => validateControlMapping({ ...mapping,measures: ['order_count','order_count'] }));
});
test('postgres control configuration is independent and synthetic auth fails closed', () => {
    const defaults = { analyticsPath: '/tmp/demo.db',dashboardPath: '/tmp/dashboards.db' };
    const environment = { CONTROL_PROVIDER: 'postgres',CONTROL_DATABASE_URL: 'postgresql://control_app_login:fixture@localhost/control',ACCESS_IDENTITY_MODE: 'disabled' };
    assert.equal(parseRuntimeConfig(environment,defaults).controlProvider,'postgres');
    assert.throws(() => parseRuntimeConfig({ ...environment,ACCESS_IDENTITY_MODE: 'synthetic' },defaults));
    assert.throws(() => parseRuntimeConfig({ ...environment,CONTROL_MIGRATOR_URL: environment.CONTROL_DATABASE_URL },defaults));
    assert.throws(() => parseRuntimeConfig({ CONTROL_PROVIDER: 'postgres' },defaults));
});
