import assert from 'node:assert/strict';
import test from 'node:test';
import { governedPalettes } from '@el-dabboos/domain';
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
