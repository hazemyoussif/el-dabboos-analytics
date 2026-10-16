import test from 'node:test';
import assert from 'node:assert/strict';
import type {ProductionFact} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {fixture,pages} from './business-fixture.ts';
import {deploy,mapping} from './fixtures.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import type {ReviewControl} from '../../src/review/source.ts';

function controlsFor(facts:ProductionFact[]):ReviewControl[]{
 const groups=new Map<string,{control:ReviewControl;total:number;count:number}>();
 for(const fact of facts)for(const dimensions of [null,fact.dimensions]){
  const key=JSON.stringify([fact.measureId,dimensions]);
  const group=groups.get(key)??{control:{measure:fact.measureId,dimensions,value:'0.000000',count:'0'},total:0,count:0};
  // This fixture uses integer operands; its expected controls are independent of query SQL.
  group.total+=Number(fact.value);group.count++;groups.set(key,group);
 }
 return [...groups.values()].map(({control,total,count})=>({...control,value:total.toFixed(6),count:String(count)}));
}
async function sourceFacts(source:ReturnType<typeof fixture>){
 const facts:ProductionFact[]=[];
 for await(const batch of source.facts)facts.push(...batch);
 return facts;
}
test('group labels preserve missing, repeated, partially missing and conflicting source evidence',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const source=fixture(),original=await sourceFacts(source),base=original.find(fact=>fact.measureId==='period_net_sales')!;
  const cases={absent:[undefined,undefined,undefined],same:['Synthetic','Synthetic','Synthetic'],partial:['Synthetic',undefined,'Synthetic'],conflict:['Synthetic','Other',undefined]};
  const repeated=Object.entries(cases).flatMap(([customer,labels])=>labels.map((label,index)=>({...base,sourceRecordId:`${customer}:${index}`,value:'1.000000',currency:{...base.currency!,transactionValue:'1.000000'},dimensions:{...base.dimensions,customer:`fixture:${customer}`},...(label?{displayLabels:{customer:label}}:{})})));
  const facts=[...original.filter(fact=>fact.measureId!==base.measureId),...repeated];
  await exposeReviewMonth(db.ingestor,{...source,facts:pages(facts),controls:async()=>controlsFor(facts)},'business');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const result=await repository.execute({metric:'period_net_sales',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'}},{tenantId:'a',locale:'en'});
  assert.equal(result.rows.length,4);assert.ok(result.rows.every(row=>row.value===3));
  assert.deepEqual(result.metadata.dimensionLabels,{'fixture:partial':'Synthetic','fixture:same':'Synthetic'});
 }finally{await db.close();}
});
for(const units of [['unit:a','unit:a'],['unit:a','unit:b'],['unassigned','unassigned'],['unit:a','unassigned']])test(`quantity groups preserve compatible-unit validation for ${units.join(',')}`,{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const source=fixture('2026-10',true),original=await sourceFacts(source),base=original.find(fact=>fact.measureId==='internal_stock_quantity')!;
  const repeated=[...units.map((uom,index)=>({...base,sourceRecordId:`unit:${index}`,entityId:`unit:${index}`,dimensions:{...base.dimensions,uom}})),{...base,sourceRecordId:'safe',entityId:'safe',dimensions:{...base.dimensions,product:'fixture:safe',uom:'unit:a'}}];
  const facts=[...original.filter(fact=>fact.measureId!==base.measureId),...repeated];
  await exposeReviewMonth(db.ingestor,{...source,facts:pages(facts),controls:async()=>controlsFor(facts)},'business');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'internal_stock_quantity' as const,groupBy:'product' as const,dateRange:{from:'2026-10-01',to:'2026-10-31'}},context={tenantId:'a',locale:'en' as const};
  if(units.every(unit=>unit==='unit:a')){
   const result=await repository.execute(query,context);
   assert.deepEqual(result.rows.map(row=>row.value),[26,13]);
  }else{
   await assert.rejects(repository.execute(query,context),/UOM/);
   await assert.rejects(repository.execute(query,context,{outputKeys:['fixture:safe']}),/UOM/,'invalid groups outside the selected identities still fail closed');
  }
 }finally{await db.close();}
});
