import type {PoolClient} from 'pg';
import type {ProductionFact,SourceMapping} from '@el-dabboos/domain';
import {validateProductionFact} from '@el-dabboos/domain';
import {compatibleBusinessDeltaMapping} from './delta-mapping.ts';
import {stableContent} from '../operational/facts.ts';
import {businessDefinitionVersion} from './definitions.ts';
import type {ReviewControl} from '../review/source.ts';
import {allocationDeletionRequests,allocationChangeRequests} from './allocation-impact.ts';
import type {RecordedAllocationDeletion} from '../operational/contracts.ts';
import type {CommandAllocationChange} from './allocation-changes.ts';

export interface BusinessDeltaBaseline {
 tenantId:string;partitionId:string;parentRevision:string;month:string;
 cutoff:string;sourceRevision:string;mapping:SourceMapping;
}
/** A replacement is the complete output of one recipe identity, including no output.
 * A moved event must be replaced in both its previous and current month.
 */
export interface BusinessIdentityReplacement {
 object:string;id:string;facts:readonly ProductionFact[];
}

/** Resolve this family's watermark, never the unrelated operational cursor.
 * The existing tenant transaction and analytics advisory lock must own this read.
 */
export async function readBusinessDeltaBaseline(client:PoolClient,scope:{tenantId:string;parentRevision:string;month:string}):Promise<BusinessDeltaBaseline> {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month))throw new Error('Explicit business delta month required');
 const rows=(await client.query(`SELECT member.partition_id,extraction.source_cutoff,extraction.source_revision,
  extraction.definition_version,extraction.mapping
  FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE trusted.tenant_id=$1 AND trusted.revision_id=$2 AND member.month=$3
  AND member.family='business' AND extraction.completed`,[scope.tenantId,scope.parentRevision,scope.month+'-01'])).rows;
 if(rows.length!==1||rows[0].definition_version!==businessDefinitionVersion())throw new Error('Accepted compatible business baseline required');
 const row=rows[0];
 return {tenantId:scope.tenantId,parentRevision:scope.parentRevision,month:scope.month,partitionId:row.partition_id,
  cutoff:row.source_cutoff.toISOString(),sourceRevision:row.source_revision,mapping:row.mapping};
}

/** Bounded replacement workspace; unchanged rows remain in the accepted parent.
 * Migration 068 proves scoped source evidence plus that immutable baseline.
 * This workspace does not certify or publish a partition on its own.
 */
export class BusinessDeltaWorkspace {
 private state:'new'|'capturing'|'sealed'|'failed'='new';
 constructor(private readonly client:PoolClient,private readonly baseline:BusinessDeltaBaseline,private readonly observation:{cutoff:string;revision:string;mapping:SourceMapping}){}
 async open(){
  if(this.state!=='new')throw new Error('Business delta workspace already opened');
  this.state='failed';
  if(!Number.isFinite(Date.parse(this.observation.cutoff))||Date.parse(this.observation.cutoff)<=Date.parse(this.baseline.cutoff)||
   !this.observation.revision.trim()||!compatibleBusinessDeltaMapping(this.baseline.mapping,this.observation.mapping))throw new Error('Newer source observation and compatible Business mapping required');
  await this.assertParent();
  await this.client.query(`CREATE TEMP TABLE business_delta_identities (
   source_object text,source_record_id text,dirty boolean NOT NULL DEFAULT true,PRIMARY KEY(source_object,source_record_id)
  ) ON COMMIT DROP`);
  await this.client.query(`CREATE TEMP TABLE business_delta_facts (
   fact_key text PRIMARY KEY,payload jsonb NOT NULL
  ) ON COMMIT DROP`);
  await this.client.query('CREATE TEMP TABLE business_delta_previous (fact_key text PRIMARY KEY,payload jsonb NOT NULL) ON COMMIT DROP');
  await this.client.query('CREATE TEMP TABLE business_delta_allocation_links (id text PRIMARY KEY,effective_from date NOT NULL,links jsonb NOT NULL) ON COMMIT DROP');
  await this.client.query(`CREATE TEMP TABLE business_delta_requests (
   source_object text,source_record_id text,PRIMARY KEY(source_object,source_record_id)
  ) ON COMMIT DROP`);
  await this.client.query(`CREATE TEMP TABLE business_delta_control_scopes (
   source_object text,source_record_id text,PRIMARY KEY(source_object,source_record_id)
  ) ON COMMIT DROP`);
  await this.client.query(`CREATE TEMP TABLE business_delta_source_controls (
   measure text NOT NULL,dimensions jsonb,value numeric NOT NULL,count bigint NOT NULL
  ) ON COMMIT DROP`);
  this.state='capturing';
 }
 async requestAllocationDeletions(deletions:readonly RecordedAllocationDeletion[],objects?:readonly string[]){
  if(this.state!=='capturing')throw new Error('Active business delta capture required');
  this.state='failed';
  if(deletions.some(record=>!Number.isFinite(Date.parse(record.dependencyCutoff))||Date.parse(record.dependencyCutoff)>Date.parse(this.observation.cutoff)))throw new Error('Allocation deletion footprint exceeds source observation');
  const requests=allocationDeletionRequests(this.observation.mapping,deletions).filter(request=>!objects||objects.includes(request.object));
  await this.client.query(`INSERT INTO pg_temp.business_delta_requests
   SELECT object,id FROM jsonb_to_recordset($1::jsonb) request(object text,id text) WHERE true
   ON CONFLICT DO NOTHING`,[JSON.stringify(requests)]);
  this.state='capturing';
 }
 async allocationChanges(changes:readonly CommandAllocationChange[],scope:{previousCutoff:string;objects:readonly string[];initialize:boolean}){
  if(this.state!=='capturing'||changes.length>1000)throw new Error('Bounded active allocation dependency scope required');
  const previous=(await this.client.query(`SELECT DISTINCT ON(source_record_id) source_record_id id,allocation_links links,
   effective_from::text "from",source_cutoff FROM mart.business_allocation_links
   WHERE tenant_id=$1 AND source_id=$2 AND source_record_id=ANY($3::text[]) AND source_cutoff<=$4
   ORDER BY source_record_id,source_cutoff DESC`,
   [this.baseline.tenantId,this.baseline.mapping.sourceId,changes.map(change=>change.id),scope.previousCutoff])).rows;
  const byId=new Map(previous.map(record=>[record.id,record]));
  const requests=changes.flatMap(change=>allocationChangeRequests(this.observation.mapping,change,byId.get(change.id),{...scope,cutoff:this.observation.cutoff}));
  for(let offset=0;offset<requests.length;offset+=1000)await this.client.query(`INSERT INTO pg_temp.business_delta_requests
   SELECT object,id FROM jsonb_to_recordset($1::jsonb) request(object text,id text) WHERE true ON CONFLICT DO NOTHING`,[JSON.stringify(requests.slice(offset,offset+1000))]);
  await this.client.query(`INSERT INTO pg_temp.business_delta_allocation_links
   SELECT id,"from"::date,links FROM jsonb_to_recordset($1::jsonb) record(id text,"from" text,links jsonb)`,[JSON.stringify(changes)]);
 }
 async persistAllocationLinks(partitionId:string){
  if(this.state!=='sealed')throw new Error('Sealed Business source dependency evidence required');
  await this.client.query(`INSERT INTO mart.business_allocation_links
   SELECT $1,$2,id,$3,$4,$5,effective_from,links FROM pg_temp.business_delta_allocation_links`,
   [this.baseline.tenantId,this.baseline.mapping.sourceId,this.observation.cutoff,this.observation.revision,partitionId]);
 }
 async request(object:string,ids:readonly string[]){
  // Canonical source identities are opaque strings; recipe adapters own their syntax.
  if(this.state!=='capturing'||ids.length>1000||!this.observation.mapping.measures.some(rule=>rule.sourceObject===object)||ids.some(id=>!id.trim()||id.length>160||id!==id.trim()))throw new Error('Bounded governed Business identity request required');
  await this.client.query(`INSERT INTO pg_temp.business_delta_requests SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING`,[object,ids]);
 }
 async requestPreviousObject(object:string){
  if(this.state!=='capturing'||!this.observation.mapping.measures.some(rule=>rule.sourceObject===object))throw new Error('Governed Business recipe required');
  await this.client.query(`INSERT INTO pg_temp.business_delta_requests SELECT DISTINCT $3,payload->>'sourceRecordId'
   FROM mart.review_effective_facts($1,$2) WHERE payload->>'sourceObject'=$3
   ON CONFLICT DO NOTHING`,[this.baseline.tenantId,this.baseline.partitionId,object]);
 }
 async controlScope(object:string,ids:readonly string[],controls:readonly ReviewControl[]){
  if(this.state!=='capturing'||!ids.length||ids.length>1000||new Set(ids).size!==ids.length||controls.length>20000||controls.some(control=>control.count===null||!/^\d+$/.test(control.count)||!this.observation.mapping.measures.some(rule=>rule.sourceObject===object&&rule.measureId===control.measure)))throw new Error('Bounded independent Business control scope required');
  if(new Set(controls.map(control=>stableContent([control.measure,control.dimensions]))).size!==controls.length)throw new Error('Duplicate independent Business identity control');
  const processed=(await this.client.query(`SELECT count(*)::int count FROM pg_temp.business_delta_identities
   WHERE source_object=$1 AND source_record_id=ANY($2::text[])`,[object,ids])).rows[0].count;
  if(processed!==ids.length)throw new Error('Complete Business replacements must precede their controls');
  await this.client.query('INSERT INTO pg_temp.business_delta_control_scopes SELECT $1,unnest($2::text[])',[object,ids]);
  for(let offset=0;offset<controls.length;offset+=1000)await this.client.query(`INSERT INTO pg_temp.business_delta_source_controls
   SELECT measure,dimensions,value::numeric,count::bigint FROM jsonb_to_recordset($1::jsonb) control(measure text,dimensions jsonb,value text,count text)`,[JSON.stringify(controls.slice(offset,offset+1000))]);
 }
 /** Accepted aggregate minus accepted changed roots plus independently aggregated new roots. */
 async incrementalControls():Promise<ReviewControl[]>{
  if(this.state!=='capturing')throw new Error('Active Business delta capture required');
  if((await this.client.query(`SELECT 1 FROM pg_temp.business_delta_identities identity WHERE NOT EXISTS(
   SELECT 1 FROM pg_temp.business_delta_control_scopes control WHERE control.source_object=identity.source_object
    AND control.source_record_id=identity.source_record_id) LIMIT 1`)).rowCount)throw new Error('Business identity source controls incomplete');
  if((await this.client.query('SELECT 1 FROM mart.review_controls WHERE tenant_id=$1 AND partition_id=$2 AND expected_count IS NULL LIMIT 1',[this.baseline.tenantId,this.baseline.partitionId])).rowCount)throw new Error('Accepted Business identity counts required for incremental controls');
  const rows=(await this.client.query(`WITH previous AS MATERIALIZED (
   SELECT fact.payload FROM pg_temp.business_delta_previous fact WHERE EXISTS(SELECT 1 FROM pg_temp.business_delta_control_scopes scope
    WHERE scope.source_object=fact.payload->>'sourceObject' AND scope.source_record_id=fact.payload->>'sourceRecordId')
  ),removed AS (
   SELECT payload->>'measureId' measure,CASE WHEN grouping(payload->'dimensions')=1 THEN NULL ELSE payload->'dimensions' END dimensions,
    -sum((payload->>'value')::numeric) value,-count(*) count FROM previous
   GROUP BY GROUPING SETS ((payload->>'measureId',payload->'dimensions'),(payload->>'measureId'))
  ),operands AS (
   SELECT measure_id measure,dimensions,expected_value value,expected_count count FROM mart.review_controls WHERE tenant_id=$1 AND partition_id=$2
   UNION ALL SELECT * FROM removed UNION ALL SELECT * FROM pg_temp.business_delta_source_controls
   UNION ALL SELECT rule->>'measureId',NULL::jsonb,0::numeric,0::bigint FROM jsonb_array_elements($3::jsonb) rule
  ) SELECT measure,dimensions,sum(value)::numeric(30,6)::text value,sum(count)::text count
   FROM operands GROUP BY measure,dimensions HAVING dimensions IS NULL OR sum(count)<>0 OR sum(value)<>0`,
   [this.baseline.tenantId,this.baseline.partitionId,JSON.stringify(this.observation.mapping.measures)])).rows;
  if(rows.length>500128||rows.some(row=>row.count===null||BigInt(row.count)<0n))throw new Error('Business incremental control evidence invalid');
  return rows as ReviewControl[];
 }
 async *requestedIdentities():AsyncGenerator<{object:string;ids:string[]}> {
  if(this.state!=='capturing')throw new Error('Active business delta capture required');
  const objects=(await this.client.query('SELECT DISTINCT source_object FROM pg_temp.business_delta_requests ORDER BY source_object')).rows;
  for(const row of objects){
   let after='';
   for(;;){
    const records=(await this.client.query(`SELECT requested.source_record_id FROM pg_temp.business_delta_requests requested
     WHERE requested.source_object=$1 AND requested.source_record_id>$2 AND NOT EXISTS(
      SELECT 1 FROM pg_temp.business_delta_identities replaced WHERE replaced.source_object=requested.source_object
      AND replaced.source_record_id=requested.source_record_id)
     ORDER BY requested.source_record_id LIMIT 1000`,[row.source_object,after])).rows;
    if(!records.length)break;
    const ids=records.map(record=>String(record.source_record_id));after=ids[ids.length-1]!;
    yield {object:String(row.source_object),ids};
   }
  }
 }
 async replace(replacements:readonly BusinessIdentityReplacement[]){
  if(this.state!=='capturing'||replacements.length>1000)throw new Error('Bounded active business delta capture required');
  this.state='failed';
  if(replacements.reduce((count,replacement)=>count+replacement.facts.length,0)>1000)throw new Error('Bounded canonical business delta page required');
  for(const replacement of replacements)this.assertReplacement(replacement);
  // The primary key rejects duplicate identities, including duplicates across pages.
  await this.client.query(`INSERT INTO pg_temp.business_delta_identities(source_object,source_record_id)
   SELECT object,id FROM jsonb_to_recordset($1::jsonb) record(object text,id text)`,
   [JSON.stringify(replacements.map(({object,id})=>({object,id})))]);
  const records=replacements.flatMap(replacement=>replacement.facts.map(fact=>({key:businessFactKey(fact),payload:fact})));
  if(records.length)await this.client.query(`INSERT INTO pg_temp.business_delta_facts
   SELECT record.key,record.payload FROM jsonb_to_recordset($1::jsonb) record(key text,payload jsonb)`,[JSON.stringify(records)]);
  await this.retainUnchanged(replacements);
  this.state='capturing';
 }
 async seal(controls:readonly ReviewControl[]){
  if(this.state!=='capturing')throw new Error('Active business delta capture required');
  this.state='failed';
  await this.assertParent();
  if((await this.client.query(`SELECT 1 FROM pg_temp.business_delta_requests requested
   WHERE NOT EXISTS(SELECT 1 FROM pg_temp.business_delta_identities replaced
    WHERE replaced.source_object=requested.source_object AND replaced.source_record_id=requested.source_record_id) LIMIT 1`)).rowCount)throw new Error('Business delta has unprocessed impact requests');
  await this.reconcile(controls);
  const impact=(await this.client.query(`SELECT DISTINCT payload->>'businessDate' AS "day" FROM (
   SELECT payload FROM pg_temp.business_delta_facts
   UNION ALL
   SELECT previous.payload FROM pg_temp.business_delta_previous previous
   WHERE EXISTS(
    SELECT 1 FROM pg_temp.business_delta_identities changed WHERE changed.dirty AND
    changed.source_object=previous.payload->>'sourceObject'
    AND changed.source_record_id=previous.payload->>'sourceRecordId')
  ) affected ORDER BY "day"`)).rows;
  this.state='sealed';
  const changed=(await this.client.query('SELECT count(*)::int count FROM pg_temp.business_delta_identities WHERE dirty')).rows[0].count as number;
  return {previousCutoff:this.baseline.cutoff,cutoff:this.observation.cutoff,changed,days:impact.map(row=>String(row.day))};
 }
 /** Only new payloads are persisted. Dirty identities with no payload are tombstones. */
 async *pages():AsyncGenerator<{key:string;payload:ProductionFact}[]> {
  if(this.state!=='sealed')throw new Error('Sealed business delta required');
  let after='';
  for(;;){
   const rows=(await this.client.query(`SELECT fact_key key,payload FROM pg_temp.business_delta_facts
    WHERE fact_key>$1 ORDER BY fact_key LIMIT 1000`,[after])).rows as {key:string;payload:ProductionFact}[];
   if(!rows.length)return;
   after=rows[rows.length-1]!.key;yield rows;
  }
 }
 async persistLineage(partitionId:string){
  if(this.state!=='sealed')throw new Error('Sealed business delta required');
  await this.assertParent();
  await this.client.query('INSERT INTO mart.business_delta_origins VALUES($1,$2,$3,$4)',
   [this.baseline.tenantId,partitionId,this.baseline.parentRevision,this.baseline.partitionId]);
  await this.client.query('INSERT INTO mart.business_delta_storage VALUES($1,$2)',[this.baseline.tenantId,partitionId]);
  await this.client.query(`INSERT INTO mart.business_delta_replacements
   SELECT $1,$2,source_object,source_record_id FROM pg_temp.business_delta_identities WHERE dirty`,[this.baseline.tenantId,partitionId]);
  await this.client.query(`INSERT INTO mart.business_delta_checked_roots
   SELECT $1,$2,source_object,source_record_id FROM pg_temp.business_delta_control_scopes`,[this.baseline.tenantId,partitionId]);
  await this.client.query(`INSERT INTO mart.business_delta_source_evidence
   SELECT $1,$2,measure,CASE WHEN dimensions IS NULL THEN 'summary' ELSE encode(sha256(convert_to(dimensions::text,'UTF8')),'hex') END,
    dimensions,sum(value),sum(count)::bigint FROM pg_temp.business_delta_source_controls GROUP BY measure,dimensions`,[this.baseline.tenantId,partitionId]);
 }
 private async retainUnchanged(replacements:readonly BusinessIdentityReplacement[]){
  const keys=replacements.flatMap(replacement=>this.observation.mapping.measures.filter(rule=>rule.sourceObject===replacement.object)
   .map(rule=>JSON.stringify([replacement.object,replacement.id,'whole',rule.measureId])));
  // Observation-only timestamp changes do not invalidate accepted business content.
  // The fixed recipes emit componentId=whole; all mapped measures are included so
  // an omitted/removed measure still makes the complete identity dirty.
  await this.client.query(`INSERT INTO pg_temp.business_delta_previous
   SELECT fact_key,payload FROM mart.review_effective_facts($1,$2,$3::text[])
   ON CONFLICT DO NOTHING`,[this.baseline.tenantId,this.baseline.partitionId,keys]);
  await this.client.query(`WITH previous AS MATERIALIZED (
   SELECT fact_key,payload FROM pg_temp.business_delta_previous WHERE fact_key=ANY($1::text[])
  ),next AS MATERIALIZED (SELECT * FROM pg_temp.business_delta_facts WHERE fact_key=ANY($1::text[])),
  difference AS (
   SELECT coalesce(next.payload,previous.payload) payload FROM previous FULL JOIN next USING(fact_key)
   WHERE (previous.payload-ARRAY['sourceAsOf','frozenRevision','sourceVersion','sourceRevision'])
    IS DISTINCT FROM (next.payload-ARRAY['sourceAsOf','frozenRevision','sourceVersion','sourceRevision'])
  ) UPDATE pg_temp.business_delta_identities identity SET dirty=EXISTS(
   SELECT 1 FROM difference WHERE payload->>'sourceObject'=identity.source_object AND payload->>'sourceRecordId'=identity.source_record_id)
   FROM jsonb_to_recordset($2::jsonb) request(object text,id text)
   WHERE identity.source_object=request.object AND identity.source_record_id=request.id`,
   [keys,JSON.stringify(replacements.map(({object,id})=>({object,id})))]);
  await this.client.query(`DELETE FROM pg_temp.business_delta_facts fact USING pg_temp.business_delta_identities identity
   WHERE NOT identity.dirty AND identity.source_object=fact.payload->>'sourceObject' AND identity.source_record_id=fact.payload->>'sourceRecordId'`);
 }
 private assertReplacement(replacement:BusinessIdentityReplacement){
  if(!replacement.id.trim()||!this.observation.mapping.measures.some(rule=>rule.sourceObject===replacement.object))throw new Error('Governed business recipe identity required');
  // Existing source recipes emit a bounded number of measures per identity.
  // Customer/stock recipes must supply their own dependency-complete identities.
  if(replacement.facts.length>1000)throw new Error('Bounded complete business identity output required');
  for(const fact of replacement.facts){
   validateProductionFact(fact,this.observation.mapping);
   if(fact.tenantId!==this.baseline.tenantId||fact.sourceObject!==replacement.object||fact.sourceRecordId!==replacement.id||
    fact.businessDate.slice(0,7)!==this.baseline.month||fact.sourceAsOf!==this.observation.cutoff||
    fact.frozenRevision!==this.observation.revision||fact.status!=='active'||fact.componentId!=='whole'||
    (fact.kind==='snapshot'&&fact.entityId!==`${replacement.object}:${replacement.id}`))throw new Error('Business delta identity, period or lineage conflict');
  }
 }
 private async assertParent(){
  const current=(await this.client.query(`SELECT 1 FROM mart.analytics_trusted_serving trusted
   JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
   WHERE trusted.tenant_id=$1 AND trusted.revision_id=$2 AND member.partition_id=$3
   AND member.family='business' AND member.month=$4 AND extraction.completed
   AND extraction.source_cutoff=$5 AND extraction.source_revision=$6
   AND extraction.mapping=$7::jsonb AND extraction.definition_version=$8`,
   [this.baseline.tenantId,this.baseline.parentRevision,this.baseline.partitionId,this.baseline.month+'-01',
    this.baseline.cutoff,this.baseline.sourceRevision,JSON.stringify(this.baseline.mapping),businessDefinitionVersion()])).rowCount;
  if(current!==1)throw new Error('Business delta parent changed');
 }
 private async reconcile(controls:readonly ReviewControl[]){
  const summaries=new Set(controls.filter(control=>control.dimensions===null).map(control=>control.measure));
  if(controls.length>500128||this.observation.mapping.measures.some(rule=>!summaries.has(rule.measureId)))throw new Error('Complete bounded Business controls required');
  const result=(await this.client.query(`WITH merged AS (
   SELECT previous.payload FROM pg_temp.business_delta_previous previous WHERE NOT EXISTS(
    SELECT 1 FROM pg_temp.business_delta_identities changed WHERE changed.dirty
    AND changed.source_object=previous.payload->>'sourceObject' AND changed.source_record_id=previous.payload->>'sourceRecordId')
   UNION ALL SELECT payload FROM pg_temp.business_delta_facts
  ),actual AS (
   SELECT payload->>'measureId' measure,CASE WHEN grouping(payload->'dimensions')=1 THEN NULL ELSE payload->'dimensions' END dimensions,
    sum((payload->>'value')::numeric) value,count(*) count FROM merged
   GROUP BY GROUPING SETS ((payload->>'measureId',payload->'dimensions'),(payload->>'measureId'))
  ),expected AS (
   SELECT measure,dimensions,sum(value) value,sum(count) count FROM pg_temp.business_delta_source_controls GROUP BY measure,dimensions
  ) SELECT NOT EXISTS(SELECT 1 FROM actual FULL JOIN expected
   ON actual.measure=expected.measure AND actual.dimensions IS NOT DISTINCT FROM expected.dimensions
   WHERE coalesce(actual.value,0) IS DISTINCT FROM coalesce(expected.value,0)
    OR coalesce(actual.count,0) IS DISTINCT FROM coalesce(expected.count,0)) exact`)).rows[0];
  if(result?.exact!==true)throw new Error('Business delta independent identity controls do not match');
 }
}
function businessFactKey(fact:ProductionFact){return JSON.stringify([fact.sourceObject,fact.sourceRecordId,fact.componentId,fact.measureId]);}
