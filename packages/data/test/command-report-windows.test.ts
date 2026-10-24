import test from 'node:test';
import assert from 'node:assert/strict';
import {commandReportObjects} from '../src/business/command-report-windows.ts';

test('overview selects current recipes and only historical invoice, cash and weekly-order windows',()=>{
 assert.deepEqual(commandReportObjects('2026-10-24','2026-10'),['command_invoice','command_receipt','command_order','command_receivable','command_allocation']);
 assert.deepEqual(commandReportObjects('2026-10-24','2026-09'),['command_invoice','command_receipt','command_order']);
 assert.deepEqual(commandReportObjects('2026-10-24','2026-08'),[]);
 assert.deepEqual(commandReportObjects('2026-10-24','2025-01'),[]);
 assert.deepEqual(commandReportObjects('2026-10-24','2026-11'),[]);
});
test('Saturday-start six-week window can require a third calendar month',()=>{
 assert.deepEqual(commandReportObjects('2026-03-01','2026-01'),['command_order']);
 assert.deepEqual(commandReportObjects('2026-03-01','2026-02'),['command_invoice','command_receipt','command_order']);
 assert.deepEqual(commandReportObjects('2026-03-01','2025-12'),[]);
 assert.deepEqual(commandReportObjects('2026-03-14','2026-01'),[]);
});
test('comparison windows cross a year boundary without opening unrelated history',()=>{
 assert.deepEqual(commandReportObjects('2026-01-01','2025-12'),['command_invoice','command_receipt','command_order']);
 assert.deepEqual(commandReportObjects('2026-01-01','2025-11'),['command_order']);
 assert.deepEqual(commandReportObjects('2026-01-01','2025-10'),[]);
});
