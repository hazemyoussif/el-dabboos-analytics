import type { AnalyticsCursor } from '@el-dabboos/domain';

/** Inclusive overlap is discovery-only. A page cursor orders ties after discovery starts. */
export function odooIncrementalWindow(cursor: AnalyticsCursor | null, cutoff: string, overlapSeconds = 120) {
  const upper = Date.parse(cutoff);
  if (!Number.isFinite(upper) || !Number.isInteger(overlapSeconds) || overlapSeconds < 1 || overlapSeconds > 86400) throw new Error('Invalid incremental cutoff/overlap');
  const previous = cursor ? Date.parse(cursor.cutoff) : 0;
  if (!Number.isFinite(previous) || previous > upper) throw new Error('Source cutoff cannot regress');
  const lower = Math.max(0, previous - overlapSeconds * 1000);
  const timestamp = new Date(lower).toISOString().replace('T',' ').replace('Z','000');
  return { modificationFrom: timestamp, sourceCutoff: cutoff, overlapSeconds };
}
