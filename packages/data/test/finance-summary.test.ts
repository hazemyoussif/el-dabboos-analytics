import test from 'node:test';
import assert from 'node:assert/strict';
import {financeSummaryValue} from '../src/operational/finance-summary.ts';
import type {FinanceSummaryRow} from '../src/operational/finance-summary.ts';

function row(actual_values:Record<string,string>,invalid_measures:string[]=[]):FinanceSummaryRow{
 return {key:null,snapshot_date:'2026-09-30',source_cutoff:new Date('2026-10-01'),definition_version:'synthetic',source_revision:'synthetic',snapshot_id:'synthetic',label:null,actual_values,invalid_measures};
}
test('shared Finance vectors preserve signed decimals, ratio operands and zero-denominator nulls',()=>{
 const selected=row({net_aged_receivable:'180.000000',total_overdue_receivable:'80.000000',credit_balances:'-20.000000'});
 assert.equal(financeSummaryValue({metric:'credit_balances'},selected),-20);
 assert.equal(financeSummaryValue({metric:'overdue_receivable_percentage'},selected),80/180*100);
 assert.equal(financeSummaryValue({metric:'overdue_receivable_percentage'},row({net_aged_receivable:'0.000000',total_overdue_receivable:'80.000000'})),null);
});
test('malformed and unsafe components cannot contaminate independent summary metrics',()=>{
 const selected=row({aged_at_date:'12.345678',net_aged_receivable:'9007199254740992.000000'},['aged_1_30']);
 assert.equal(financeSummaryValue({metric:'aged_at_date'},selected),12.345678);
 assert.throws(()=>financeSummaryValue({metric:'aged_1_30'},selected),/Invalid SQL numeric output/);
 assert.throws(()=>financeSummaryValue({metric:'net_aged_receivable'},selected),/Unsafe SQL numeric output/);
});
