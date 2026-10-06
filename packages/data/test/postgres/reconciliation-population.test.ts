import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReconciliationCase } from '@el-dabboos/domain';
import { PostgresReconciliation } from '../../src/postgres/reconciliation.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { database,enabled } from './support.ts';
import { deploy,mapping,batch,fact,evidence,clock } from './fixtures.ts';
test('complete Customer reconciliation exceeds 1000 groups without truncation; subsets and overflow fail closed',{skip:!enabled},async()=>{
 const db=await database();const m=mapping();
 for(const measure of m.measures)measure.dimensionMappings.customer='source partner ID';
 const writer=new PostgresMartWriter(db.ingestor,{a:['fixture-company']},clock);const reconcile=new PostgresReconciliation(db.ingestor);
 try{
  await deploy(db.migrator,m);
  await writer.commit(batch('wide-1',1000),Array.from({length:1000},(_,index)=>({facts:[fact(`person-${index}`,{batchId:'wide-1',dimensions:{branch:'cairo',customer:`partner-${index}`}})]})),{...evidence,requestLimit:1000,completeness:'complete_scope'});
  await writer.commit({...batch('wide-2'),watermarkStart:'fixture-end',sourceAsOf:'2026-10-01T11:00:00.000Z',frozenRevision:'freeze-2'},[{facts:[fact('person-1000',{batchId:'wide-2',sourceAsOf:'2026-10-01T11:00:00.000Z',frozenRevision:'freeze-2',dimensions:{branch:'cairo',customer:'partner-1000'}})]}],evidence);
  const controls:ReconciliationCase[]=Array.from({length:1001},(_,index)=>({caseId:`wide-${index}`,tenantId:'a',datasetId:'release',mappingVersion:'1',measureId:'revenue',sourceReportReference:'COMPLETE SYNTHETIC PARTNER CONTROL',frozenRevision:'freeze-2',batchIds:['wide-1','wide-2'],from:'2026-02-01',to:'2026-02-28',grouping:'customer',groupKey:`partner-${index}`,expectedValue:'100.000000',expectedCount:'1',actualValue:'0.000000',actualCount:'0',tolerance:{status:'approved',absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'SYNTHETIC TEST ONLY'}}));
  const exact=await reconcile.record(controls,'IQD');assert.equal(exact.status,'passed');assert.equal(exact.cases.length,1001);assert.deepEqual(exact.unexpectedGroups,[]);
  const partial=await reconcile.record(controls.slice(0,1000).map(c=>({...c,caseId:`partial-${c.caseId}`})),'IQD');assert.equal(partial.status,'failed');assert.deepEqual(partial.unexpectedGroups,['partner-1000']);
  await assert.rejects(reconcile.record(Array.from({length:5001},(_,index)=>({...controls[0]!,caseId:`overflow-${index}`,groupKey:`partner-${index}`})),'IQD'),/Bounded complete/);
  assert.equal((await db.admin.query("SELECT count(*)::int n FROM mart.reconciliation_evidence WHERE case_id LIKE 'overflow-%'")).rows[0].n,0);
 }finally{await db.close();}
});
