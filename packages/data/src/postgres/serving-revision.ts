import {AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';

export function requireServingRevision(actual:string|undefined,expected?:string):string{
 if(expected&&actual!==expected)throw new AnalyticsPublicationChangedError();
 if(!actual)throw new Error('Trusted serving revision required');
 return actual;
}
/** The check and subsequent data selection share the caller's repeatable-read transaction. */
export async function readServingRevision(client:PoolClient,tenantId:string,expected?:string):Promise<string>{
 const row=(await client.query<{revision_id:string}>('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenantId])).rows[0];
 return requireServingRevision(row?.revision_id,expected);
}
