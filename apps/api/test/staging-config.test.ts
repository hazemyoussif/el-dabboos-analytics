import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDeploymentConfig,parseCorsOrigins } from '../src/deployment-config.ts';
import { correlationId } from '../src/operational-logging.ts';
import { stagingConnectionUrls,stagingAdminUrl } from '../src/staging-config.ts';
import { stagingIdentities } from '../../../packages/data/src/staging/roles.ts';
const shared = { ENVIRONMENT: 'staging',CONTROL_PROVIDER: 'postgres',ANALYTICS_PROVIDER: 'postgres',CONTROL_DATABASE_URL: 'postgres://staging_control_app_login:placeholder@localhost/el_dabboos_control_staging',MART_RUNTIME_URL: 'postgres://staging_mart_runtime_login:placeholder@localhost/el_dabboos_analytics_staging',CORS_ORIGINS: 'https://analytics.example.test' };
test('shared deployment rejects synthetic identities, wrong DBs and nonexact CORS', () => {
    assert.equal(parseDeploymentConfig(shared).identityMode,'disabled');
    for (const change of [{ ACCESS_IDENTITY_MODE: 'synthetic' },{ CONTROL_PROVIDER: 'sqlite' },{ MART_RUNTIME_URL: 'postgres://localhost/el_dabboos_analytics' },{ CORS_ORIGINS: '*' },{ CONTROL_DATABASE_URL: undefined },{ MART_RUNTIME_URL: undefined }]) assert.throws(() => parseDeploymentConfig({ ...shared,...change }));
    for (const origin of ['https://example.test/path','https://user:secret@example.test','http://example.test','https://example.test/','https://example.test,https://example.test']) assert.throws(() => parseCorsOrigins(origin));
    assert.deepEqual(parseCorsOrigins('http://localhost:8088,https://example.test'),['http://localhost:8088','https://example.test']);
    assert.throws(() => parseDeploymentConfig({ API_HOST: '0.0.0.0',ACCESS_IDENTITY_MODE: 'synthetic' }));
});
test('request correlation accepts only bounded opaque identifiers', () => {
    assert.equal(correlationId('review_123'),'review_123');
    for (const value of ['bad\nheader','a'.repeat(65),['multi'],undefined,'']) assert.match(correlationId(value),/^[a-f0-9-]{36}$/);
});
test('operator connections require distinct staging credentials and one approved endpoint', () => {
    const keys = ['CONTROL_MIGRATOR_URL','CONTROL_DATABASE_URL','MART_MIGRATOR_URL','MART_INGESTOR_URL','MART_RUNTIME_URL'];
    const environment = Object.fromEntries(Object.values(stagingIdentities).map((identity,index) => [keys[index],`postgres://${identity.login}:test-${index}@localhost:5432/${identity.database}`]));
    const urls = stagingConnectionUrls(environment);
    assert.equal(Object.keys(urls).length,5);
    assert.throws(() => stagingConnectionUrls({ ...environment,MART_RUNTIME_URL: environment.MART_RUNTIME_URL.replace('localhost','other') }));
    assert.throws(() => stagingConnectionUrls({ ...environment,MART_RUNTIME_URL: environment.MART_RUNTIME_URL.replace('test-4','test-0') }));
    assert.throws(() => stagingAdminUrl('postgres://admin:secret@other/postgres',urls.controlMigrator));
});

test('configuration errors do not emit supplied credential values', () => {
    for (const change of [{ CONTROL_DATABASE_URL: 'postgres://wrong:private-secret@localhost/el_dabboos_control_staging' },{ CORS_ORIGINS: 'https://user:private-secret@example.test' }]) {
        try { parseDeploymentConfig({ ...shared,...change }); assert.fail('Expected configuration refusal'); }
        catch (error) { assert.ok(error instanceof Error); assert.ok(!error.message.includes('private-secret')); }
    }
});
