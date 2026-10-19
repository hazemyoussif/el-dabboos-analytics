import type { ComparisonPeriod, DateRange, DimensionId } from '@el-dabboos/domain';

const date = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const iso = (value: Date): string => value.toISOString().slice(0, 10);
const lastDay = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();
export function addDays(value: string, days: number): string {
  const d = date(value);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
/** Clamp days in shorter months; a range endpoint at month-end remains at month-end. */
export function shiftMonths(value: string, months: number, preserveMonthEnd = false): string {
  const d = date(value);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const target = year * 12 + month - 1 + months;
  const targetYear = Math.floor(target / 12);
  const targetMonth = ((target % 12) + 12) % 12 + 1;
  const end = lastDay(targetYear, targetMonth);
  const targetDay = preserveMonthEnd && day === lastDay(year, month) ? end : Math.min(day, end);
  return iso(new Date(Date.UTC(targetYear, targetMonth - 1, targetDay)));
}
export function shiftRange(range: DateRange, period: ComparisonPeriod): DateRange {
  if (period === 'previous_period') {
    const days = Math.round((date(range.to).getTime() - date(range.from).getTime()) / 86400000) + 1;
    return { from: addDays(range.from, -days), to: addDays(range.to, -days) };
  }
  const months = period === 'month_over_month' ? -1 : -12;
  return { from: shiftMonths(range.from, months), to: shiftMonths(range.to, months, true) };
}
export function timeKey(value: string, dimension: DimensionId): string {
  if (dimension === 'date') return value;
  if(dimension==='week')return addDays(value,-((date(value).getUTCDay()+1)%7));
  if (dimension === 'month') return value.slice(0, 7);
  if (dimension === 'year') return value.slice(0, 4);
  if (dimension === 'quarter') return `${value.slice(0, 4)}-Q${Math.floor((Number(value.slice(5, 7)) - 1) / 3) + 1}`;
  throw new Error('Not a time dimension');
}
export function periodRange(key: string, dimension: DimensionId): DateRange {
  if (dimension === 'date') return { from: key, to: key };
  if(dimension==='week')return {from:key,to:addDays(key,6)};
  if (dimension === 'month') {
    const from = `${key}-01`;
    const d = date(from);
    return { from, to: `${key}-${String(lastDay(d.getUTCFullYear(), d.getUTCMonth() + 1)).padStart(2, '0')}` };
  }
  if (dimension === 'quarter') {
    const [yearText, quarterText] = key.split('-Q');
    const year = Number(yearText);
    const quarter = Number(quarterText);
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return { from: `${year}-${String(startMonth).padStart(2, '0')}-01`, to: `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay(year, endMonth)).padStart(2, '0')}` };
  }
  if (dimension === 'year') return { from: `${key}-01-01`, to: `${key}-12-31` };
  throw new Error('Not a time dimension');
}
export function previousTimeKey(key: string, dimension: DimensionId, comparison: ComparisonPeriod): string {
  if(dimension==='week')return timeKey(comparison==='previous_period'?addDays(key,-7):shiftMonths(key,comparison==='month_over_month'?-1:-12),'week');
  if (dimension === 'date') return comparison === 'previous_period' ? addDays(key, -1) : shiftMonths(key, comparison === 'month_over_month' ? -1 : -12);
  if (dimension === 'month') return shiftMonths(`${key}-01`, comparison === 'year_over_year' ? -12 : -1).slice(0, 7);
  if (dimension === 'quarter') {
    const year = Number(key.slice(0, 4));
    const quarter = Number(key.slice(6));
    if (comparison === 'year_over_year') return `${year - 1}-Q${quarter}`;
    return quarter === 1 ? `${year - 1}-Q4` : `${year}-Q${quarter - 1}`;
  }
  if (dimension === 'year') return String(Number(key) - 1);
  throw new Error('Not a time dimension');
}
/** Enumerate complete calendar buckets intersecting a range, including buckets without new facts. */
export function periodKeys(range: DateRange, dimension: DimensionId): string[] {
  const keys: string[] = [];
  let cursor = periodRange(timeKey(range.from, dimension), dimension).from;
  while (cursor <= range.to) {
    if (keys.length >= 5000) throw new Error('Too many time periods');
    keys.push(timeKey(cursor, dimension));
    cursor = dimension === 'week'?addDays(cursor,7):dimension === 'date' ? addDays(cursor, 1) : shiftMonths(cursor, dimension === 'month' ? 1 : dimension === 'quarter' ? 3 : 12);
  }
  return keys;
}

/** ISO month-end calculation shared by source preparation and serving metadata. */
export function monthEnd(month:string){const date=new Date(`${month}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+1);date.setUTCDate(0);return date.toISOString().slice(0,10);}
