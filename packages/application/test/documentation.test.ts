import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { widgetTypes } from '@el-dabbous/domain';
const root = fileURLToPath(new URL('../../../', import.meta.url));
function markdown(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? markdown(join(directory, entry.name)) : entry.name.endsWith('.md') ? [join(directory, entry.name)] : []);
}
test('documentation and root agent links resolve to existing local files', () => {
  for (const path of [join(root, 'AGENTS.md'), join(root, 'README.md'), ...markdown(join(root, 'docs')), ...markdown(join(root, '.agents/skills'))]) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
      const target = match[1]!.split('#')[0]!;
      if (!target || /^[a-z]+:/iu.test(target)) continue;
      assert.ok(existsSync(resolve(dirname(path), decodeURIComponent(target))), `${path}: missing ${target}`);
    }
  }
});
test('documented canonical visualization vocabulary matches domain', () => {
  const content = readFileSync(join(root, 'docs/architecture/visualization-capabilities.md'), 'utf8');
  const match = content.match(/<!-- widget-types: ([\w,]+) -->/u);
  assert.ok(match); assert.deepEqual(match[1]!.split(','), [...widgetTypes]);
});
test('stories, acceptance criteria and manual cases have stable unique IDs and required fields', () => {
  const stories = readFileSync(join(root, 'docs/product/user-stories.md'), 'utf8');
  const criteria = readFileSync(join(root, 'docs/product/acceptance-criteria.md'), 'utf8');
  const storyParts = stories.split(/^## (US-[A-Z]+-\d{3})$/mu).slice(1);
  const ids = new Set<string>();
  for (let i = 0; i < storyParts.length; i += 2) {
    const id = storyParts[i]!, body = storyParts[i + 1]!;
    assert.ok(!ids.has(id), `duplicate ${id}`); ids.add(id);
    for (const field of ['Title', 'Persona', 'Goal', 'Business value', 'Preconditions', 'Permissions', 'Main flow', 'Alternative flows', 'Failure/error flows', 'Acceptance criteria', 'Related human tests', 'Related automated tests or test area']) assert.ok(body.includes(`**${field}:**`), `${id}: ${field}`);
    assert.ok(criteria.includes(`## ${id.replace('US-', 'AC-')}`), `${id}: missing criteria`);
  }
  assert.ok(ids.size > 0);
  const cases = new Set<string>(); let smoke = 0;
  for (const path of markdown(join(root, 'docs/qa'))) {
    const parts = readFileSync(path, 'utf8').split(/^## (TC-[A-Z]+-\d{3})$/mu).slice(1);
    for (let i = 0; i < parts.length; i += 2) {
      const id = parts[i]!, body = parts[i + 1]!;
      assert.ok(!cases.has(id), `duplicate ${id}`); cases.add(id);
      if (id.startsWith('TC-SMOKE-')) smoke++;
      for (const field of ['ID', 'Title', 'Priority', 'Area', 'Persona', 'Tenant', 'Locale', 'Theme', 'Preconditions', 'Test data', 'Steps', 'Expected result', 'Cleanup', 'Automation coverage']) assert.ok(body.includes(`**${field}:**`), `${id}: ${field}`);
      assert.match(body, /\*\*Priority:\*\* P[012]/u);
    }
  }
  assert.ok(smoke >= 25 && smoke <= 35);
  for (const match of stories.matchAll(/\[(TC-[A-Z]+-\d{3})\]/gu)) assert.ok(cases.has(match[1]!), `missing human case ${match[1]}`);
});
