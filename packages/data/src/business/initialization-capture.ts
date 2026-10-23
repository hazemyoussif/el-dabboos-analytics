import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {validateSourceMapping} from '@el-dabboos/domain';
import type {SourceMapping} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {tenantTransaction} from '../postgres/session.ts';
import {OdooBusinessReader} from './source.ts';

export interface CommandCaptureScope {
 mart:Pool;owner:Pool;reader:Pool;config:OdooSourceConfig;month:string;object:string;
 baseRevision:string;basePartition?:string;mapping:SourceMapping;
 observe?:(event:{phase:'capture';state:'started'|'page'|'sealed';month:string;recipe:string;pages:number;facts:number})=>void;
}
/** A source lease lives only for this invocation. Failure leaves an unsealed,
 * invisible candidate that the next invocation must explicitly abandon.
 */
export async function captureCommandRecipe(scope:CommandCaptureScope){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month)||scope.mapping.tenantId!==scope.config.tenantId||
  scope.mapping.sourceId!==scope.config.sourceId||scope.mapping.measures.some(rule=>rule.sourceObject===scope.object&&
  !rule.measureId.startsWith('command_'))||!scope.mapping.measures.some(rule=>rule.sourceObject===scope.object))throw new Error('Governed Command capture scope required');
 validateSourceMapping(scope.mapping);
 const lease=await OdooSnapshotLease.open(scope.owner,scope.config,scope.config.snapshotMaxDurationMs,scope.config.credentialPolicy);
 const candidateId=randomUUID();let created=false,factPages=0,controlPages=0,factCount=0,controlCount=0;
 try{
  const source=new OdooBusinessReader(scope.reader,scope.config,lease,{month:scope.month,mapping:scope.mapping,objects:[scope.object]});
  await tenantTransaction(scope.mart,scope.config.tenantId,async client=>{
   const trusted=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[scope.config.tenantId])).rows[0]?.revision_id;
   if(trusted!==scope.baseRevision)throw new Error('Command capture parent changed');
   await client.query(`INSERT INTO mart.command_capture_candidates
    (tenant_id,candidate_id,month,source_object,base_revision,base_partition,mapping,source_cutoff,source_revision)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[scope.config.tenantId,candidateId,scope.month+'-01',scope.object,
    scope.baseRevision,scope.basePartition??null,JSON.stringify(scope.mapping),lease.evidence.sourceAsOf,lease.evidence.frozenRevision]);
  });created=true;
  scope.observe?.({phase:'capture',state:'started',month:scope.month,recipe:scope.object,pages:0,facts:0});
  for await(const facts of source.facts()){
   if(!facts.length)continue;
   factCount+=facts.length;if(factCount>500000)throw new Error('Command recipe fact bound exceeded');
   await tenantTransaction(scope.mart,scope.config.tenantId,client=>client.query(
    'INSERT INTO mart.command_capture_facts VALUES($1,$2,$3,$4)',
    [scope.config.tenantId,candidateId,factPages++,JSON.stringify(facts)]));
   scope.observe?.({phase:'capture',state:'page',month:scope.month,recipe:scope.object,pages:factPages,facts:factCount});
   await lease.assertAlive();
  }
  const controls=await source.controls();
  if(controls.length>500128)throw new Error('Command recipe control bound exceeded');
  for(let offset=0;offset<controls.length;offset+=1000){
   const page=controls.slice(offset,offset+1000);controlCount+=page.length;
   await tenantTransaction(scope.mart,scope.config.tenantId,client=>client.query(
    'INSERT INTO mart.command_capture_controls VALUES($1,$2,$3,$4)',
    [scope.config.tenantId,candidateId,controlPages++,JSON.stringify(page)]));
  }
  await lease.assertAlive();
  await tenantTransaction(scope.mart,scope.config.tenantId,client=>client.query(
   'INSERT INTO mart.command_capture_seals VALUES($1,$2,$3,$4,$5,$6)',
   [scope.config.tenantId,candidateId,factPages,controlPages,factCount,controlCount]),false,120000);
  scope.observe?.({phase:'capture',state:'sealed',month:scope.month,recipe:scope.object,pages:factPages,facts:factCount});
  return {candidateId,month:scope.month,recipe:scope.object,facts:factCount,pages:factPages};
 }catch(error){
  if(created)await tenantTransaction(scope.mart,scope.config.tenantId,client=>client.query(
   'INSERT INTO mart.command_capture_abandoned VALUES($1,$2) ON CONFLICT DO NOTHING',
   [scope.config.tenantId,candidateId])).catch(()=>{});
  throw error;
 }finally{await lease.close();}
}
