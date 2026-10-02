import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copy } from '../src/i18n.ts';
test('official RGBA assets retain their original bytes and dimensions; favicon uses the mark', () => {
  for (const [name, width, height, hash] of [
    ['mark', 692, 518, '2d59d94e6dc387883aae7218c32499190c9cdfd5daf196c11efbe392df2bdfe3'],
    ['corporate-logo', 1709, 532, '1f7c39556fd2fd6ccf09e9cc2afc94d3e6926d58c73fb65315bc11f685e9cf9e'],
  ] as const) {
    const png = readFileSync(new URL(`../public/brand/el-dabboos-${name}.png`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height); assert.equal(png[25], 6);
    assert.equal(createHash('sha256').update(png).digest('hex'), hash);
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /rel="icon" type="image\/png" href="\/brand\/el-dabboos-mark.png"/);
  assert.ok(html.includes('<title>El Dabboos | Analytics Studio</title>'));
  assert.equal(copy.en.product, 'El Dabboos'); assert.equal(copy.ar.product, 'El Dabboos');
});
