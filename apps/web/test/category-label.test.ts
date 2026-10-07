import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { compactCategoryLabel } from '../src/rendering/category-label.ts';
test('category ellipsis retains graphemes and never mutates full labels', () => {
  assert.equal(compactCategoryLabel('Short'), 'Short');
  assert.equal(compactCategoryLabel('abcdefghijk', 6), 'abcde…');
  assert.equal(compactCategoryLabel('مُحَمَّد عبدالله عبد الرحمن', 5), 'مُحَمَّد…');
  assert.equal(compactCategoryLabel('👨‍👩‍👧‍👦abcdef', 4), '👨‍👩‍👧‍👦ab…');
});
test('shared ticks retain complete EN/AR names for focus and render single-line text in both themes', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../',import.meta.url)),server: { middlewareMode: true },appType: 'custom' });
  try {
    const { CategoryAxisTick } = await server.ssrLoadModule('/src/rendering/CategoryAxisTick.tsx');
    for (const locale of ['en','ar']) for (const fill of ['#435563','#b5c4cb']) for (const horizontal of [true,false]) {
      const label = locale === 'ar' ? 'محمد عبدالله عبد الرحمن اسم طويل' : 'Very long salesperson display name';
      const html = renderToStaticMarkup(createElement(CategoryAxisTick,{ payload: { value: label },locale,fill,horizontal }));
      assert.ok(html.includes(`<title>${label}</title>`));
      assert.ok(html.includes(`aria-label="${label}"`));
      assert.ok(html.includes('tabindex="0"')); assert.ok(html.includes('…'));
      assert.ok(!html.includes('tspan'));
    }
  } finally { await server.close(); }
});
