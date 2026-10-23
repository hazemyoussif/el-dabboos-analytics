import type {Pool,PoolClient} from 'pg';
import type {SourceMapping} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';

export interface CommandInitialization {
 candidate_id:string;month:string;source_object:string;base_revision:string;base_partition:string|null;
 mapping:SourceMapping;source_cutoff:Date;source_revision:string;
 partition_id?:string;revision_id?:string;parent_revision?:string;
}
export class CommandBusinessBaseChanged extends Error {
 constructor(){super('Command initialization Business base changed');}
}
export async function pendingCommandInitialization(pool:Pool,tenantId:string){
 return tenantTransaction(pool,tenantId,async client=>{
  // An exported snapshot cannot outlive its owning invocation. Keep sealed work,
  // but explicitly abandon incomplete captures left by an interrupted owner.
  await client.query(`INSERT INTO mart.command_capture_abandoned
   SELECT tenant_id,candidate_id FROM mart.command_capture_candidates capture
   WHERE tenant_id=$1 AND NOT EXISTS(SELECT 1 FROM mart.command_capture_seals seal
    WHERE seal.tenant_id=capture.tenant_id AND seal.candidate_id=capture.candidate_id)
   ON CONFLICT DO NOTHING`,[tenantId]);
  return (await client.query<CommandInitialization>(`SELECT capture.*,to_char(capture.month,'YYYY-MM') AS "month",
   work.partition_id,work.revision_id,work.parent_revision
   FROM mart.command_capture_candidates capture JOIN mart.command_capture_seals seal USING(tenant_id,candidate_id)
   LEFT JOIN mart.command_initializations work USING(tenant_id,candidate_id)
   WHERE capture.tenant_id=$1 AND NOT EXISTS(SELECT 1 FROM mart.command_initialization_publications published
    WHERE published.tenant_id=capture.tenant_id AND published.candidate_id=capture.candidate_id)
   AND NOT EXISTS(SELECT 1 FROM mart.command_initialization_conflicts conflict
    WHERE conflict.tenant_id=capture.tenant_id AND conflict.candidate_id=capture.candidate_id)
   ORDER BY capture.month DESC,capture.candidate_id LIMIT 1`,[tenantId])).rows[0];
 });
}
export async function currentBusinessParent(client:PoolClient,tenantId:string,work:CommandInitialization){
 const trusted=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenantId])).rows[0]?.revision_id as string|undefined;
 if(!trusted)throw new Error('Accepted publication required');
 const base=(await client.query(`SELECT partition_id FROM mart.analytics_serving_members
  WHERE tenant_id=$1 AND revision_id=$2 AND family='business' AND month=$3`,[tenantId,trusted,work.month+'-01'])).rows[0]?.partition_id??null;
 if(base!==work.base_partition)throw new CommandBusinessBaseChanged();
 return trusted;
}
export async function pageCheckpoint(client:PoolClient,tenantId:string,candidateId:string,kind:string,page:number){
 await client.query('INSERT INTO mart.command_initialization_pages VALUES($1,$2,$3,$4)',[tenantId,candidateId,kind,page]);
}
export async function nextPage(client:PoolClient,tenantId:string,candidateId:string,kind:string){
 return Number((await client.query(`SELECT coalesce(max(page)+1,0)::int page FROM mart.command_initialization_pages
  WHERE tenant_id=$1 AND candidate_id=$2 AND kind=$3`,[tenantId,candidateId,kind])).rows[0].page);
}
