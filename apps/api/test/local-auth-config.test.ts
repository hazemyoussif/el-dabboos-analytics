import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLocalAuthConfig } from '../src/auth/config.ts';
import { LoginAbuseGuard } from '../src/auth/abuse-guard.ts';
import { parseDeploymentConfig } from '../src/deployment-config.ts';
const config = { ACCESS_IDENTITY_MODE: 'local',CONTROL_PROVIDER: 'postgres',AUTH_BASE_URL: 'https://analytics.example.test',CORS_ORIGINS: 'https://analytics.example.test',AUTH_SECRET: 'isolated-test-secret-only-0000000000000000' };
test('local authentication requires an explicit secret, PostgreSQL, exact origin and HTTPS in shared mode', () => {
    assert.equal(parseLocalAuthConfig({ ...config,ENVIRONMENT: 'staging' })?.secure,true);
    for (const override of [{ AUTH_SECRET: undefined },{ AUTH_SECRET: 'private-secret' },{ CONTROL_PROVIDER: 'sqlite' },{ AUTH_BASE_URL: 'https://evil.example.test' },{ AUTH_BASE_URL: 'http://localhost:8088',CORS_ORIGINS: 'http://localhost:8088',ENVIRONMENT: 'staging' }]) {
        assert.throws(() => parseLocalAuthConfig({ ...config,...override }),error => error instanceof Error && !error.message.includes('private-secret'));
    }
    assert.equal(parseLocalAuthConfig({ ...config,ENVIRONMENT: 'development',AUTH_BASE_URL: 'http://localhost:8088',CORS_ORIGINS: 'http://localhost:8088' })?.secure,false);
    assert.throws(() => parseDeploymentConfig({ ENVIRONMENT: 'staging',ACCESS_IDENTITY_MODE: 'synthetic' }));
});
test('login abuse gate bounds account attempts, IP load, hashing concurrency and entry lifetime', () => {
    let clock = 0; const gate = new LoginAbuseGuard(() => clock);
    const releases = Array.from({ length: 4 },(_,index) => gate.enter('shared',`account-${index}`));
    assert.ok(releases.every(Boolean)); assert.equal(gate.enter('another','other'),null);
    for (const release of releases) { release?.(); release?.(); }
    for (let attempt=0; attempt<8; attempt++) { const release=gate.enter(`ip-${attempt}`,'target'); assert.ok(release); release(); }
    assert.equal(gate.enter('new-ip','target'),null);
    assert.equal(gate.enter('new-ip',' TARGET '),null);
    clock=60_001; assert.ok(gate.enter('new-ip','target'));
});
