import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

const oldExact=`WITH expected AS (SELECT * FROM mart.prepared_expected_cells($1,$2,$3)),actual AS (
 SELECT time_grain,grain_id,business_date,measure_id,dimensions,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
 FROM mart.prepared_cells WHERE tenant_id=$1 AND data_id=$4)
 SELECT NOT EXISTS(SELECT * FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)) delta) exact`;
async function cloneCells(client:PoolClient,original:string,fault:string){
 const dataId='SYNTHETIC PROOF '+fault;
 await client.query('INSERT INTO mart.prepared_datasets SELECT tenant_id,$2,configuration FROM mart.prepared_datasets WHERE tenant_id=$1 AND data_id=$3',['a',dataId,original]);
 await client.query(`INSERT INTO mart.prepared_cells SELECT tenant_id,$2,time_grain,grain_id,business_date,measure_id,
  CASE WHEN $4='dimensions' THEN dimensions||'{"region":"SYNTHETIC EXTRA"}'::jsonb ELSE dimensions END,
  CASE WHEN $4='dimensions' THEN encode(sha256(convert_to((dimensions||'{"region":"SYNTHETIC EXTRA"}'::jsonb)::text,'UTF8')),'hex') ELSE dimension_key END,
  value+CASE WHEN $4='value' THEN 1 ELSE 0 END,fact_count+CASE WHEN $4='count' THEN 1 ELSE 0 END,
  CASE WHEN $4='minimum' THEN coalesce(minimum,0)+1 ELSE minimum END,CASE WHEN $4='maximum' THEN coalesce(maximum,0)+1 ELSE maximum END,
  data_through+CASE WHEN $4='through' THEN 1 ELSE 0 END,
  CASE WHEN $4='labels' THEN labels||'{"customer":"SYNTHETIC WRONG LABEL"}'::jsonb ELSE labels END,
  CASE WHEN $4='conflicts' THEN conflicting_labels||ARRAY['customer'] ELSE conflicting_labels END
  FROM mart.prepared_cells WHERE tenant_id=$1 AND data_id=$3 ORDER BY time_grain,grain_id,business_date,measure_id,dimension_key OFFSET $5`,['a',dataId,original,fault,fault==='missing'?1:0]);
 if(fault==='extra')await client.query(`INSERT INTO mart.prepared_cells SELECT tenant_id,$2,time_grain,grain_id,business_date,measure_id,
  dimensions||'{"region":"SYNTHETIC EXTRA"}'::jsonb,encode(sha256(convert_to((dimensions||'{"region":"SYNTHETIC EXTRA"}'::jsonb)::text,'UTF8')),'hex'),
  value,fact_count,minimum,maximum,data_through,labels,conflicting_labels FROM mart.prepared_cells WHERE tenant_id=$1 AND data_id=$3 LIMIT 1`,['a',dataId,original]);
 return dataId;
}
test('indexed prepared proof matches exact multiset comparison for valid, missing, extra and changed canonical content',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const published=await exposeReviewMonth(db.ingestor,fixture('2026-09'),'business');
  await tenantTransaction(db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:published.revisionId},{maxCellsPerChunk:50000,maxChunks:100}));
  await tenantTransaction(db.ingestor,'a',async client=>{
   const original=(await client.query("SELECT data_id,configuration FROM mart.prepared_bindings JOIN mart.prepared_datasets USING(tenant_id,data_id) WHERE tenant_id='a' AND revision_id=$1 AND family='business' AND kind='event'",[published.revisionId])).rows[0];
   for(const fault of ['none','missing','extra','dimensions','value','count','minimum','maximum','through','labels','conflicts']){
    const dataId=await cloneCells(client,original.data_id,fault),params=['a',published.revisionId,JSON.stringify(original.configuration),dataId];
    const expected=(await client.query(oldExact,params)).rows[0].exact;
    const actual=(await client.query('SELECT mart.prepared_cells_exact($1,$2,$3,$4) exact',params)).rows[0].exact;
    assert.equal(expected,fault==='none',fault);assert.equal(actual,expected,fault);
   }
  });
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('SELECT mart.prepared_cells_exact($1,$2,$3,$4)',['a',published.revisionId,'{}','missing']),true),/permission denied/);
 }finally{await db.close();}
});
