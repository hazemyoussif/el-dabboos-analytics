import test from 'node:test';
import assert from 'node:assert/strict';
import {productMetricCatalog,validateQuery,validWidget} from '@el-dabboos/domain';
import {executeFacts} from '../src/engine.ts';
import type {AnalyticsFact} from '../src/facts.ts';
const context={tenantId:'fixture',locale:'en' as const},execution={sourceId:'SYNTHETIC ONLY',executedAt:'2026-10-14T00:00:00Z'};
const facts:AnalyticsFact[]=[60,30,10,0,-20].map((value,index)=>({tenantId:'fixture',measureId:'period_net_sales',date:'2026-09-15',value,dimensions:{customer:`customer-${index}`}}));
test('Pareto sorts positive contributions, preserves stable ranks and identifies the smallest set crossing 80%',()=>{
 const result=executeFacts(facts,{metric:'period_net_sales',groupBy:'customer',analysis:{pareto:true}},context,execution);
 assert.deepEqual(result.rows.map(row=>row.value),[60,90,100]);assert.deepEqual(result.rows.map(row=>row.rank),[1,2,3]);
 assert.equal(result.rows.findIndex(row=>row.value!>=80)+1,2);assert.equal(result.metadata.metricType,'percentage');
 assert.throws(()=>validateQuery({metric:'period_net_sales',groupBy:'month',analysis:{pareto:true}},context),/Pareto/);
 assert.throws(()=>validateQuery({metric:'period_net_sales',groupBy:'customer',analysis:{pareto:true,topN:{limit:10,direction:'top'}}},context),/Pareto/);
});
test('calendar dates use the latest snapshot per entity and maximum across selected customers; missing history remains null',()=>{
 const dates:AnalyticsFact[]=[{tenantId:'fixture',measureId:'customer_last_invoice_date',date:'2026-08-31',value:20000,entityId:'customer-a',dimensions:{customer:'a'}},{tenantId:'fixture',measureId:'customer_last_invoice_date',date:'2026-09-30',value:20701,entityId:'customer-a',dimensions:{customer:'a'}},{tenantId:'fixture',measureId:'customer_last_invoice_date',date:'2026-09-30',value:20702,entityId:'customer-b',dimensions:{customer:'b'}}];
 const query={metric:'customer_last_invoice_date' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'}};
 assert.equal(executeFacts(dates,query,context,execution).rows[0]?.value,20702);
 assert.deepEqual(executeFacts(dates,{...query,groupBy:'customer'},context,execution).rows,[{key:'a',value:20701},{key:'b',value:20702}]);
 assert.equal(executeFacts(dates,{...query,filters:[{dimension:'customer',values:['missing']}]},context,execution).rows[0]?.value,null);
 assert.throws(()=>validateQuery({...query,analysis:{ranking:true},groupBy:'customer'},context),/Calendar/);
 assert.equal(validWidget({id:'dates',type:'line',dimension:'month',series:[{id:'date',metric:'customer_last_invoice_date'}]}),false);
});
test('base quantities require product or compatible unit scope and a precise table presentation',()=>{
 assert.throws(()=>validateQuery({metric:'internal_stock_quantity'},context),/Quantity/);
 assert.doesNotThrow(()=>validateQuery({metric:'internal_stock_quantity',groupBy:'uom'},context));
 assert.equal(validWidget({id:'quantities',type:'bar',dimension:'product',series:[{id:'quantity',metric:'internal_stock_quantity'}]}),false);
 assert.equal(validWidget({id:'quantities',type:'table',dimension:'product',series:[{id:'quantity',metric:'internal_stock_quantity'}]}),true);
});

test('legacy customer cash retains Finance authorization and new supplier liabilities are Finance metrics',()=>{
 for(const id of ['customer_cash_collected','customer_collection_ratio','supplier_payable_due','customer_balance_sales_percentage'])assert.equal(productMetricCatalog.find(metric=>metric.id===id)?.domain,'finance',id);
});
