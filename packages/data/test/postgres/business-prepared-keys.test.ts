import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,changedInvoice} from './business-delta-fixture.ts';
import {exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

test('stored-key reuse accepts exact keys and rejects missing or extra keys before cell comparison',{skip:!enabled},async()=>{
 const {db,source,initial}=await deltaFixture();
 try{
  const cutoff='2026-10-20T10:00:00.000Z';
  const changed=await exposeBusinessDeltaMonth(db.ingestor,deltaSource(source,cutoff,[{object:'command_invoice',id:'10',facts:changedInvoice(initial,cutoff)}]));
  await tenantTransaction(db.ingestor,'a',async client=>{
   const original=(await client.query(`SELECT binding.data_id,dataset.configuration config FROM mart.prepared_bindings binding
    JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
    WHERE binding.tenant_id='a' AND binding.revision_id=$1 AND binding.family='business' AND binding.kind='event'`,[changed.revisionId])).rows[0];
   const exact=async(data:string)=>(await client.query('SELECT mart.business_prepared_delta_exact($1,$2,$3,$4) exact',
    ['a',changed.revisionId,original.config,data])).rows[0].exact;
   assert.equal(await exact(original.data_id),true);
   for(const variant of ['missing','extra']){
    const data='synthetic-'+variant;
    await client.query('INSERT INTO mart.prepared_datasets SELECT tenant_id,$1,configuration FROM mart.prepared_datasets WHERE tenant_id=$2 AND data_id=$3',[data,'a',original.data_id]);
    await client.query('INSERT INTO mart.business_prepared_origins SELECT tenant_id,$1,base_data_id,revision_id,base_revision FROM mart.business_prepared_origins WHERE tenant_id=$2 AND data_id=$3',[data,'a',original.data_id]);
    await client.query(`INSERT INTO mart.business_prepared_keys SELECT tenant_id,$1,time_grain,grain_id,business_date,measure_id,dimensions,dimension_key
     FROM mart.business_prepared_keys WHERE tenant_id=$2 AND data_id=$3 ORDER BY time_grain,grain_id,business_date,measure_id,dimension_key
     LIMIT (SELECT count(*)-CASE WHEN $4='missing' THEN 1 ELSE 0 END FROM mart.business_prepared_keys WHERE tenant_id=$2 AND data_id=$3)`,[data,'a',original.data_id,variant]);
    if(variant==='extra')await client.query(`INSERT INTO mart.business_prepared_keys SELECT tenant_id,$1,time_grain,grain_id,business_date+1,measure_id,dimensions,dimension_key
     FROM mart.business_prepared_keys WHERE tenant_id=$2 AND data_id=$3 AND time_grain='monthly' LIMIT 1`,[data,'a',original.data_id]);
    await client.query(`INSERT INTO mart.prepared_cells SELECT tenant_id,$1,time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,
     value,fact_count,minimum,maximum,data_through,labels,conflicting_labels FROM mart.prepared_cells WHERE tenant_id=$2 AND data_id=$3`,[data,'a',original.data_id]);
    assert.equal(await exact(data),false,variant+' key must reject despite unchanged correct cells');
    assert.equal((await client.query('SELECT count(*)::int count FROM mart.prepared_bindings WHERE tenant_id=$1 AND data_id=$2',['a',data])).rows[0].count,0);
   }
   assert.equal((await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id,changed.revisionId);
  });
 }finally{await db.close();}
});
