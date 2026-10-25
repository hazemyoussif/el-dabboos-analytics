import assert from 'node:assert/strict';
import test from 'node:test';
import type {ProductionFact} from '@el-dabboos/domain';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,deltaContext,deltaRange,observedFact,factControls,storedCounts,replacementPages} from './business-delta-fixture.ts';
import {withInventoryAvailabilityMapping,inventoryAvailabilityObject} from '../../src/business/inventory-availability-mapping.ts';
import {exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';

test('registered availability publishes through shared preparation, preserves accepted recipes and replaces removed warehouse positions',{skip:!enabled},async()=>{
 const {db,source,initial,accepted}=await deltaFixture();
 try{
  const mapping=withInventoryAvailabilityMapping(source.mapping),cutoff='2026-10-21T10:00:00.000Z';
  const seed=initial.find(fact=>fact.measureId==='internal_stock_quantity')!;
  const make=(id:string,free:string,date=cutoff):ProductionFact[]=>mapping.measures.filter(rule=>rule.sourceObject===inventoryAvailabilityObject).map(rule=>{
   const value=rule.measureId==='reserved_stock_quantity'?'2.000000':rule.measureId==='free_stock_value'?'25.000000':free;
   const fact={...observedFact(seed,date,date.slice(0,10)),measureId:rule.measureId,sourceObject:inventoryAvailabilityObject,
    sourceRecordId:id,entityId:inventoryAvailabilityObject+':'+id,value,
    dimensions:{product:'fixture:product',product_category:'fixture:category',brand:'fixture:brand',warehouse:'fixture:'+id.split(':')[1],uom:'fixture:uom'},
    ...(rule.measureId==='free_stock_value'?{currency:{mode:'native' as const,transactionCurrency:'IQD',transactionValue:value,reportingCurrency:'IQD',policyReference:rule.currencyPolicy}}:{})};
   return fact;
  });
  const first=make('10:1','10.000000'),other=make('10:unassigned','3.000000');
  const replacement=[{object:inventoryAvailabilityObject,id:'10:1',facts:first},{object:inventoryAvailabilityObject,id:'10:unassigned',facts:other}];
  const original=(await db.admin.query('SELECT fact_key,payload FROM mart.review_facts WHERE partition_id=$1 ORDER BY fact_key',[accepted.partitionId])).rows;
  await exposeBusinessDeltaMonth(db.ingestor,{...deltaSource(source,cutoff,replacement,[inventoryAvailabilityObject]),mapping,replaceObjects:[inventoryAvailabilityObject],
   replacements:replacementPages([]),discover:request=>request(inventoryAvailabilityObject,replacement.map(entry=>entry.id)),
   readReplacements:(_object,ids)=>replacementPages(replacement.filter(entry=>ids.includes(entry.id)))});
  const prepared=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),native=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'free_stock_quantity' as const,groupBy:'product' as const,dateRange:{from:'2026-10-01',to:'2026-10-21'}};
  assert.equal((await prepared.execute(query,deltaContext)).rows[0]?.value,13);
  assert.deepEqual((await prepared.execute(query,deltaContext)).rows,(await native.execute(query,deltaContext)).rows);
  assert.equal((await prepared.execute({...query,filters:[{dimension:'warehouse',values:['fixture:1']}]},deltaContext)).rows[0]?.value,10);
  assert.equal((await prepared.execute({...query,metric:'free_stock_value'},deltaContext)).rows[0]?.value,50);
  assert.equal((await prepared.execute({metric:'internal_stock_quantity',groupBy:'product',dateRange:deltaRange},deltaContext)).rows[0]?.value,13);
  assert.deepEqual((await db.admin.query('SELECT fact_key,payload FROM mart.review_facts WHERE partition_id=$1 ORDER BY fact_key',[accepted.partitionId])).rows,original);
  const nextCutoff='2026-10-22T10:00:00.000Z',next=make('10:1','4.000000',nextCutoff);
  const nextSource={...deltaSource({...source,mapping},nextCutoff,[{object:inventoryAvailabilityObject,id:'10:1',facts:next},{object:inventoryAvailabilityObject,id:'10:unassigned',facts:[]}],[inventoryAvailabilityObject]),replaceObjects:[inventoryAvailabilityObject]};
  await exposeBusinessDeltaMonth(db.ingestor,nextSource);
  const current={...query,dateRange:{from:'2026-10-01',to:'2026-10-22'}};
  assert.equal((await prepared.execute(current,deltaContext)).rows[0]?.value,4,'complete observation removes the disappeared position');
  assert.deepEqual((await prepared.execute(current,deltaContext)).rows,(await native.execute(current,deltaContext)).rows);
  await assert.rejects(prepared.execute(current,{...deltaContext,tenantId:'b'}));
  const before=await storedCounts(db);
  for(const ids of [[''],[' padded '],['x'.repeat(161)],Array.from({length:1001},(_,index)=>String(index+1))]){
   await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...nextSource,cutoff:'2026-10-23T10:00:00.000Z',replacements:replacementPages([]),discover:request=>request(inventoryAvailabilityObject,ids)}),/identity request/);
  }
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...nextSource,cutoff:'2026-10-23T10:00:00.000Z',identityControls:async()=>factControls(first)}));
  assert.deepEqual(await storedCounts(db),before,'failed controls cannot change the trusted publication');
 }finally{await db.close();}
});
