import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticCatalog,requiredMeasures,categoricalDimensions} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping,fact,batch,evidence,clock} from './fixtures.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';
import {PostgresAnalyticsRepository} from '../../src/postgres/repository.ts';
test('discovery uses governed labels with stable duplicate identities, localization and policy-scoped evidence',{skip:!enabled},async()=>{
 const db=await database();
 try {
  const release=mapping('a');release.capabilities=release.capabilities.map(capability=>({...capability,dimensions:semanticCatalog[capability.metric].dimensions.filter(dimension=>['branch','date','month','quarter','year','salesperson','customer','business_line','product'].includes(dimension))}));release.measures=release.measures.map(measure=>({...measure,dimensionMappings:Object.fromEntries(categoricalDimensions.filter(dimension=>Object.values(semanticCatalog).filter(metric=>requiredMeasures(metric.id).includes(measure.measureId)).every(metric=>metric.dimensions.includes(dimension))&&['branch','salesperson','customer','business_line','product'].includes(dimension)).map(dimension=>[dimension,'fixture']))}));await deploy(db.migrator,release);
  const rows=['source:2045','source:2046','unassigned','source:missing'].map((id,index)=>fact('named-'+index,{batchId:'named',value:'10.000000',dimensions:{branch:'baghdad',salesperson:id,customer:id,business_line:id,product:id},...(index<2?{displayLabels:{salesperson:'{"en_US":"Same name","ar_001":"اسم متكرر"}',customer:'Customer',businessLine:'General'}}:{})}));
  await new PostgresMartWriter(db.ingestor,{a:['fixture-company']},clock).commit(batch('named',rows.length),rows.map(row=>({facts:[row]})),evidence);
  const repository=new PostgresAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  for(const locale of ['en','ar'] as const){
   const options=await repository.listDimensionOptions('salesperson',{tenantId:'a',locale});
   assert.equal(options.find(option=>option.id==='source:2045')?.label,locale==='ar'?'اسم متكرر':'Same name');
   assert.equal(options.find(option=>option.id==='source:2046')?.label,locale==='ar'?'اسم متكرر':'Same name');
   assert.equal(options.find(option=>option.id==='source:missing')?.label,undefined);
   const result=await repository.execute({metric:'revenue',filters:[{dimension:'salesperson',values:['source:2045']}]},{tenantId:'a',locale});assert.equal(result.rows[0]?.value,10);
  }
  for(const dimension of ['customer','business_line','product'] as const){const options=await repository.listDimensionOptions(dimension,{tenantId:'a',locale:'en'});assert.equal(options.length,4);assert.equal(options[0]?.label,dimension==='customer'?'Customer':dimension==='business_line'?'General':undefined);}
  const scoped=await repository.listDimensionOptions('salesperson',{tenantId:'a',locale:'en',enforcedFilters:[{dimension:'salesperson',values:['source:2046']}]});assert.deepEqual(scoped,[{id:'source:2046',label:'Same name'}]);
 }finally{await db.close();}
});
