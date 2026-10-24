import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {acceptedState,syntheticFact} from './sync-fixture.ts';
import {preparedFactFixture,binding,assertCanonical,revise,context,january} from './fact-prepared-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

const numericFields=['value','fact_count','minimum','maximum','data_through'] as const;
const identity=(row:Record<string,unknown>)=>JSON.stringify([row.time_grain,row.grain_id,row.business_date,row.measure_id,row.dimensions]);
test('label changes preserve numbers, write only affected groups, retain other periods and remain tenant isolated',{skip:!enabled},async()=>{
 const f=await preparedFactFixture();try{
  const prior=await binding(f,'2026-01-01'),later=await binding(f,'2026-02-01');
  const original=(await f.db.admin.query('SELECT * FROM mart.prepared_cells WHERE data_id=$1 ORDER BY time_grain,grain_id,business_date,measure_id,dimension_key',[prior.data_id])).rows;
  const changed=f.state.population.filter(row=>row.dimensions.customer==='division-a').map(row=>revise(row,{displayLabels:{customer:'RENAMED'}}));
  assert.equal((await f.change(changed)).status,'passed');
  const current=await binding(f,'2026-01-01');assert.notEqual(current.data_id,prior.data_id);
  const written=(await f.db.admin.query('SELECT * FROM mart.prepared_cells WHERE data_id=$1',[current.data_id])).rows;
  assert.ok(written.length>0&&written.length<original.length);
  const previous=new Map(original.map(row=>[identity(row),row]));
  for(const row of written){
   assert.ok(JSON.parse(row.grain_id).includes('customer'));
   assert.equal(row.labels.customer,'RENAMED');
   for(const field of numericFields)assert.deepEqual(row[field],previous.get(identity(row))?.[field],field);
  }
  assert.equal((await binding(f,'2026-02-01')).data_id,later.data_id);
  assert.deepEqual((await f.db.admin.query('SELECT * FROM mart.prepared_cells WHERE data_id=$1 ORDER BY time_grain,grain_id,business_date,measure_id,dimension_key',[prior.data_id])).rows,original);
  await assertCanonical(f);
  const choices=await f.prepared.searchDimensionOptions('customer',context,{metric:'revenue',dateRange:january});
  assert.deepEqual(choices.values,[{id:'division-a',label:'RENAMED'},{id:'division-b',label:'division-b'}]);
  await assert.rejects(tenantTransaction(f.db.runtime,'b',client=>client.query("SELECT * FROM mart.business_prepared_cells('a',$1)",[current.data_id]),true),/Invalid Business prepared read identity/);
  await assert.rejects(tenantTransaction(f.db.runtime,'a',client=>client.query("SELECT * FROM mart.business_prepared_cells('a',$1)",[prior.data_id]),true),/not currently published/);
 }finally{await f.db.close();}
});

test('value, date and assignment corrections match the complete base calculation across successive updates',{skip:!enabled},async()=>{
 const f=await preparedFactFixture();try{
  const one=f.state.population.find(row=>row.sourceRecordId==='one')!;
  assert.equal((await f.change([revise(one,{value:'55.000000'})])).status,'passed');await assertCanonical(f);
  const two=f.state.population.find(row=>row.sourceRecordId==='two')!;
  assert.equal((await f.change([revise(two,{businessDate:'2026-01-20',dimensions:{branch:'giza',customer:'division-c'},displayLabels:{customer:'division-c'}})])).status,'passed');
  await assertCanonical(f);
  const total=await f.prepared.execute({metric:'revenue',dateRange:january},context);
  assert.equal(total.rows[0]?.value,105);
 }finally{await f.db.close();}
});

test('moving a record between months and deleting the final record remove old groups without stale cells',{skip:!enabled},async()=>{
 const f=await preparedFactFixture();try{
  const later=f.state.population.find(row=>row.sourceRecordId==='later')!;
  assert.equal((await f.change([revise(later,{businessDate:'2026-01-22'})])).status,'passed');await assertCanonical(f);
  const empty=await binding(f,'2026-02-01');
  assert.deepEqual(empty.statistics,{});
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.prepared_cells WHERE data_id=$1',[empty.data_id])).rows[0].count,0);
  const remove=f.state.population.filter(row=>row.dimensions.customer==='division-a').map(row=>revise(row,{status:'tombstone'}));
  assert.equal((await f.change(remove)).status,'passed');await assertCanonical(f);
  const result=await f.prepared.execute({metric:'revenue',dateRange:january,groupBy:'customer'},context);
  assert.deepEqual(result.rows,[{key:'division-b',value:70}]);
 }finally{await f.db.close();}
});

test('transaction detail and observation-only changes reuse prepared data instead of invalidating the month',{skip:!enabled},async()=>{
 const f=await preparedFactFixture();try{
  const prior=await binding(f,'2026-01-01'),one=f.state.population[0]!;
  const detail=revise(one,{transaction:{sourceCompanyId:'1',state:'confirmed',documentType:'synthetic',paymentState:null,
   untaxedAmount:one.value,taxAmount:'0.000000',totalAmount:one.value,currency:'IQD',
   labels:{customer:'unused detail',salesperson:null,businessLine:null,state:null},area:null,relatedLines:[],location:{latitude:'30',longitude:'31',shopGps:null}}});
  assert.equal((await f.change([detail])).status,'passed');
  const next=await binding(f,'2026-01-01');assert.equal(next.data_id,prior.data_id);assert.deepEqual(next.source_cutoff,prior.source_cutoff);
  await assertCanonical(f);
  const observed=revise(detail,{sourceUpdatedAt:'2026-03-03T00:00:00.000Z'});
  assert.equal((await f.change([observed])).status,'unchanged');
  assert.equal((await binding(f,'2026-01-01')).data_id,prior.data_id);
 }finally{await f.db.close();}
});

test('snapshot corrections select the latest entity observation and preserve unaffected later snapshots',{skip:!enabled},async()=>{
 const balance=(id:string,day:string,value:string)=>syntheticFact(id,day,{measureId:'outstanding_amount',kind:'snapshot',entityId:'entity-a',value,
  currency:{mode:'native',transactionCurrency:'IQD',transactionValue:value,reportingCurrency:'IQD',policyReference:'test-native'},
  dimensions:{branch:'cairo',customer:'division-a'},displayLabels:{customer:'division-a'}});
 const f=await preparedFactFixture([balance('older','2026-01-10','50.000000'),balance('newer','2026-02-10','75.000000')]);try{
  const later=await binding(f,'2026-02-10','snapshot');assert.ok(later);
  const older=f.state.population.find(row=>row.sourceRecordId==='older')!;
  assert.equal((await f.change([revise(older,{value:'60.000000'})])).status,'passed');await assertCanonical(f);
  assert.equal((await binding(f,'2026-02-10','snapshot')).data_id,later.data_id);
  const row=await f.prepared.execute({metric:'outstanding_amount',dateRange:{from:'2026-02-01',to:'2026-02-20'}},context);
  assert.equal(row.rows[0]?.value,75);
  const newer=f.state.population.find(row=>row.sourceRecordId==='newer')!;
  assert.equal((await f.change([revise(newer,{status:'tombstone'})])).status,'passed');await assertCanonical(f);
  const remaining=await f.prepared.execute({metric:'outstanding_amount',dateRange:{from:'2026-02-01',to:'2026-02-20'}},context);
  assert.equal(remaining.rows[0]?.value,60);
 }finally{await f.db.close();}
});

test('ambiguous snapshots cannot publish or advance accepted data',{skip:!enabled},async()=>{
 const existing=syntheticFact('balance','2026-01-10',{measureId:'outstanding_amount',kind:'snapshot',entityId:'entity-a',
  dimensions:{branch:'cairo',customer:'division-a'},displayLabels:{customer:'division-a'}});
 const f=await preparedFactFixture([existing]);try{
  const before=await acceptedState(f.db);
  await assert.rejects(f.change([revise(existing,{sourceRecordId:'duplicate'})]),/Complete unique snapshot identities/);
  assert.deepEqual(await acceptedState(f.db),before);
 }finally{await f.db.close();}
});

test('mixed value and label corrections retain exact counts, extrema and label conflicts across inherited updates',{skip:!enabled},async()=>{
 const f=await preparedFactFixture();try{
  const one=f.state.population.find(row=>row.sourceRecordId==='one')!;
  const three=f.state.population.find(row=>row.sourceRecordId==='three')!;
  assert.equal((await f.change([revise(one,{value:'15.000000',displayLabels:{customer:'RENAMED'}}),
   revise(three,{displayLabels:{customer:'OTHER'}})])).status,'passed');
  await assertCanonical(f);
  const current=await binding(f,'2026-01-01');
  const grouped=(await f.db.admin.query(`SELECT value,fact_count,minimum,maximum,conflicting_labels FROM mart.prepared_cells
   WHERE data_id=$1 AND time_grain='monthly' AND grain_id='["customer"]' AND dimensions='{"customer":"division-a"}'`,[current.data_id])).rows[0];
  assert.equal(Number(grouped.value),35);assert.equal(Number(grouped.fact_count),2);
  assert.equal(Number(grouped.minimum),15);assert.equal(Number(grouped.maximum),20);
  assert.deepEqual(grouped.conflicting_labels,['customer']);
  const two=f.state.population.find(row=>row.sourceRecordId==='two')!;
  assert.equal((await f.change([revise(two,{status:'tombstone'})])).status,'passed');
  await assertCanonical(f);
 }finally{await f.db.close();}
});
