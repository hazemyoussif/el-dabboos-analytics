import { validDateRange } from '@el-dabboos/domain';
export interface OdooCursor { writeDate: string; id: string }
export function parseOdooCursor(token: string): OdooCursor {
  let cursor: unknown;
  try { cursor = JSON.parse(token); } catch { throw new Error('Invalid source cursor'); }
  if (!Array.isArray(cursor) || cursor.length!==2 || typeof cursor[0]!=='string' || typeof cursor[1]!=='string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(cursor[0]) || !/^[1-9]\d*$/.test(cursor[1])) throw new Error('Invalid source cursor');
  if (!validDateRange({ from: cursor[0].slice(0,10),to: cursor[0].slice(0,10) })) throw new Error('Invalid source cursor date');
  return { writeDate: cursor[0],id: cursor[1] };
}
export const odooCursor = (writeDate: string,id: string): string => JSON.stringify([writeDate,id]);
/** PostgreSQL/Odoo timestamps are UTC without timezone; microseconds provide monotonic version order. */
export function odooRevision(writeDate: string): string {
  parseOdooCursor(odooCursor(writeDate,'1'));
  const milliseconds = Date.parse(writeDate.slice(0,19).replace(' ','T')+'Z');
  if (!Number.isFinite(milliseconds) || milliseconds<0) throw new Error('Invalid source revision');
  return String(BigInt(milliseconds)*1000n+BigInt(writeDate.slice(20)));
}
export function sourceTimestamp(writeDate: string): string {
  odooRevision(writeDate);
  return writeDate.slice(0,19).replace(' ','T')+'.'+writeDate.slice(20,23)+'Z';
}
