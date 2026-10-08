import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateQuerySlots,selectGroupedEventRows } from '../../src/postgres/query-aggregate.ts';
import {prepareSnapshotScope} from '../../src/postgres/snapshot-query.ts';
import { queryDimensionLabels,readEventDimensionOptions } from '../../src/postgres/query-labels.ts';
import { database,enabled } from './support.ts';
test('grouped management queries aggregate one authorized scope with labels separate from identity',{skip:!enabled},async()=>{
 const fixture=await database(false);const client=await fixture.admin.connect();
 try {
  await client.query(`CREATE SCHEMA mart;CREATE TABLE mart.canonical_facts(tenant_id text,dataset_id text,measure_id text,business_date date,value numeric,salesperson text,transaction_evidence jsonb,display_labels jsonb);
   INSERT INTO mart.canonical_facts VALUES
   ('one','approved','order_revenue','2026-09-01',100,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}',NULL),
   ('one','approved','order_revenue','2026-09-02',200,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}',NULL),
   ('one','approved','order_count','2026-09-01',1,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}',NULL),
   ('one','approved','order_count','2026-09-02',1,'rep1','{"labels":{"salesperson":"Synthetic Rep"}}',NULL),
   ('one','approved','order_revenue','2026-09-02',30,'rep2','{"labels":{"salesperson":"Duplicate Name"}}',NULL),
   ('one','approved','order_revenue','2026-09-03',50,'rep2','{"labels":{"salesperson":"Changed Name"}}',NULL),
   ('one','approved','order_revenue','2026-10-01',1000,'rep1','{"labels":{"salesperson":"Later Name"}}',NULL),
   ('other','approved','order_revenue','2026-09-01',9000,'rep1','{"labels":{"salesperson":"Private Other"}}',NULL);`);
  const slots=['rep1','rep2'].map(key=>({key,match_key:key,from:'2026-09-01',to:'2026-09-30'}));
  const scope={params:['one','approved',['order_revenue']],scope:'f.tenant_id=$1 AND f.dataset_id=$2 AND f.measure_id=ANY($3::text[])',predicates:'true',maxGroups:100};
  const query={metric:'order_revenue' as const,groupBy:'salesperson' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'}};
  assert.deepEqual(await aggregateQuerySlots(client,query,scope,slots),[300,80]);
  await client.query(`ALTER TABLE mart.canonical_facts ADD COLUMN source_as_of timestamptz DEFAULT '2026-10-07T00:00:00Z',ADD COLUMN source_object text DEFAULT 'fixture',ADD COLUMN source_record_id text DEFAULT 'stable-fixture';`);
  const groupedScope={...scope,labelStrategy:'latest_observed' as const};
  assert.deepEqual(await readEventDimensionOptions(client,'salesperson',scope,'en'),[{id:'rep1',label:'Later Name'},{id:'rep2',label:'Changed Name'}]);
  await assert.rejects(readEventDimensionOptions(client,'salesperson',{...scope,maxGroups:1},'en'),/discovery/i);
  const grouped=await selectGroupedEventRows(client,query,groupedScope,'en');
  assert.deepEqual(grouped?.rows,[{key:'rep1',value:300},{key:'rep2',value:80}]);
  assert.deepEqual(grouped?.dimensionLabels,{rep1:'Synthetic Rep',rep2:'Changed Name'});
  await assert.rejects(selectGroupedEventRows(client,query,{...groupedScope,maxGroups:1},'en'),/technical bound/);
  assert.deepEqual((await selectGroupedEventRows(client,{...query,aggregation:'average'},groupedScope,'en'))?.rows,[{key:'rep1',value:150},{key:'rep2',value:40}]);
  assert.deepEqual(await aggregateQuerySlots(client,{...query,aggregation:'average'},scope,slots),[150,40]);
  assert.deepEqual(await aggregateQuerySlots(client,{...query,metric:'average_confirmed_order_value'},{...scope,params:['one','approved',['order_revenue','order_count']]},slots),[150,null]);
  assert.deepEqual(await queryDimensionLabels(client,query,scope,['rep1','rep2'],'en'),{rep1:'Synthetic Rep'});
  const scoped={...scope,predicates:"f.salesperson=$4",params:[...scope.params,'rep1']};
  assert.deepEqual(await readEventDimensionOptions(client,'salesperson',scoped,'en'),[{id:'rep1',label:'Later Name'}]);
  assert.deepEqual(await aggregateQuerySlots(client,query,scoped,slots),[300,0]);
  assert.deepEqual(await queryDimensionLabels(client,query,scoped,['rep1','rep2'],'en'),{rep1:'Synthetic Rep'});
  await client.query(`ALTER TABLE mart.canonical_facts ADD COLUMN entity_id text;
   INSERT INTO mart.canonical_facts(tenant_id,dataset_id,measure_id,business_date,value,entity_id) VALUES
    ('one','snapshot','outstanding_amount','2026-09-30',100,'customer-a'),
    ('one','snapshot','outstanding_amount','2026-09-30',200,'customer-a');`);
  const snapshotScope={...scope,params:['one','snapshot',['outstanding_amount']]};
  const snapshotQuery={metric:'outstanding_amount' as const,dateRange:query.dateRange};
  assert.equal((await prepareSnapshotScope(client,snapshotQuery,snapshotScope)).uniformSnapshotCutoff,undefined);
  await client.query(`DELETE FROM mart.canonical_facts WHERE dataset_id='snapshot' AND value=200`);
  assert.equal((await prepareSnapshotScope(client,snapshotQuery,snapshotScope)).uniformSnapshotCutoff,true);
  await client.query(`INSERT INTO mart.canonical_facts(tenant_id,dataset_id,measure_id,business_date,value,entity_id) VALUES ('one','snapshot','outstanding_amount','2026-09-15',50,'customer-b')`);
  assert.equal((await prepareSnapshotScope(client,snapshotQuery,snapshotScope)).uniformSnapshotCutoff,undefined);
 } finally {client.release();await fixture.close();}
});
