import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {requiredPreparedChunks,prepareChunk} from '../prepared/preparation.ts';
import {preparePopulationUnit,copyPopulationBindings} from '../prepared/population-preparation.ts';
import {currentBusinessParent,CommandBusinessBaseChanged} from './initialization-state.ts';
import type {CommandInitialization} from './initialization-state.ts';

export async function createCommandMembership(client:PoolClient,tenantId:string,work:CommandInitialization){
 const month=work.month+'-01';
 if(work.base_partition)await inheritRecipeObservations(client,tenantId,work);
 await client.query(`INSERT INTO mart.business_recipe_observations
  VALUES($1,$2,$3,$4,$5,least(($6::date+interval '1 month - 1 day')::date,($4::timestamptz AT TIME ZONE $7)::date))`,
  [tenantId,work.partition_id,work.source_object,work.source_cutoff,work.source_revision,month,work.mapping.measures[0]!.timeZone]);
 if(!(await client.query('SELECT mart.business_partition_exact($1,$2) exact',[tenantId,work.partition_id])).rows[0]?.exact)throw new Error('Command canonical source controls differ');
 await client.query(`INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose)
  VALUES($1,$2,$3,$4,ARRAY[$5::date],'business')`,[tenantId,work.revision_id,work.parent_revision,work.source_cutoff,month]);
 await copyCommandManifest(client,{tenantId,revision:work.revision_id!,parent:work.parent_revision!,month,partition:work.partition_id!});
 return 'canonical_sealed';
}
async function inheritRecipeObservations(client:PoolClient,tenantId:string,work:CommandInitialization){
 await client.query(`INSERT INTO mart.business_recipe_observations
  SELECT DISTINCT ON(rule->>'sourceObject') $1,$2,rule->>'sourceObject',observed.source_cutoff,observed.source_revision,observed.business_day
  FROM mart.review_extractions extraction,
   LATERAL jsonb_array_elements(extraction.mapping->'measures') rule,
   LATERAL mart.business_measure_observation($1,$3,rule->>'measureId') observed
  WHERE extraction.tenant_id=$1 AND extraction.partition_id=$3
  AND rule->>'sourceObject'<>$4 ORDER BY rule->>'sourceObject'`,[tenantId,work.partition_id,work.base_partition,work.source_object]);
}
interface ManifestScope {tenantId:string;revision:string;parent:string;month:string;partition:string}
async function copyCommandManifest(client:PoolClient,scope:ManifestScope){
 await client.query(`INSERT INTO mart.analytics_serving_members
  SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members
  WHERE tenant_id=$1 AND revision_id=$3 AND NOT(family='business' AND month=$4)`,[scope.tenantId,scope.revision,scope.parent,scope.month]);
 await client.query("INSERT INTO mart.analytics_serving_members VALUES($1,$2,$3,$4,'business')",[scope.tenantId,scope.revision,scope.month,scope.partition]);
}
export async function prepareCommandChunk(client:PoolClient,tenantId:string,work:CommandInitialization,observe:(event:object)=>void){
 const scope={tenantId,revisionId:work.revision_id!};
 const bounds=(await client.query(`SELECT max_cells_per_chunk,max_chunks FROM mart.prepared_activation WHERE tenant_id=$1`,[tenantId])).rows[0];
 if(!bounds)throw new Error('Prepared serving activation required for Command background work');
 const limits={maxCellsPerChunk:Number(bounds.max_cells_per_chunk),maxChunks:Number(bounds.max_chunks)};
 const chunks=await requiredPreparedChunks(client,scope,limits);
 for(const chunk of chunks){
  const present=(await client.query(`SELECT 1 FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2
   AND family=$3 AND kind=$4 AND period=$5`,[tenantId,work.revision_id,chunk.family,chunk.kind,chunk.period])).rowCount;
  if(present)continue;
  const prepared=await prepareChunk(client,{...scope,observeStep:event=>observe({phase:'prepare',month:work.month,...event})},chunk,limits);
  return prepared.reused?'prepared_binding':'prepared_chunk';
 }
 const population=await preparePopulationUnit(client,scope,limits);
 if(population)return population;
 await client.query("INSERT INTO mart.prepared_revision_seals VALUES($1,$2,'prepared-v1')",[tenantId,work.revision_id]);
 return 'prepared_sealed';
}
/** Rebase only manifest/binding metadata. No source read or raw/cell copying. */
export async function publishCommandInitialization(client:PoolClient,tenantId:string,work:CommandInitialization){
 await client.query("SELECT set_config('lock_timeout','1000',true)");
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenantId}`]);
 const current=await currentBusinessParent(client,tenantId,work);
 let revision=work.revision_id!;
 if(current!==work.parent_revision){
  await assertBusinessInputsUnchanged(client,tenantId,work.parent_revision!,current);
  revision=await rebaseCommandManifest(client,tenantId,work,current);
 }
 const changed=await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1 AND revision_id=$3',[tenantId,revision,current]);
 if(changed.rowCount!==1)throw new Error('Command publication parent changed');
 await client.query('INSERT INTO mart.command_initialization_publications VALUES($1,$2,$3)',[tenantId,work.candidate_id,revision]);
 return 'published';
}
async function assertBusinessInputsUnchanged(client:PoolClient,tenantId:string,parent:string,current:string){
 const difference=(await client.query(`WITH previous AS(SELECT month,partition_id FROM mart.analytics_serving_members
   WHERE tenant_id=$1 AND revision_id=$2 AND family='business'), latest AS(SELECT month,partition_id FROM mart.analytics_serving_members
   WHERE tenant_id=$1 AND revision_id=$3 AND family='business')
  SELECT EXISTS((SELECT * FROM previous EXCEPT SELECT * FROM latest) UNION ALL
   (SELECT * FROM latest EXCEPT SELECT * FROM previous)) changed`,[tenantId,parent,current])).rows[0]?.changed;
 if(difference)throw new CommandBusinessBaseChanged();
}
async function rebaseCommandManifest(client:PoolClient,tenantId:string,work:CommandInitialization,parent:string){
 const revision=randomUUID();
 await client.query(`INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose)
  VALUES($1,$2,$3,$4,ARRAY[$5::date],'business')`,[tenantId,revision,parent,work.source_cutoff,work.month+'-01']);
 await copyCommandManifest(client,{tenantId,revision,parent,month:work.month+'-01',partition:work.partition_id!});
 // Existing binding guard recomputes configuration/signature/cutoff. Business
 // bindings reuse only a sealed matching input; other families follow latest.
 await client.query(`INSERT INTO mart.prepared_bindings
  SELECT tenant_id,$2,family,kind,period,data_id,input_fingerprint,source_cutoff,statistics FROM mart.prepared_bindings
  WHERE tenant_id=$1 AND ((revision_id=$3 AND family='business') OR (revision_id=$4 AND family<>'business'))`,
  [tenantId,revision,work.revision_id,parent]);
 await copyPopulationBindings(client,tenantId,revision,work.revision_id!);
 await client.query("INSERT INTO mart.prepared_revision_seals VALUES($1,$2,'prepared-v1')",[tenantId,revision]);
 return revision;
}
