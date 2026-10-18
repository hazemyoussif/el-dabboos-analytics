import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredMeasures} from '@el-dabboos/domain';
import type {FactMeasureId,ProductionFact} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import {pages} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import type {ReviewExtraction} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

const populations=`WITH observations AS MATERIALIZED (
 SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations($1,$2,$3)
 WHERE business_day<=$4::date ORDER BY measure_id,business_day DESC
),empty_markers AS (
 SELECT measure_id,'snapshot'::text kind,business_day,NULL::text entity_id,0::numeric amount,'{}'::jsonb dimensions,'{}'::jsonb labels,0::bigint item_count
 FROM observations WHERE expected_count=0 AND expected_value=0
),canonical AS MATERIALIZED (
 SELECT fact.* FROM mart.prepared_input_rows($1,$2,$3) fact JOIN observations USING(measure_id,business_day) WHERE fact.kind='snapshot'
 UNION ALL SELECT * FROM empty_markers
),candidate AS MATERIALIZED (
 SELECT * FROM mart.prepared_work_complete_snapshot_rows($1,$2,$3,$4)
 UNION ALL SELECT * FROM empty_markers
),differences AS (
 (SELECT * FROM canonical EXCEPT ALL SELECT * FROM candidate)
 UNION ALL (SELECT * FROM candidate EXCEPT ALL SELECT * FROM canonical)
) SELECT (SELECT count(*)::int FROM differences) mismatches,
 (SELECT count(*)::int FROM candidate) rows,
 (SELECT count(*)::int FROM candidate WHERE item_count=0) empty_markers`;

async function removeMeasure(source:ReviewExtraction,measure:FactMeasureId):Promise<ReviewExtraction>{
 const facts:ProductionFact[]=[];for await(const page of source.facts)facts.push(...page);
 const measures=source.mapping.measures.filter(rule=>rule.measureId!==measure),ids=new Set(measures.map(rule=>rule.measureId));
 return {...source,mapping:{...source.mapping,measures,capabilities:source.mapping.capabilities.filter(capability=>requiredMeasures(capability.metric).every(id=>ids.has(id)))},
  facts:pages(facts.filter(fact=>fact.measureId!==measure)),controls:async()=>(await source.controls()).filter(control=>control.measure!==measure)};
}
async function partialDate(source:ReviewExtraction,day:string):Promise<ReviewExtraction>{
 const facts:ProductionFact[]=[];for await(const page of source.facts)facts.push(...page);
 return {...source,facts:pages(facts.map(fact=>fact.kind==='snapshot'?{...fact,businessDate:day}:fact))};
}

test('complete population selection preserves per-measure observation dates, partial cutoffs, empty/missing and pinned corrections',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[
   {measure:'review_customer_balance',entity:'old',customer:'old',value:'100.000000'},
   {measure:'positive_due_0_30',entity:'prior',customer:'old',value:'30.000000'}
  ],'2026-10-01T09:00:00.000Z',{current:true}),'business');
  const partial=await partialDate(await removeMeasure(await snapshotSource('2026-10','business',[
   {measure:'positive_due_0_30',entity:'new',customer:'new',value:'20.000000'}
  ],'2026-10-15T09:00:00.000Z',{current:true,emptyMeasures:['positive_due_31_60']}),'review_customer_balance'),'2026-10-15');
  const first=await exposeReviewMonth(db.ingestor,partial,'business');
  async function compare(revisionId:string,through:string){
   return tenantTransaction(db.ingestor,'a',async client=>{
    const result=(await client.query(populations,['a',revisionId,'business',through])).rows[0];assert.equal(result.mismatches,0);return result;
   },true);
  }
  assert.equal((await compare(first.revisionId,'2026-08-31')).rows,0);
  await compare(first.revisionId,'2026-09-30');await compare(first.revisionId,'2026-10-14');
  assert.ok((await compare(first.revisionId,'2026-10-15')).empty_markers>0);
  await tenantTransaction(db.ingestor,'a',async client=>{
   const rows=(await client.query("SELECT measure_id,business_day::text,amount::text FROM mart.prepared_work_complete_snapshot_rows($1,$2,'business','2026-10-15') WHERE measure_id=ANY($3::text[]) ORDER BY measure_id",['a',first.revisionId,['review_customer_balance','positive_due_0_30']])).rows;
   assert.deepEqual(rows,[{measure_id:'positive_due_0_30',business_day:'2026-10-15',amount:'20.000000'},{measure_id:'review_customer_balance',business_day:'2026-09-30',amount:'100.000000'}]);
  },true);
  const corrected=await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','business',[
   {measure:'review_customer_balance',entity:'corrected',customer:'corrected',value:'125.000000'}
  ],'2026-10-16T09:00:00.000Z',{current:true}),'business');
  await compare(first.revisionId,'2026-10-15');await compare(corrected.revisionId,'2026-10-15');
  await tenantTransaction(db.ingestor,'b',async client=>{
   assert.equal((await client.query("SELECT * FROM mart.prepared_work_complete_snapshot_rows($1,$2,'business','2026-10-15')",['a',corrected.revisionId])).rowCount,0);
  },true);
  await assert.rejects(db.runtime.query("SELECT * FROM mart.prepared_work_complete_snapshot_rows($1,$2,'business','2026-10-15')",['a',corrected.revisionId]),/permission denied/);
 }finally{await db.close();}
});
