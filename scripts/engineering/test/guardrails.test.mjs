import { baselineSourceCommit, baselineProvenanceDiagnostics } from '../baseline-policy.mjs';
import { changedArtifactDiagnostics } from '../diff.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { measure, debt, compare } from '../metrics.mjs';
import { checkImports } from '../architecture.mjs';
test('historical ceiling refuses growth and new debt, and requires removal of resolved entries', () => {
  const original = [{ file: 'old.ts', symbol: 'old', complexity: 20 }];
  const baseline = debt(original);
  assert.deepEqual(compare(original, baseline), []);
  assert.equal(compare([{ ...original[0], complexity: 21 }], baseline).length, 1);
  assert.equal(compare([{ file: 'new.ts', symbol: 'new', complexity: 20 }], baseline).length, 2);
  assert.match(compare([{ ...original[0], complexity: 3 }], baseline)[0], /Remove resolved/);
});
test('named methods stay stable across line movement and density is counted from statements', () => {
  const source = 'class CustomerOperations { update(customer) { const result = customer; return result; } }';
  assert.deepEqual(measure('file.ts', source), measure('file.ts', '\n\n' + source));
  assert.ok(measure('file.ts', source).some(record => record.symbol === 'CustomerOperations/update' && record.statements === 2));
  assert.ok(debt(measure('file.ts', 'function authorize(a) { return a; }')).some(entry => entry.metric === 'shortNames'));
});
test('relative imports, reexports, dynamic imports and type imports obey resolved boundaries', () => {
  const resolve = () => 'packages/data/src/index.ts';
  for (const source of ["import { store } from '../../data/src/index.ts'", "export * from '../../data/src/index.ts'", "import('../../data/src/index.ts')", "type Store = import('../../data/src/index.ts').Store"]) {
    assert.equal(checkImports('packages/domain/src/test.ts', source, resolve).length, 1);
  }
  assert.equal(checkImports('packages/domain/src/test.ts', 'import(variable)', resolve).length, 1);
  assert.equal(checkImports('apps/web/src/test.ts', "import 'node:sqlite'", () => undefined).length, 1);
  assert.equal(checkImports('packages/data/src/test.ts', "import '@el-dabboos/domain'", () => 'packages/domain/src/index.ts').length, 0);
  assert.equal(checkImports('packages/domain/src/test.ts', "import './missing.ts'", () => undefined).length, 1);
});

test('diff guard rejects credential artifacts and permits documented environment examples', () => {
  assert.deepEqual(changedArtifactDiagnostics(['.env.example', 'apps/api/example.ts']), []);
  assert.equal(changedArtifactDiagnostics(['.env.local', 'apps/api/server.key', 'credentials.pem']).length, 3);
});

test('baseline cannot grandfather feature files, grow ceilings or use a different historical source', () => {
  const entry = { file: 'historical.ts', symbol: 'existing', metric: 'complexity', ceiling: 20 };
  assert.deepEqual(baselineProvenanceDiagnostics({ sourceCommit: baselineSourceCommit, entries: [entry] }, [entry]), []);
  assert.equal(baselineProvenanceDiagnostics({ sourceCommit: baselineSourceCommit, entries: [{ ...entry, file: 'administration.ts' }] }, [entry]).length, 1);
  assert.equal(baselineProvenanceDiagnostics({ sourceCommit: baselineSourceCommit, entries: [{ ...entry, ceiling: 21 }] }, [entry]).length, 1);
  assert.equal(baselineProvenanceDiagnostics({ sourceCommit: 'current', entries: [entry] }, [entry]).length, 1);
});

test('overload signatures cannot conceal the implementation from quality analysis', () => {
  const records = measure('file.ts', 'function authorize(actor: string): void; function authorize(actor: string) { if(actor) { return; } }');
  assert.ok(records.some(record => record.symbol === 'authorize' && record.complexity === 2));
});

test('real resolver follows relative modules and workspace package exports', async () => {
  const { mkdtemp, mkdir, writeFile, symlink, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { resolver } = await import('../architecture.mjs');
  const root = await mkdtemp(path.join(tmpdir(), 'dabboos-architecture-'));
  try {
    await mkdir(path.join(root, 'packages/data/src'), { recursive: true });
    await mkdir(path.join(root, 'packages/domain/src'), { recursive: true });
    await mkdir(path.join(root, 'node_modules/@el-dabboos'), { recursive: true });
    await writeFile(path.join(root, 'packages/data/src/index.ts'), 'export const database = true;');
    await writeFile(path.join(root, 'packages/data/package.json'), JSON.stringify({ name: '@el-dabboos/data', type: 'module', exports: { '.': './src/index.ts' } }));
    await symlink(path.join(root, 'packages/data'), path.join(root, 'node_modules/@el-dabboos/data'));
    for (const source of ["import '../../data/src/index.ts'", "export * from '@el-dabboos/data'", "import('@el-dabboos/data')"]) {
      assert.match(checkImports('packages/domain/src/index.ts', source, resolver(root))[0], /forbidden dependency/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
