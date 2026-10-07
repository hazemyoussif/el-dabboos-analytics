import type { PoolClient } from 'pg';
import type { AnalyticsQuery,Locale } from '@el-dabboos/domain';
import type { QuerySqlScope } from './query-slots.ts';
import { bind,dimensionSql } from './sql.ts';
/** Labels are evidence, never identity. Return only unambiguous labels for the authorized result keys. */
export async function queryDimensionLabels(client:PoolClient,query:AnalyticsQuery,scope:QuerySqlScope,keys:(string|null)[],locale:Locale):Promise<Record<string,string>> {
 const field=dimensionLabelField(query.groupBy);
 if(!field || !query.groupBy || !keys.length)return {};
 const parameters=[...scope.params];
 const identity=dimensionSql(query.groupBy);
 const keyParameter=bind(parameters,keys.filter(key=>key!==null));
 const labelParameter=bind(parameters,field);
 const from=query.dateRange?`AND f.business_date>=${bind(parameters,query.dateRange.from)}::date`:'';
 const to=query.dateRange?`AND f.business_date<=${bind(parameters,query.dateRange.to)}::date`:'';
 const label = `nullif(coalesce(f.display_labels->>${labelParameter},f.transaction_evidence->'labels'->>${labelParameter}),'')`;
 const result=await client.query(`SELECT ${identity} identity,min(${label}) label FROM mart.canonical_facts f WHERE ${scope.scope} AND ${scope.predicates} AND ${identity}=ANY(${keyParameter}::text[]) ${from} ${to} GROUP BY ${identity} HAVING count(DISTINCT ${label})=1`,parameters);
 return Object.fromEntries(result.rows.filter(row=>row.label).map(row=>[row.identity,sourceDisplayLabel(row.label,locale)]));
}

export function sourceDisplayLabel(raw:string,locale:Locale):string {
 if(!raw.trim().startsWith('{'))return raw;
 try {
  const translations=JSON.parse(raw) as Record<string,unknown>;
  const preferred=locale==='ar'?translations.ar_001??translations.ar:translations.en_US??translations.en;
  if(typeof preferred==='string'&&preferred.trim())return preferred;
  const fallback=translations.en_US??Object.values(translations).find(value=>typeof value==='string'&&value.trim());
  return typeof fallback==='string'?fallback:raw;
 } catch {return raw;}
}

export function dimensionLabelField(dimension:AnalyticsQuery['groupBy']) {
 return dimension==='business_line'?'businessLine':dimension==='salesperson'?'salesperson':dimension==='customer'?'customer':null;
}
