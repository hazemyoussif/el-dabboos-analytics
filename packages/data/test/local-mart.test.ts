import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { localMartBootstrapConfig, localMartUrls, localMartLogins } from '../src/postgres/local-mart.ts';
function environment(): Record<string,string> {
  const config: Record<string,string> = {};
  for (const identity of ['ADMIN','MIGRATOR','INGESTOR','RUNTIME']) config[`MART_LOCAL_${identity}_PASSWORD`]=randomBytes(32).toString('hex');
  for (const [identity,login] of Object.entries(localMartLogins)) {
    const url = new URL(`postgresql://${login}@127.0.0.1:55437/el_dabboos_analytics`);
    url.password=config[`MART_LOCAL_${identity.toUpperCase()}_PASSWORD`]!;
    config[`MART_${identity.toUpperCase()}_URL`]=url.toString();
  }
  return config;
}
test('local mart configuration requires distinct isolated credentials and never exposes invalid values',() => {
  const config = environment();
  assert.equal(Object.keys(localMartUrls(config)).length,3);
  assert.ok(localMartBootstrapConfig(config).adminUrl);
  assert.throws(() => localMartBootstrapConfig({}),/configuration required/);
  assert.throws(() => localMartUrls({ ...config,MART_INGESTOR_URL: config.MART_RUNTIME_URL! }),/isolated local mart identity/);
  assert.throws(() => localMartBootstrapConfig({ ...config,MART_LOCAL_ADMIN_PASSWORD: config.MART_LOCAL_RUNTIME_PASSWORD! }),/Distinct/);
  const invalid = randomBytes(32).toString('hex');
  try { localMartUrls({ ...config,MART_RUNTIME_URL: invalid }); assert.fail('Expected invalid configuration'); }
  catch (error) { assert.ok(error instanceof Error); assert.ok(!error.message.includes(invalid)); }
});
test('persistent local mart cannot replace disposable storage, expose a public port or embed a password',() => {
  const persistent = readFileSync(new URL('../../../infra/postgres/compose.mart.yml',import.meta.url),'utf8');
  const disposable = readFileSync(new URL('../../../infra/postgres/compose.yml',import.meta.url),'utf8');
  assert.match(persistent,/127\.0\.0\.1:55437:5432/);
  assert.match(persistent,/dabboos_analytics_data:\/var\/lib\/postgresql/);
  assert.match(persistent,/postgres:18\.6/);
  assert.match(persistent,/POSTGRES_PASSWORD: \$\{MART_LOCAL_ADMIN_PASSWORD:\?/);
  assert.doesNotMatch(persistent,/tmpfs|foundation_test/);
  assert.match(disposable,/tmpfs/); assert.match(disposable,/127\.0\.0\.1:55436:5432/);
});
