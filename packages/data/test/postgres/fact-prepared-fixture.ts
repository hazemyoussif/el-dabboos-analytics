import assert from 'node:assert/strict';
import type {ProductionFact} from '@el-dabboos/domain';
import {mapping} from './fixtures.ts';
import {syncFixture,syntheticFact} from './sync-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';

export const context={tenantId:'a',locale:'en' as const};
export const january={from:'2026-01-01',to:'2026-01-31'};
export async function preparedFactFixture(extra:ProductionFact[]=[]){
 const selected=mapping();
 selected.measures=selected.measures.map(rule=>({...rule,dimensionMappings:{...rule.dimensionMappings,customer:'synthetic division'}}));
 selected.capabilities=selected.capabilities.map(capability=>({...capability,dimensions:[...capability.dimensions,'customer']}));
 const f=await syncFixture(true,selected);
 try{
  const row=(id:string,date:string,value:string,division:string)=>syntheticFact(id,date,{value,
   currency:{mode:'native',transactionCurrency:'IQD',transactionValue:value,reportingCurrency:'IQD',policyReference:'test-native'},
   dimensions:{branch:'cairo',customer:division},displayLabels:{customer:division}});
  f.state.changed=[row('one','2026-01-15','10.000000','division-a'),row('two','2026-01-15','20.000000','division-a'),
   row('three','2026-01-15','30.000000','division-b'),row('later','2026-02-15','40.000000','division-b'),...extra];
  f.state.population=f.state.changed;
  assert.equal((await f.run()).status,'passed');
  const prepared=new PreparedAnalyticsRepository(f.db.runtime,{reportingCurrencies:{a:'IQD'}});
  const native=new TrustedAnalyticsRepository(f.db.runtime,{reportingCurrencies:{a:'IQD'}});
  async function change(changed:ProductionFact[]){
   f.snapshot.cutoff=new Date(Date.parse(f.snapshot.cutoff)+86400000).toISOString();
   const identities=new Map(changed.map(row=>[row.sourceRecordId+':'+row.measureId,row]));
   f.state.population=f.state.population.map(row=>identities.get(row.sourceRecordId+':'+row.measureId)??row);
   const existing=new Set(f.state.population.map(row=>row.sourceRecordId+':'+row.measureId));
   f.state.population.push(...changed.filter(row=>!existing.has(row.sourceRecordId+':'+row.measureId)));
   f.state.changed=changed;
   return f.run();
  }
  return {...f,prepared,native,change};
 }catch(error){await f.db.close();throw error;}
}
export type FactFixture=Awaited<ReturnType<typeof preparedFactFixture>>;
export async function binding(f:FactFixture,period:string,kind='event'){
 return (await f.db.admin.query(`SELECT binding.*,dataset.configuration FROM mart.analytics_trusted_serving trusted
  JOIN mart.prepared_bindings binding USING(tenant_id,revision_id) JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
  WHERE trusted.tenant_id='a' AND binding.family='facts' AND binding.kind=$1 AND binding.period=$2`,[kind,period])).rows[0];
}
export async function assertCanonical(f:FactFixture){
 await tenantTransaction(f.db.ingestor,'a',async client=>{
  const bindings=(await client.query(`SELECT binding.*,dataset.configuration FROM mart.analytics_trusted_serving trusted
   JOIN mart.prepared_bindings binding USING(tenant_id,revision_id) JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
   WHERE trusted.tenant_id='a' AND binding.family='facts'`)).rows;
  for(const row of bindings){
   const checked=await client.query(`WITH expected AS (SELECT * FROM mart.prepared_expected_cells('a',$1,$2::jsonb)),actual AS (
    SELECT time_grain,grain_id,business_date,measure_id,dimensions,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
    FROM mart.business_prepared_cells('a',$3))
    SELECT NOT EXISTS((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
     UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)) exact,
     (SELECT coalesce(jsonb_object_agg(key,row_count),'{}'::jsonb) FROM (
      SELECT time_grain||':'||grain_id key,count(*) row_count FROM expected GROUP BY 1) counted) statistics`,[row.revision_id,JSON.stringify(row.configuration),row.data_id]);
   assert.equal(checked.rows[0].exact,true,`${row.kind} ${row.period.toISOString()}`);
   assert.deepEqual(row.statistics,checked.rows[0].statistics,'stored row counts match the complete canonical output');
  }
 },true);
 for(const groupBy of [undefined,'customer' as const,'date' as const]){
  const query={metric:'revenue' as const,dateRange:january,...groupBy?{groupBy}:{}};
  assert.deepEqual((await f.prepared.execute(query,context)).rows,(await f.native.execute(query,context)).rows);
 }
}
export function revise(row:ProductionFact,patch:Partial<ProductionFact>={}):ProductionFact{
 const changed={...row,...patch,sourceRevision:String(BigInt(row.sourceRevision)+1n)};
 return {...changed,...changed.currency?{currency:{...changed.currency,transactionValue:changed.value}}:{}};
}
