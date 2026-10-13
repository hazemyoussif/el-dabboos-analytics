import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {deploy,mapping,batch,fact,evidence,clock} from './fixtures.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';
import {PostgresExtractionRuns} from '../../src/postgres/extractions.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {scopedCanonicalFactCtes} from '../../src/postgres/scoped-canonical-facts.ts';

test('scoped canonical projection preserves completed revisions, tombstones, date corrections and tenant isolation',{skip:!enabled},async()=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping());
  const writer=new PostgresMartWriter(db.ingestor,{a:['fixture-company']},clock);
  const original=fact('source-record');
  await writer.commit(batch('original'),[{facts:[{...original,batchId:'original'}]}],{...evidence,completeness:'complete_scope'});
  async function projection() {
   return tenantTransaction(db.migrator,'a',async client=>{
    const scoped=(await client.query(`WITH ${scopedCanonicalFactCtes} SELECT to_jsonb(fact) payload FROM scoped_canonical fact ORDER BY fact_key`,['a',['release']])).rows;
    const canonical=(await client.query('SELECT to_jsonb(fact) payload FROM mart.canonical_facts fact WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) ORDER BY fact_key',['a',['release']])).rows;
    assert.deepEqual(scoped,canonical);return scoped;
   },true);
  }
  assert.equal((await projection())[0]!.payload.value,100);
  const runs=new PostgresExtractionRuns(db.ingestor,{a:['fixture-company']});
  await runs.begin({tenantId:'a',datasetId:'release',sourceId:'fixture',mappingId:'synthetic',mappingVersion:'1',extractionId:'partial-update',sourceObjects:['fixture'],companyIds:['fixture-company'],from:'2026-02-01',to:'2026-02-28',sourceAsOf:original.sourceAsOf,frozenRevision:'freeze-1',freezeReference:'SYNTHETIC ONLY',completeness:'complete_scope'});
  const updated={...original,batchId:'partial-first',sourceRevision:'2',sourceVersion:'updated',value:'200.000000',currency:{...original.currency!,transactionValue:'200.000000'}};
  await writer.commit(batch('partial-first'),[{facts:[updated]}],{sourceObjects:evidence.sourceObjects,requestLimit:evidence.requestLimit,deletionEvidence:evidence.deletionEvidence,paginationComplete:false,completeness:'complete_scope',page:{extractionId:'partial-update',pageNumber:1,cursorEnd:'1'}});
  assert.equal((await projection())[0]!.payload.value,100);
  await writer.commit(batch('partial-terminal',0),[],{...evidence,completeness:'complete_scope',cursorStart:'1',page:{extractionId:'partial-update',pageNumber:2,cursorEnd:'1'}});
  assert.equal((await projection())[0]!.payload.value,200);
  await writer.commit(batch('deleted'),[{facts:[{...updated,batchId:'deleted',sourceRevision:'3',sourceVersion:'deleted',status:'tombstone'}]}],{...evidence,completeness:'complete_scope'});
  assert.deepEqual(await projection(),[]);
  await writer.commit(batch('date-correction'),[{facts:[{...updated,batchId:'date-correction',sourceRevision:'4',sourceVersion:'moved-date',businessDate:'2026-03-15'}]}],{...evidence,completeness:'complete_scope'});
  assert.equal((await projection())[0]!.payload.business_date,'2026-03-15');
  const oldMonth=await tenantTransaction(db.migrator,'a',client=>client.query(`WITH ${scopedCanonicalFactCtes} SELECT 1 FROM scoped_canonical WHERE business_date BETWEEN '2026-02-01' AND '2026-02-28'`,['a',['release']]),true);assert.equal(oldMonth.rowCount,0);
  const hidden=await tenantTransaction(db.migrator,'b',client=>client.query(`WITH ${scopedCanonicalFactCtes} SELECT 1 FROM scoped_canonical`,['a',['release']]),true);assert.equal(hidden.rowCount,0);
 }finally{await db.close();}
});
