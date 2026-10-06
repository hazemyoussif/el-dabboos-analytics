import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyInvoiceResidual,semanticCatalog } from '@el-dabboos/domain';
import { executeFacts } from '../src/engine.ts';
import type { AnalyticsFact } from '../src/facts.ts';

const context={tenantId:'tenant-a',locale:'en' as const};
const execution={sourceId:'synthetic-characterization',executedAt:'2026-10-06T12:00:00.000Z'};
function snapshot(measureId: 'outstanding_amount'|'overdue_amount',date: string,value: number,entityId: string,customer='customer-a'): AnalyticsFact {
 return {tenantId:context.tenantId,measureId,date,value,entityId,dimensions:{customer}};
}
const observations=[
 snapshot('outstanding_amount','2026-09-01',100,'invoice-installment-a'),
 snapshot('outstanding_amount','2026-09-30',40,'invoice-installment-a'),
 snapshot('outstanding_amount','2026-10-03',0,'invoice-installment-a'),
 snapshot('outstanding_amount','2026-09-15',50,'invoice-installment-b','customer-b'),
 snapshot('overdue_amount','2026-09-01',100,'overdue-installment-a'),
 snapshot('overdue_amount','2026-09-30',40,'overdue-installment-a'),
 snapshot('overdue_amount','2026-10-03',0,'overdue-installment-a'),
 {...snapshot('outstanding_amount','2026-09-30',9999,'foreign'),tenantId:'tenant-b'},
];
test('existing receivable metrics select stored entity snapshots inclusively at cutoff, never sum dates or use extraction time',()=>{
 const dateRange={from:'2026-09-30',to:'2026-09-30'};
 const outstanding=executeFacts(observations,{metric:'outstanding_amount',dateRange},context,execution);
 assert.deepEqual(outstanding.rows,[{key:null,value:90}]);
 assert.deepEqual(executeFacts(observations,{metric:'overdue_amount',dateRange},context,execution).rows,[{key:null,value:40}]);
 assert.deepEqual(executeFacts(observations,{metric:'outstanding_amount',dateRange:{from:'2026-10-03',to:'2026-10-03'}},context,execution).rows,[{key:null,value:50}]);
 assert.deepEqual(executeFacts(observations,{metric:'outstanding_amount',dateRange:{from:'2026-08-01',to:'2026-08-31'}},context,execution).rows,[{key:null,value:null}]);
});
test('existing receivable customer groups and policy totals retain distinct component identity and tenant isolation',()=>{
 const query={metric:'outstanding_amount' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'},groupBy:'customer' as const};
 assert.deepEqual(executeFacts(observations,query,context,execution).rows,[{key:'customer-a',value:40},{key:'customer-b',value:50}]);
 assert.deepEqual(executeFacts(observations,query,{...context,enforcedFilters:[{dimension:'customer',values:['customer-b']}]},execution).rows,[{key:'customer-b',value:50}]);
});
test('existing generic outstanding and overdue semantics do not enforce gross positivity or derive overdue from due dates',()=>{
 assert.deepEqual(semanticCatalog.outstanding_amount.semantics,{kind:'snapshot',measure:'outstanding_amount'});
 assert.deepEqual(semanticCatalog.overdue_amount.semantics,{kind:'snapshot',measure:'overdue_amount'});
 const facts=[snapshot('outstanding_amount','2026-09-30',100,'debit'),snapshot('outstanding_amount','2026-09-30',-20,'unapplied-credit')];
 assert.deepEqual(executeFacts(facts,{metric:'outstanding_amount'},context,execution).rows,[{key:null,value:80}]);
 assert.deepEqual(executeFacts(facts,{metric:'overdue_amount'},context,execution).rows,[{key:null,value:null}]);
});
test('existing snapshots carry balances forward; explicit zero snapshots close entities and attribution is selected before policy',()=>{
 const moved=[snapshot('outstanding_amount','2026-09-01',100,'component'),snapshot('outstanding_amount','2026-09-30',40,'component','customer-b')];
 assert.deepEqual(executeFacts(moved,{metric:'outstanding_amount'},{...context,enforcedFilters:[{dimension:'customer',values:['customer-a']}]},execution).rows,[{key:null,value:null}]);
 assert.deepEqual(executeFacts(moved,{metric:'outstanding_amount',dateRange:{from:'2026-10-01',to:'2026-10-31'}},context,execution).rows,[{key:null,value:40}]);
 assert.throws(()=>executeFacts([...moved,moved[1]!],{metric:'outstanding_amount'},context,execution),/Duplicate snapshot/);
});
test('Wave 1 classifier is invoice-only with unknown maturity and residual-based eligibility, not a historical ledger reconstruction',()=>{
 const invoice={state:'posted',documentType:'customer_invoice' as const,residualCompanyCurrency:'40.000000',dueDate:'2026-09-30'};
 assert.equal(classifyInvoiceResidual(invoice,'2026-09-30').due,'not_yet_due');
 assert.equal(classifyInvoiceResidual(invoice,'2026-10-01').overdue,'40.000000');
 assert.deepEqual(classifyInvoiceResidual({...invoice,dueDate:null},'2026-09-30'),{eligible:true,due:'unknown',outstanding:'40.000000',overdue:null,notYetDue:null});
 for (const documentType of ['other','customer_credit_note'] as const) assert.equal(classifyInvoiceResidual({...invoice,documentType},'2026-09-30').eligible,false);
 for (const residualCompanyCurrency of ['0.000000','-40.000000']) assert.equal(classifyInvoiceResidual({...invoice,residualCompanyCurrency},'2026-09-30').eligible,false);
});
