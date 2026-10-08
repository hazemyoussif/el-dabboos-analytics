import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeDatePresets } from '@el-dabboos/domain';
import { resolveRelativeDatePreset } from '../src/relative-date.ts';
test('all relative periods use exact inclusive tenant-local calendar semantics', () => {
  const expected = [ ['2026-10-18','2026-10-18'], ['2026-10-17','2026-10-17'], ['2026-10-01','2026-10-18'], ['2026-09-01','2026-09-30'], ['2026-09-19','2026-10-18'], ['2026-07-21','2026-10-18'], ['2026-10-01','2026-10-18'], ['2026-07-01','2026-09-30'], ['2026-01-01','2026-10-18'], ['2025-01-01','2025-12-31'], ['2026-05-01','2026-10-18'], ['2025-11-01','2026-10-18'] ];
  relativeDatePresets.forEach((preset, i) => assert.deepEqual(resolveRelativeDatePreset(preset, 'Asia/Baghdad', new Date('2026-10-17T22:00:00Z')), { from: expected[i]![0], to: expected[i]![1] }));
});
test('relative dates cross year, leap month, quarter and Cairo DST boundaries deterministically', () => {
  for (const [preset, zone, instant, from, to] of [
    ['previous_month','Asia/Baghdad','2027-01-15T00:00:00Z','2026-12-01','2026-12-31'],
    ['previous_month','Asia/Baghdad','2024-03-01T00:00:00Z','2024-02-01','2024-02-29'],
    ['previous_quarter','Asia/Baghdad','2027-01-01T00:00:00Z','2026-10-01','2026-12-31'],
    ['last_30_days','Asia/Baghdad','2027-01-01T00:00:00Z','2026-12-03','2027-01-01'],
    ['today','Africa/Cairo','2026-04-23T22:30:00Z','2026-04-24','2026-04-24'],
    ['today','Africa/Cairo','2026-04-24T21:30:00Z','2026-04-25','2026-04-25'],
    ['today','Africa/Cairo','2026-10-29T21:30:00Z','2026-10-29','2026-10-29'],
  ] as const) assert.deepEqual(resolveRelativeDatePreset(preset, zone, new Date(instant)), { from, to });
});
