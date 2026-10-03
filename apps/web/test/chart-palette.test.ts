import assert from 'node:assert/strict';
import test from 'node:test';
import { governedPalettes } from '@el-dabboos/domain';
import { paletteLabels } from '../src/i18n.ts';
import { chartTheme, seriesColor, withGovernedPalette } from '../src/rendering/chart-theme.ts';
function luminance(hex: string): number {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
const contrast = (left: string, right: string) => { const a = luminance(left); const b = luminance(right); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
for (const mode of ['light', 'dark'] as const) test(`${mode} governed palettes remain bounded, deterministic and contrast-aware`, () => {
  const base = chartTheme(mode); const before = structuredClone(base);
  assert.equal(withGovernedPalette(base), base); assert.equal(withGovernedPalette(base, 'default'), base);
  for (const palette of governedPalettes) {
    const resolved = withGovernedPalette(base, palette);
    assert.deepEqual(resolved, withGovernedPalette(base, palette)); assert.equal(resolved.axis, base.axis); assert.equal(resolved.tooltip, base.tooltip); assert.equal(resolved.negative, base.negative);
    assert.equal(resolved.categorical.length, 8);
    assert.equal(new Set(resolved.categorical).size, 8);
    assert.equal(new Set(Array.from({ length: 8 }, (_, index) => seriesColor(resolved, index))).size, 8);
    assert.notEqual(seriesColor(resolved, 4), seriesColor(resolved, 0));
    assert.equal(resolved.sequential, base.sequential);
    for (let index = 0; index < resolved.categorical.length; index++) {
      const color = seriesColor(resolved, index); assert.match(color, /^#[0-9a-f]{6}$/u);
      assert.ok(contrast(color, base.tooltip) >= 3, `${palette} ${color} graphic contrast`);
      assert.ok(contrast(color, base.onMark) >= 4.5, `${palette} ${color} label contrast`);
      assert.equal(seriesColor(resolved, index + resolved.categorical.length), color);
    }
  }
  assert.deepEqual(base, before);
});
test('named palettes have distinct Light and Dark colors and retain series identity for comparison styling', () => {
  for (const palette of governedPalettes) assert.notDeepEqual(withGovernedPalette(chartTheme('light'), palette).categorical, withGovernedPalette(chartTheme('dark'), palette).categorical);
});

test('default categorical, sequential and semantic colors match Palette V2 exactly', () => {
  const light = chartTheme('light'); const dark = chartTheme('dark');
  assert.deepEqual(light.categorical, ['#087f72','#355fa8','#8056a6','#9a641b','#b14568','#2f7890','#657a2d','#9a4c3c']);
  assert.deepEqual(dark.categorical, ['#50c7b5','#7ca4e8','#bd98dc','#ddb263','#e58ca4','#72bfd2','#b2c779','#d89a82']);
  assert.deepEqual(light.sequential, ['#d9eee9','#aed9cf','#76bfb0','#3e9f8e','#157f72','#065c54']);
  assert.deepEqual(dark.sequential, ['#24433f','#2d5a51','#347266','#3d917e','#49b49b','#63d1b7']);
  assert.deepEqual([light.positive, light.negative, light.warning, light.neutral], ['#2e7d32','#b4233d','#9a6200','#63758b']);
  assert.deepEqual([dark.positive, dark.negative, dark.warning, dark.neutral], ['#78c982','#ef8b99','#e2b35e','#a0b0c4']);
  for (const theme of [light, dark]) assert.notEqual(theme.positive, theme.categorical[0]);
});
test('named categorical themes retain the specified accent-first ordering in both modes', () => {
  const orders = { blue: [1,0,3,2,4,6,7,5], green: [6,0,1,3,2,4,5,7], orange: [3,7,0,1,2,4,5,6], purple: [2,0,3,1,4,6,5,7], red: [4,7,0,1,3,2,5,6], neutral: [8,1,0,3,2,4,6,7] } as const;
  for (const mode of ['light', 'dark'] as const) {
    const base = chartTheme(mode); const core = [...base.categorical, mode === 'light' ? '#656876' : '#b6bbc3'];
    for (const palette of Object.keys(orders) as (keyof typeof orders)[]) assert.deepEqual(withGovernedPalette(base, palette).categorical, orders[palette].map(index => core[index]));
  }
});
test('persisted palette vocabulary and localized aesthetic labels remain governed', () => {
  assert.deepEqual(governedPalettes, ['default','blue','green','orange','purple','red','neutral']);
  assert.deepEqual(governedPalettes.map(token => paletteLabels.en[token]), ['Enterprise','Ocean','Forest','Amber','Plum','Rose','Slate']);
  assert.deepEqual(governedPalettes.map(token => paletteLabels.ar[token]), ['مؤسسية','محيط','غابة','كهرمان','برقوق','ورد','أردواز']);
});

test('widget omission inherits dashboard while explicit Enterprise and named overrides stay independent', async () => {
  const { resolveGovernedPalette } = await import('../src/rendering/chart-theme.ts');
  assert.equal(resolveGovernedPalette(), 'default');
  assert.equal(resolveGovernedPalette(undefined, 'blue'), 'blue');
  assert.equal(resolveGovernedPalette('default', 'blue'), 'default');
  assert.equal(resolveGovernedPalette('red', 'blue'), 'red');
  assert.equal(resolveGovernedPalette(undefined, 'green'), 'green');
});
