import type {ProductionFact} from '@el-dabboos/domain';
import type {BusinessIdentityReplacement} from './delta-store.ts';

/** One bounded identity request, never a tenant-wide candidate buffer. Empty
 * outputs explicitly replace previous facts that no longer satisfy the recipe.
 */
export async function* completeBusinessIdentityReplacements(scope:{object:string;ids:readonly string[];facts:AsyncIterable<readonly ProductionFact[]>}):AsyncGenerator<BusinessIdentityReplacement[]>{
 if(scope.ids.length>1000||new Set(scope.ids).size!==scope.ids.length)throw new Error('Distinct bounded business identity request required');
 const byId=new Map(scope.ids.map(id=>[id,[] as ProductionFact[]]));
 const keys=new Set<string>();
 for await(const page of scope.facts)for(const fact of page){
  const identity=byId.get(fact.sourceRecordId);
  if(!identity||fact.sourceObject!==scope.object)throw new Error('Business source returned an unrequested identity');
  const key=JSON.stringify([fact.sourceRecordId,fact.componentId,fact.measureId]);
  if(keys.has(key))throw new Error('Duplicate business identity output');
  if(identity.length>=1000)throw new Error('Bounded business identity output exceeded');
  identity.push(fact);keys.add(key);
 }
 let batch:BusinessIdentityReplacement[]=[],facts=0;
 for(const [id,identity] of byId){
  if(batch.length&&(facts+identity.length>1000||batch.length===1000)){yield batch;batch=[];facts=0;}
  batch.push({object:scope.object,id,facts:identity});facts+=identity.length;
 }
 if(batch.length)yield batch;
}
