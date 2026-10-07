import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {mapping,batch,fact,evidence,clock} from './fixtures.ts';
import {PostgresMappingReleases} from '../../src/postgres/mapping-releases.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';
import {PostgresReconciliation} from '../../src/postgres/reconciliation.ts';
import {PostgresReleaseCertification} from '../../src/postgres/release-certification.ts';
import {PostgresDerivedMetricCertification} from '../../src/postgres/derived-certification.ts';
import {PostgresAnalyticsRepository} from '../../src/postgres/repository.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
test('exact aging snapshots publish cutoff/customer only; derived ratio requires its certificate and aggregates signed operands',{skip:!enabled},async()=>{
 const db=await database();
 try {
  const release=mapping();
  release.measures=release.measures.slice(0,2).map((measure,index)=>({...measure,measureId:index===0?'total_overdue_receivable':'net_aged_receivable',dimensionMappings:{customer:'synthetic stable identity'}}));
  release.capabilities=[{metric:'total_overdue_receivable',dimensions:['customer']},{metric:'net_aged_receivable',dimensions:['customer']},{metric:'overdue_receivable_percentage',dimensions:['customer']}];
  const registry=new PostgresMappingReleases(db.migrator);await registry.registerCandidate({...release,approval:{status:'pending'}});
  const records=['one','credit','zero'].map((customer,index)=>({facts:[fact(customer,{componentId:'overdue',measureId:'total_overdue_receivable',businessDate:'2026-01-31',value:['40.000000','-10.000000','0.000000'][index]!,batchId:'aging',dimensions:{customer},displayLabels:{customer:customer==='credit'?'Synthetic Credit Customer':'Synthetic Shared Name'}}),fact(customer,{componentId:'net',measureId:'net_aged_receivable',businessDate:'2026-01-31',value:['100.000000','-20.000000','0.000000'][index]!,batchId:'aging',dimensions:{customer},displayLabels:{customer:customer==='credit'?'Synthetic Credit Customer':'Synthetic Shared Name'}})]}));
  await new PostgresMartWriter(db.migrator,{a:['fixture-company']},clock).commit(batch('aging',3),records,{...evidence,completeness:'complete_scope'});
  const controls=[];
  for(const measureId of ['total_overdue_receivable','net_aged_receivable'] as const)for(const grouping of [null,'customer'] as const){
   const expected=(grouping?['one','credit','zero']:[null]).map((groupKey,index)=>({caseId:`aging-${measureId}-${groupKey??'summary'}`,tenantId:'a',datasetId:'release',mappingVersion:'1',measureId,sourceReportReference:'SYNTHETIC AGING CONTROL',frozenRevision:'freeze-1',batchIds:['aging'],from:'2026-01-01',to:'2026-01-31',grouping,groupKey,expectedValue:groupKey?(measureId==='total_overdue_receivable'?['40.000000','-10.000000','0.000000']:['100.000000','-20.000000','0.000000'])[index]!:measureId==='total_overdue_receivable'?'30.000000':'80.000000',actualValue:'0.000000',expectedCount:groupKey?'1':'3',actualCount:'0',tolerance:{status:'approved' as const,absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'SYNTHETIC'}}));
   const result=await new PostgresReconciliation(db.migrator).record(expected,'IQD');assert.equal(result.status,'passed');controls.push(...result.cases);
  }
  const caseIds=controls.map(control=>control.caseId);
  await new PostgresReleaseCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'SYNTHETIC-AGING',approverReference:'synthetic Finance',approvedAt:clock().toISOString(),companyIds:['fixture-company'],from:'2026-01-01',to:'2026-01-31',caseIds,technicalReference:'synthetic exact aging',evidenceKind:'authorized_business_approval',approvedValues:[{measureId:'net_aged_receivable',value:'80.000000'}],businessSemantics:['SYNTHETIC signed aging']});
  await registry.approve({tenantId:'a',datasetId:'release',caseIds,reference:'SYNTHETIC-AGING',approvedAt:clock().toISOString()});
  await tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.serving_bindings VALUES('a','release')"));
  const repo=new PostgresAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});const context={tenantId:'a',locale:'en' as const};
  assert.ok(!(await repo.getPublishedCapabilities(context)).releases[0]!.capabilities.some(capability=>capability.metric==='overdue_receivable_percentage'));
  for(const grouping of [null,'customer'] as const)await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:`SYNTHETIC-AGING-${grouping??'summary'}`,metric:'overdue_receivable_percentage',grouping,from:'2026-01-01',to:'2026-01-31',caseIds:controls.filter(control=>control.grouping===grouping).map(control=>control.caseId),approvalReference:'SYNTHETIC',approvedAt:clock().toISOString(),businessSemantics:'Signed overdue divided by signed net; aggregate operands; zero denominator null',technicalReference:'synthetic'});
  assert.equal((await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.published_derived_coverage($1,$2,$3,$4,$5)',['a','release','overdue_receivable_percentage',null,false]),true)).rowCount,0);
  const published=await repo.getPublishedCapabilities(context);assert.deepEqual(published.releases[0]!.period,{from:'2026-01-31',to:'2026-01-31'});
  const query={metric:'overdue_receivable_percentage' as const,dateRange:{from:'2026-01-31',to:'2026-01-31'}};
  assert.equal((await repo.execute(query,context)).rows[0]!.value,37.5);
  const grouped = await repo.execute({...query,groupBy:'customer'},context);
  assert.deepEqual(grouped.metadata.dimensionLabels,{credit:'Synthetic Credit Customer',one:'Synthetic Shared Name',zero:'Synthetic Shared Name'});
  assert.deepEqual(grouped.rows,[{key:'credit',value:50},{key:'one',value:40},{key:'zero',value:null}]);
  await assert.rejects(repo.execute({...query,dateRange:{from:'2026-01-01',to:'2026-01-31'}},context),/Uncertified/);
 }finally{await db.close();}
});
