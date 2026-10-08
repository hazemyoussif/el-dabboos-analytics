import { categoricalDimensions, timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsFilter, DimensionId } from '@el-dabboos/domain';
/** Identifiers and functions come exclusively from the governed closed vocabulary. */
export function dimensionSql(d: DimensionId, alias = 'f'): string {
  if (categoricalDimensions.includes(d)) return `${alias}.${d}`;
  const formats = { date: 'YYYY-MM-DD', month: 'YYYY-MM', quarter: 'YYYY-"Q"Q', year: 'YYYY' };
  if (!timeDimensions.includes(d)) throw new Error('Unsupported SQL dimension');
  return `to_char(${alias}.business_date,'${formats[d as keyof typeof formats]}')`;
}
export function bind(values: unknown[], value: unknown): string { values.push(value); return `$${values.length}`; }
export function filterSql(filters: readonly AnalyticsFilter[], values: unknown[], certified: readonly DimensionId[], alias = 'f'): string {
  if (filters.length > 32) throw new Error('Too many filters');
  return filters.map(f => {
    if (!certified.includes(f.dimension) || !Array.isArray(f.values) || f.values.length > 1000 || f.values.some(v => typeof v !== 'string' || !v.trim() || v.length > 200)) throw new Error('Uncertified filter dimension/values');
    return `${dimensionSql(f.dimension,alias)} = ANY(${bind(values,f.values)}::text[])`;
  }).join(' AND ') || 'true';
}
/** Lossless roundtrip at the meaningful decimal scale, with at most six fractional places. */
export function numericOutput(raw: string | null): number | null {
  if (raw === null) return null;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid SQL numeric output');
  const n = Number(raw);
  const [whole, fraction = ''] = raw.split('.');
  const tail = fraction.slice(6);
  if (/[^0]/.test(tail)) throw new Error('Numeric output exceeds six-decimal execution boundary');
  // Trailing zeroes do not increase the decimal's mathematical precision.
  // Use its significant decimal places, not the storage column's fixed scale.
  const significant = fraction.slice(0,6).replace(/0+$/, '');
  const units = BigInt(`${whole}${significant}`);
  const scaledSafe=units<=BigInt(Number.MAX_SAFE_INTEGER) && units>=-BigInt(Number.MAX_SAFE_INTEGER);
  const normalized = significant ? `${whole}.${significant}` : whole;
  if (!Number.isFinite(n) || !scaledSafe || n.toFixed(significant.length) !== normalized) throw new Error('Unsafe SQL numeric output');
  return n;
}
