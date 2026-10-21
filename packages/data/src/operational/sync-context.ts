import type {PoolClient} from 'pg';
import type {AnalyticsSyncCandidate} from '@el-dabboos/domain';
import type {OperationDetails,ExactControl,OperationalBaseline} from './contracts.ts';
import type {OperationalProgressObserver} from './progress.ts';
import {readBaseline} from './baseline.ts';

export interface StoredSyncCandidate extends AnalyticsSyncCandidate {
 parent:string;previousCursor:unknown;cursor:{cutoff:string;objects:Record<string,string>};
 details:OperationDetails;controls:ExactControl[];expectedHeads:number;days:string[];
 receivablePages:number;lookupPages:number;lookupProjection:string|null;
}
/** One checked-out session owns the advisory lock across bounded transactions. */
export class SyncContext {
 constructor(readonly client:PoolClient,readonly tenantId:string,readonly observe?:OperationalProgressObserver){}
 async transaction<T>(operation:()=>Promise<T>,candidateId?:string,timeout:15000|120000=15000):Promise<T>{
  await this.client.query('BEGIN');
  try {
   await this.client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout',$3,true),set_config('mart.sync_candidate_id',$2,true),set_config('mart.sync_accepting','',true)",[this.tenantId,candidateId??'',String(timeout)]);
   if(candidateId)await this.client.query('SELECT mart.assert_sync_candidate_current($1,$2)',[this.tenantId,candidateId]);
   const result=await operation();await this.client.query('COMMIT');return result;
  }catch(error){await this.client.query('ROLLBACK');throw error;}
 }
 async candidate(id:string):Promise<StoredSyncCandidate>{
  const row=(await this.client.query('SELECT specification FROM mart.analytics_sync_candidates WHERE tenant_id=$1 AND candidate_id=$2',[this.tenantId,id])).rows[0];
  if(!row)throw new Error('Frozen sync candidate missing');return row.specification;
 }
 baseline():Promise<OperationalBaseline>{return readBaseline(this.client,this.tenantId);}
}
