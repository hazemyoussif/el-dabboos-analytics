import type {PoolClient} from 'pg';
import type {PreparedBuildScope,PreparedConfiguration} from './contracts.ts';

/** The owner transaction publishes only after the binding guard proves the
 * affected cells and inherited parent. No full-month fallback for sparse input.
 */
export async function prepareBusinessDelta(client:PoolClient,scope:PreparedBuildScope,config:PreparedConfiguration,maxCells:number){
 if(config.family!=='business')return;
 const created=(await client.query<{data_id:string}>('SELECT data_id FROM mart.prepare_business_delta_dataset($1,$2,$3,$4)',
  [scope.tenantId,scope.revisionId,JSON.stringify(config),maxCells])).rows[0];
 if(!created)return;
 const statistics=(await client.query<{statistics:Record<string,number>|null}>('SELECT mart.business_prepared_statistics($1,$2) statistics',
  [scope.tenantId,created.data_id])).rows[0]?.statistics;
 if(!statistics)throw new Error('Business prepared baseline statistics invalid');
 const counts=Object.values(statistics);
 if(counts.some(count=>!Number.isSafeInteger(count)||count<0))throw new Error('Business prepared counts invalid');
 const rows=counts.reduce((sum,count)=>sum+count,0);
 if(!Number.isSafeInteger(rows)||rows>maxCells)throw new Error('Business logical prepared cell bound exceeded');
 return {dataId:created.data_id,statistics,rows};
}
