import type {Pool,PoolClient} from 'pg';
import type {PreparedBuildBounds,PreparedChunkResult} from './contracts.ts';
import {requiredPreparedChunks,prepareChunk} from './preparation.ts';
export interface PreparedOperatorScope {tenantId:string;database:string;revisionId:string;bounds:PreparedBuildBounds}
/** Bounded transactions persist completed chunks; a session lock shares the established tenant writer key. */
export async function preparePublishedRevision(pool:Pool,scope:PreparedOperatorScope,observe:(chunk:PreparedChunkResult)=>void=()=>{}){
 const client=await pool.connect();let locked=false;
 try{
  await verifyOperator(client,scope,'dabboos_ingestor');
  locked=Boolean((await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked',[`analytics:${scope.tenantId}`])).rows[0].locked);
  if(!locked)throw new Error('Tenant analytics operation already running');
  const chunks=await transaction(client,scope,()=>requiredPreparedChunks(client,scope,scope.bounds));
  const results:PreparedChunkResult[]=[];
  for(const chunk of chunks){const result=await transaction(client,scope,()=>prepareChunk(client,scope,chunk,scope.bounds));results.push(result);observe(result);}
  await transaction(client,scope,async()=>{await client.query("INSERT INTO mart.prepared_revision_seals VALUES($1,$2,'prepared-v1') ON CONFLICT DO NOTHING",[scope.tenantId,scope.revisionId]);});
  return {revisionId:scope.revisionId,chunks:results.length,reused:results.filter(chunk=>chunk.reused).length,rows:results.reduce((total,chunk)=>total+chunk.rows,0)};
 }finally{
  if(locked)await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`analytics:${scope.tenantId}`]).catch(()=>{});
  client.release(true);
 }
}
/** Deliberate operator cutover after verification. No migration or backfill runs as a side effect. */
export async function activatePreparedRevision(pool:Pool,scope:PreparedOperatorScope){
 const client=await pool.connect();let locked=false;
 try{
  await verifyOperator(client,scope,'dabboos_migrator');
  locked=Boolean((await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked',[`analytics:${scope.tenantId}`])).rows[0].locked);
  if(!locked)throw new Error('Tenant analytics operation already running');
  return await transaction(client,scope,async()=>{
   await client.query('INSERT INTO mart.prepared_activation VALUES($1,$2,$3,$4)',[scope.tenantId,scope.revisionId,scope.bounds.maxCellsPerChunk,scope.bounds.maxChunks]);
   return {revisionId:scope.revisionId,activated:true};
  });
 }finally{
  if(locked)await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`analytics:${scope.tenantId}`]).catch(()=>{});
  client.release(true);
 }
}
async function verifyOperator(client:PoolClient,scope:PreparedOperatorScope,role:'dabboos_ingestor'|'dabboos_migrator'){
 if(!scope.tenantId.trim()||!scope.database.trim()||!scope.revisionId.trim())throw new Error('Explicit preparation identity required');
 const identity=(await client.query(`SELECT current_database() database,pg_has_role(current_user,$1,'MEMBER') member,
 pg_has_role(current_user,'dabboos_runtime','MEMBER') runtime,rolsuper OR rolbypassrls bypass FROM pg_roles WHERE rolname=current_user`,[role])).rows[0];
 if(identity.database!==scope.database||!identity.member||identity.runtime||identity.bypass)throw new Error('Unexpected preparation identity');
}
async function transaction<Result>(client:PoolClient,scope:PreparedOperatorScope,operation:()=>Promise<Result>){
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout','120000',true),set_config('lock_timeout','5000',true)",[scope.tenantId]);
  const trusted=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[scope.tenantId])).rows[0]?.revision_id;
  if(trusted!==scope.revisionId)throw new Error('Prepared input publication changed');
  const result=await operation();await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
