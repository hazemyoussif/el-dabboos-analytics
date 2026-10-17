import {AnalyticsResultWindowError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsRepository,AnalyticsExecutionScope} from '@el-dabboos/domain';
import type {Pool} from 'pg';
import {tenantTransaction} from '../postgres/session.ts';
import {readServingRevision} from '../postgres/serving-revision.ts';

/** Pin publication membership, retaining current-only RLS and parallel short transactions. */
export async function pinnedTrustedExecution(pool:Pool,repository:AnalyticsRepository,context:AnalyticsContext,timeout=15000):Promise<AnalyticsExecutionScope>{
 const scope=structuredClone(context),identity=JSON.stringify(scope);
 const revision=await tenantTransaction(pool,scope.tenantId,client=>readServingRevision(client,scope.tenantId),true,timeout);
 return {supportsResultWindows:true,servingRevision:revision,execute(query,actor,read){
  if(JSON.stringify(actor)!==identity)throw new Error('Analytics execution context changed');
  if(read?.revision&&read.revision!==revision)throw new AnalyticsResultWindowError();
  return repository.execute(query,scope,{...read,revision});
 },async verifyExecution(){
  await tenantTransaction(pool,scope.tenantId,client=>readServingRevision(client,scope.tenantId,revision),true,timeout);
 }};
}
