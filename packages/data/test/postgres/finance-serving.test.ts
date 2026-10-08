import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {publishFinanceSnapshot} from '../../src/operational/finance-publication.ts';
import type {FinanceSnapshotEvidence} from '../../src/operational/finance-publication.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
function evidence(date:string,count=1):FinanceSnapshotEvidence {
 const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
 return {tenantId:'a',date,anchorDataset:'release',currency:'IQD',sourceCutoff:'2026-10-08T00:21:08.728Z',sourceRevision:'synthetic-retained-snapshot',totals:Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?`${count*100}.000000`:'0.000000'])),customers:Array.from({length:count},(_,index)=>({id:`fixture:${String(index).padStart(5,'0')}`,label:`Customer ${index}`,actual:values,expected:{...values}}))};
}
async function fixture(){
 const db=await database(),specification=mapping();
 const rule=specification.measures[2]!;
 specification.measures=receivableMeasures.map(measureId=>({...rule,measureId,dimensionMappings:{customer:'Synthetic governed identity'}}));
 specification.capabilities=receivableMeasures.map(metric=>({metric,dimensions:['customer','month']}));
 await deploy(db.migrator,specification);
 const capabilities={tenantId:'a',mode:'certified',releases:[{datasetId:'release',sourceId:'fixture',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC TEST ONLY',period:{from:'2026-01-01',to:'2026-01-31'},capabilities:receivableMeasures.map(metric=>({metric,summary:true,dimensions:['customer','month'],analyses:['ranking','topN','percentageContribution']}))}]};
 await tenantTransaction(db.migrator,'a',client=>client.query('INSERT INTO mart.analytics_anchor_capabilities VALUES($1,$2,$3)',['a','release',JSON.stringify(capabilities)]));
 await bootstrapOperationalServing(db.migrator,'a');
 return {db,repository:new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}})};
}
test('separate exact customer snapshots resolve historical, middle-date, latest and absent cutoffs without rewriting certificates',{skip:!enabled},async()=>{
 const {db,repository}=await fixture();try {
  const prior=(await db.admin.query('SELECT specification FROM mart.release_certifications')).rows;
  for(const date of ['2025-10-31','2026-01-31','2026-05-31','2026-06-30','2026-09-30'])await publishFinanceSnapshot(db.migrator,evidence(date));
  for(const [end,asOf] of [['2025-10-31','2025-10-31'],['2026-01-31','2026-01-31'],['2026-06-17','2026-05-31'],['2026-06-30','2026-06-30'],['2026-10-08','2026-09-30']]){
   const result=await repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange:{from:'2025-10-01',to:end!}},{tenantId:'a',locale:'en'});
   assert.equal(result.rows[0]?.value,100);assert.equal(result.metadata.snapshotAsOf,asOf);assert.ok(result.metadata.release?.outputCertificationReference?.startsWith('Exact historical snapshot:'));
  }
  const missing=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2025-01-01',to:'2025-10-30'}},{tenantId:'a',locale:'ar'});assert.equal(missing.rows[0]?.value,null);assert.equal(missing.metadata.availability?.state,'DATA_NOT_READY');
  const trend=await repository.execute({metric:'net_aged_receivable',groupBy:'month',dateRange:{from:'2026-05-01',to:'2026-06-30'}},{tenantId:'a',locale:'en'});assert.deepEqual(trend.rows.map(row=>row.value),[100,100]);
  assert.deepEqual((await db.admin.query('SELECT specification FROM mart.release_certifications')).rows,prior);
  const hidden=await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.finance_snapshot_customers'),true);assert.equal(hidden.rowCount,0);
  const scoped=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2025-10-01',to:'2026-09-30'}},{tenantId:'a',locale:'en',enforcedFilters:[{dimension:'customer',values:['fixture:absent']}]});assert.equal(scoped.rows[0]?.value,0);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query("UPDATE mart.finance_snapshot_customers SET label='tampered'")),/permission denied/);
  await assert.rejects(tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.finance_snapshot_customers SELECT tenant_id,snapshot_id,'appended-customer',label,actual_values,expected_values FROM mart.finance_snapshot_customers LIMIT 1")),/membership is immutable/);
  const bad=evidence('2026-08-31');bad.customers[0]!.expected.net_aged_receivable='99.000000';await assert.rejects(publishFinanceSnapshot(db.migrator,bad),/Exact governed/);
 }finally{await db.close();}
});

test('more than 3000 governed customers use bounded stable search and selected-ID hydration',{skip:!enabled},async()=>{
 const {db,repository}=await fixture();try {
  await publishFinanceSnapshot(db.migrator,evidence('2026-09-30',3105));
  const context={tenantId:'a',locale:'en' as const},request={metric:'net_aged_receivable' as const,asOf:'2026-10-08',limit:50};
  const first=await repository.searchDimensionOptions('customer',context,{...request,selectedIds:['fixture:03104']});
  assert.equal(first.values.length,50);assert.equal(first.selected[0]?.label,'Customer 3104');assert.ok(first.nextCursor);
  const second=await repository.searchDimensionOptions('customer',context,{...request,cursor:first.nextCursor});assert.equal(second.values.length,50);assert.equal(second.values[0]?.id,'fixture:00050');assert.equal(new Set([...first.values,...second.values].map(option=>option.id)).size,100);
  const search=await repository.searchDimensionOptions('customer',context,{...request,search:'Customer 310'});assert.equal(search.values.length,6);
  await assert.rejects(repository.searchDimensionOptions('customer',{...context,enforcedFilters:[{dimension:'customer',values:['fixture:03104']}]},{...request,cursor:first.nextCursor}),/Invalid customer continuation/);
  const scoped=await repository.searchDimensionOptions('customer',{...context,enforcedFilters:[{dimension:'customer',values:['fixture:03104']}]},request);assert.deepEqual(scoped.values.map(option=>option.id),['fixture:03104']);
  const headline=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2025-10-01',to:'2026-10-08'}},context);assert.equal(headline.rows[0]?.value,310500);
 }finally{await db.close();}
});
