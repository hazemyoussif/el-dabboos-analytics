import { openOdooReadLease } from '../odoo/read-lease.ts';
import type {Pool,PoolClient} from 'pg';
import {validateSourceMapping} from '@el-dabboos/domain';
import type {SourceMapping} from '@el-dabboos/domain';
import {randomUUID} from 'node:crypto';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {tenantTransaction} from '../postgres/session.ts';
import {exposeBusinessDeltaMonth,exposeReviewMonth} from '../review/exposure.ts';
import {reviewBusinessDate} from '../review/cutoff.ts';
import {businessDefinitionVersion,businessMapping} from './definitions.ts';
import {salesCommandDefinitionVersion,withSalesCommandMapping} from './sales-command-mapping.ts';
import {readBusinessRecipeObservations} from './observations.ts';
import {commandObjects,discoverCommandChanges} from './command-changes.ts';
import {OdooBusinessReader} from './source.ts';
import {commandAllocationChanges} from './allocation-changes.ts';
import {sweepBusinessAllocations} from './allocation-sweep.ts';
import type {RecordedAllocationDeletion} from '../operational/contracts.ts';
import type {OperationalProgressObserver} from '../operational/progress.ts';

interface CommandMember {month:string;partitionId:string;mapping:SourceMapping;cutoff:string}
export async function commandSyncMembers(pool:Pool,tenantId:string):Promise<CommandMember[]>{
 return tenantTransaction(pool,tenantId,async client=>{
  const rows=(await client.query(`SELECT to_char(member.month,'YYYY-MM') AS "month",member.partition_id,
   extraction.mapping,extraction.definition_version,extraction.source_cutoff FROM mart.analytics_trusted_serving trusted
   JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
   WHERE trusted.tenant_id=$1 AND member.family='business'
   AND extraction.mapping->>'mappingId' IN('business-purpose-v1','business-purpose-v1-sales-command') ORDER BY member.month`,[tenantId])).rows;
  if(rows.some(row=>row.definition_version!==businessDefinitionVersion()||(row.mapping.mappingId==='business-purpose-v1-sales-command'&&row.mapping.mappingVersion!==salesCommandDefinitionVersion())))throw new Error('Command sync requires compatible accepted Business definitions');
  return rows.map(row=>({month:row.month,partitionId:row.partition_id,mapping:row.mapping,cutoff:row.source_cutoff.toISOString()}));
 },true);
}

/** Independent family watermark. A failed Business refresh never advances it from the facts cursor.
 * Each completed member is reusable on retry; only changed members prepare new data.
 */
export async function synchronizeCommandCenter(scope:{mart:Pool;owner:Pool;reader:Pool;config:OdooSourceConfig;members:readonly CommandMember[];sweepAllocations?:boolean;initializeMissing?:boolean;observe?:OperationalProgressObserver}){
 assertCommandRefreshScope(scope);
 const results=[];
 for(const member of scope.members){
  const lease=await openOdooReadLease(scope.owner,scope.config);
  try{
   const observations=await tenantTransaction(scope.mart,scope.config.tenantId,client=>readBusinessRecipeObservations(client,scope.config.tenantId,member.partitionId),true);
   const today=reviewBusinessDate(lease.evidence.sourceAsOf,member.mapping.measures[0]!.timeZone);
   const initialize=member.mapping.mappingId==='business-purpose-v1';
   const mapping=initialize?withSalesCommandMapping(member.mapping,member.month===today.slice(0,7)):member.mapping;
   const objects=commandObjects.filter(object=>(object!=='command_receivable'||member.month===today.slice(0,7))&&mapping.measures.some(rule=>rule.sourceObject===object));
   const debt=observations.find(observation=>observation.object==='command_receivable');
   const previousCutoff=observations.filter(observation=>objects.some(object=>object===observation.object)).map(observation=>observation.cutoff).sort()[0]??member.cutoff;
   const graph=await tenantTransaction(scope.mart,scope.config.tenantId,async client=>(await client.query('SELECT max(source_cutoff) cutoff FROM mart.business_allocation_links WHERE tenant_id=$1 AND source_id=$2',[scope.config.tenantId,scope.config.sourceId])).rows[0].cutoff as Date|null,true);
   const replaceDebt=objects.includes('command_receivable')&&debt?.day!==today;
   const reader=new OdooBusinessReader(scope.reader,scope.config,lease,{month:member.month,mapping,objects,...(scope.observe?{observe:scope.observe}:{})});
   const result=await exposeBusinessDeltaMonth(scope.mart,{
    tenantId:scope.config.tenantId,month:member.month,mapping,
    cutoff:lease.evidence.sourceAsOf,revision:lease.evidence.frozenRevision,observedObjects:objects,
    replaceObjects:replaceDebt?['command_receivable']:[],replacements:emptyReplacements(),
    ...(mapping.measures.some(rule=>rule.sourceObject==='command_allocation')?{allocationChanges:commandAllocationChanges({pool:scope.reader,config:scope.config,lease,cutoff:initialize&&graph?graph.toISOString():previousCutoff,initialize:!graph,...(scope.observe?{observe:scope.observe}:{})})}:{}),
    ...(scope.sweepAllocations&&!initialize?{allocationDeletions:{
     discover:(consume:(records:readonly RecordedAllocationDeletion[])=>Promise<void>,client:PoolClient)=>sweepBusinessAllocations(client,{pool:scope.reader,config:scope.config,lease,partitionId:member.partitionId,previousCutoff},consume),
     replacements:(object:string,ids:readonly string[])=>reader.replacements(object,ids),
    }}:{}),
    discover:async request=>{
     for(const object of objects){
      if(initialize){await reader.identities(object,ids=>request(object,ids));continue;}
      const previous=observations.find(observation=>observation.object===object);
      if(!previous)throw new Error('Command recipe observation missing');
      await discoverCommandChanges({...scope,lease,object,cutoff:previous.cutoff,month:member.month,timeZone:mapping.measures[0]!.timeZone,completeSnapshot:object==='command_receivable'&&replaceDebt,pool:scope.reader},ids=>request(object,ids));
     }
    },
    readReplacements:(object,ids)=>reader.replacements(object,ids),
    identityControls:(object,ids)=>reader.identityControls(object,ids),
    controls:()=>reader.controls(),assertAlive:()=>lease.assertAlive(),
    completeSourceRead:async()=>{await lease.assertAlive();await lease.close();},
   });
   results.push(result);
  }finally{await lease.close();}
 }
 if(scope.initializeMissing===false)return results;
 const current=await initializeCurrentCommandMonth(scope);
 if(current)results.push(current);
 return results;
}
function assertCommandRefreshScope(scope:{members:readonly CommandMember[];initializeMissing?:boolean}){
 if(scope.initializeMissing!==false)return;
 if(scope.members.length>1||scope.members.some(member=>member.mapping.mappingId==='business-purpose-v1'))throw new Error('Background delta requires one initialized month; initialization is separate');
}
async function* emptyReplacements():AsyncGenerator<never>{/* Identity requests are discovered before source replacement reads. */}

/** A new month has no shared Business member to overwrite. Establish only the
 * Command recipes; other recipes retain their last real observation in history.
 */
async function initializeCurrentCommandMonth(scope:{mart:Pool;owner:Pool;reader:Pool;config:OdooSourceConfig;members:readonly CommandMember[];observe?:OperationalProgressObserver}){
 if(!scope.members.length)return;
 const template=scope.members[scope.members.length-1]!.mapping;
 const lease=await openOdooReadLease(scope.owner,scope.config);
 try{
  const month=reviewBusinessDate(lease.evidence.sourceAsOf,template.measures[0]!.timeZone).slice(0,7);
  if(scope.members.some(member=>member.month===month))return;
  const base=businessMapping({tenantId:scope.config.tenantId,sourceId:scope.config.sourceId,currency:template.reportingCurrency,
   timeZone:template.measures[0]!.timeZone,datasetId:`command:${month}:${randomUUID()}`,current:true});
  const extended=withSalesCommandMapping(base,true);
  const mapping={...extended,measures:extended.measures.filter(rule=>rule.measureId.startsWith('command_')),
   capabilities:extended.capabilities.filter(capability=>capability.metric.startsWith('command_'))};
  validateSourceMapping(mapping);
  const reader=new OdooBusinessReader(scope.reader,scope.config,lease,{month,mapping,...(scope.observe?{observe:scope.observe}:{})});
  return await exposeReviewMonth(scope.mart,{tenantId:scope.config.tenantId,month,mapping,
   cutoff:lease.evidence.sourceAsOf,revision:lease.evidence.frozenRevision,facts:reader.facts(),controls:()=>reader.controls(),
   assertAlive:()=>lease.assertAlive(),completeSourceRead:async()=>{await lease.assertAlive();await lease.close();},
   requireEmptyMonth:true},'business');
 }finally{await lease.close();}
}
