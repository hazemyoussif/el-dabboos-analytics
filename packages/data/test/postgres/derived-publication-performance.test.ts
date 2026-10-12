import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,enabled} from './support.ts';
import {mapping,batch,fact,evidence,clock,certify,deploy} from './fixtures.ts';
import {PostgresMappingReleases} from '../../src/postgres/mapping-releases.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';
import {PostgresReconciliation} from '../../src/postgres/reconciliation.ts';
import {PostgresDerivedMetricCertification} from '../../src/postgres/derived-certification.ts';
import {promoteLocalBoundedRelease} from '../../src/postgres/local-bounded-promotion.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {importCertifiedHistoricalMonth} from '../../src/operational/historical-import.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import type {ReconciliationCase} from '@el-dabboos/domain';

type Database=Awaited<ReturnType<typeof database>>;
function candidateMapping(datasetId:string) {
 const candidate=mapping();candidate.datasetId=datasetId;candidate.approval={status:'pending'};
 candidate.measures=candidate.measures.slice(0,2).map((rule,index)=>({...rule,measureId:index===0?'order_revenue':'order_count',dimensionMappings:{customer:'Synthetic identity',salesperson:'Synthetic owner'}}));
 candidate.capabilities=[{metric:'order_revenue',dimensions:['customer','salesperson']},{metric:'order_count',dimensions:['customer','salesperson']},{metric:'average_confirmed_order_value',dimensions:['customer','salesperson']}];
 return candidate;
}
async function bootstrap(db:Database) {
 const anchor=candidateMapping('anchor');
 await deploy(db.migrator,anchor,undefined,anchor.measures.map(rule=>fact('anchor-'+rule.measureId,{datasetId:'anchor',measureId:rule.measureId,value:'0.000000',businessDate:'2026-01-15',dimensions:{customer:'anchor',salesperson:'owner-1'}})));
 await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId:'anchor',mappingVersion:'1',reference:'SYNTHETIC ANCHOR RATIO',metric:'average_confirmed_order_value',grouping:null,from:'2026-01-01',to:'2026-01-31',caseIds:['fixture-certification-order_revenue','fixture-certification-order_count'],approvalReference:'SYNTHETIC TEST ONLY',approvedAt:clock().toISOString(),businessSemantics:'Synthetic governed zero-denominator baseline',technicalReference:'Synthetic exact inputs'});
 await bootstrapOperationalServing(db.migrator,'a');
}
async function seed(db:Database,datasetId:string,records:number) {
 const candidate=candidateMapping(datasetId);
 await new PostgresMappingReleases(db.migrator).registerCandidate(candidate);
 const facts=candidate.measures.map(rule=>fact('1',{datasetId,batchId:datasetId,businessDate:'2025-12-15',measureId:rule.measureId,value:rule.measureId==='order_count'?'1.000000':'10.000000',dimensions:{customer:'customer-1',salesperson:'owner-1'}}));
 await new PostgresMartWriter(db.ingestor,{a:['fixture-company']},clock).commit({...batch(datasetId,1),datasetId},[{facts}],{...evidence,completeness:'complete_scope'});
 // Bulk synthetic clones retain the validated seed fields; fixture-only maintenance
 // skips per-row FK probes. All triggers are restored before exercising the product.
 const fixtureClient=await db.admin.connect();
 try {
  await fixtureClient.query('SET session_replication_role=replica');
  await fixtureClient.query(`INSERT INTO mart.fact_revisions SELECT expanded.* FROM mart.fact_revisions seed CROSS JOIN generate_series(2,$2::int) identity CROSS JOIN LATERAL jsonb_populate_record(NULL::mart.fact_revisions,to_jsonb(seed)||jsonb_build_object('fact_key',seed.fact_key||':'||identity,'source_record_id',identity::text,'customer','customer-'||identity,'salesperson','owner-'||(identity%12))) expanded WHERE seed.tenant_id='a' AND seed.dataset_id=$1`,[datasetId,records]);
  await fixtureClient.query('INSERT INTO mart.batch_facts SELECT tenant_id,dataset_id,batch_id,fact_key,source_revision FROM mart.fact_revisions WHERE tenant_id=$1 AND dataset_id=$2 ON CONFLICT DO NOTHING',['a',datasetId]);
 }finally{await fixtureClient.query('RESET session_replication_role');fixtureClient.release();}
 assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.batch_facts WHERE tenant_id=$1 AND dataset_id=$2',['a',datasetId])).rows[0].count,records*2);
}
function controls(records:number):ReconciliationCase[] {
 return (['order_revenue','order_count'] as const).flatMap(measureId=>([null,'customer','salesperson'] as const).flatMap(grouping=>{
  const populations=new Map<string|null,number>();
  for(let identity=1;identity<=records;identity++){const key=grouping==='customer'?`customer-${identity}`:grouping==='salesperson'?`owner-${identity%12}`:null;populations.set(key,(populations.get(key)??0)+1);}
  return [...populations].map(([groupKey,population])=>({tenantId:'a',datasetId:'release',mappingVersion:'1',caseId:`${measureId}-${grouping}-${groupKey}`,measureId,sourceReportReference:'SYNTHETIC independent population',frozenRevision:'freeze-1',batchIds:['release'],from:'2025-12-01',to:'2025-12-31',grouping,groupKey,expectedValue:`${population*(measureId==='order_count'?1:10)}.000000`,actualValue:'0.000000',expectedCount:String(population),actualCount:'0',tolerance:{status:'approved',absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'SYNTHETIC'}}));
 }));
}
test('monthly ratio publication and replay stay scoped with 4000 customers and 280k unrelated revisions',{skip:!enabled,timeout:600000},async()=>{
 const db=await database();
 try {
  await bootstrap(db);
  await seed(db,'release',4000);await seed(db,'unrelated-history',140000);
  await db.admin.query('ANALYZE mart.fact_revisions,mart.batch_facts,mart.ingestion_batches');
  const cases:ReconciliationCase[]=[];
  for(const measure of ['order_revenue','order_count'])for(const grouping of [null,'customer','salesperson']){
   const checked=await new PostgresReconciliation(db.migrator).record(controls(4000).filter(control=>control.measureId===measure&&control.grouping===grouping),'IQD');
   assert.equal(checked.status,'passed');cases.push(...checked.cases);
  }
  const caseIds=cases.map(control=>control.caseId),reference='SYNTHETIC TEST ONLY';
  await certify(db.migrator,{tenantId:'a',datasetId:'release',caseIds,from:'2025-12-01',to:'2025-12-31',measureId:'order_revenue',value:'40000.000000'});
  await new PostgresMappingReleases(db.migrator).approve({tenantId:'a',datasetId:'release',reference,caseIds,approvedAt:clock().toISOString()});
  const original=await readFile(new URL('../../migrations/postgres/021_certified_proof_results.sql',import.meta.url),'utf8');
  const start=original.indexOf('CREATE FUNCTION mart.derived_inputs_exact_uncached'),end=original.indexOf('\n$$;',start)+4;
  await db.admin.query(original.slice(start,end).replace('derived_inputs_exact_uncached','synthetic_original_derived_inputs'));
  for(const grouping of [null,'customer','salesperson'] as const){
   const selected=cases.filter(control=>control.grouping===grouping).map(control=>control.caseId);
   const started=performance.now();
   await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:`ratio-${grouping}`,metric:'average_confirmed_order_value',grouping,from:'2025-12-01',to:'2025-12-31',caseIds:selected,approvalReference:reference,approvedAt:clock().toISOString(),businessSemantics:'SYNTHETIC exact ratio',technicalReference:'SYNTHETIC exact controls'});
   process.stdout.write(`scoped-ratio-publication ${JSON.stringify({grouping,cases:selected.length,ms:performance.now()-started})}\n`);
   await tenantTransaction(db.migrator,'a',async client=>{
    for(const ids of [selected,selected.slice(1),[...selected,selected[0]!]]){
     const result=await client.query('SELECT mart.derived_inputs_exact_uncached($1,$2,$3,$4,$5,$6,$7) current,mart.synthetic_original_derived_inputs($1,$2,$3,$4,$5,$6,$7) original',['a','release','average_confirmed_order_value',grouping,'2025-12-01','2025-12-31',ids]);
     assert.equal(result.rows[0].current,result.rows[0].original);
    }
   },false,120000);
  }
  const scope={tenantId:'a',datasetId:'release',reference};
  const promoted=await promoteLocalBoundedRelease(db.migrator,scope);assert.equal(promoted.alreadyPromoted,false);
  assert.deepEqual(await promoteLocalBoundedRelease(db.migrator,scope),{...promoted,alreadyPromoted:true});
  const imported=await importCertifiedHistoricalMonth(db.migrator,{tenantId:'a',month:'2025-12',datasets:['release'],approvalReference:reference});assert.equal(imported.alreadyImported,false);
  const replay=await importCertifiedHistoricalMonth(db.migrator,{tenantId:'a',month:'2025-12',datasets:['release'],approvalReference:reference});assert.equal(replay.revisionId,imported.revisionId);assert.equal(replay.alreadyImported,true);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const result=await repository.execute({metric:'average_confirmed_order_value',dateRange:{from:'2025-12-01',to:'2025-12-31'}},{tenantId:'a',locale:'en'});assert.equal(result.rows[0]?.value,10,JSON.stringify(result));
  const hidden=await tenantTransaction(db.migrator,'b',client=>client.query("SELECT mart.derived_inputs_exact_uncached('a','release','average_confirmed_order_value',NULL,'2025-12-01','2025-12-31',$1) exact",[caseIds]));assert.equal(hidden.rows[0].exact,false);
 }finally{await db.close();}
});
