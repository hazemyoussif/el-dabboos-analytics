import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresDerivedMetricCertification } from '../../src/postgres/derived-certification.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { PostgresAnalyticsRepository } from '../../src/postgres/repository.ts';
import { database,enabled } from './support.ts';
import { deploy,mapping,clock } from './fixtures.ts';

test('append-only ratio output approval requires declared exact inputs; pending approval and unproven pairs cannot publish',{skip:!enabled},async()=>{
 const db=await database();
 try {
  const release=mapping();release.measures=release.measures.slice(0,2).map((measure,index)=>({...measure,measureId:index===0?'order_revenue':'order_count',dimensionMappings:{salesperson:'synthetic owner'}}));
  release.capabilities=[{metric:'order_revenue',dimensions:['salesperson','month']},{metric:'order_count',dimensions:['salesperson','month']},{metric:'average_confirmed_order_value',dimensions:['salesperson','month']}];
  await deploy(db.migrator,release);
  const original=(await tenantTransaction(db.migrator,'a',client=>client.query("SELECT specification,approval_case_ids,approval_reference FROM mart.mapping_releases WHERE tenant_id='a' AND dataset_id='release'"))).rows;
  const certificate={tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'SYNTHETIC-OUTPUT',metric:'average_confirmed_order_value' as const,grouping:null,from:'2026-01-01',to:'2026-01-31',caseIds:['fixture-certification-order_revenue','fixture-certification-order_count'],approvalReference:'SYNTHETIC-APPROVER',approvedAt:clock().toISOString(),businessSemantics:'Confirmed order revenue divided by confirmed order count; zero denominator is null',technicalReference:'synthetic-exact-operand-controls'};
  const writer=new PostgresDerivedMetricCertification(db.migrator);
  await assert.rejects(writer.record({...certificate,approvalReference:''}),/approval/);
  await assert.rejects(writer.record({...certificate,reference:'unproven-pair',grouping:'salesperson'}),/scope|compatible/);
  await writer.record(certificate);
  const repo=new PostgresAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const published=await repo.getPublishedCapabilities({tenantId:'a',locale:'en'});
  assert.equal(published.releases[0]!.capabilities.find(capability=>capability.metric==='average_confirmed_order_value')?.summary,true);
  assert.deepEqual(published.releases[0]!.capabilities.find(capability=>capability.metric==='average_confirmed_order_value')?.dimensions,[]);
  const query={metric:'average_confirmed_order_value' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}};
  assert.equal((await repo.execute(query,{tenantId:'a',locale:'en'})).rows[0]!.value,null);
  await assert.rejects(repo.execute({...query,groupBy:'salesperson'},{tenantId:'a',locale:'en'}),/Uncertified/);
  await assert.rejects(tenantTransaction(db.migrator,'a',client=>client.query("UPDATE mart.derived_metric_certifications SET reference='rewrite'")),/immutable|history/i);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('SELECT specification FROM mart.derived_metric_certifications'),true),/permission/);
  assert.equal((await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.published_derived_coverage($1,$2)',['a','release']),true)).rowCount,0);
  const after=(await tenantTransaction(db.migrator,'a',client=>client.query("SELECT specification,approval_case_ids,approval_reference FROM mart.mapping_releases WHERE tenant_id='a' AND dataset_id='release'"))).rows;
  assert.deepEqual(after,original);
 }finally{await db.close();}
});

test('approved positive ratios reconcile operands, weight totals, preserve group isolation and do not sum averages',{skip:!enabled},async()=>{
 const {PostgresMappingReleases}=await import('../../src/postgres/mapping-releases.ts');
 const {PostgresMartWriter}=await import('../../src/postgres/writer.ts');
 const {PostgresReconciliation}=await import('../../src/postgres/reconciliation.ts');
 const {PostgresReleaseCertification}=await import('../../src/postgres/release-certification.ts');
 const {batch,fact,evidence}=await import('./fixtures.ts');
 const db=await database();
 try{
  const release=mapping();release.measures=release.measures.slice(0,2).map((measure,index)=>({...measure,measureId:index===0?'order_revenue':'order_count',dimensionMappings:{salesperson:'synthetic owner'}}));
  release.capabilities=[{metric:'order_revenue',dimensions:['salesperson']},{metric:'order_count',dimensions:['salesperson']},{metric:'average_confirmed_order_value',dimensions:['salesperson']}];
  const releases=new PostgresMappingReleases(db.migrator);await releases.registerCandidate({...release,approval:{status:'pending'}});
  const records=['one','two'].map((owner,index)=>({facts:[fact(owner,{measureId:'order_revenue',value:`${(index+1)*10}.000000`,businessDate:'2026-01-15',batchId:'positive',dimensions:{salesperson:owner}}),fact(owner,{measureId:'order_count',value:'1.000000',businessDate:'2026-01-15',batchId:'positive',dimensions:{salesperson:owner}})]}));
  await new PostgresMartWriter(db.migrator,{a:['fixture-company']},clock).commit(batch('positive',2),records,{...evidence,completeness:'complete_scope'});
  const controls=[];
  for(const measure of ['order_revenue','order_count'] as const) for(const grouping of [null,'salesperson'] as const){
   const keys=grouping?['one','two']:[null];
   const expected=keys.map((key,index)=>({caseId:`positive-${measure}-${key??'summary'}`,tenantId:'a',datasetId:'release',mappingVersion:'1',measureId:measure,sourceReportReference:'SYNTHETIC POSITIVE SOURCE',frozenRevision:'freeze-1',batchIds:['positive'],from:'2026-01-01',to:'2026-01-31',grouping,groupKey:key,expectedValue:measure==='order_count'?(key?'1.000000':'2.000000'):(key?`${(index+1)*10}.000000`:'30.000000'),actualValue:'0.000000',expectedCount:key?'1':'2',actualCount:'0',tolerance:{status:'approved' as const,absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'SYNTHETIC'}}));
   controls.push(...(await new PostgresReconciliation(db.migrator).record(expected,'IQD')).cases);
  }
  const caseIds=controls.map(control=>control.caseId);
  await new PostgresReleaseCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'SYNTHETIC-POSITIVE',approverReference:'synthetic',approvedAt:clock().toISOString(),companyIds:['fixture-company'],from:'2026-01-01',to:'2026-01-31',caseIds,technicalReference:'synthetic',evidenceKind:'authorized_business_approval',approvedValues:[{measureId:'order_revenue',value:'30.000000'}],businessSemantics:['SYNTHETIC']});
  await releases.approve({tenantId:'a',datasetId:'release',caseIds,reference:'SYNTHETIC-POSITIVE',approvedAt:clock().toISOString()});
  await tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.serving_bindings VALUES('a','release')"));
  for(const grouping of [null,'salesperson'] as const) await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:`SYNTHETIC-RATIO-${grouping??'summary'}`,metric:'average_confirmed_order_value',grouping,from:'2026-01-01',to:'2026-01-31',caseIds:controls.filter(control=>control.grouping===grouping).map(control=>control.caseId),approvalReference:'SYNTHETIC',approvedAt:clock().toISOString(),businessSemantics:'Governed confirmed-order ratio',technicalReference:'synthetic'});
  await tenantTransaction(db.migrator,'a',client=>client.query("SELECT mart.refresh_proof_results('a','release')"));
  assert.equal((await tenantTransaction(db.migrator,'a',client=>client.query('SELECT count(*)::int count FROM mart.derived_proof_results'))).rows[0].count,2);
  const repo=new PostgresAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});const query={metric:'average_confirmed_order_value' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}};const context={tenantId:'a',locale:'en' as const};
  assert.equal((await repo.execute(query,context)).rows[0]!.value,15);
  assert.deepEqual((await repo.execute({...query,groupBy:'salesperson'},context)).rows,[{key:'one',value:10},{key:'two',value:20}]);
  assert.equal((await repo.execute(query,context)).metadata.release!.outputCertificationReference,'SYNTHETIC-RATIO-summary');
  await tenantTransaction(db.runtime,'a',async client=>{
   const published=await client.query('SELECT * FROM mart.published_derived_coverage($1,$2)',['a','release']);
   await new PostgresMartWriter(db.migrator,{a:['fixture-company']},clock).commit(batch('unexpected',1),[{facts:[fact('three',{measureId:'order_revenue',value:'0.000000',businessDate:'2026-01-15',batchId:'unexpected',dimensions:{salesperson:'three'}})]}],{...evidence,completeness:'complete_scope'});
   // The in-flight repeatable-read request retains both its old facts and proof.
   assert.deepEqual((await client.query('SELECT * FROM mart.published_derived_coverage($1,$2)',['a','release'])).rows,published.rows);
   assert.equal((await client.query("SELECT count(*)::int count FROM mart.canonical_facts WHERE measure_id='order_revenue'")).rows[0].count,2);
  },true);
  assert.equal((await tenantTransaction(db.migrator,'a',client=>client.query('SELECT count(*)::int count FROM mart.derived_proof_results'))).rows[0].count,0);
  const changed=await repo.getPublishedCapabilities(context);
  assert.equal(changed.releases[0]!.capabilities.some(capability=>capability.metric==='average_confirmed_order_value'),false);
  await assert.rejects(repo.execute({...query,groupBy:'salesperson'},context),/Uncertified/);

 }finally{await db.close();}
});
