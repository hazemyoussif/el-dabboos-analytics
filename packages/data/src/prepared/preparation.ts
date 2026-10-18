import {measurePreparedStep} from './diagnostics.ts';
import type {PoolClient} from 'pg';
import type {PreparedBuildBounds,PreparedBuildScope,PreparedChunk,PreparedChunkResult,PreparedConfiguration} from './contracts.ts';
import {buildPreparedWorkspace} from './workspace.ts';
import {fingerprintPreparedCells,persistPreparedCells} from './materialization.ts';

/** The owning background transaction holds the existing tenant writer lock. No Odoo access. */
export async function requiredPreparedChunks(client:PoolClient,scope:PreparedBuildScope,bounds:PreparedBuildBounds):Promise<PreparedChunk[]>{
 validateBounds(bounds);
 const chunks=(await client.query<PreparedChunk>('SELECT family,kind,period::text,through::text FROM mart.prepared_required_chunks($1,$2) ORDER BY family,kind,period',[scope.tenantId,scope.revisionId])).rows;
 if(chunks.length>bounds.maxChunks)throw new Error('Prepared chunk bound exceeded');
 return chunks;
}
function validateBounds(bounds:PreparedBuildBounds){
 if(!Number.isSafeInteger(bounds.maxCellsPerChunk)||bounds.maxCellsPerChunk<1||!Number.isSafeInteger(bounds.maxChunks)||bounds.maxChunks<1)throw new Error('Explicit finite preparation bounds required');
 if(bounds.maxPopulationRows!==undefined&&(!Number.isSafeInteger(bounds.maxPopulationRows)||bounds.maxPopulationRows<1))throw new Error('Explicit finite population bound required');
}
export async function prepareChunk(client:PoolClient,scope:PreparedBuildScope,chunk:PreparedChunk,bounds:PreparedBuildBounds):Promise<PreparedChunkResult>{
 validateBounds(bounds);
 const existing=(await client.query<{data_id:string;statistics:Record<string,number>}>('SELECT data_id,statistics FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2 AND family=$3 AND kind=$4 AND period=$5',[scope.tenantId,scope.revisionId,chunk.family,chunk.kind,chunk.period])).rows[0];
 if(existing)return result(chunk,existing.data_id,existing.statistics,true);
 const config=(await measurePreparedStep(scope,{step:'configuration'},()=>client.query<{config:PreparedConfiguration}>('SELECT mart.prepared_configuration($1,$2,$3,$4,$5,$6) config',[scope.tenantId,scope.revisionId,chunk.family,chunk.kind,chunk.period,chunk.through]))).rows[0]?.config;
 if(!config)throw new Error('Governed prepared configuration missing');
 const signature=(await measurePreparedStep(scope,{step:'signature'},()=>client.query<{fingerprint:string;source_cutoff:Date}>('SELECT * FROM mart.prepared_input_signature($1,$2,$3)',[scope.tenantId,scope.revisionId,JSON.stringify(config)]))).rows[0];
 if(!signature)throw new Error('Prepared source signature missing');
 const reused=(await measurePreparedStep(scope,{step:'reuse'},()=>client.query<{data_id:string;statistics:Record<string,number>}>(`SELECT binding.data_id,binding.statistics FROM mart.prepared_bindings binding
  JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id) WHERE binding.tenant_id=$1 AND binding.input_fingerprint=$2 LIMIT 1`,[scope.tenantId,signature.fingerprint]))).rows[0];
 if(!reused)await buildPreparedWorkspace(client,scope,config,bounds);
 const materialized=reused?{dataId:reused.data_id,statistics:reused.statistics,rows:Object.values(reused.statistics).reduce((sum,count)=>sum+count,0)}:await measurePreparedStep(scope,{step:'fingerprint'},()=>fingerprintPreparedCells(client,scope,config,bounds.maxCellsPerChunk));
 if(materialized.rows>bounds.maxCellsPerChunk)throw new Error('Prepared cell storage bound exceeded');
 const found=(await client.query('SELECT 1 FROM mart.prepared_datasets WHERE tenant_id=$1 AND data_id=$2',[scope.tenantId,materialized.dataId])).rowCount;
 if(!found)await measurePreparedStep(scope,{step:'persistence'},()=>persistPreparedCells(client,scope,config,materialized));
 await measurePreparedStep(scope,{step:'binding'},()=>client.query('INSERT INTO mart.prepared_bindings VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[scope.tenantId,scope.revisionId,chunk.family,chunk.kind,chunk.period,materialized.dataId,signature.fingerprint,signature.source_cutoff,JSON.stringify(materialized.statistics)]));
 return {...chunk,dataId:materialized.dataId,rows:materialized.rows,reused:Boolean(found)};
}
function result(chunk:PreparedChunk,dataId:string,statistics:Record<string,number>,reused:boolean):PreparedChunkResult{return {...chunk,dataId,rows:Object.values(statistics).reduce((sum,count)=>sum+count,0),reused};}
/** Called only by preparation/publication jobs; serving cannot invoke either materialization function. */
export async function prepareRevision(client:PoolClient,scope:PreparedBuildScope,bounds:PreparedBuildBounds){
 if((await client.query('SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2',[scope.tenantId,scope.revisionId])).rowCount)return [];
 const chunks=await requiredPreparedChunks(client,scope,bounds),results=[];
 for(const chunk of chunks)results.push(await prepareChunk(client,scope,chunk,bounds));
 await client.query("INSERT INTO mart.prepared_revision_seals VALUES($1,$2,'prepared-v1')",[scope.tenantId,scope.revisionId]);
 return results;
}
