import {odooComparisonCandidate} from '../../src/odoo/mapping.ts';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {preparePublishedRevision,activatePreparedRevision} from '../../src/prepared/operator.ts';
import {PublishedAnalyticsRepository} from '../../src/published-repository.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {compatibleQuantityMetrics,publishedQueryIssues,requiredMeasures,timeDimensions,AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import {readPreparedSelection} from '../../src/prepared/selection.ts';
import {fixture} from './business-fixture.ts';
import {executeFacts} from '../../src/engine.ts';
import type {AnalyticsQuery,ProductionFact,AnalyticsResultCursor} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping,fact} from './fixtures.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import {persistOperationalFacts} from '../../src/operational/facts.ts';
import {refreshOperationalMonths} from '../../src/operational/aggregates.ts';
import {readBaseline} from '../../src/operational/baseline.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {prepareRevision,prepareChunk,requiredPreparedChunks} from '../../src/prepared/preparation.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
import {publishFinanceSnapshot} from '../../src/operational/finance-publication.ts';
const bounds={maxCellsPerChunk:50000,maxChunks:100},tenant='a';
async function revision(pool:Pool){return tenantTransaction(pool,tenant,async client=>(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenant])).rows[0].revision_id as string,true);}
async function prepare(pool:Pool){const revisionId=await revision(pool);return tenantTransaction(pool,tenant,async client=>{await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenant}`]);return {revisionId,results:await prepareRevision(client,{tenantId:tenant,revisionId},bounds)};},'repeatable-write',120000);}
async function setup(operational=false){const db=await database(),spec=mapping();
 if(operational){
  const comparison=odooComparisonCandidate({tenantId:tenant,sourceId:'fixture',datasetId:'release',mappingId:'synthetic',mappingVersion:'1',businessOwner:'synthetic',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'});
  spec.measures=[...spec.measures.filter(rule=>!comparison.measures.some(peer=>peer.measureId===rule.measureId)),...comparison.measures];
  spec.capabilities=[...spec.capabilities.filter(capability=>!comparison.capabilities.some(peer=>peer.metric===capability.metric)),...comparison.capabilities].map(capability=>({...capability,dimensions:capability.dimensions.filter(dimension=>timeDimensions.includes(dimension)||requiredMeasures(capability.metric).every(measure=>Object.hasOwn(spec.measures.find(rule=>rule.measureId===measure)!.dimensionMappings,dimension)))}));
 }
 const rule=spec.measures[0]!;
 spec.measures=[...spec.measures,...receivableMeasures.map(measureId=>({...rule,measureId,dimensionMappings:{customer:'Synthetic customer'}}))];
 spec.capabilities=[...spec.capabilities,...[...receivableMeasures,'overdue_receivable_percentage' as const].map(metric=>({metric,dimensions:['customer' as const,'month' as const]}))];
 await deploy(db.migrator,spec);await bootstrapOperationalServing(db.migrator,tenant);return db;
}
async function cell(pool:Pool,family:string,measure:string,period:string,grain:string){return tenantTransaction(pool,tenant,async client=>(await client.query(`SELECT cell.value::numeric(30,6)::text value,cell.dimensions,cell.fact_count::text count FROM mart.prepared_bindings binding
 JOIN mart.prepared_cells cell USING(tenant_id,data_id) WHERE binding.tenant_id=$1 AND binding.family=$2 AND binding.period=$3 AND cell.measure_id=$4 AND cell.grain_id=$5 AND cell.time_grain='cutoff' ORDER BY cell.dimensions::text`,[tenant,family,period,measure,grain])).rows,true);}
for(const family of ['review','business'] as const)test(`${family} complete preparation replaces missing identities before policy rollups`,{skip:!enabled},async()=>{
 const db=await setup();try{
  const measure=family==='review'?'receivables_due_for_collection':'review_customer_balance';
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-08',family,[{measure,entity:'move',customer:'a',value:'100.000000'},{measure,entity:'carry',customer:'a',value:'30.000000'},{measure,entity:'zero',customer:'a',value:'50.000000'}]),family);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09',family,[{measure,entity:'move',customer:'b',value:'10.000000'},{measure,entity:'zero',customer:'a',value:'0.000000'}],'2026-11-03T09:00:00.000Z'),family);
  const prepared=await prepare(db.ingestor);assert.ok(prepared.results.some(result=>result.family===family));
  assert.equal((await cell(db.runtime,family,measure,'2026-09-30','[]'))[0]?.value,'10.000000');
  const customers=await cell(db.runtime,family,measure,'2026-09-30','["customer"]');
  assert.deepEqual(customers.map(row=>[row.dimensions.customer,Number(row.value)]),[['fixture:a',0],['fixture:b',10]]);
  assert.deepEqual((await prepare(db.ingestor)).results,[]);
  const before=(await db.admin.query('SELECT count(*)::int count FROM mart.prepared_cells')).rows[0].count;
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-08',family,[{measure,entity:'move',customer:'a',value:'100.000000'},{measure,entity:'carry',customer:'a',value:'50.000000'},{measure,entity:'zero',customer:'a',value:'50.000000'}],'2026-11-04T09:00:00.000Z'),family);
  assert.deepEqual(await cell(db.runtime,family,measure,'2026-09-30','[]'),[],'unprepared publication is invisible in prepared serving');
  const corrected=await prepare(db.ingestor);assert.ok(corrected.results.some(result=>result.reused));
  assert.equal((await cell(db.runtime,family,measure,'2026-09-30','[]'))[0]?.value,'10.000000');
  assert.ok((await db.admin.query('SELECT count(*)::int count FROM mart.prepared_cells')).rows[0].count>before);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-10',family,[],'2026-11-05T09:00:00.000Z',{emptyMeasures:[measure]}),family);
  await prepare(db.ingestor);
  assert.equal((await cell(db.runtime,family,measure,'2026-10-31','[]'))[0]?.value,'0.000000','accepted empty complete observation clears the earlier population');
  assert.equal((await cell(db.runtime,family,measure,'2026-10-31','[]'))[0]?.count,'0');
  const emptyCustomers=await cell(db.runtime,family,measure,'2026-10-31','["customer"]');
  assert.ok(emptyCustomers.every(row=>row.dimensions.customer===undefined),'no customer identity is fabricated for an empty observation');
  await assert.rejects(tenantTransaction(db.ingestor,tenant,client=>client.query('DELETE FROM mart.prepared_cells')),/permission denied/);
  await assert.rejects(tenantTransaction(db.runtime,tenant,client=>client.query("SELECT * FROM mart.prepared_input_rows($1,$2,'business')",[tenant,corrected.revisionId]),true),/permission denied/);
  await assert.rejects(tenantTransaction(db.runtime,tenant,client=>client.query('SELECT * FROM mart.prepared_expected_cells($1,$2,$3)',[tenant,corrected.revisionId,'{}']),true),/permission denied/);
  const hidden=await tenantTransaction(db.runtime,'other',client=>client.query('SELECT * FROM mart.prepared_cells'),true);assert.equal(hidden.rowCount,0);
 }finally{await db.close();}
});
test('complete Finance cutoffs prepare authoritative zero without carrying customers from an older snapshot',{skip:!enabled},async()=>{
 const db=await setup();try{
  const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  const evidence={tenantId:tenant,currency:'IQD',date:'2026-08-31',sourceCutoff:'2026-10-01T10:00:00.000Z',sourceRevision:'synthetic-finance',totals:values,customers:[{id:'fixture:a',actual:values,expected:{...values}}]};
  await publishFinanceSnapshot(db.ingestor,evidence);
  await publishFinanceSnapshot(db.ingestor,{...evidence,date:'2026-09-30',totals:Object.fromEntries(receivableMeasures.map(measure=>[measure,'0.000000'])),customers:[]});
  await prepare(db.ingestor);
  assert.equal(Number((await cell(db.runtime,'receivables','net_aged_receivable','2026-08-31','[]'))[0]?.value),100);
  assert.equal(Number((await cell(db.runtime,'receivables','net_aged_receivable','2026-09-30','[]'))[0]?.value),0);
  const customers=await cell(db.runtime,'receivables','net_aged_receivable','2026-09-30','["customer"]');assert.ok(customers.every(row=>row.dimensions.customer===undefined));
  const prepared=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),baseline=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:tenant,locale:'en' as const};
  for(const metric of ['net_aged_receivable','overdue_receivable_percentage'] as const)for(const filtered of [false,true]){
   const query:AnalyticsQuery={metric,groupBy:'month',dateRange:{from:'2026-07-01',to:'2026-10-16'},...(filtered?{filters:[{dimension:'customer',values:['fixture:missing']}]}:{})};
   const actual=await prepared.execute(query,context),expected=await baseline.execute(query,context);
   assert.deepEqual(actual.rows,expected.rows);
   assert.deepEqual(actual.rows.map(row=>row.key),['2026-08','2026-09'],'missing months and unfinished months cannot inherit another cutoff');
  }

 }finally{await db.close();}
});
test('prepared coverage, exact binding proof and explicit storage bounds fail closed before activation',{skip:!enabled},async()=>{
 const db=await setup();try{
  const source=await snapshotSource('2026-09','business',[{measure:'review_customer_balance',entity:'one',customer:'a',value:'100.000000'}]);
  await exposeReviewMonth(db.ingestor,source,'business');const revisionId=await revision(db.ingestor),scope={tenantId:tenant,revisionId};
  await assert.rejects(tenantTransaction(db.ingestor,tenant,client=>client.query("INSERT INTO mart.prepared_revision_seals VALUES($1,$2,'prepared-v1')",[tenant,revisionId])),/coverage is incomplete/);
  await assert.rejects(tenantTransaction(db.ingestor,tenant,async client=>{const chunks=await requiredPreparedChunks(client,scope,bounds);await prepareChunk(client,scope,chunks.find(chunk=>chunk.family==='business')!,{...bounds,maxCellsPerChunk:1});}),/storage bound/);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.prepared_bindings')).rows[0].count,0);
  await prepare(db.ingestor);
  await assert.rejects(tenantTransaction(db.ingestor,tenant,client=>client.query('INSERT INTO mart.prepared_activation VALUES($1,$2,$3,$4)',[tenant,revisionId,bounds.maxCellsPerChunk,bounds.maxChunks])),/permission denied/);
  await tenantTransaction(db.migrator,tenant,client=>client.query('INSERT INTO mart.prepared_activation VALUES($1,$2,$3,$4)',[tenant,revisionId,bounds.maxCellsPerChunk,bounds.maxChunks]));
  const previous=await revision(db.runtime);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-10','business',[{measure:'review_customer_balance',entity:'one',customer:'a',value:'200.000000'}],'2026-11-05T09:00:00.000Z'),'business');
  assert.notEqual(await revision(db.runtime),previous);
  assert.equal(Number((await cell(db.runtime,'business','review_customer_balance','2026-10-31','[]'))[0]?.value),200);
  const published=await revision(db.runtime),unprepared=randomUUID();
  await assert.rejects(tenantTransaction(db.ingestor,tenant,async client=>{
   await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose) VALUES($1,$2,$3,'2026-11-06T09:00:00Z','{}','business')",[tenant,unprepared,published]);
   await client.query('INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3',[tenant,unprepared,published]);
   await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1',[tenant,unprepared]);
  }),/requires complete prepared revision/);
  assert.equal(await revision(db.runtime),published);
 }finally{await db.close();}
});

test('the universal prepared reader matches canonical event, snapshot, ratio and date semantics without reading history',{skip:!enabled},async()=>{
 const db=await setup();try{
  const facts:ProductionFact[]=[];
  for(const month of ['2026-08','2026-09']){
   const source=fixture(month);
   const captured=fixture(month);for await(const page of captured.facts)facts.push(...page);
   await exposeReviewMonth(db.ingestor,source,'business');
  }
  const range={from:'2026-08-01',to:'2026-09-30'},context={tenantId:tenant,locale:'en' as const};
  const read=(query:AnalyticsQuery)=>tenantTransaction(db.runtime,tenant,client=>readPreparedSelection(client,{query,context,range:query.dateRange??range,family:'business',maxGroups:100,timeBuckets:'observed'}),true);
  await assert.rejects(read({metric:'period_net_sales'}),/Prepared publication not ready/);
  await prepare(db.ingestor);
  const queries:AnalyticsQuery[]=[
   {metric:'period_net_sales'},{metric:'period_net_sales',groupBy:'month'},
   {metric:'period_net_sales',groupBy:'date'},
   {metric:'period_net_sales',groupBy:'customer',analysis:{topN:{direction:'top',limit:1}}},
   {metric:'period_net_sales',groupBy:'state',filters:[{dimension:'customer',values:['fixture:customer']}]},
   {metric:'period_net_sales',dateRange:{from:'2026-08-16',to:'2026-09-14'}},
   {metric:'period_collection_percentage'},
   {metric:'customer_last_invoice_date'},
   {metric:'customer_last_invoice_date',groupBy:'customer'},
   {metric:'review_customer_balance',groupBy:'month'}
  ];
  const canonical=facts.map(fact=>({tenantId:tenant,measureId:fact.measureId,date:fact.businessDate,value:Number(fact.value),dimensions:fact.dimensions,...(fact.entityId?{entityId:fact.entityId}:{})}));
  for(const query of queries){
   const effective={...query,dateRange:query.dateRange??range},expected=executeFacts(canonical,effective,context,{sourceId:'synthetic',executedAt:'2026-10-01T00:00:00.000Z'});
   const actual=await read(effective);
   assert.deepEqual(actual.rows,expected.rows,JSON.stringify(query));
  }
  const filtered=await tenantTransaction(db.runtime,tenant,client=>readPreparedSelection(client,{query:{metric:'period_net_sales'},context:{...context,enforcedFilters:[{dimension:'state',values:['synthetic:other']}]},range,family:'business',maxGroups:100,timeBuckets:'observed'}),true);
  assert.deepEqual(filtered.rows,[{key:null,value:0}]);
 }finally{await db.close();}
});
test('prepared repository preserves every exposed synthetic metric and grouping across all four source families',{skip:!enabled},async testContext=>{
 const db=await setup(true);try{
  await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'review'),'review');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',true),'business');
  const totals=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  await publishFinanceSnapshot(db.ingestor,{tenantId:tenant,currency:'IQD',date:'2026-09-30',sourceCutoff:'2026-10-01T10:00:00.000Z',sourceRevision:'SYNTHETIC',totals,customers:[{id:'fixture:customer',actual:totals,expected:{...totals}}]});
  await prepare(db.ingestor);
  const options={reportingCurrencies:{a:'IQD'},statementTimeoutMs:15000,maxGroups:4000};
  const prepared=new PreparedAnalyticsRepository(db.runtime,options),baseline=new TrustedAnalyticsRepository(db.runtime,options),context={tenantId:tenant,locale:'en' as const};
  const capabilities=await baseline.getPublishedCapabilities(context),candidate=await prepared.getPublishedCapabilities(context);assert.deepEqual(candidate,capabilities);
  const queries=new Map<string,AnalyticsQuery>();
  for(const release of capabilities.releases)for(const capability of release.capabilities){
   for(const groupBy of [undefined,...capability.dimensions]){
    if(groupBy===undefined&&!capability.summary)continue;
    const query:AnalyticsQuery={metric:capability.metric,...(groupBy?{groupBy}:{}),...(release.period?{dateRange:release.period}:{}),...(compatibleQuantityMetrics.includes(capability.metric as import('@el-dabboos/domain').BusinessMetricId)&&groupBy!=='product'&&groupBy!=='uom'?{filters:[{dimension:'uom' as const,values:['fixture:uom']}]}:{})};
    if(!publishedQueryIssues(query,capabilities).length)queries.set(JSON.stringify(query),query);
   }
  }
  assert.ok(queries.size>100,'the inventory must exercise all exposed dimensions rather than selected dashboards');
  testContext.diagnostic(JSON.stringify({comparedQueries:queries.size,metrics:new Set([...queries.values()].map(query=>query.metric)).size,sourceFamilies:4}));
  for(const query of queries.values()){
   const expected=await baseline.execute(query,context),actual=await prepared.execute(query,context).catch(error=>{throw new Error(JSON.stringify(query),{cause:error});});
   assert.deepEqual(actual.rows,expected.rows,JSON.stringify(query));
   const {executedAt:expectedTime,...expectedMetadata}=expected.metadata,{executedAt:actualTime,...actualMetadata}=actual.metadata;
   void expectedTime;void actualTime;
   assert.deepEqual(actualMetadata,expectedMetadata,JSON.stringify(query));
  }
  for(const metric of ['net_aged_receivable','overdue_receivable_percentage'] as const){
   const query={metric,dateRange:{from:'2026-09-01',to:'2026-09-30'},filters:[{dimension:'customer' as const,values:['fixture:missing']}]};
   assert.deepEqual((await prepared.execute(query,context)).rows,(await baseline.execute(query,context)).rows);
  }
  const discovered=await prepared.searchDimensionOptions('customer',context,{metric:'period_net_sales',dateRange:{from:'2026-09-01',to:'2026-09-30'},selectedIds:['fixture:customer'],limit:1});
  assert.deepEqual(discovered.values.map(option=>option.id),['fixture:customer']);
  assert.deepEqual(discovered.selected,discovered.values);
 }finally{await db.close();}
});
test('preparation resumes committed chunks, binds the intended database and revision, then cuts over explicitly',{skip:!enabled},async()=>{
 const db=await setup();try{
  await exposeReviewMonth(db.ingestor,fixture('2026-09'),'business');
  const revisionId=await revision(db.runtime),databaseName=(await db.admin.query('SELECT current_database() name')).rows[0].name;
  const scope={tenantId:tenant,database:databaseName,revisionId,bounds};
  await assert.rejects(preparePublishedRevision(db.ingestor,{...scope,database:'synthetic_wrong_database'}),/Unexpected preparation identity/);
  await assert.rejects(preparePublishedRevision(db.runtime,scope),/Unexpected preparation identity/);
  const firstChunk=await tenantTransaction(db.ingestor,tenant,async client=>{const chunks=await requiredPreparedChunks(client,scope,bounds);return prepareChunk(client,scope,chunks[0]!,bounds);});
  const resumed=await preparePublishedRevision(db.ingestor,scope);assert.ok(resumed.reused>=1);
  const saved=(await db.admin.query('SELECT count(*)::int count FROM mart.prepared_cells')).rows[0].count;
  const repeated=await preparePublishedRevision(db.ingestor,scope);assert.equal(repeated.reused,repeated.chunks);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.prepared_cells')).rows[0].count,saved);
  assert.ok(firstChunk.dataId);
  await assert.rejects(activatePreparedRevision(db.ingestor,scope),/Unexpected preparation identity/);
  const routed=new PublishedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:tenant,locale:'en' as const};
  const before=await routed.execute({metric:'period_net_sales',dateRange:{from:'2026-09-01',to:'2026-09-30'}},context);
  await activatePreparedRevision(db.migrator,scope);
  const after=await routed.execute({metric:'period_net_sales',dateRange:{from:'2026-09-01',to:'2026-09-30'}},context);
  assert.deepEqual(after.rows,before.rows);assert.equal(await routed.isDataReady(tenant),true);
  const execution=await routed.createExecutionScope(context);
  await exposeReviewMonth(db.ingestor,fixture('2026-10'),'business');
  await assert.rejects(preparePublishedRevision(db.ingestor,scope),/Prepared input publication changed/);
  await assert.rejects(execution.execute({metric:'period_net_sales',dateRange:{from:'2026-09-01',to:'2026-09-30'}},context),AnalyticsPublicationChangedError);
  await assert.rejects(execution.verifyExecution!(),AnalyticsPublicationChangedError);
 }finally{await db.close();}
});
test('prepared distinct counts retain zero-valued identities and cannot use a totals-only grain',{skip:!enabled},async()=>{
 const db=await database();try{
  const specification=mapping();
  specification.measures=specification.measures.filter(rule=>rule.measureId==='order_count').map(rule=>({...rule,dimensionMappings:{customer:'synthetic customer'}}));
  specification.capabilities=[{metric:'order_count',dimensions:['customer','date','month','quarter','year']},{metric:'customers_served',dimensions:['customer','date','month','quarter','year']}];
  await deploy(db.migrator,specification,fact('one',{measureId:'order_count',businessDate:'2026-01-15',value:'0.000000',dimensions:{customer:'fixture:one'}}));
  await bootstrapOperationalServing(db.migrator,tenant);await prepare(db.ingestor);
  const prepared=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:tenant,locale:'en' as const},range={from:'2026-01-01',to:'2026-01-31'};
  await assert.rejects(prepared.execute({metric:'customers_served',dateRange:range},context),/Uncertified prepared query/);
  const read=(query:AnalyticsQuery)=>tenantTransaction(db.runtime,tenant,client=>readPreparedSelection(client,{query,context,range,family:'facts',timeBuckets:'complete',maxGroups:100}),true);
  assert.deepEqual((await read({metric:'customers_served',dateRange:range})).rows,[{key:null,value:1}]);
  assert.deepEqual((await read({metric:'customers_served',groupBy:'customer',dateRange:range})).rows,[{key:'fixture:one',value:1}]);
 }finally{await db.close();}
});

test('declared delta snapshots retain missing entities, apply explicit zero and reassign before policy filters',{skip:!enabled},async()=>{
 const db=await setup();try{
  const inputs=[
   {entity:'move',customer:'a',date:'2026-08-31',value:'100.000000'},
   {entity:'carry',customer:'a',date:'2026-08-31',value:'30.000000'},
   {entity:'zero',customer:'a',date:'2026-08-31',value:'50.000000'},
   {entity:'move',customer:'b',date:'2026-09-30',value:'10.000000'},
   {entity:'zero',customer:'a',date:'2026-09-30',value:'0.000000'}
  ];
  await tenantTransaction(db.migrator,tenant,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenant}`]);
   const baseline=await readBaseline(client,tenant),parent=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenant])).rows[0].revision_id,next=randomUUID();
   await persistOperationalFacts(client,baseline,inputs.map(input=>fact(input.entity,{measureId:'outstanding_amount',businessDate:input.date,value:input.value,entityId:input.entity,dimensions:{branch:input.customer}})));
   await refreshOperationalMonths(client,{tenantId:tenant,revisionId:next,parent,runId:null,cutoff:'2026-10-01T10:00:00.000Z',purpose:'adoption'},['2026-08','2026-09']);
   await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1',[tenant,next]);
  });
  await prepare(db.ingestor);
  assert.equal((await cell(db.runtime,'facts','outstanding_amount','2026-09-30','[]'))[0]?.value,'40.000000');
  assert.deepEqual((await cell(db.runtime,'facts','outstanding_amount','2026-09-30','["branch"]')).map(row=>[row.dimensions.branch,Number(row.value)]),[['a',30],['b',10]]);
  const context={tenantId:tenant,locale:'en' as const,enforcedFilters:[{dimension:'branch' as const,values:['a']}]};
  const selected=await tenantTransaction(db.runtime,tenant,client=>readPreparedSelection(client,{query:{metric:'outstanding_amount'},context,range:{from:'2026-09-01',to:'2026-09-30'},family:'facts',maxGroups:100,timeBuckets:'complete'}),true);
  assert.deepEqual(selected.rows,[{key:null,value:30}]);
 }finally{await db.close();}
});

test('complete empty observations preserve null dates, zero-denominator ratios and quantity scope',{skip:!enabled},async()=>{
 const db=await setup();try{
  const measures=['review_customer_balance','customer_period_sales','customer_last_invoice_date','internal_stock_quantity'] as const;
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-08','business',[],'2026-11-02T09:00:00.000Z',{current:true}),'business');
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[],'2026-11-03T09:00:00.000Z',{current:true,emptyMeasures:measures}),'business');
  await prepare(db.ingestor);
  const context={tenantId:tenant,locale:'en' as const},range={from:'2026-09-01',to:'2026-09-30'};
  const read=(query:AnalyticsQuery)=>tenantTransaction(db.runtime,tenant,client=>readPreparedSelection(client,{query,context,range,family:'business',maxGroups:100,timeBuckets:'observed'}),true);
  assert.deepEqual((await read({metric:'review_customer_balance'})).rows,[{key:null,value:0}]);
  assert.deepEqual((await read({metric:'review_customer_balance',filters:[{dimension:'customer',values:['fixture:customer']}]})).rows,[{key:null,value:0}]);
  assert.deepEqual((await read({metric:'customer_last_invoice_date'})).rows,[{key:null,value:null}]);
  assert.deepEqual((await read({metric:'customer_last_invoice_date',filters:[{dimension:'customer',values:['fixture:customer']}]})).rows,[{key:null,value:null}]);
  assert.deepEqual((await read({metric:'customer_balance_sales_percentage'})).rows,[{key:null,value:null}]);
  assert.deepEqual((await read({metric:'internal_stock_quantity',filters:[{dimension:'uom',values:['fixture:uom']}]})).rows,[{key:null,value:0}]);
  assert.deepEqual((await read({metric:'review_customer_balance',groupBy:'customer'})).rows,[]);
 }finally{await db.close();}
});

test('complete prepared totals and counts must independently reconcile to accepted source controls',{skip:!enabled},async()=>{
 const db=await setup();try{
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[{measure:'review_customer_balance',entity:'one',customer:'a',value:'100.000000'}]),'business');
  const published=await prepare(db.ingestor);
  for(const corrupted of ['value','fact_count'])await assert.rejects(tenantTransaction(db.ingestor,tenant,async client=>{
   const candidate=randomUUID(),dataId=randomUUID();
   await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose) VALUES($1,$2,$3,'2026-11-06T09:00:00Z','{}','business')",[tenant,candidate,published.revisionId]);
   await client.query('INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3',[tenant,candidate,published.revisionId]);
   const original=(await client.query("SELECT * FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2 AND family='business' AND kind='snapshot'",[tenant,published.revisionId])).rows[0];
   await client.query('INSERT INTO mart.prepared_datasets SELECT tenant_id,$2,configuration FROM mart.prepared_datasets WHERE tenant_id=$1 AND data_id=$3',[tenant,dataId,original.data_id]);
   await client.query(`INSERT INTO mart.prepared_cells SELECT tenant_id,$2,time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,
    value+CASE WHEN $4='value' AND grain_id='[]' THEN 1 ELSE 0 END,
    fact_count+CASE WHEN $4='fact_count' AND grain_id='[]' THEN 1 ELSE 0 END,minimum,maximum,data_through,labels,conflicting_labels
    FROM mart.prepared_cells WHERE tenant_id=$1 AND data_id=$3`,[tenant,dataId,original.data_id,corrupted]);
   await client.query('INSERT INTO mart.prepared_bindings VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[tenant,candidate,original.family,original.kind,original.period,dataId,original.input_fingerprint,original.source_cutoff,original.statistics]);
  }),/Complete prepared population differs from independent source controls/);
  assert.equal(await revision(db.runtime),published.revisionId);
  await assert.rejects(tenantTransaction(db.runtime,tenant,client=>client.query('SELECT mart.prepared_complete_controls_exact($1,$2,$3,$4)',[tenant,published.revisionId,'{}','missing']),true),/permission denied/);
 }finally{await db.close();}
});

test('prepared policy intersections, Pareto values, Top N and continuation preserve the exact authorized population',{skip:!enabled},async()=>{
 const db=await setup();try{
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[
   {measure:'period_net_sales',entity:'one',customer:'a',value:'30.000000'},
   {measure:'period_net_sales',entity:'two',customer:'b',value:'60.000000'},
   {measure:'period_net_sales',entity:'three',customer:'c',value:'10.000000'}]),'business');
  await prepare(db.ingestor);
  const prepared=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),baseline=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const context={tenantId:tenant,locale:'en' as const,enforcedFilters:[{dimension:'state' as const,values:['fixture:state']},{dimension:'customer' as const,values:['fixture:a','fixture:c']}]};
  const query:AnalyticsQuery={metric:'period_net_sales',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'},analysis:{pareto:true}};
  const expected=await baseline.execute(query,context),actual=await prepared.execute(query,context);assert.deepEqual(actual.rows,expected.rows);
  assert.deepEqual(actual.rows.map(row=>row.value),[75,100]);
  const rows:typeof actual.rows=[];let cursor:AnalyticsResultCursor|undefined;
  do{
   const page=await prepared.execute(query,context,{window:{limit:1,...(cursor?{cursor}:{})}});
   rows.push(...page.rows);cursor=page.metadata.window?.nextCursor;
  }while(cursor);
  assert.deepEqual(rows,actual.rows,'paging retains the global authorized Pareto reduction');
  const top={...query,analysis:{topN:{direction:'top' as const,limit:1}}};
  assert.deepEqual((await prepared.execute(top,context)).rows,(await baseline.execute(top,context)).rows);
  const selected={outputKeys:['fixture:c','fixture:a'],revision:actual.metadata.servingRevision!};
  assert.deepEqual((await prepared.execute(query,context,selected)).rows,(await baseline.execute(query,context,selected)).rows);
 }finally{await db.close();}
});
