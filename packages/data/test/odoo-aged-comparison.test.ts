import assert from 'node:assert/strict';
import test from 'node:test';
import { compareAgedCustomers,decimalUnits,decimalText,type AgedAmounts } from '../../../scripts/integration/odoo-aged-comparison.ts';
const values: AgedAmounts={current:'10.000', '1_30':'-5.000','31_60':'0.000','61_90':'0.000','91_120':'0.000',older:'5.000',total:'10.000'};
const expected={rowNumber:5,rawLabel:'  Synthetic\tCustomer ',comparisonKey:'Synthetic Customer',values};
const actual={...values,partner_reference:'10',raw_label:'Synthetic Customer'};
test('Excel customer comparisons keep exact decimal signs and stable partner references',()=>{
 const result=compareAgedCustomers({customers:[expected],totals:values},[actual]);
 assert.equal(result.passed,true);assert.equal(result.exactCases,7);assert.equal(result.cases[0]?.partnerId,'10');
 assert.equal(decimalText(decimalUnits('-0.001')),'-0.001000');
 assert.throws(()=>decimalUnits('1.0000001'));
});
test('global equality cannot hide opposite customer/bucket discrepancies',()=>{
 const shifted={...values,current:'11',older:'4'};
 const result=compareAgedCustomers({customers:[expected],totals:values},[{...actual,...shifted}]);
 assert.equal(result.passed,false);assert.equal(result.mismatchedCases,2);assert.equal(result.deltas.total,'0.000000');
});
test('duplicate, missing and unexpected labels fail instead of guessing partner identity',()=>{
 const duplicate=compareAgedCustomers({customers:[expected],totals:values},[actual,{...actual,partner_reference:'11'}]);
 assert.equal(duplicate.missingCases,7);assert.equal(duplicate.unexpectedCases,14);assert.equal(duplicate.ambiguousLabels.length,1);
 const missing=compareAgedCustomers({customers:[expected],totals:values},[{...actual,raw_label:'Different'}]);
 assert.equal(missing.unmatchedLabels.length,1);assert.equal(missing.passed,false);
 const duplicateExcel=compareAgedCustomers({customers:[expected,{...expected,rowNumber:6}],totals:values},[actual]);
 assert.equal(duplicateExcel.ambiguousLabels.length,2);assert.equal(duplicateExcel.passed,false);
});
test('zero-total customers with offsetting signed aging buckets remain control cases',()=>{
 const offset={...values,current:'0',older:'5',total:'0'};
 const result=compareAgedCustomers({customers:[{...expected,values:offset}],totals:offset},[{...actual,...offset}]);
 assert.equal(result.passed,true);assert.equal(result.exactCases,7);
});
