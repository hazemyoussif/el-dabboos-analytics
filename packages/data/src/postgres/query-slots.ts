import type { PoolClient } from 'pg';
import { semanticCatalog,timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsQuery } from '@el-dabboos/domain';
import { periodKeys } from '../calendar.ts';
import {snapshotInput} from './snapshot-query.ts';
import { bind,dimensionSql } from './sql.ts';
export interface QuerySqlScope { params: unknown[]; scope: string; predicates: string; maxGroups: number; completeEventPeriods?:boolean; uniformSnapshotCutoff?:boolean; labelStrategy?:'latest_observed'; observeDataThrough?:(date:string|null)=>void }
export {querySlots} from './slot-plan.ts';
export type {QuerySlot} from './slot-plan.ts';
export async function selectQueryKeys(client: PoolClient,query: AnalyticsQuery,sql: QuerySqlScope): Promise<(string|null)[]> {
  const semantics = semanticCatalog[query.metric].semantics;
  const snapshot = semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot';
  const timeGrouping = !!query.groupBy && timeDimensions.includes(query.groupBy);
  let keys: (string|null)[];
  if (!query.groupBy) keys = [null];
  else if (usesCompletePeriods(snapshot,sql) && timeGrouping && query.dateRange) keys = periodKeys(query.dateRange,query.groupBy);
  else {
    const parameters = [...sql.params];
    const latest = snapshot && !timeGrouping;
    const cutoff = latest && query.dateRange ? `AND business_date<=${bind(parameters,query.dateRange.to)}::date` : '';
    const input = latest ? snapshotInput(sql,cutoff) : 'mart.canonical_facts';
    const range = !snapshot && query.dateRange ? `AND f.business_date BETWEEN ${bind(parameters,query.dateRange.from)}::date AND ${bind(parameters,query.dateRange.to)}::date` : '';
    const result = await client.query(`SELECT DISTINCT ${dimensionSql(query.groupBy)} AS key FROM ${input} f WHERE ${sql.scope} AND ${sql.predicates} ${range} AND ${dimensionSql(query.groupBy)} IS NOT NULL ORDER BY key LIMIT ${sql.maxGroups+1}`,parameters);
    keys = result.rows.map(row => String(row.key));
  }
  if (keys.length > sql.maxGroups) throw new Error('Grouping exceeds technical bound');
  keys.sort((left,right) => String(left).localeCompare(String(right)));

  return keys;
}
function usesCompletePeriods(snapshot:boolean,scope:QuerySqlScope) { return snapshot || scope.completeEventPeriods; }
