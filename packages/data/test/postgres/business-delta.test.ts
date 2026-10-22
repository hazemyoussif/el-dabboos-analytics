import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,changedInvoice,observedFact,factControls,storedCounts,deltaContext,deltaRange,replacementPages,deltaBounds} from './business-delta-fixture.ts';
import {fixture,pages} from './business-fixture.ts';
import type {ProductionFact} from '@el-dabboos/domain';
import {exposeBusinessDeltaMonth,exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';

test('Business correction/deletion stores only replacements, preserves baseline bytes and reuses unaffected prepared inputs',{skip:!enabled},async()=>{
 const {db,source,initial,accepted}=await deltaFixture();
 try{
  const original=(await db.admin.query('SELECT fact_key,payload FROM mart.review_facts WHERE partition_id=$1 ORDER BY fact_key',[accepted.partitionId])).rows;
  const priorBindings=(await db.admin.query("SELECT data_id,kind,period FROM mart.prepared_bindings WHERE revision_id=$1 AND family='business' ORDER BY kind,period",[accepted.revisionId])).rows;
  const cutoff='2026-10-20T10:00:00.000Z',updated=changedInvoice(initial,cutoff).map(fact=>observedFact(fact,cutoff,'2026-10-14')),added=changedInvoice(initial,cutoff,'11');
  const changed=await exposeBusinessDeltaMonth(db.ingestor,deltaSource(source,cutoff,[{object:'command_invoice',id:'10',facts:updated},{object:'command_invoice',id:'11',facts:added}]));
  assert.equal(changed.facts,updated.length+added.length);
  assert.deepEqual((await db.admin.query('SELECT fact_key,payload FROM mart.review_facts WHERE partition_id=$1 ORDER BY fact_key',[accepted.partitionId])).rows,original);
  const nextBindings=(await db.admin.query("SELECT data_id,kind,period FROM mart.prepared_bindings WHERE revision_id=$1 AND family='business' ORDER BY kind,period",[changed.revisionId])).rows;
  assert.deepEqual(nextBindings.filter(binding=>binding.kind==='snapshot'),priorBindings.filter(binding=>binding.kind==='snapshot'),'event edits reuse snapshot datasets');
  const prepared=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),native=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'command_invoice_total' as const,dateRange:deltaRange};
  assert.equal((await prepared.execute(query,deltaContext)).rows[0]?.value,6);
  assert.deepEqual((await prepared.execute({...query,groupBy:'customer'},deltaContext)).rows,(await native.execute({...query,groupBy:'customer'},deltaContext)).rows);
  assert.deepEqual((await prepared.execute({...query,groupBy:'date'},deltaContext)).rows,(await native.execute({...query,groupBy:'date'},deltaContext)).rows,'backdated correction removes the prior daily cell and creates the new daily cell');
  const physical=(await db.admin.query(`SELECT binding.revision_id,count(*)::int cells FROM mart.prepared_bindings binding
   JOIN mart.prepared_cells cell USING(tenant_id,data_id) WHERE binding.tenant_id='a' AND binding.family='business' AND binding.kind='event'
   AND binding.revision_id=ANY($1::text[]) GROUP BY binding.revision_id`,[[accepted.revisionId,changed.revisionId]])).rows;
  assert.ok(physical.find(row=>row.revision_id===changed.revisionId).cells<physical.find(row=>row.revision_id===accepted.revisionId).cells,'changed preparation stores fewer cells than the complete baseline');
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.business_prepared_origins WHERE revision_id=$1',[changed.revisionId])).rows[0].count,1);
  const deleted=await exposeBusinessDeltaMonth(db.ingestor,deltaSource(source,'2026-10-20T11:00:00.000Z',[{object:'command_invoice',id:'10',facts:[]}]));
  assert.equal(deleted.facts,0);
  assert.equal((await prepared.execute(query,deltaContext)).rows[0]?.value,1);
  assert.deepEqual((await prepared.execute(query,deltaContext)).rows,(await native.execute(query,deltaContext)).rows);
  const beforeNoop=await storedCounts(db),unchanged=added.map(fact=>observedFact(fact,'2026-10-20T12:00:00.000Z'));
  const checked=await exposeBusinessDeltaMonth(db.ingestor,deltaSource(source,'2026-10-20T12:00:00.000Z',[{object:'command_invoice',id:'11',facts:unchanged}]));
  assert.equal(checked.unchanged,true);assert.equal(checked.revisionId,deleted.revisionId);
  assert.deepEqual(await storedCounts(db),beforeNoop);
  assert.equal((await prepared.execute(query,deltaContext)).metadata.sourceAsOf,'2026-10-20T12:00:00.000Z');
  const priorEvent=priorBindings.find(binding=>binding.kind==='event')!.data_id;
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('SELECT * FROM mart.business_prepared_cells($1,$2)', ['a',priorEvent]),true),/not currently published/);
  await assert.rejects(tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.business_prepared_cells($1,$2)', ['a',nextBindings.find(binding=>binding.kind==='event')!.data_id]),true),/Invalid Business prepared read identity/);
  assert.equal((await tenantTransaction(db.runtime,'b',client=>client.query("SELECT * FROM mart.review_fact_population WHERE tenant_id='a'"),true)).rowCount,0);
 }finally{await db.close();}
});

test('Business snapshot rollover replaces empty groups, preserves stock observation and reuses prepared keys across months',{skip:!enabled},async()=>{
 const {db,source}=await deltaFixture();
 try{
  const empty=deltaSource(source,'2026-10-21T10:00:00.000Z',[{object:'command_receivable',id:'10',facts:[]}],['command_receivable']);
  await exposeBusinessDeltaMonth(db.ingestor,{...empty,replaceObjects:['command_receivable']});
  const prepared=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),native=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'command_customer_balance' as const,dateRange:{from:'2026-10-01',to:'2026-10-21'}};
  const balance=await prepared.execute(query,deltaContext);
  assert.equal(balance.rows[0]?.value,0);assert.equal(balance.metadata.snapshotAsOf,'2026-10-21');
  assert.deepEqual(balance.rows,(await native.execute(query,deltaContext)).rows);
  const stock=await prepared.execute({metric:'internal_stock_quantity',groupBy:'product',dateRange:deltaRange},deltaContext);
  assert.equal(stock.rows[0]?.value,13);assert.equal(stock.metadata.sourceAsOf,'2026-10-20T09:00:00.000Z');
  assert.equal(stock.metadata.snapshotAsOf,'2026-10-20');
  const november=fixture('2026-11',true,'business',true),facts:ProductionFact[]=[];
  for await(const page of november.facts)facts.push(...page);
  const cutoff='2026-11-01T10:00:00.000Z',command=facts.filter(fact=>fact.measureId.startsWith('command_')).map(fact=>observedFact(fact,cutoff,'2026-11-01'));
  const mapping={...november.mapping,measures:november.mapping.measures.filter(rule=>rule.measureId.startsWith('command_')),capabilities:november.mapping.capabilities.filter(capability=>capability.metric.startsWith('command_'))};
  await exposeReviewMonth(db.ingestor,{...november,mapping,cutoff,revision:command[0]!.frozenRevision!,facts:pages(command),controls:async()=>factControls(command),requireEmptyMonth:true},'business');
  const next={...query,dateRange:{from:'2026-11-01',to:'2026-11-01'}};
  assert.equal((await prepared.execute(next,deltaContext)).rows[0]?.value,1);
  assert.deepEqual((await prepared.execute({...next,groupBy:'customer'},deltaContext)).rows,(await native.execute({...next,groupBy:'customer'},deltaContext)).rows);
  assert.equal((await prepared.execute({metric:'internal_stock_quantity',groupBy:'product',dateRange:deltaRange},deltaContext)).metadata.snapshotAsOf,'2026-10-20');
  await assert.rejects(prepared.execute({metric:'internal_stock_quantity',groupBy:'product',dateRange:next.dateRange},deltaContext),/Uncertified prepared query/);
 }finally{await db.close();}
});

test('Business mismatches and promotion failures roll back raw data, prepared deltas and the trusted pointer',{skip:!enabled},async()=>{
 const {db,source,initial}=await deltaFixture();
 try{
  const before=await storedCounts(db),cutoff='2026-10-20T10:00:00.000Z',facts=changedInvoice(initial,cutoff);
  const bad=deltaSource(source,cutoff,[{object:'command_invoice',id:'10',facts}]);
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...bad,identityControls:async()=>[{measure:'command_invoice_total',dimensions:null,value:'999.000000',count:'1'}]}),/independent identity controls/);
  assert.deepEqual(await storedCounts(db),before);
  const requested={...bad,replacements:replacementPages([]),discover:async(request:(object:string,ids:readonly string[])=>Promise<void>)=>request('command_invoice',['10'])};
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...requested,readReplacements:()=>replacementPages([])}),/Complete Business replacements/);
  const extra=changedInvoice(initial,cutoff,'11');
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...requested,readReplacements:()=>replacementPages([
   {object:'command_invoice',id:'10',facts},{object:'command_invoice',id:'11',facts:extra}
  ])}),/Business identity source controls incomplete/);
  assert.deepEqual(await storedCounts(db),before);
  await db.admin.query(`CREATE FUNCTION mart.synthetic_fail_promotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC atomic rollback'; END $$;
   CREATE TRIGGER synthetic_fail_promotion BEFORE UPDATE ON mart.analytics_trusted_serving FOR EACH ROW EXECUTE FUNCTION mart.synthetic_fail_promotion()`);
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,deltaSource(source,cutoff,[{object:'command_invoice',id:'10',facts}])),/SYNTHETIC atomic rollback/);
  assert.deepEqual(await storedCounts(db),before);
 }finally{await db.close();}
});

test('established sparse Business input without a sealed prepared parent rejects instead of rebuilding the complete month',{skip:!enabled},async()=>{
 const {db,source,initial}=await deltaFixture(false);
 try{
  const cutoff='2026-10-20T10:00:00.000Z';
  const changed=await exposeBusinessDeltaMonth(db.ingestor,deltaSource(source,cutoff,[{object:'command_invoice',id:'10',facts:changedInvoice(initial,cutoff)}]));
  const before=await storedCounts(db);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:changed.revisionId},deltaBounds)),/no full-month fallback/);
  assert.deepEqual(await storedCounts(db),before);
 }finally{await db.close();}
});
