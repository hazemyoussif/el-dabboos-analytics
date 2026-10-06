import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateQuerySlots } from '../../src/postgres/query-aggregate.ts';
import { queryDimensionLabels } from '../../src/postgres/query-labels.ts';
import { database,enabled } from './support.ts';
test('grouped management queries aggregate one authorized scope with labels separate from identity',{skip:!enabled},async()=>{
 const fixture=await database(false);const client=await fixture.admin.connect();
 try {
  await client.query(`CREATE SCHEMA mart;CREATE TABLE mart.canonical_facts(tenant_id text,dataset_id text,measure_id text,business_date date,value numeric,salesperson text,transaction_evidence jsonb);
   INSERT INTO mart.canonical_facts VALUES
   ('one','approved','order_revenue','2026-09-01',100,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}'),
   ('one','approved','order_revenue','2026-09-02',200,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}'),
   ('one','approved','order_count','2026-09-01',1,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}'),
   ('one','approved','order_count','2026-09-02',1,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}'),
   ('one','approved','order_revenue','2026-09-02',30,'rep2','{"labels":{"salesperson":"Duplicate Name"}}'),
   ('one','approved','order_revenue','2026-09-03',50,'rep2','{"labels":{"salesperson":"Changed Name"}}'),
   ('one','approved','order_revenue','2026-10-01',1000,'rep1','{"labels":{"salesperson":"Later Name"}}'),
   ('other','approved','order_revenue','2026-09-01',9000,'rep1','{"labels":{"salesperson":"Private Other"}}');`);
  const slots=['rep1','rep2'].map(key=>({key,match_key:key,from:'2026-09-01',to:'2026-09-30'}));
  const scope={params:['one','approved',['order_revenue']],scope:'f.tenant_id=$1 AND f.dataset_id=$2 AND f.measure_id=ANY($3::text[])',predicates:'true',maxGroups:100};
  const query={metric:'order_revenue' as const,groupBy:'salesperson' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'}};
  assert.deepEqual(await aggregateQuerySlots(client,query,scope,slots),[300,80]);
  assert.deepEqual(await aggregateQuerySlots(client,{...query,aggregation:'average'},scope,slots),[150,40]);
  assert.deepEqual(await aggregateQuerySlots(client,{...query,metric:'average_confirmed_order_value'},{...scope,params:['one','approved',['order_revenue','order_count']]},slots),[150,null]);
  assert.deepEqual(await queryDimensionLabels(client,query,scope,['rep1','rep2'],'en'),{rep1:'Synthetic Rep'});
  const scoped={...scope,predicates:"f.salesperson=$4",params:[...scope.params,'rep1']};
  assert.deepEqual(await aggregateQuerySlots(client,query,scoped,slots),[300,0]);
  assert.deepEqual(await queryDimensionLabels(client,query,scoped,['rep1','rep2'],'en'),{rep1:'Synthetic Rep'});
 } finally {client.release();await fixture.close();}
});
