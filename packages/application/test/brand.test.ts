import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const extensions = new Set(['.ts', '.tsx', '.json', '.md', '.css', '.html', '.yaml', '.yml', '.sql']);
const excluded = new Set(['node_modules', 'dist', 'coverage', '.git', 'build']);
function projectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? projectFiles(path) : extensions.has(extname(entry.name)) ? [path] : [];
  });
}
const oldSlug = 'el-' + 'dabbous';
const forbidden = new RegExp(['El-' + 'Dabbous', 'El ' + 'Dabbous', 'EL-' + 'DABBOUS', 'EL ' + 'DABBOUS', oldSlug].join('|'), 'g');
const legacyLine = /^ {2}(theme|sidebar|locale|tenant|demoUser): '([^']+)', \/\/ Legacy browser preference: backward compatibility only\.$/;
const legacySuffixes = new Set(['ui-theme', 'sidebar-collapsed', 'ui-locale', 'last-tenant', 'demo-user']);
test('project-controlled source and docs use canonical brand; only five explicit browser migration constants are exempt', () => {
  const failures: string[] = []; let exemptions = 0;
  const githubFiles = existsSync(join(root, '.github')) ? projectFiles(join(root, '.github')) : [];
  const files = [...projectFiles(join(root, 'apps')), ...projectFiles(join(root, 'packages')), ...projectFiles(join(root, 'docs')), ...projectFiles(join(root, '.agents')), ...githubFiles, ...readdirSync(root).filter(name => extensions.has(extname(name))).map(name => join(root, name))];
  for (const file of files) readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (!line.match(forbidden)) return;
    const match = line.match(legacyLine);
    if (relative(root, file) === 'apps/web/src/presentation/preference-storage.ts' && match && legacySuffixes.has(match[2]!.replace(`${oldSlug}.`, '')) && match[2]!.startsWith(`${oldSlug}.`)) { exemptions++; return; }
    failures.push(`${relative(root, file)}:${index + 1}: ${line.trim()}`);
  });
  assert.deepEqual(failures, [], `Noncanonical project branding:\n${failures.join('\n')}`); assert.equal(exemptions, 5);
});
test('all workspace package names, dependencies, filters, bundling and lockfile references use the canonical scope', () => {
  const scope = '@el-dabboos/'; const packages = ['domain', 'application', 'data', 'api', 'web'];
  const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(rootPackage.name, 'el-dabboos-analytics');
  for (const name of packages) {
    const pkg = JSON.parse(readFileSync(join(root, `${['api', 'web'].includes(name) ? 'apps' : 'packages'}/${name}/package.json`), 'utf8'));
    assert.equal(pkg.name, `${scope}${name}`);
    for (const key of Object.keys(pkg.dependencies ?? {})) if (key.startsWith('@el-')) assert.ok(packages.includes(key.slice(scope.length)) && key.startsWith(scope), key);
  }
  assert.ok(rootPackage.scripts.typecheck.includes(`${scope}web`)); assert.ok(rootPackage.scripts.build.includes(`${scope}api`)); assert.ok(rootPackage.scripts.build.includes(`${scope}web`));
  assert.ok(JSON.parse(readFileSync(join(root, 'apps/api/package.json'), 'utf8')).scripts.build.includes(`--external:${scope}*`));
  const lock = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'); assert.ok(!lock.includes(oldSlug));
  for (const name of ['domain', 'application', 'data']) assert.ok(lock.includes(`${scope}${name}`));
});
