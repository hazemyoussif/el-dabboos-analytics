import type {PoolClient} from 'pg';
import type {PreparedBuildBounds,PreparedBuildScope} from './contracts.ts';

interface PopulationWork {
 dataId:string;inputFingerprint:string;inputs:Record<string,unknown>;
 entityCount:number;itemCount:number;rows:number;entitiesPerChunk:number;chunks:number;
}
interface PopulationPlan {definition:string;details:PopulationWork}
/** Continue one bounded unit in the same immutable prepared publication lifecycle. */
export async function preparePopulationUnit(client:PoolClient,scope:PreparedBuildScope,bounds:PreparedBuildBounds):Promise<string|undefined>{
 const plans=await populationPlans(client,scope,bounds);
 for(const plan of plans){
  const bound=(await client.query('SELECT 1 FROM mart.prepared_population_bindings WHERE tenant_id=$1 AND revision_id=$2 AND definition_id=$3',[scope.tenantId,scope.revisionId,plan.definition])).rowCount;
  if(bound)continue;
  // The workspace is transaction-private; selecting a plan restores its inputs.
  await openPopulation(client,scope,bounds,plan.definition);
  return persistPopulationUnit(client,scope,bounds,plan);
 }
}
async function openPopulation(client:PoolClient,scope:PreparedBuildScope,bounds:PreparedBuildBounds,definition:string){
 const result=await client.query<{details:PopulationWork}>('SELECT mart.prepared_population_work_open($1,$2,$3,$4,$5) details',[scope.tenantId,scope.revisionId,definition,bounds.maxCellsPerChunk,bounds.maxChunks]);
 return result.rows[0]!.details;
}
async function populationPlans(client:PoolClient,scope:PreparedBuildScope,bounds:PreparedBuildBounds){
 const required=await client.query<{definition_id:string}>('SELECT definition_id FROM mart.prepared_population_required($1,$2) ORDER BY definition_id',[scope.tenantId,scope.revisionId]);
 const plans:PopulationPlan[]=[];
 for(const requiredDefinition of required.rows)plans.push({definition:requiredDefinition.definition_id,details:await openPopulation(client,scope,bounds,requiredDefinition.definition_id)});
 const native=(await client.query<{count:string}>('SELECT count(*)::text count FROM mart.prepared_required_chunks($1,$2)',[scope.tenantId,scope.revisionId])).rows[0]!;
 if(Number(native.count)+plans.reduce((total,plan)=>total+plan.details.chunks,0)>bounds.maxChunks)throw new Error('Combined prepared chunk bound exceeded');
 return plans;
}
async function persistPopulationUnit(client:PoolClient,scope:PreparedBuildScope,bounds:PreparedBuildBounds,plan:PopulationPlan){
 const details=plan.details,identity=[scope.tenantId,details.dataId];
 const existing=(await client.query('SELECT 1 FROM mart.prepared_population_datasets WHERE tenant_id=$1 AND data_id=$2',identity)).rowCount;
 if(!existing){
  await client.query(`INSERT INTO mart.prepared_population_datasets VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[...identity,plan.definition,scope.revisionId,JSON.stringify(details.inputs),details.entityCount,details.itemCount,details.rows,details.entitiesPerChunk,bounds.maxCellsPerChunk,bounds.maxChunks]);
  await client.query(`INSERT INTO mart.prepared_population_sources SELECT $1,$2,axis.key,axis.value->>'data_id' FROM jsonb_each($3::jsonb->'axes') axis`,[...identity,JSON.stringify(details.inputs)]);
  return 'population_inputs';
 }
 const sealed=(await client.query('SELECT 1 FROM mart.prepared_population_seals WHERE tenant_id=$1 AND data_id=$2',identity)).rowCount;
 if(!sealed)return persistPopulationChunk(client,identity,details.rows);
 await client.query('INSERT INTO mart.prepared_population_bindings VALUES($1,$2,$3,$4,$5,$6)',[scope.tenantId,scope.revisionId,plan.definition,details.dataId,details.inputFingerprint,JSON.stringify(details.inputs)]);
 return 'population_bound';
}
async function persistPopulationChunk(client:PoolClient,identity:string[],rows:number){
 const next=(await client.query<{partition_key:string;chunk_no:number}>(`SELECT plan.partition_key,plan.chunk_no FROM mart.prepared_population_chunk_plan($1,$2) plan
  WHERE NOT EXISTS(SELECT 1 FROM mart.prepared_population_chunks completed WHERE completed.tenant_id=$1 AND completed.data_id=$2
   AND completed.partition_key=plan.partition_key AND completed.chunk_no=plan.chunk_no) ORDER BY plan.partition_key,plan.chunk_no LIMIT 1`,identity)).rows[0];
 if(next){
  await client.query('SELECT mart.prepared_population_build_chunk($1,$2,$3,$4)',[...identity,next.partition_key,next.chunk_no]);
  return 'population_chunk';
 }
 await client.query('INSERT INTO mart.prepared_population_seals VALUES($1,$2,$3)',[...identity,rows]);
 return 'population_sealed';
}
export async function copyPopulationBindings(client:PoolClient,tenantId:string,revision:string,parent:string){
 await client.query(`INSERT INTO mart.prepared_population_bindings SELECT tenant_id,$2,definition_id,data_id,input_fingerprint,inputs
  FROM mart.prepared_population_bindings WHERE tenant_id=$1 AND revision_id=$3`,[tenantId,revision,parent]);
}
