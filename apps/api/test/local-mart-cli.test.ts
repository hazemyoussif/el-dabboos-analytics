import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('local infrastructure CLI redacts invalid connection credentials and fails without config',() => {
  const secret = randomBytes(32).toString('hex');
  const url = `postgresql://synthetic:${secret}@invalid.example/private`;
  for (const environment of [{},{ MART_RUNTIME_URL: url }]) {
    const result = spawnSync(process.execPath,['--experimental-transform-types','--disable-warning=ExperimentalWarning',fileURLToPath(new URL('../src/local-mart-cli.ts',import.meta.url)),'verify'],{ env: environment,encoding: 'utf8' });
    assert.equal(result.status,1); assert.equal(result.stdout,'');
    assert.match(result.stderr,/Local mart operation failed/);
    assert.ok(!result.stderr.includes(secret)); assert.ok(!result.stderr.includes(url));
  }
});
