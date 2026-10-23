import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {SourceMapping} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture,pages} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {withSalesCommandRecipe} from '../../src/business/sales-command-mapping.ts';
import {businessCapabilities,businessDefinitionVersion} from '../../src/business/definitions.ts';

test('a second Command recipe preserves accepted definitions; changed or removed definitions and stale parents reject',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const source=fixture('2026-09',false,'business',true);
  const first=withSalesCommandRecipe(fixture('2026-09',false,'business').mapping,'command_invoice',false);
  const facts=[];for await(const page of source.facts)facts.push(...page.filter(fact=>first.measures.some(rule=>rule.measureId===fact.measureId)));
  const base=await exposeReviewMonth(db.ingestor,{...source,mapping:first,facts:pages(facts),controls:async()=>(await source.controls()).filter(control=>first.measures.some(rule=>rule.measureId===control.measure))},'business');
  const next=withSalesCommandRecipe(first,'command_receipt',false),cutoff=new Date(Date.parse(source.cutoff)+1000).toISOString();
  async function origin(candidate:SourceMapping,parent=base.revisionId){
   return tenantTransaction(db.ingestor,'a',async client=>{
    const partition=randomUUID();
    await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,capabilities) VALUES('a',$1,'2026-09-01','business',$2)",[partition,JSON.stringify(businessCapabilities(candidate,{month:'2026-09',cutoff,reference:`technical-exact:${partition}`}))]);
    await client.query("INSERT INTO mart.review_extractions VALUES('a',$1,'2026-09-01',$2,$3,$4,'SYNTHETIC ADDITIVE',$5,$6,true)",[partition,candidate.sourceId,candidate.reportingCurrency,cutoff,businessDefinitionVersion(),JSON.stringify(candidate)]);
    await client.query("INSERT INTO mart.business_delta_origins VALUES('a',$1,$2,$3)",[partition,parent,base.partitionId]);
    return partition;
   });
  }
  assert.ok(await origin(next));
  const changed={...next,measures:next.measures.map((rule,index)=>index===0?{...rule,recognitionRule:'SYNTHETIC changed definition'}:rule)};
  for(const invalid of [changed,{...next,measures:next.measures.slice(1)},{...next,capabilities:next.capabilities.slice(1)},{...next,mappingVersion:'SYNTHETIC other version'}]){
   await assert.rejects(origin(invalid),/current compatible accepted partition/);
  }
  await assert.rejects(origin(next,randomUUID()),/current compatible accepted partition/);
  assert.equal((await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id,base.revisionId);
 }finally{await db.close();}
});
