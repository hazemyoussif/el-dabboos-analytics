import type {PoolClient} from 'pg';
import type {AnalyticsContext,AnalyticsQuery} from '@el-dabboos/domain';
import {requiredMeasures,semanticCatalog} from '@el-dabboos/domain';
import {receivableMeasures} from '../receivable-aging.ts';
import {numericOutput} from '../postgres/sql.ts';
import {financeSnapshotCandidates,financeSelectedBalances} from './finance-selection.ts';

export interface FinanceSummaryRow {
 key:string|null;
 snapshot_date:string|null;
 source_cutoff:Date;
 definition_version:string;
 source_revision:string;
 snapshot_id:string;
 label:string|null;
 actual_values:Record<string,string>;
 invalid_measures:string[];
}
interface FinanceSummaryScope {
 query:AnalyticsQuery;
 context:AnalyticsContext;
 params:unknown[];
 conditions:string;
 maxGroups:number;
}

/** One exact reduction of the governed vector per authorized scope and publication.
 * The owning adapter creates a fresh instance for each dashboard execution.
 * Cached operands never authorize a metric; every caller validates before reading.
 */
export class FinanceSummaryReads {
 private readonly reads=new Map<string,Promise<FinanceSummaryRow[]>>();
 async read(client:PoolClient,scope:FinanceSummaryScope):Promise<FinanceSummaryRow[]> {
  const revision=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[scope.context.tenantId])).rows[0]?.revision_id;
  if(!revision)throw new Error('Trusted serving revision required');
  const key=JSON.stringify([revision,scope.context,scope.params,scope.conditions,scope.query.groupBy??null,scope.maxGroups]);
  let result=this.reads.get(key);
  if(!result){result=client.query<FinanceSummaryRow>(financeSummarySql(scope),scope.params).then(selected=>selected.rows);this.reads.set(key,result);}
  return result;
 }
}

function financeSummarySql({query,context,conditions,maxGroups}:FinanceSummaryScope) {
 // Each invalid operand is marked separately, so an unrelated metric can still succeed.
 const values=receivableMeasures.flatMap(measure=>[
  `'${measure}'`,
  `coalesce(sum(CASE WHEN pg_input_is_valid(customer.actual_values->>'${measure}','numeric') THEN (customer.actual_values->>'${measure}')::numeric END),0)::text`,
 ]).join(',');
 const invalid=receivableMeasures.map(measure=>`CASE WHEN bool_or(NOT pg_input_is_valid(customer.actual_values->>'${measure}','numeric')) THEN '${measure}' END`).join(',');
 return `WITH candidates AS MATERIALIZED (${financeSnapshotCandidates(query,context)}),selected AS MATERIALIZED (
  SELECT slot.key,publication.* FROM jsonb_to_recordset($2::jsonb) slot(key text,"end" date)
  JOIN LATERAL (SELECT * FROM candidates WHERE snapshot_date${query.groupBy==='month'?'=':'<='}slot."end" ORDER BY snapshot_date DESC,priority DESC LIMIT 1) publication ON true)
  SELECT slot.key,jsonb_build_object(${values}) actual_values,array_remove(ARRAY[${invalid}]::text[],NULL) invalid_measures,
   max(slot.snapshot_date)::text snapshot_date,max(slot.source_cutoff) source_cutoff,
   min(slot.definition_version) definition_version,min(slot.source_revision) source_revision,
   min(slot.snapshot_id) snapshot_id,NULL::text label
  FROM selected slot LEFT JOIN LATERAL (${financeSelectedBalances}) customer ON ${conditions}
  GROUP BY slot.key ORDER BY slot.key LIMIT ${maxGroups+1}`;
}

/** Preserve per-metric numeric safety; a large unrelated component cannot poison peers. */
export function financeSummaryValue(query:AnalyticsQuery,row:FinanceSummaryRow) {
 if(requiredMeasures(query.metric).some(measure=>row.invalid_measures.includes(measure)))throw new Error('Invalid SQL numeric output');
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind!=='ratio')return numericOutput(row.actual_values[query.metric]??null);
 const denominator=numericOutput(row.actual_values[semantics.denominator]??null);
 return denominator===null||denominator===0?null:numericOutput(row.actual_values[semantics.numerator]??null)!/denominator*semantics.scale;
}
