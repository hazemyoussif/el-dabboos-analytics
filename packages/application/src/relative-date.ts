import type { DateRange, RelativeDatePreset } from '@el-dabboos/domain';

/** Tenant-local calendar dates; UTC arithmetic below operates on calendar labels, not instants. */
export function resolveRelativeDatePreset(preset: RelativeDatePreset, timeZone: string, now: Date): DateRange {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => Number(parts.find(item => item.type === name)!.value);
  const year = part('year'), month = part('month') - 1, day = part('day');
  const date = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  const today = date(year, month, day);
  const quarter = Math.floor(month / 3) * 3;
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'yesterday': return { from: date(year, month, day - 1), to: date(year, month, day - 1) };
    case 'current_month': return { from: date(year, month, 1), to: today };
    case 'previous_month': return { from: date(year, month - 1, 1), to: date(year, month, 0) };
    case 'last_30_days': return { from: date(year, month, day - 29), to: today };
    case 'last_90_days': return { from: date(year, month, day - 89), to: today };
    case 'current_quarter': return { from: date(year, quarter, 1), to: today };
    case 'previous_quarter': return { from: date(year, quarter - 3, 1), to: date(year, quarter, 0) };
    case 'current_year': return { from: date(year, 0, 1), to: today };
    case 'previous_year': return { from: date(year - 1, 0, 1), to: date(year - 1, 11, 31) };
    case 'last_6_months': return { from: date(year, month - 5, 1), to: today };
    case 'last_12_months': return { from: date(year, month - 11, 1), to: today };
    default: throw new Error('Unknown relative date preset');
  }
}
