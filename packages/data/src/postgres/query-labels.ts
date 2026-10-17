import {sourceDisplayLabel,dimensionLabelField} from './display-labels.ts';
import type { PoolClient } from 'pg';
import type { AnalyticsQuery,Locale } from '@el-dabboos/domain';
import type { QuerySqlScope } from './query-slots.ts';
import {DimensionDiscoveryLimitError} from '@el-dabboos/domain';
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
 const predicates=`${scope.scope} AND ${scope.predicates} AND ${identity}=ANY(${keyParameter}::text[]) ${from} ${to}`;
 const statement=scope.labelStrategy==='latest_observed'
  ? `SELECT DISTINCT ON (${identity}) ${identity} identity,${label} label FROM mart.canonical_facts f WHERE ${predicates} AND ${label} IS NOT NULL ORDER BY ${identity},f.source_as_of DESC,f.business_date DESC,f.source_object COLLATE "C",f.source_record_id COLLATE "C"`
  : `SELECT ${identity} identity,min(${label}) label FROM mart.canonical_facts f WHERE ${predicates} GROUP BY ${identity} HAVING count(DISTINCT ${label})=1`;
 const result=await client.query(statement,parameters);
 return Object.fromEntries(result.rows.filter(row=>row.label).map(row=>[row.identity,sourceDisplayLabel(row.label,locale)]));
}

export {sourceDisplayLabel,dimensionLabelField} from './display-labels.ts';

/** Discover every authorized event identity and its latest nonempty label in one scan. */
export async function readEventDimensionOptions(client:PoolClient,dimension:NonNullable<AnalyticsQuery['groupBy']>,scope:QuerySqlScope,locale:Locale) {
 const parameters=[...scope.params],identity=dimensionSql(dimension),field=dimensionLabelField(dimension);
 const label=field?`nullif(coalesce(f.display_labels->>${bind(parameters,field)},f.transaction_evidence->'labels'->>${bind(parameters,field)}),'')`:'NULL::text';
 const result=await client.query(`SELECT DISTINCT ON (${identity}) ${identity} value,${label} label
  FROM mart.canonical_facts f WHERE ${scope.scope} AND ${scope.predicates} AND ${identity} IS NOT NULL
  ORDER BY ${identity},(${label} IS NOT NULL) DESC,f.source_as_of DESC,f.business_date DESC,f.source_object COLLATE "C",f.source_record_id COLLATE "C"
  LIMIT ${scope.maxGroups+1}`,parameters);
 if(result.rows.length>scope.maxGroups)throw new DimensionDiscoveryLimitError(dimension);
 return result.rows.map(row=>({id:String(row.value),...(row.label?{label:sourceDisplayLabel(row.label,locale)}:{})}));
}
