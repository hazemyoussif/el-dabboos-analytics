import {reviewBusinessDate} from '../src/review/cutoff.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticCatalog,requiredMeasures,validateQuery} from '../../domain/src/index.ts';
import {executeFacts} from '../src/engine.ts';
import {reviewMapping,reviewCapabilities,reviewMetrics} from '../src/review/definitions.ts';
import {mapReviewRow} from '../src/review/mapper.ts';
import type {ReviewSourceRow} from '../src/review/mapper.ts';
const mapping=reviewMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'review-test'});
const source={cutoff:'2026-10-13T09:00:00.000Z',revision:'SYNTHETIC ONLY',companyIds:['1']};
const values={customer_cash_collected:'150.000000',cash_applied_to_invoices:'100.000000',unallocated_customer_receipts:'50.000000',collection_amount_days:'2000.000000',collection_applied_amount:'100.000000',order_margin:'40.000000',order_untaxed_value:'200.000000',net_invoiced_revenue:'120.000000',invoiced_revenue:'125.000000',refund_value:'5.000000',receivables_due_for_collection:'30.000000'};
export function rowFor(measure:ReviewSourceRow['measure_id'],value:string):ReviewSourceRow {
 const rule=mapping.measures.find(rule=>rule.measureId===measure)!;
 return {source_record_id:'10',source_object:rule.sourceObject,component_id:'whole',business_date:measure==='receivables_due_for_collection'?'2026-09-30':'2026-09-15',company_id:'1',currency:'IQD',measure_id:measure,value,invalid:false,customer:'20',salesperson:'30',business_line:'40',product:'50',product_category:'60'};
}
test('all eight metrics use exact canonical inputs, matching totals, days and snapshot semantics',()=>{
 const facts=Object.entries(values).map(([measure,value])=>mapReviewRow(rowFor(measure as ReviewSourceRow['measure_id'],value),mapping,source)).map(fact=>({tenantId:fact.tenantId,measureId:fact.measureId,date:fact.businessDate,value:Number(fact.value),dimensions:fact.dimensions,...fact.entityId?{entityId:fact.entityId}:{}}));
 const expected=[150,100,50,125,20,30,40,20];
 for(const [index,metric] of reviewMetrics.entries())assert.equal(executeFacts(facts,{metric,dateRange:{from:'2026-09-01',to:'2026-09-30'}},{tenantId:'a',locale:'en'},{sourceId:'mock-review',executedAt:source.cutoff}).rows[0]?.value,expected[index]);
 assert.equal(semanticCatalog.weighted_collection_days.presentation.unit,'days');
 assert.equal(semanticCatalog.order_margin.help.definition.en.includes('accounting gross profit'),true);
 for(const metric of reviewMetrics)for(const locale of ['en','ar'] as const)assert.ok(semanticCatalog[metric].help.formula[locale]);
 assert.deepEqual(requiredMeasures('weighted_collection_days'),['collection_amount_days','collection_applied_amount']);
});
test('source mapper rejects cross-company, mixed currency, missing/invalid values and source quality failures',()=>{
 const row=rowFor('customer_cash_collected','150.000000');
 for(const changes of [{company_id:'2'},{currency:'USD'},{invalid:true},{value:'NaN'}])assert.throws(()=>mapReviewRow({...row,...changes},mapping,source));
 const payment=mapReviewRow(row,mapping,source);assert.deepEqual(payment.dimensions,{customer:'fixture:20'});
 const product=mapReviewRow(rowFor('net_invoiced_revenue','120.000000'),mapping,source);assert.equal(product.dimensions.product,'fixture:50');
});
test('exposure capabilities are executable without Finance approval but do not grant unsupported payment dimensions or product invoice counts',()=>{
 assert.equal(mapping.approval.status,'pending');
 const capabilities=reviewCapabilities(mapping,{month:'2026-09',cutoff:source.cutoff,reference:'technical-test'});
 assert.equal(capabilities.releases[0]?.financeReview,'pending');
 assert.deepEqual(capabilities.releases[0]?.capabilities.find(capability=>capability.metric==='customer_collection_ratio')?.dimensions,['date','month','quarter','year','customer']);
 assert.equal(capabilities.releases[0]?.capabilities.some(capability=>capability.metric==='invoice_count'),false);
 assert.throws(()=>validateQuery({metric:'weighted_collection_days',aggregation:'sum'},{tenantId:'a',locale:'en'}));
 assert.equal(executeFacts([],{metric:'weighted_collection_days'},{tenantId:'a',locale:'en'},{sourceId:'mock',executedAt:source.cutoff}).rows[0]?.value,null);
});

test('allocation cutoff follows the Baghdad business day across the UTC boundary',()=>{
 assert.equal(reviewBusinessDate('2026-10-13T20:59:59.000Z','Asia/Baghdad'),'2026-10-13');
 assert.equal(reviewBusinessDate('2026-10-13T21:00:00.000Z','Asia/Baghdad'),'2026-10-14');
});
