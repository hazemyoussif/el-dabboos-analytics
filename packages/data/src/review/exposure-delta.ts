import type {PoolClient} from 'pg';
import {BusinessDeltaWorkspace,readBusinessDeltaBaseline} from '../business/delta-store.ts';
import type {BusinessDeltaExtraction} from './exposure.ts';
import {readBusinessRecipeObservations} from '../business/observations.ts';
import {reviewBusinessDate} from './cutoff.ts';

/** Existing exposure transaction owns the tenant lock, source lease and rollback.
 * Only a source adapter with complete recipe replacements may call this path.
 */
export async function captureBusinessDelta(client:PoolClient,scope:{source:BusinessDeltaExtraction;parent:string}){
 const {source,parent}=scope;
 const baseline=await readBusinessDeltaBaseline(client,{tenantId:source.tenantId,parentRevision:parent,month:source.month});
 const workspace=new BusinessDeltaWorkspace(client,baseline,{cutoff:source.cutoff,revision:source.revision,mapping:source.mapping});
 const observed=observedRecipes(source);
 await workspace.open();
 const priorObservations=await readBusinessRecipeObservations(client,source.tenantId,baseline.partitionId);
 const previousCutoff=priorObservations.filter(observation=>observed.includes(observation.object)).map(observation=>observation.cutoff).sort()[0]??baseline.cutoff;
 const initialize=observed.every(object=>!priorObservations.some(observation=>observation.object===object));
 if(source.allocationChanges)for await(const changes of source.allocationChanges)await workspace.allocationChanges(changes,{previousCutoff,objects:observed,initialize});
 for(const object of source.replaceObjects??[]){
  if(!observed.includes(object))throw new Error('Unobserved Business recipe replacement');
  await workspace.requestPreviousObject(object);
 }
 if(source.discover)await source.discover(async(object,ids)=>{
  if(!observed.includes(object))throw new Error('Unobserved Business recipe discovery');
  await workspace.request(object,ids);
 });
 if(source.allocationDeletions)await source.allocationDeletions.discover(records=>workspace.requestAllocationDeletions(records,observed),client);
 await captureReplacements(source,workspace,observed);
 const controls=await workspace.incrementalControls();
 await source.assertAlive();
 const impact=await workspace.seal(controls);
 const observations=await readBusinessRecipeObservations(client,source.tenantId,baseline.partitionId);
 const day=reviewBusinessDate(source.cutoff,source.mapping.measures[0]!.timeZone);
 const end=new Date(Date.UTC(Number(source.month.slice(0,4)),Number(source.month.slice(5)),0)).toISOString().slice(0,10);
 const through=day<end?day:end;
 const unchanged=!initialize&&impact.changed===0&&observed.every(object=>observations.find(observation=>observation.object===object)?.day===through);
 return {workspace,baseline,observed,controls,impact,unchanged};
}
export type CapturedBusinessDelta=Awaited<ReturnType<typeof captureBusinessDelta>>;

function observedRecipes(source:BusinessDeltaExtraction){
 const objects=[...new Set(source.mapping.measures.map(rule=>rule.sourceObject))];
 const observed=source.observedObjects??objects;
 if(!observed.length||new Set(observed).size!==observed.length||observed.some(object=>!objects.includes(object)))throw new Error('Distinct mapped Business recipes required');
 return observed;
}

/** Every complete identity replacement is paired with independent source controls. */
async function captureReplacements(source:BusinessDeltaExtraction,workspace:BusinessDeltaWorkspace,observed:readonly string[]){
 for await(const replacements of source.replacements){
  if(replacements.some(replacement=>!observed.includes(replacement.object)))throw new Error('Unobserved Business recipe replacement');
  await workspace.replace(replacements);
  for(const object of new Set(replacements.map(replacement=>replacement.object))){
   const ids=replacements.filter(replacement=>replacement.object===object).map(replacement=>replacement.id);
   await workspace.controlScope(object,ids,await source.identityControls(object,ids));
  }
 }
 for await(const request of workspace.requestedIdentities()){
  const read=source.readReplacements??source.allocationDeletions?.replacements;
  if(!read)throw new Error('Business requested identity reader required');
  for await(const replacements of read(request.object,request.ids))await workspace.replace(replacements);
  await workspace.controlScope(request.object,request.ids,await source.identityControls(request.object,request.ids));
 }
}

/** Fresh exact controls with unchanged content do not create another raw copy or preparation. */
export async function recordUnchangedBusinessDelta(client:PoolClient,source:BusinessDeltaExtraction,captured:CapturedBusinessDelta){
 if(!captured.unchanged)throw new Error('Unchanged Business observation required');
 await client.query(`INSERT INTO mart.business_recipe_checks(tenant_id,partition_id,source_object,source_cutoff,source_revision,business_day,control_fingerprint)
  SELECT $1,$2,object,$4,$5,observation.business_day,mart.business_recipe_control_fingerprint($1,$2,object)
  FROM unnest($3::text[]) object CROSS JOIN LATERAL (
   SELECT rule->>'measureId' measure FROM mart.review_extractions extraction,
   LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
   WHERE extraction.tenant_id=$1 AND extraction.partition_id=$2 AND rule->>'sourceObject'=object LIMIT 1
  ) recipe CROSS JOIN LATERAL mart.business_measure_observation($1,$2,recipe.measure) observation
  WHERE observation.source_cutoff<$4::timestamptz`,
  [source.tenantId,captured.baseline.partitionId,captured.observed,source.cutoff,source.revision]);
 await captured.workspace.persistAllocationLinks(captured.baseline.partitionId);
}

export async function persistBusinessDelta(client:PoolClient,scope:{source:BusinessDeltaExtraction;partitionId:string;captured:CapturedBusinessDelta}){
 const {source,partitionId}=scope;
 const {workspace,baseline,observed,controls,impact}=scope.captured;
 await workspace.persistLineage(partitionId);
 await client.query(`INSERT INTO mart.business_recipe_observations
  SELECT $1,$2,rule->>'sourceObject',
   CASE WHEN rule->>'sourceObject'=ANY($4::text[]) THEN $5::timestamptz ELSE previous.source_cutoff END,
   CASE WHEN rule->>'sourceObject'=ANY($4::text[]) THEN $6::text ELSE previous.source_revision END,
   CASE WHEN rule->>'sourceObject'=ANY($4::text[]) THEN least((extraction.month+interval '1 month - 1 day')::date,
    ($5::timestamptz AT TIME ZONE (rule->>'timeZone'))::date) ELSE previous.business_day END
  FROM mart.review_extractions extraction CROSS JOIN LATERAL (
   SELECT DISTINCT ON(value->>'sourceObject') value rule FROM jsonb_array_elements(extraction.mapping->'measures')
  ) recipe LEFT JOIN LATERAL mart.business_measure_observation($1,$3,rule->>'measureId') previous ON true
  WHERE extraction.tenant_id=$1 AND extraction.partition_id=$2`,
  [source.tenantId,partitionId,baseline.partitionId,observed,source.cutoff,source.revision]);
 let rows=0;
 for await(const page of workspace.pages()){
  rows+=page.length;if(rows>500000)throw new Error('Bounded business delta partition exceeded');
  await client.query(`INSERT INTO mart.review_facts
   SELECT $1,$2,record.key,record.payload FROM jsonb_to_recordset($3::jsonb) record(key text,payload jsonb)`,
   [source.tenantId,partitionId,JSON.stringify(page.map(({key,payload})=>({key,payload})))]);
 }
 return {rows,controls,impact};
}
