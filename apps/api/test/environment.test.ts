import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { startupSummary } from '../src/startup-config.ts';

test('actual dev/start scripts load optional root files with shell > local > base precedence', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const root = mkdtempSync(join(tmpdir(), 'analytics-env-'));
  const cwd = join(root, 'apps/api'); mkdirSync(cwd, { recursive: true });
  try {
    for (const script of [pkg.scripts.dev, pkg.scripts.start]) {
      const flags = script.split(' ').filter((word: string) => word.startsWith('--env-file'));
      assert.equal(flags.length, 2);
      const run = (env: Record<string, string> = {}) => {
        const child = spawnSync(process.execPath, [...flags, '-e', 'process.stdout.write(process.env.ENV_TEST_VALUE ?? "default")'], { cwd, env, encoding: 'utf8' });
        assert.equal(child.status, 0, child.stderr); return child.stdout;
      };
      rmSync(join(root, '.env'), { force: true }); rmSync(join(root, '.env.local'), { force: true });
      assert.equal(run(), 'default');
      writeFileSync(join(root, '.env'), 'ENV_TEST_VALUE=base\n'); assert.equal(run(), 'base');
      writeFileSync(join(root, '.env.local'), 'ENV_TEST_VALUE=local\n'); assert.equal(run(), 'local');
      assert.equal(run({ ENV_TEST_VALUE: 'shell' }), 'shell');
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('startup summary drops credentials, query, fragment and API key even in allowed fields', () => {
  const summary = startupSummary({ analyticsProvider: 'mock', dashboardPath: 'dashboards.db', plannerMode: 'structured',
    modelId: 'model-secret-key', baseUrl: 'https://user:password@example.com/v1?token=secret-key#private', diagnostics: false, port: 3001 }, 'secret-key');
  for (const secret of ['user', 'password', 'secret-key', 'token=', 'private', 'Authorization']) assert.ok(!summary.includes(secret));
  assert.ok(summary.includes('https://example.com/v1'));
  assert.ok(summary.includes('[redacted]'));
});
