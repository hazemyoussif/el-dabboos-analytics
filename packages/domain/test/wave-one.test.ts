import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyInvoiceResidual,reconcileDerivedRatio,semanticCatalog,validateDerivedCertification } from '../src/index.ts';
import type { ReconciliationCase } from '../src/index.ts';
const input=(measureId: ReconciliationCase['measureId'],value: string,groupKey: string|null=null): ReconciliationCase => ({ caseId: measureId+(groupKey??'summary'),tenantId: 'a',datasetId: 'release',mappingVersion: '1',measureId,sourceReportReference: 'SYNTHETIC',frozenRevision: 'freeze',batchIds: ['batch'],from: '2026-09-01',to: '2026-09-30',grouping: groupKey ? 'salesperson' : null,groupKey,expectedValue: value,actualValue: value,expectedCount: '2',actualCount: '2',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC' } });
test('source-neutral order and invoice averages retain distinct bases and exact weighted rational controls',()=>{
 assert.notDeepEqual(semanticCatalog.order_revenue.semantics,semanticCatalog.net_invoiced_revenue.semantics);
 assert.deepEqual(semanticCatalog.average_confirmed_order_value.semantics,{ kind: 'ratio',numerator: 'order_revenue',denominator: 'order_count',scale: 1 });
 assert.deepEqual(reconcileDerivedRatio('average_confirmed_order_value',[input('order_revenue','10.000000'),input('order_count','3.000000')])[0]!.value,{ numerator: '10.000000',denominator: '3.000000',scale: 1 });
 assert.deepEqual(reconcileDerivedRatio('average_invoice_value',[input('invoiced_revenue','100.000000'),input('invoice_count','2.000000')])[0]!.value,{ numerator: '100.000000',denominator: '2.000000',scale: 1 });
 assert.throws(()=>reconcileDerivedRatio('average_invoice_value',[input('net_invoiced_revenue','100.000000'),input('invoice_count','2.000000')]),/Unexpected/);
});
test('zero denominator is null; missing groups, incompatible scopes and failed controls cannot certify',()=>{
 assert.equal(reconcileDerivedRatio('average_confirmed_order_value',[input('order_revenue','0.000000'),input('order_count','0.000000')])[0]!.value,null);
 assert.throws(()=>reconcileDerivedRatio('average_confirmed_order_value',[input('order_revenue','10.000000','one'),input('order_count','2.000000','two')]),/Missing/);
 assert.throws(()=>reconcileDerivedRatio('average_confirmed_order_value',[input('order_revenue','10.000000'),{...input('order_count','2.000000'),actualValue:'3.000000'}]),/Exact/);
 const cases=[input('order_revenue','10.000000'),input('order_count','2.000000')];
 assert.throws(()=>validateDerivedCertification({ tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'test',metric:'average_confirmed_order_value',grouping:null,from:'2026-09-01',to:'2026-09-30',caseIds:cases.map(control=>control.caseId),approvalReference:'',approvedAt:'2026-10-06T10:00:00.000Z',businessSemantics:'ratio',technicalReference:'exact' },cases),/approval/);
});
test('proposed current invoice residual classification preserves partial balances, unknown due dates and credits',()=>{
 const invoice={state:'posted',documentType:'customer_invoice' as const,residualCompanyCurrency:'25.000000',dueDate:'2026-10-05'};
 assert.deepEqual(classifyInvoiceResidual(invoice,'2026-10-06'),{eligible:true,due:'overdue',outstanding:'25.000000',overdue:'25.000000',notYetDue:'0.000000'});
 assert.equal(classifyInvoiceResidual({...invoice,dueDate:'2026-10-06'},'2026-10-06').due,'not_yet_due');
 assert.equal(classifyInvoiceResidual({...invoice,dueDate:null},'2026-10-06').overdue,null);
 for (const patch of [{documentType:'customer_credit_note' as const},{state:'draft'},{residualCompanyCurrency:'0.000000'},{residualCompanyCurrency:'-25.000000'}]) assert.equal(classifyInvoiceResidual({...invoice,...patch},'2026-10-06').eligible,false);
 assert.equal(semanticCatalog.outstanding_amount.semantics.kind,'snapshot');
});
