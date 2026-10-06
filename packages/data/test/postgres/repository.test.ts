import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnalyticsQuery } from '@el-dabboos/domain';
import { PostgresAnalyticsRepository } from '../../src/postgres/repository.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { executeFacts } from '../../src/engine.ts';
import type { AnalyticsFact } from '../../src/facts.ts';
import { database, enabled } from './support.ts';
import { deploy, mapping, batch, fact, evidence, clock } from './fixtures.ts';
const range = { from: '2026-01-01',to: '2026-02-28' };
const queries: AnalyticsQuery[] = [
  { metric: 'revenue' },{ metric: 'revenue',dateRange: range },{ metric: 'revenue',dateRange: range,groupBy: 'branch' },
  ...(['sum','count','average','min','max'] as const).map(aggregation => ({ metric: 'revenue' as const,aggregation,dateRange: range,groupBy: 'month' as const })),
  { metric: 'revenue',dateRange: range,filters: [{ dimension: 'branch',values: ['giza'] }] },
  { metric: 'average_order_value',dateRange: range },{ metric: 'average_order_value',dateRange: { from: '2024-01-01',to: '2024-01-31' } },
  { metric: 'outstanding_amount',dateRange: range },{ metric: 'outstanding_amount',dateRange: range,groupBy: 'branch' },
  { metric: 'outstanding_amount',dateRange: range,groupBy: 'month' },{ metric: 'outstanding_amount',groupBy: 'month' },
  ...(['previous_period','month_over_month','year_over_year'] as const).flatMap(comparison => [{ metric: 'revenue' as const,dateRange: range,analysis: { comparison } },{ metric: 'revenue' as const,dateRange: range,groupBy: 'month' as const,analysis: { comparison } }]),
  { metric: 'sales_growth',dateRange: range,groupBy: 'month' },
  { metric: 'revenue',dateRange: range,groupBy: 'branch',analysis: { topN: { direction: 'top',limit: 1 } } },
  { metric: 'revenue',dateRange: range,groupBy: 'branch',analysis: { ranking: true } },
  { metric: 'revenue',dateRange: range,groupBy: 'month',analysis: { movingAverage: { window: 2 } } },
  { metric: 'revenue',dateRange: range,groupBy: 'month',analysis: { runningTotal: true } },
  { metric: 'revenue',dateRange: range,groupBy: 'branch',analysis: { percentageContribution: true } },
  { metric: 'revenue',dateRange: range,groupBy: 'month',analysis: { comparison: 'previous_period',movingAverage: { window: 2 },ranking: true } },
];
async function setup() {
  const db = await database();
  try {
    for (const tenant of ['a','b']) await deploy(db.migrator,mapping(tenant));
    const canonical = [
      fact('rev-old',{ businessDate: '2025-02-15',value: '125.000000' }),
      fact('rev-jan',{ businessDate: '2026-01-15',value: '100.000000' }),
      fact('rev-feb',{ value: '200.000000' }),fact('rev-giza',{ value: '50.000000',dimensions: { branch: 'giza' } }),
      fact('count-jan',{ measureId: 'order_count',value: '1.000000',businessDate: '2026-01-15' }),
      fact('count-feb',{ measureId: 'order_count',value: '4.000000' }),fact('count-giza',{ measureId: 'order_count',value: '1.000000',dimensions: { branch: 'giza' } }),
      fact('snapshot-jan',{ measureId: 'outstanding_amount',value: '10.000000',businessDate: '2026-01-15',entityId: 'entity' }),
      fact('snapshot-feb',{ measureId: 'outstanding_amount',value: '20.000000',entityId: 'entity',dimensions: { branch: 'giza' } }),
      fact('foreign',{ tenantId: 'b',value: '9999.000000',batchId: 'foreign',dimensions: { branch: 'foreign-only' } }),
    ];
    const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'],b: ['fixture-company'] },clock);
    await writer.commit(batch('batch-1',9),canonical.slice(0,9).map(f => ({ facts: [f] })),evidence);
    await writer.commit(batch('foreign',1,'b'),[{ facts: [canonical[9]!] }],evidence);
    const facts: AnalyticsFact[] = canonical.map(f => ({ tenantId: f.tenantId,measureId: f.measureId,date: f.businessDate,value: Number(f.value),dimensions: f.dimensions,...(f.entityId ? { entityId: f.entityId } : {}) }));
    return { db,facts,repo: new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD',b: 'IQD' },clock }) };
  } catch (e) { await db.close(); throw e; }
}
test('repository parity: additive/aggregations, ratios, snapshots, comparison calendars and complete analysis pipeline', { skip: !enabled }, async t => {
  const { db,facts,repo } = await setup();
  try {
    for (const [i,q] of queries.entries()) await t.test(`case ${i+1}: ${JSON.stringify(q)}`,async () => {
      for (const ctx of [{ tenantId: 'a',locale: 'en' as const },{ tenantId: 'a',locale: 'en' as const,enforcedFilters: [{ dimension: 'branch' as const,values: ['cairo'] }] }]) {
        const expected = executeFacts(facts,q,ctx,{ sourceId: 'postgres',executedAt: clock().toISOString(),sourceAsOf: '2026-10-01T10:00:00.000Z' });
        const actual=await repo.execute(q,ctx);
        expected.metadata.release={datasetId:'release',sourceId:'fixture',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC TEST ONLY'};
        assert.deepEqual(actual,expected);
      }
    });
    assert.deepEqual(await repo.listDimensionValues('branch',{ tenantId: 'a',locale: 'en' }),['cairo','giza']);
    assert.deepEqual(await repo.listDimensionValues('branch',{ tenantId: 'a',locale: 'en',enforcedFilters: [{ dimension: 'branch',values: ['giza'] }] }),['giza']);
    assert.deepEqual(await repo.listDimensionValues('branch',{ tenantId: 'b',locale: 'en' }),['foreign-only']);
    assert.deepEqual((await repo.execute({ metric: 'revenue',filters: [{ dimension: 'branch',values: ['giza'] }] },{ tenantId: 'a',locale: 'en',enforcedFilters: [{ dimension: 'branch',values: ['cairo'] }] })).rows,[{ key: null,value: 0 }]);
  } finally { await db.close(); }
});
test('repository: certification/currency gates, query bounds, numeric refusal and SQL pushdown plan', { skip: !enabled }, async () => {
  const { db,repo } = await setup(); const ctx = { tenantId: 'a',locale: 'en' as const };
  try {
    await assert.rejects(repo.execute({ metric: 'revenue',groupBy: 'product' },ctx), /Uncertified/);
    await assert.rejects(repo.execute({ metric: 'gross_profit' },ctx), /Uncertified/);
    await assert.rejects(repo.execute({ metric: 'revenue' },{ ...ctx,enforcedFilters: [{ dimension: 'customer',values: ['x'] }] }), /Uncertified/);
    await assert.rejects(repo.listDimensionValues('customer',ctx), /Uncertified/);
    await assert.rejects(repo.listDimensionValues('branch',{ ...ctx,enforcedFilters: [{ dimension: 'customer',values: ['x'] }] }), /discovery\/policy/);
    await assert.rejects(new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'EGP' } }).execute({ metric: 'revenue' },ctx), /currency/);
    await assert.rejects(new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' },maxGroups: 1 }).execute({ metric: 'revenue',groupBy: 'branch' },ctx), /bound/);
    await assert.rejects(new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' },maxGroups: 1 }).listDimensionValues('branch',ctx), /Discovery exceeds technical bound/);
    await assert.rejects(repo.execute({ metric: 'revenue',dateRange: { from: '2000-01-01',to: '2026-01-01' } },ctx), /bound/);
    const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
    await writer.commit(batch('huge'),[{ facts: [fact('huge',{ batchId: 'huge',value: '9007199254740992.000000' })] }],evidence);
    await assert.rejects(repo.execute({ metric: 'revenue' },ctx), /Unsafe/);
    const plan = await db.admin.query("EXPLAIN (FORMAT JSON) SELECT branch,sum(value) FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=$3 AND business_date BETWEEN $4 AND $5 GROUP BY branch", ['a','release','revenue',range.from,range.to]);
    const text = JSON.stringify(plan.rows); assert.match(text,/Aggregate/); assert.match(text,/business_date/); assert.match(text,/tenant_id/);
    await db.admin.query("DELETE FROM mart.serving_bindings WHERE tenant_id='a'");
    await assert.rejects(repo.execute({ metric: 'revenue' },ctx), /binding/);
  } finally { await db.close(); }
});

test('repository parity: every executable catalog family, inventory/finance snapshots, duration ratios and moved attribution', { skip: !enabled },async t => {
  const { categoricalDimensions,requiredMeasures,semanticCatalog,timeDimensions,factMeasureIds } = await import('@el-dabboos/domain');
  const db = await database();
  try {
    const m = mapping();
    const dimensions = new Map(factMeasureIds.map(id => [id,categoricalDimensions.filter(d => Object.values(semanticCatalog).filter(m => requiredMeasures(m.id).includes(id)).every(m => m.dimensions.includes(d)))]));
    m.measures = factMeasureIds.map(id => ({ ...m.measures[0]!,measureId: id,dimensionMappings: Object.fromEntries(dimensions.get(id)!.map(d => [d,`synthetic ${d}`])) }));
    m.capabilities = Object.values(semanticCatalog).map(metric => ({ metric: metric.id,dimensions: metric.dimensions.filter(d => timeDimensions.includes(d) || requiredMeasures(metric.id).every(id => dimensions.get(id)!.includes(d))) }));
    await deploy(db.migrator,m);
    const monetary = (id: typeof factMeasureIds[number]) => Object.values(semanticCatalog).some(m => m.type==='currency' && requiredMeasures(m.id).includes(id) && m.semantics.kind!=='ratio');
    const canonical = factMeasureIds.flatMap((measureId,index) => ['2024-02-29','2026-01-31','2026-02-28'].map((businessDate,i) => {
      const f = fact(`${measureId}-${i}`,{ measureId,businessDate,value: `${index+i+1}.000000`,dimensions: Object.fromEntries(dimensions.get(measureId)!.map(d => [d,i===2 ? 'moved' : 'original'])) });
      if (f.kind==='snapshot') f.entityId = `${measureId}-entity`;
      if (!monetary(measureId)) delete f.currency;
      return f;
    }));
    const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
    await writer.commit(batch('batch-1',canonical.length),canonical.map(f => ({ facts: [f] })),evidence);
    const facts: AnalyticsFact[] = canonical.map(f => ({ tenantId: f.tenantId,measureId: f.measureId,date: f.businessDate,value: Number(f.value),dimensions: f.dimensions,...(f.entityId ? { entityId: f.entityId } : {}) }));
    const repo = new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' },clock });
    for (const metric of Object.values(semanticCatalog)) await t.test(metric.id,async () => {
      const dimension = m.capabilities.find(c => c.metric===metric.id)!.dimensions.find(d => categoricalDimensions.includes(d));
      for (const groupBy of [undefined,'month' as const,dimension]) {
        const q: AnalyticsQuery = { metric: metric.id,dateRange: range,...(groupBy ? { groupBy } : {}) };
        const ctx = { tenantId: 'a',locale: 'en' as const };
        if (['average_confirmed_order_value','average_invoice_value'].includes(metric.id)) {
          await assert.rejects(repo.execute(q,ctx),/Uncertified derived/);
          continue;
        }
        const expected = executeFacts(facts,q,ctx,{ sourceId: 'postgres',executedAt: clock().toISOString(),sourceAsOf: '2026-10-01T10:00:00.000Z' });
        const actual=await repo.execute(q,ctx);
        expected.metadata.release={datasetId:'release',sourceId:'fixture',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC TEST ONLY'};
        assert.deepEqual(actual,expected);
        if (dimension) {
          const restricted = { ...ctx,enforcedFilters: [{ dimension,values: ['original'] }] };
          assert.deepEqual((await repo.execute(q,restricted)).rows,executeFacts(facts,q,restricted,{ sourceId: 'postgres',executedAt: clock().toISOString() }).rows);
        }
      }
    });
  } finally { await db.close(); }
});
test('compiled membership scopes: same-dimension OR, compound AND and latest snapshot before policy', {skip:!enabled},async()=>{
 const {compileMembershipScopes}=await import('@el-dabboos/domain');const db=await database();
 try{
  const m=mapping();m.measures=m.measures.map(measure=>({...measure,dimensionMappings:measure.measureId==='outstanding_amount'?{branch:'trusted',region:'trusted'}:{branch:'trusted',region:'trusted',salesperson:'trusted'}}));m.capabilities=m.capabilities.map(capability=>({...capability,dimensions:capability.metric==='outstanding_amount'?['branch','region','date','month','quarter','year']:['branch','region','salesperson','date','month','quarter','year']}));await deploy(db.migrator,m);
  const canonical=[fact('baghdad-1',{value:'10.000000',dimensions:{branch:'baghdad',region:'central',salesperson:'agent-1'}}),fact('baghdad-2',{value:'20.000000',dimensions:{branch:'baghdad',region:'central',salesperson:'agent-2'}}),fact('baghdad-unassigned',{value:'30.000000',dimensions:{branch:'baghdad',region:'central',salesperson:'agent-3'}}),fact('basra-1',{value:'99.000000',dimensions:{branch:'basra',region:'south',salesperson:'agent-1'}}),fact('balance-old',{measureId:'outstanding_amount',entityId:'moved-balance',businessDate:'2026-01-15',value:'5.000000',dimensions:{branch:'baghdad',region:'central'}}),fact('balance-latest',{measureId:'outstanding_amount',entityId:'moved-balance',value:'9.000000',dimensions:{branch:'basra',region:'south'}})];
  await new PostgresMartWriter(db.ingestor,{a:['fixture-company']},clock).commit(batch('batch-1',canonical.length),canonical.map(f=>({facts:[f]})),evidence);
  const repo=new PostgresAnalyticsRepository(db.runtime,{reportingCurrencies:{},reportingCurrency:async id=>id==='a'?'IQD':null,clock});const ctx={tenantId:'a',locale:'en' as const,enforcedFilters:compileMembershipScopes([{dimension:'branch',values:['baghdad']},{dimension:'salesperson',values:['agent-1','agent-2']}])};
  assert.deepEqual((await repo.execute({metric:'revenue'},ctx)).rows,[{key:null,value:30}]);assert.deepEqual(await repo.listDimensionValues('salesperson',ctx),['agent-1','agent-2']);assert.deepEqual((await repo.execute({metric:'revenue',filters:[{dimension:'branch',values:['basra']}]},ctx)).rows,[{key:null,value:0}]);
  const snapshot={...ctx,enforcedFilters:compileMembershipScopes([{dimension:'branch',values:['baghdad']},{dimension:'region',values:['central','north']}])};assert.deepEqual((await repo.execute({metric:'outstanding_amount'},snapshot)).rows,[{key:null,value:null}]);
  assert.equal(await repo.isDataReady('a'),true);assert.equal(await repo.isDataReady('no-binding'),false);
  await assert.rejects(new PostgresAnalyticsRepository(db.runtime,{reportingCurrencies:{},reportingCurrency:async()=> 'EGP'}).isDataReady('a'),/currency/);
 }finally{await db.close();}
});
