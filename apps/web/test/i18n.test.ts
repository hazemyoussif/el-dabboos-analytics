import assert from 'node:assert/strict';
import test from 'node:test';
import { formatKey, formatValue } from '../src/i18n.ts';
test('Arabic formats values and labels with Arabic numerals while IDs remain stable', () => {
  assert.match(formatValue(1234, 'number', 'ar'), /[٠-٩]/u);
  assert.match(formatKey('2026-01', 'month', 'ar'), /[٠-٩]/u);
  assert.equal(formatKey('cairo', 'branch', 'ar'), 'القاهرة');
  assert.equal(formatKey('cairo', 'branch', 'en'), 'Cairo');
});
