import type {Pool} from 'pg';
import {tenantTransaction} from '../postgres/session.ts';
import {assertCertifiedRelease} from '../postgres/release-transfer.ts';
import {receivableMeasures} from '../receivable-aging.ts';

/** Use the activated immutable cutoff; operational summaries remain the fallback. */
export async function readPublishedFinanceSummary(pool:Pool,tenantId:string,date:string):Promise<Record<string,string>> {
  return tenantTransaction(pool,tenantId,async client=>{
    const member=(await client.query(`SELECT member.dataset_id FROM mart.historical_serving_bindings binding
      JOIN mart.historical_release_members member USING(tenant_id,reference)
      WHERE binding.tenant_id=$1 AND member.kind='aging' AND member.period_to=$2`,[tenantId,date])).rows[0];
    if (member) {
      await assertCertifiedRelease(client,{tenantId,datasetId:member.dataset_id});
      const rows=(await client.query(`SELECT measure_id,sum(value)::numeric(30,6)::text value FROM mart.canonical_facts
        WHERE tenant_id=$1 AND dataset_id=$2 AND business_date=$3 AND kind='snapshot' AND measure_id=ANY($4::text[])
        GROUP BY measure_id`,[tenantId,member.dataset_id,date,receivableMeasures])).rows;
      return completeSummary(rows);
    }
    const rows=(await client.query(`SELECT base.measure_id,sum(base.value)::numeric(30,6)::text value
      FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
      JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id)
      WHERE trusted.tenant_id=$1 AND base.business_date=$2 AND base.measure_id=ANY($3::text[]) GROUP BY base.measure_id`,[tenantId,date,receivableMeasures])).rows;
    return completeSummary(rows);
  },true,120000);
}
function completeSummary(rows:Array<{measure_id:string;value:string}>) {
  const totals=Object.fromEntries(rows.map(row=>[row.measure_id,row.value]));
  if (receivableMeasures.some(measure=>totals[measure]===undefined)) throw new Error('Published historical summary anchor required');
  return totals;
}
