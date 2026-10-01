import assert from 'node:assert/strict';
import test from 'node:test';
import { structuredOutputPreview } from '../src/structured-diagnostics.ts';

test('structured output preview redacts free text and truncates large returned objects', () => {
  const output = { widgets: Array.from({ length: 30 }, (_, index) => ({ id: `widget${index}`,
    title: { en: 'private prompt and provider secret', ar: 'نص خاص' },
    series: Array.from({ length: 20 }, (_, series) => ({ id: `series${series}`, metric: 'revenue' })) })),
    authorization: 'Bearer credential', prompt: 'private prompt' };
  const preview = structuredOutputPreview(output);
  assert.ok(preview.length < 4200);
  assert.ok(preview.endsWith('...[truncated]'));
  assert.ok(!preview.includes('private prompt'));
  assert.ok(!preview.includes('Bearer credential'));
  assert.ok(!preview.includes('authorization'));
});
