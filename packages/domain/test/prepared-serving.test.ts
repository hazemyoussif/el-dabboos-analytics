import test from 'node:test';
import assert from 'node:assert/strict';
import {preparedDimensionGrains,preparedMetricBasis,preparedReadDimensions,selectPreparedGrain} from '../src/prepared-serving.ts';
import type {PreparedGrain} from '../src/prepared-serving.ts';
const context={tenantId:'synthetic',locale:'en' as const};
const grains:PreparedGrain[]=[
 {id:'total',dimensions:[],measures:['period_net_sales'],timeGrain:'daily',rows:365},
 {id:'customer',dimensions:['customer'],measures:['period_net_sales'],timeGrain:'daily',rows:3000},
 {id:'full',dimensions:['customer','state','salesperson'],measures:['period_net_sales'],timeGrain:'daily',rows:9000},
 {id:'month',dimensions:[],measures:['period_net_sales'],timeGrain:'monthly',rows:12},
];
test('prepared grain selection retains authorization/filter dimensions and never substitutes the wrong temporal grain',()=>{
 const query={metric:'period_net_sales' as const,groupBy:'customer' as const};
 assert.equal(selectPreparedGrain(grains,{query,context,timeGrain:'daily'})?.id,'customer');
 const scoped={...context,enforcedFilters:[{dimension:'state' as const,values:['synthetic:state']}]};
 assert.equal(selectPreparedGrain(grains,{query,context:scoped,timeGrain:'daily'})?.id,'full');
 assert.equal(selectPreparedGrain(grains,{query:{...query,filters:[{dimension:'brand',values:['synthetic:brand']}]},context,timeGrain:'daily'}),undefined);
 assert.equal(selectPreparedGrain(grains,{query:{metric:'period_net_sales'},context,timeGrain:'monthly'})?.id,'month');
 assert.equal(selectPreparedGrain(grains,{query:{metric:'period_net_sales'},context,timeGrain:'cutoff'}),undefined);
 assert.deepEqual(preparedReadDimensions(query,scoped),['customer','state']);
});
test('a ratio requires both exact operands and its governed temporal basis',()=>{
 assert.equal(preparedMetricBasis('customer_balance_sales_percentage'),'snapshot');
 assert.equal(preparedMetricBasis('period_collection_percentage'),'event');
 assert.equal(preparedMetricBasis('sales_growth'),'event');
 const query={metric:'customer_balance_sales_percentage' as const};
 assert.equal(selectPreparedGrain([{id:'incomplete',dimensions:[],measures:['review_customer_balance'],timeGrain:'cutoff',rows:1}],{query,context,timeGrain:'cutoff'}),undefined);
});
test('dataset grain generation is deterministic, includes the full policy tuple and deduplicates single-dimension datasets',()=>{
 assert.deepEqual(preparedDimensionGrains(['state','customer','month','state']),[[],['customer'],['state'],['customer','state']]);
 assert.deepEqual(preparedDimensionGrains(['customer']),[[],['customer']]);
 assert.deepEqual(preparedDimensionGrains([]),[[]]);
});
test('distinct populations and quantity compatibility require their semantic dimensions even for totals',()=>{
 assert.deepEqual(preparedReadDimensions({metric:'customers_served'},context),['customer']);
 assert.deepEqual(preparedReadDimensions({metric:'internal_stock_quantity',groupBy:'product'},context),['product','uom']);
 assert.equal(selectPreparedGrain([{id:'lost-unit',dimensions:['product'],measures:['internal_stock_quantity'],timeGrain:'cutoff',rows:1}],{query:{metric:'internal_stock_quantity',groupBy:'product'},context,timeGrain:'cutoff'}),undefined);
});
