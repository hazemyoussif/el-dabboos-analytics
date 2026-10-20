import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {refreshOperationalMonths} from '../../src/operational/aggregates.ts';
import assert from 'node:assert/strict';
import {odooComparisonCandidate} from '../../src/odoo/mapping.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
import {publishFinanceSnapshot} from '../../src/operational/finance-publication.ts';
import {requiredMeasures,timeDimensions,AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import type {AnalyticsResult,AnalyticsContext} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction,verifyMartRuntimeRole} from '../../src/postgres/session.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {DashboardExecutor,dashboardTemplates,supportedPurposeTemplate,supportedTemplatePeriod,templateCompatibility} from '../../../application/src/index.ts';
import {Pool} from 'pg';
import type {PoolClient,QueryResult} from 'pg';

const context={tenantId:'a',locale:'en' as const},dateRange={from:'2026-09-01',to:'2026-09-30'},options={reportingCurrencies:{a:'IQD'}};
async function prepare(pool:Pool){
 await tenantTransaction(pool,'a',async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['analytics:a']);
  const revisionId=(await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  await prepareRevision(client,{tenantId:'a',revisionId},{maxCellsPerChunk:50000,maxChunks:100});
 },'repeatable-write',120000);
}

test('accepted complete snapshots reconcile signed totals and detail without float residues or stale identities',{skip:!enabled},async testContext=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-08','business',[
   {measure:'review_customer_balance',entity:'settled',customer:'old',value:'30.000000'}]),'business');
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[
   {measure:'review_customer_balance',entity:'debit',customer:'current',value:'0.100000'},
   {measure:'review_customer_balance',entity:'credit',customer:'current',value:'-0.300000'},
   {measure:'review_customer_balance',entity:'debit2',customer:'current',value:'0.200000'}
  ],'2026-11-03T09:00:00.000Z'),'business');
  await prepare(db.ingestor);
  const prepared=new PreparedAnalyticsRepository(db.runtime,options),baseline=new TrustedAnalyticsRepository(db.runtime,options);
  const query={metric:'review_customer_balance' as const,dateRange};
  const total=await prepared.execute(query,context),detail=await prepared.execute({...query,groupBy:'customer'},context);
  assert.deepEqual(total.rows,[{key:null,value:0}]);
  assert.deepEqual(detail.rows,[{key:'fixture:current',value:0}]);
  const oldTotal=await baseline.execute(query,context),oldDetail=await baseline.execute({...query,groupBy:'customer'},context);
  testContext.diagnostic('Independent complete-population oracle: signed total zero, one current customer, settled customer absent');
  assert.deepEqual(oldDetail.rows,detail.rows,'detail must replace settled identities in complete observations');
  assert.deepEqual(oldTotal.rows,total.rows,'summary must preserve exact signed decimal cancellation');
 }finally{await db.close();}
});

type Sample={calls:number;ms:number};
function profile(pool:Pool){
 const samples:Record<string,Sample>={};let active=0;
 const connect=pool.connect.bind(pool);
 pool.connect=(async()=>{
  const began=performance.now(),client=await connect(),sample=samples.poolWait??={calls:0,ms:0};
  sample.calls++;sample.ms+=performance.now()-began;return client;
 }) as Pool['connect'];
 pool.on('connect',client=>{
  const query=client.query.bind(client) as (sql:string,params?:unknown[])=>Promise<QueryResult>;
  client.query=(async(sql:string,params?:unknown[])=>{
   const category=/prepared_cells/.test(sql)?'cells':/analytics_partitions|analytics_baselines|finance_publications|finance_snapshot_evidence|review_extractions/.test(sql)?'publication':/BEGIN|COMMIT|set_config/.test(sql)?'transaction':'guardsAndBindings';
   const sample=samples[category]??={calls:0,ms:0};sample.calls++;active++;const began=performance.now();
   try{return await query(sql,params);}finally{sample.ms+=performance.now()-began;active--;}
  }) as PoolClient['query'];
 });
 return {samples,reset(){assert.equal(active,0);for(const category of Object.keys(samples))delete samples[category];}};
}

test('product invoice report publication and prepared SQL profile uses the governed executor',{skip:!enabled},async testContext=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'review'),'review');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');await prepare(db.ingestor);
  const measured=profile(db.runtime),prepared=new PreparedAnalyticsRepository(db.runtime,options),baseline=new TrustedAnalyticsRepository(db.runtime,options);
  const capabilities=await prepared.getPublishedCapabilities(context);
  const source=dashboardTemplates.find(template=>template.id==='product-invoice-performance')!;
  const template=supportedPurposeTemplate(source,capabilities),period=supportedTemplatePeriod(template,capabilities);assert.ok(period);
  const spec={schemaVersion:2 as const,id:template.id,title:template.name,locale:'en' as const,filters:{dateRange:period},widgets:template.widgets,layout:template.layout};
  const clock=()=>new Date('2026-10-19T12:00:00Z');
  for(const mode of ['first','repeat','baseline']){
   measured.reset();const began=performance.now();
   const result=await new DashboardExecutor(mode==='baseline'?baseline:prepared,clock).execute(spec,context,{timeZone:'Asia/Baghdad'});
   assert.equal(result.metadata.failedSeries,0);
   testContext.diagnostic(JSON.stringify({syntheticOnly:true,report:template.id,mode,executorMs:performance.now()-began,sql:measured.samples}));
  }
 }finally{await db.close();}
});

function stableResult(result:AnalyticsResult){const {executedAt,...metadata}=result.metadata;void executedAt;return {...result,metadata};}

test('request publication reuse preserves context, result ownership, live revision checks and fresh scopes',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');await prepare(db.ingestor);
  const repository=new PreparedAnalyticsRepository(db.runtime,options),scope=await repository.createExecutionScope(context);
  const query={metric:'review_customer_balance' as const,groupBy:'customer' as const,dateRange};
  const expected=await repository.execute(query,context),first=await scope.execute(query,context);
  assert.deepEqual(stableResult(first),stableResult(expected));
  assert.ok(first.metadata.release);first.metadata.release.datasetId='MUTATED';
  assert.deepEqual(stableResult(await scope.execute(query,context)),stableResult(expected),'result mutation must not corrupt the scoped publication');
  for(const actor of [{...context,tenantId:'b'},{...context,locale:'ar' as const},{...context,enforcedFilters:[{dimension:'customer' as const,values:['missing']}]}]){
   assert.throws(()=>scope.execute(query,actor),/context changed/);
  }
  const policy:AnalyticsContext={...context,enforcedFilters:[{dimension:'customer',values:['missing']}]};
  const restricted=await repository.createExecutionScope(policy);
  assert.deepEqual((await restricted.execute(query,policy)).rows,[]);
  await exposeReviewMonth(db.ingestor,fixture('2026-10',true),'business');
  await assert.rejects(scope.execute(query,context),AnalyticsPublicationChangedError);
  await assert.rejects(scope.verifyExecution!(),AnalyticsPublicationChangedError);
  await prepare(db.ingestor);
  const next=await repository.createExecutionScope(context);assert.notEqual(next.servingRevision,scope.servingRevision);
  assert.deepEqual((await next.execute(query,context)).rows,expected.rows);await next.verifyExecution!();
 }finally{await db.close();}
});

test('all locally supported purpose reports retain complete result equality after the fixes',{skip:!enabled},async testContext=>{
 const db=await database();try{
  await reportFixture(db);
  const prepared=new PreparedAnalyticsRepository(db.runtime,options),baseline=new TrustedAnalyticsRepository(db.runtime,options);
  const capabilities=await prepared.getPublishedCapabilities(context),reports:string[]=[];
  const clock=()=>new Date('2026-10-19T12:00:00Z');
  for(const source of dashboardTemplates){
   const template=supportedPurposeTemplate(source,capabilities),period=supportedTemplatePeriod(template,capabilities);
   if(templateCompatibility(template,capabilities).status!=='supported'||!period)continue;
   const spec={schemaVersion:2 as const,id:template.id,title:template.name,locale:'en' as const,filters:{dateRange:period},widgets:template.widgets,layout:template.layout};
   const first=await new DashboardExecutor(prepared,clock).execute(spec,context,{timeZone:'Asia/Baghdad'});
   const expected=await new DashboardExecutor(baseline,clock).execute(spec,context,{timeZone:'Asia/Baghdad'});
   const stable=(result:unknown)=>JSON.parse(JSON.stringify(result,(key,value)=>key==='executedAt'?undefined:value));
   assert.equal(first.metadata.failedSeries,0,template.id);
   assert.deepEqual(stable(first),stable(expected),template.id);reports.push(template.id);
  }
  assert.ok(reports.includes('customer-debt-aging'));assert.ok(reports.includes('product-invoice-performance'));
  assert.ok(reports.includes('book-liquidity-due-coverage'));
  const unavailable=dashboardTemplates.filter(source=>!reports.includes(source.id)).map(source=>({report:source.id,missing:templateCompatibility(supportedPurposeTemplate(source,capabilities),capabilities).missing}));
  testContext.diagnostic(JSON.stringify({syntheticOnly:true,comparedReports:reports.length,reports,unavailable}));
 }finally{await db.close();}
});

async function reportFixture(db:Awaited<ReturnType<typeof database>>){
 const spec=mapping(),comparison=odooComparisonCandidate({tenantId:'a',sourceId:'fixture',datasetId:'release',mappingId:'synthetic',mappingVersion:'1',businessOwner:'synthetic',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'});
 spec.measures=[...spec.measures.filter(rule=>!comparison.measures.some(peer=>peer.measureId===rule.measureId)),...comparison.measures];
 spec.capabilities=[...spec.capabilities.filter(capability=>!comparison.capabilities.some(peer=>peer.metric===capability.metric)),...comparison.capabilities].map(capability=>({...capability,dimensions:capability.dimensions.filter(dimension=>timeDimensions.includes(dimension)||requiredMeasures(capability.metric).every(measure=>Object.hasOwn(spec.measures.find(rule=>rule.measureId===measure)!.dimensionMappings,dimension)))}));
 spec.measures=[...spec.measures,...receivableMeasures.map(measureId=>({...spec.measures[0]!,measureId,dimensionMappings:{customer:'Synthetic customer'}}))];
 spec.capabilities=[...spec.capabilities,...[...receivableMeasures,'overdue_receivable_percentage' as const].map(metric=>({metric,dimensions:['customer' as const,'month' as const]}))];
 await deploy(db.migrator,spec);await bootstrapOperationalServing(db.migrator,'a');
 await exposeReviewMonth(db.ingestor,fixture('2026-01',false,'review'),'review');
 await exposeReviewMonth(db.ingestor,fixture('2026-01',true),'business');
 await exposeReviewMonth(db.ingestor,fixture('2026-02',false,'review'),'review');
 await exposeReviewMonth(db.ingestor,fixture('2026-02',true),'business');
 await tenantTransaction(db.migrator,'a',async client=>{
  const parent=(await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id,next=randomUUID();
  await refreshOperationalMonths(client,{tenantId:'a',revisionId:next,parent,runId:null,cutoff:'2026-11-02T09:00:00.000Z',purpose:'adoption'},['2026-02']);
  await client.query("UPDATE mart.analytics_trusted_serving SET revision_id=$1 WHERE tenant_id='a'",[next]);
 });
 const totals=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
 await publishFinanceSnapshot(db.ingestor,{tenantId:'a',currency:'IQD',date:'2026-01-31',sourceCutoff:'2026-11-02T09:00:00.000Z',sourceRevision:'SYNTHETIC',totals,customers:[{id:'fixture:customer',actual:totals,expected:{...totals}}]});
 await prepare(db.ingestor);
}

test('baseline and prepared snapshots preserve authoritative emptiness, opening cutoffs and ratio nulls',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-08','business',[
   {measure:'review_customer_balance',entity:'one',customer:'old',value:'100.000000'}],undefined,{current:true}),'business');
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[],'2026-11-03T09:00:00.000Z',{current:true,emptyMeasures:['review_customer_balance','customer_period_sales','customer_last_invoice_date']}),'business');
  await prepare(db.ingestor);
  const prepared=new PreparedAnalyticsRepository(db.runtime,options),baseline=new TrustedAnalyticsRepository(db.runtime,options);
  for(const repository of [prepared,baseline]){
   assert.deepEqual((await repository.execute({metric:'review_customer_balance',dateRange},context)).rows,[{key:null,value:0}]);
   assert.deepEqual((await repository.execute({metric:'review_customer_balance',groupBy:'customer',dateRange},context)).rows,[]);
   assert.deepEqual((await repository.execute({metric:'customer_last_invoice_date',dateRange},context)).rows,[{key:null,value:null}]);
   assert.deepEqual((await repository.execute({metric:'customer_balance_sales_percentage',dateRange},context)).rows,[{key:null,value:null}]);
   const opening={metric:'review_customer_balance' as const,dateRange:{from:'2026-09-01',to:'2026-09-10'}};
   assert.deepEqual((await repository.execute(opening,context)).rows,[{key:null,value:100}]);
   const policy={...context,enforcedFilters:[{dimension:'customer' as const,values:['fixture:old']}]};
   assert.deepEqual((await repository.execute({...opening,groupBy:'customer'},policy)).rows,[{key:'fixture:old',value:100}]);
  }
 }finally{await db.close();}
});

test('the bounded company diagnostic reconciles synthetic controls and guards the prepared path end to end',{skip:!enabled},async()=>{
 const {diagnosePreparedAcceptance,profilePool}=await import(new URL('../../../../docs/qa/maintenance/prepared-acceptance-diagnosis-2026-10-19.mjs',import.meta.url).href);
 const {businessDefinitionVersion}=await import('../../src/business/definitions.ts');
 const {numericOutput}=await import('../../src/postgres/sql.ts');
 const deps=await import('../../../application/src/index.ts');
 const db=await database(),preparedPool=new Pool({...db.runtime.options,max:8,options:'-c jit=off'}),baselinePool=new Pool({...db.runtime.options,max:8});
 try{
  await reportFixture(db);await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');await prepare(db.ingestor);
  const revision=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  const records:Array<Record<string,unknown>>=[],preparedProfile=profilePool(preparedPool,true),baselineProfile=profilePool(baselinePool);
  await verifyMartRuntimeRole(preparedPool);await verifyMartRuntimeRole(baselinePool);
  assert.equal((await preparedPool.query('SHOW jit')).rows[0].jit,'off');
  assert.equal((await baselinePool.query('SHOW jit')).rows[0].jit,'on','prepared diagnostic option must not affect baseline connections');
  await diagnosePreparedAcceptance({prepared:new PreparedAnalyticsRepository(preparedPool,options),baseline:new TrustedAnalyticsRepository(baselinePool,options),context,revision,
   read:(operation:(client:PoolClient)=>Promise<unknown>)=>tenantTransaction(baselinePool,'a',operation,true),
   emit:(record:Record<string,unknown>)=>records.push(record),preparedProfile,baselineProfile},{...deps,businessDefinitionVersion,numericOutput});
  const reconciliations=records.filter(record=>record.stage==='completeSnapshotReconciliation');assert.equal(reconciliations.length,5);
  assert.ok(reconciliations.every(record=>record.acceptedControlsExact&&record.preparedTotalEqual&&record.baselineTotalEqual));
  assert.ok(records.some(record=>record.stage==='boundedDiagnosisComplete'));
  assert.equal(preparedProfile.snapshot().historyAttempts,0);
 }finally{await Promise.all([preparedPool.end(),baselinePool.end()]);await db.close();}
});


test('bounded prepared cell plan probe runs actual tenant SQL and transaction-local JIT comparison',{skip:!enabled},async()=>{
 const {probePreparedCellPlans}=await import(new URL('../../../../docs/qa/maintenance/prepared-cell-plans-2026-10-19.mjs',import.meta.url).href);
 const {validateQuery}=await import('@el-dabboos/domain');
 const {preparedPublication,preparedQueryRelease}=await import('../../src/prepared/publication-metadata.ts');
 const {readPreparedSelection}=await import('../../src/prepared/selection.ts');
 const db=await database();try{
  await reportFixture(db);await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');await prepare(db.ingestor);
  await verifyMartRuntimeRole(db.runtime);
  const revision=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  const available=(await db.admin.query('SELECT pg_jit_available() available')).rows[0].available;
  assert.equal(available,true,'synthetic PostgreSQL image must exercise real JIT plans');
  const records:Array<Record<string,unknown>>=[];let historyAttempts=0;
  const read=(operation:(client:PoolClient)=>Promise<unknown>)=>tenantTransaction(db.runtime,'a',async client=>{
   await client.query("SELECT set_config('jit','on',true)");
   const guarded={query:async(sql:string,params?:unknown[])=>{
    if(/\b(review_facts|review_controls|analytics_fact_heads|analytics_fact_revisions|finance_snapshot_customers|prepared_input_rows|prepared_expected_cells|prepared_work_[a-z_]+)\b/i.test(sql)){
     historyAttempts++;throw new Error('Unexpected raw history query');
    }
    // Force the JIT branch only in this small synthetic fixture, never in the company probe.
    if(sql.startsWith('EXPLAIN '))await client.query("SELECT set_config('jit_above_cost','0',true)");
    return client.query(sql,params);
   }} as PoolClient;
   const result=await operation(guarded);
   assert.equal((await client.query('SHOW jit')).rows[0].jit,'on','probe must restore native transaction settings');
   return result;
  },true);
  await probePreparedCellPlans({context,revision,read,emit:(record:Record<string,unknown>)=>records.push(record)},
   {validateQuery,preparedPublication,preparedQueryRelease,readPreparedSelection});
  const plans=records.filter(record=>record.stage==='cellPlan');assert.equal(plans.length,9);
  assert.deepEqual(plans.map(record=>record.mode),Array.from({length:3},()=>['native','transaction-jit-off','native-repeat']).flat());
  for(const plan of plans){
   assert.ok(Array.isArray(plan.nodes));assert.ok(Number(plan.executionMs)>=0);
   assert.equal(Number((plan.jit as {functions:number}).functions)>0,plan.mode!=='transaction-jit-off');
  }
  assert.equal(historyAttempts,0);assert.ok(records.some(record=>record.stage==='preparedCellPlanProbeComplete'));
  assert.doesNotMatch(JSON.stringify(plans),/fixture:|Index Cond|QUERY PLAN/);
 }finally{await db.close();}
});


test('prepared repository disables JIT only in its read transaction and restores pooled settings on commit and rollback',{skip:!enabled},async()=>{
 const db=await database();try{
  await reportFixture(db);await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');await prepare(db.ingestor);
  await verifyMartRuntimeRole(db.runtime);
  const connection=await db.runtime.connect(),original=connection.query.bind(connection);
  const sqlQuery=original as (sql:string,params?:unknown[])=>Promise<QueryResult>;
  await sqlQuery("SELECT set_config('jit','on',false),set_config('jit_above_cost','0',false)");
  let cellReads=0;
  async function observeCell(sql:string,params?:unknown[]){
   cellReads++;
   assert.equal((await sqlQuery('SHOW jit')).rows[0].jit,'off','actual prepared cell statement must not compile JIT');
   const plan=(await sqlQuery('EXPLAIN (ANALYZE,TIMING OFF,FORMAT JSON) '+sql,params)).rows[0]['QUERY PLAN'][0];
   assert.equal(plan.JIT?.Functions??0,0,'forced low threshold must not re-enable JIT');
   return sqlQuery(sql,params);
  }
  connection.query=((...args:unknown[])=>{
   if(typeof args[0]==='string'&&/\bmart\.prepared_cells\b/.test(args[0]))return observeCell(args[0],args[1] as unknown[]|undefined);
   return Reflect.apply(original,connection,args);
  }) as PoolClient['query'];
  connection.release();
  async function restored(){
   const client=await db.runtime.connect();try{
    assert.equal((await client.query('SHOW jit')).rows[0].jit,'on','transaction-local setting must not leak into pooled session');
    assert.equal((await client.query('SHOW jit_above_cost')).rows[0].jit_above_cost,'0');
   }finally{client.release();}
  }
  const prepared=new PreparedAnalyticsRepository(db.runtime,options),baseline=new TrustedAnalyticsRepository(db.runtime,options);
  for(const query of [
   {metric:'net_invoiced_revenue' as const,groupBy:'product' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'},analysis:{topN:{direction:'top' as const,limit:10}}},
   {metric:'review_customer_balance' as const,groupBy:'customer' as const,dateRange},
   {metric:'review_customer_balance' as const,dateRange}
  ]){
   const expected=await baseline.execute(query,context);
   assert.deepEqual(stableResult(await prepared.execute(query,context)),stableResult(expected));await restored();
   const scope=await prepared.createExecutionScope(context);
   assert.deepEqual(stableResult(await scope.execute(query,context)),stableResult(expected));await scope.verifyExecution!();await restored();
  }
  assert.equal(cellReads,6);
  const failure=new Error('synthetic currency service failure');
  const broken=new PreparedAnalyticsRepository(db.runtime,{...options,reportingCurrency:async()=>{throw failure;}});
  await assert.rejects(broken.execute({metric:'review_customer_balance',dateRange},context),error=>error===failure);
  await restored();
  await assert.rejects(prepared.execute({metric:'review_customer_balance',dateRange},{...context,tenantId:'b'}));
  await restored();assert.equal(cellReads,6,'failed or foreign tenant reads must not reach cells');
 }finally{await db.close();}
});

test('parallel prepared series share only needed publication families and immutable bindings inside one scope',{skip:!enabled},async()=>{
 const db=await database(),runtime=new Pool({...db.runtime.options,max:8});try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');await prepare(db.ingestor);
  const direct=new PreparedAnalyticsRepository(db.runtime,options),queries=[
   {metric:'period_net_sales' as const,dateRange},
   {metric:'period_net_sales' as const,groupBy:'customer' as const,dateRange},
   {metric:'review_customer_balance' as const,dateRange},
   {metric:'review_customer_balance' as const,groupBy:'customer' as const,dateRange}
  ];
  const expected=await Promise.all(queries.map(query=>direct.execute(query,context)));
  let publications=0,bindings=0,financeReads=0,revisionChecks=0;
  runtime.on('connect',client=>{
   const original=client.query.bind(client);
   client.query=((...args:unknown[])=>{
    const sql=typeof args[0]==='string'?args[0]:'';
    if(sql.includes('FROM mart.analytics_baselines baseline')){
     publications++;
     return original('SHOW jit').then(result=>{
      assert.equal(result.rows[0].jit,'off','lazy capability discovery must also run inside the JIT-off transaction');
      return Reflect.apply(original,client,args);
     });
    }
    if(sql.includes('SELECT binding.data_id,binding.period::text'))bindings++;
    if(sql.includes('finance_snapshot_evidence'))financeReads++;
    if(sql==='SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1')revisionChecks++;
    return Reflect.apply(original,client,args);
   }) as PoolClient['query'];
  });
  const repository=new PreparedAnalyticsRepository(runtime,options),scope=await repository.createExecutionScope(context);
  assert.equal(publications,0,'scope creation must not discover unrelated source capabilities');
  const results=await Promise.all(queries.map(query=>scope.execute(query,context)));
  results.forEach((result,index)=>assert.deepEqual(stableResult(result),stableResult(expected[index]!)));
  assert.equal(publications,1,'parallel Business queries share one certified projection');
  assert.equal(bindings,2,'event and snapshot bindings each load once');
  assert.equal(financeReads,0,'Business reports must not discover Finance evidence');
  assert.ok(revisionChecks>=queries.length+1,'each read retains its transaction-local revision check');
  await scope.verifyExecution!();
  const fresh=await repository.createExecutionScope(context);await fresh.execute(queries[0]!,context);
  assert.equal(publications,2,'another execution owns fresh metadata');assert.equal(bindings,3);
  await exposeReviewMonth(db.ingestor,fixture('2026-10',true),'business');
  await assert.rejects(scope.execute(queries[0]!,context),AnalyticsPublicationChangedError);
  await assert.rejects(scope.verifyExecution!(),AnalyticsPublicationChangedError);
 }finally{await runtime.end();await db.close();}
});
