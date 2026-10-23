import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {businessCapabilities,businessDefinitionVersion} from './definitions.ts';
import {currentBusinessParent,nextPage,pageCheckpoint} from './initialization-state.ts';
import type {CommandInitialization} from './initialization-state.ts';

/** No source reads. Canonical content remains private until exact membership. */
export async function createCommandReplay(client:PoolClient,tenantId:string,work:CommandInitialization){
 const parent=await currentBusinessParent(client,tenantId,work),partition=randomUUID(),revision=randomUUID();
 await client.query(`INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,capabilities)
  VALUES($1,$2,$3,'business',$4)`,[tenantId,partition,work.month+'-01',JSON.stringify(businessCapabilities(work.mapping,
  {month:work.month,cutoff:work.source_cutoff.toISOString(),reference:`technical-exact:${partition}`}))]);
 await client.query(`INSERT INTO mart.review_extractions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
  [tenantId,partition,work.month+'-01',work.mapping.sourceId,work.mapping.reportingCurrency,
   work.source_cutoff,work.source_revision,businessDefinitionVersion(),JSON.stringify(work.mapping)]);
 if(work.base_partition){
  await client.query('INSERT INTO mart.business_delta_origins VALUES($1,$2,$3,$4)',[tenantId,partition,parent,work.base_partition]);
  await client.query('INSERT INTO mart.business_delta_storage VALUES($1,$2)',[tenantId,partition]);
 }
 await client.query('INSERT INTO mart.command_initializations VALUES($1,$2,$3,$4,$5)',[tenantId,work.candidate_id,partition,revision,parent]);
 return 'canonical_created';
}
export async function replayCommandFactPage(client:PoolClient,tenantId:string,work:CommandInitialization){
 const page=await nextPage(client,tenantId,work.candidate_id,'facts');
 const captured=(await client.query(`SELECT payload FROM mart.command_capture_facts
  WHERE tenant_id=$1 AND candidate_id=$2 AND page=$3`,[tenantId,work.candidate_id,page])).rows[0];
 if(!captured)return false;
 await client.query(`INSERT INTO mart.review_facts(tenant_id,partition_id,fact_key,payload)
  SELECT $1,$2,format('[%s,%s,"whole",%s]',to_json(fact->>'sourceObject')::text,
   to_json(fact->>'sourceRecordId')::text,to_json(fact->>'measureId')::text),fact
  FROM jsonb_array_elements($3::jsonb) fact`,[tenantId,work.partition_id,JSON.stringify(captured.payload)]);
 if(work.base_partition){
  await client.query(`INSERT INTO mart.business_delta_replacements
   SELECT DISTINCT $1,$2,fact->>'sourceObject',fact->>'sourceRecordId' FROM jsonb_array_elements($3::jsonb) fact
   ON CONFLICT DO NOTHING`,[tenantId,work.partition_id,JSON.stringify(captured.payload)]);
  await client.query(`INSERT INTO mart.business_delta_checked_roots
   SELECT DISTINCT $1,$2,fact->>'sourceObject',fact->>'sourceRecordId' FROM jsonb_array_elements($3::jsonb) fact
   ON CONFLICT DO NOTHING`,[tenantId,work.partition_id,JSON.stringify(captured.payload)]);
 }
 await pageCheckpoint(client,tenantId,work.candidate_id,'facts',page);return true;
}
export async function replayCommandControlPage(client:PoolClient,tenantId:string,work:CommandInitialization){
 const page=await nextPage(client,tenantId,work.candidate_id,'controls');
 const captured=(await client.query(`SELECT payload FROM mart.command_capture_controls
  WHERE tenant_id=$1 AND candidate_id=$2 AND page=$3`,[tenantId,work.candidate_id,page])).rows[0];
 if(!captured)return false;
 const parameters=[tenantId,work.partition_id,JSON.stringify(captured.payload)];
 const records=`SELECT $1,$2,control->>'measure',CASE WHEN control->'dimensions'='null'::jsonb THEN 'summary'
   ELSE encode(sha256(convert_to((control->'dimensions')::text,'UTF8')),'hex') END,
   nullif(control->'dimensions','null'::jsonb),(control->>'value')::numeric,(control->>'count')::bigint
   FROM jsonb_array_elements($3::jsonb) control`;
 await client.query('INSERT INTO mart.review_controls '+records,parameters);
 if(work.base_partition)await client.query('INSERT INTO mart.business_delta_source_evidence '+records,parameters);
 await pageCheckpoint(client,tenantId,work.candidate_id,'controls',page);return true;
}
export async function replayBaselineControlPage(client:PoolClient,tenantId:string,work:CommandInitialization){
 if(!work.base_partition)return false;
 const page=await nextPage(client,tenantId,work.candidate_id,'baseline_controls');
 const copied=await client.query(`INSERT INTO mart.review_controls
  SELECT tenant_id,$2,measure_id,scope_key,dimensions,expected_value,expected_count FROM mart.review_controls
  WHERE tenant_id=$1 AND partition_id=$3 ORDER BY measure_id,scope_key OFFSET $4 LIMIT 1000`,
  [tenantId,work.partition_id,work.base_partition,page*1000]);
 if(!copied.rowCount)return false;
 await pageCheckpoint(client,tenantId,work.candidate_id,'baseline_controls',page);return true;
}
