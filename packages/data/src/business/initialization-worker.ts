import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {tenantTransaction} from '../postgres/session.ts';
import {reviewBusinessDate} from '../review/cutoff.ts';
import {refreshCommandMonth} from './initialization-refresh.ts';
import {commandSyncMembers} from './command-sync.ts';
import {commandOnlyMapping,withSalesCommandRecipe} from './sales-command-mapping.ts';
import {captureCommandRecipe} from './initialization-capture.ts';
import {pendingCommandInitialization,currentBusinessParent,CommandBusinessBaseChanged} from './initialization-state.ts';
import type {CommandInitialization} from './initialization-state.ts';
import {createCommandReplay,replayCommandFactPage,replayCommandControlPage,replayBaselineControlPage} from './initialization-replay.ts';
import {createCommandMembership,prepareCommandChunk,publishCommandInitialization} from './initialization-publication.ts';

export interface CommandBackgroundScope {
 mart:Pool;tenantId:string;actorId:string;trigger:'operator'|'scheduled';freshnessTargetSeconds?:number;sweepAllocations?:boolean;
 openSource:()=>Promise<{owner:Pool;reader:Pool;config:OdooSourceConfig}>;
 observe?:(event:object)=>void;
}
/** The scheduler invokes once per unit. Session lock is separate from ordinary
 * sync; callers supply a pool with room for this lock and a unit transaction.
 */
export async function runCommandBackgroundUnit(scope:CommandBackgroundScope){
 if(scope.freshnessTargetSeconds!==undefined&&(!Number.isSafeInteger(scope.freshnessTargetSeconds)||scope.freshnessTargetSeconds<1))throw new Error('Positive Command freshness target required');
 if((scope.mart.options.max??10)<2)throw new Error('Command background pool requires a lock connection and a worker connection');
 const lock=await scope.mart.connect(),started=performance.now();let locked=false;
 try{
  locked=Boolean((await lock.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked',[`command-background:${scope.tenantId}`])).rows[0].locked);
  if(!locked)return {state:'deferred',phase:'background_busy'};
  if(scope.sweepAllocations)return {state:'completed',phase:await refreshCommandMonth(scope,false,true)?'allocations_checked':'coverage_not_ready'};
  const pending=await pendingCommandInitialization(scope.mart,scope.tenantId);
  const phase=pending?await advanceCommandInitialization(scope,pending):await nextCommandUnit(scope);
  const result={state:phase==='covered'?'idle':'completed',phase,durationMs:Math.round(performance.now()-started),
   ...(pending?{month:pending.month,recipe:pending.source_object,candidateId:pending.candidate_id}:{})};
  scope.observe?.(result);return result;
 }finally{
  if(locked)await lock.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`command-background:${scope.tenantId}`]).catch(()=>{});
  lock.release();
 }
}
async function advanceCommandInitialization(scope:CommandBackgroundScope,work:CommandInitialization){
 try{return await tenantTransaction(scope.mart,scope.tenantId,async client=>{
  await currentBusinessParent(client,scope.tenantId,work);
  if(!work.partition_id)return createCommandReplay(client,scope.tenantId,work);
  const membership=(await client.query('SELECT 1 FROM mart.analytics_serving_revisions WHERE tenant_id=$1 AND revision_id=$2',[scope.tenantId,work.revision_id])).rowCount;
  if(!membership){
   if(await replayCommandFactPage(client,scope.tenantId,work))return 'canonical_fact_page';
   if(await replayCommandControlPage(client,scope.tenantId,work))return 'canonical_control_page';
   if(await replayBaselineControlPage(client,scope.tenantId,work))return 'canonical_baseline_control_page';
   return createCommandMembership(client,scope.tenantId,work);
  }
  const prepared=(await client.query('SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2',[scope.tenantId,work.revision_id])).rowCount;
  if(!prepared)return prepareCommandChunk(client,scope.tenantId,work,event=>scope.observe?.(event));
  return publishCommandInitialization(client,scope.tenantId,work);
 },false,120000);
 }catch(error){
  if(!(error instanceof CommandBusinessBaseChanged))throw error;
  await tenantTransaction(scope.mart,scope.tenantId,client=>client.query(
   'INSERT INTO mart.command_initialization_conflicts VALUES($1,$2)',[scope.tenantId,work.candidate_id]));
  return 'base_conflict';
 }
}
async function nextCommandUnit(scope:CommandBackgroundScope){
 const current=await captureNextCommandRecipe(scope,true);
 if(current!=='covered')return current;
 if(await refreshCommandMonth(scope,true))return 'delta_checked';
 if(await refreshCommandMonth(scope,true,true))return 'allocations_checked';
 const historical=await captureNextCommandRecipe(scope,false);
 if(historical!=='covered')return historical;
 return await refreshCommandMonth(scope,false)?'delta_checked':'covered';
}
async function captureNextCommandRecipe(scope:CommandBackgroundScope,currentOnly:boolean){
 const members=await commandSyncMembers(scope.mart,scope.tenantId);
 const template=members.at(-1)?.mapping;if(!template)return 'covered';
 const current=reviewBusinessDate(new Date().toISOString(),template.measures[0]!.timeZone).slice(0,7);
 const ordered=currentOnly?[current]:[current,...members.map(member=>member.month).filter(month=>month!==current).sort().reverse()];
 for(const month of ordered){
  const member=members.find(candidate=>candidate.month===month);
  const objects=month===current?['command_invoice','command_receipt','command_order','command_receivable','command_allocation']:
   ['command_invoice','command_receipt','command_order','command_allocation'];
  const missing=objects.find(object=>!member?.mapping.measures.some(rule=>rule.sourceObject===object));
  if(!missing)continue;
  const mapping=member?withSalesCommandRecipe(member.mapping,missing,month===current):commandOnlyMapping(template,missing,true,`command:${month}:${randomUUID()}`);
  const baseRevision=await tenantTransaction(scope.mart,scope.tenantId,async client=>(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[scope.tenantId])).rows[0].revision_id as string,true);
  const source=await scope.openSource();
  await captureCommandRecipe({mart:scope.mart,...source,month,object:missing,baseRevision,...(member?{basePartition:member.partitionId}:{}),
   mapping,observe:event=>scope.observe?.(event)});
  return 'capture_sealed';
 }
 return 'covered';
}
