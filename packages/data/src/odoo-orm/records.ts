import {createHash} from 'node:crypto';
import type {OrmRow} from './client.ts';

export function ormTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(value)) throw new Error('Invalid Odoo ORM timestamp');
  const [seconds, fraction = ''] = value.split('.');
  if (!Number.isFinite(Date.parse(`${seconds!.replace(' ', 'T')}Z`))) throw new Error('Invalid Odoo ORM timestamp');
  return `${seconds}.${fraction.padEnd(6, '0')}`;
}
export function ormRecordHash(rows: readonly OrmRow[]): string {
  return createHash('sha256').update(JSON.stringify(rows, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value)).digest('hex');
}
