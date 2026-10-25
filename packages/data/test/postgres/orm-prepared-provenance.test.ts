import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture,observedFact,factControls,deltaContext} from './business-delta-fixture.ts';
import {pages} from './business-fixture.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';

test('prepared Business, stock and Command results disclose copy provenance without altering values',{skip:!enabled},async()=>{
 const fixture=await deltaFixture();
 try{
  const repository=new PreparedAnalyticsRepository(fixture.db.runtime,{reportingCurrencies:{a:'IQD'}});
  const prior=await repository.execute({metric:'period_net_sales',dateRange:{from:'2026-10-01',to:'2026-10-20'}},deltaContext);
  assert.equal(prior.metadata.sourceConsistency,undefined);
  const cutoff='2026-10-21T09:00:00.000Z',revision='orm-observed-copy-v1:'+'a'.repeat(64);
  const facts=fixture.initial.map(fact=>({...observedFact(fact,cutoff,fact.kind==='snapshot'?'2026-10-21':fact.businessDate),frozenRevision:revision}));
  await exposeReviewMonth(fixture.db.ingestor,{...fixture.source,cutoff,revision,facts:pages(facts),controls:async()=>factControls(facts)},'business');
  const dateRange={from:'2026-10-01',to:'2026-10-21'};
  const sales=await repository.execute({metric:'period_net_sales',dateRange},deltaContext);
  assert.equal(sales.rows[0]?.value,prior.rows[0]?.value);assert.equal(sales.metadata.sourceConsistency,'api_observed');
  const stock=await repository.execute({metric:'internal_stock_quantity',groupBy:'product',dateRange},deltaContext);
  assert.equal(stock.rows[0]?.value,13);assert.equal(stock.metadata.sourceConsistency,'api_observed');
  const command=await repository.execute({metric:'command_invoice_total',dateRange},deltaContext);
  assert.equal(command.metadata.sourceConsistency,'api_observed');
  assert.equal(command.metadata.sourceAsOf,cutoff);
 }finally{await fixture.db.close();}
});
