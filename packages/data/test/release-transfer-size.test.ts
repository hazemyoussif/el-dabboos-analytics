import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { releasePayloadBytes } from '../src/postgres/release-transfer.ts';
test('promotion budgets actual UTF-8 record payload, preserving Arabic and escaped text without double-encoding', () => {
 const records = [{label:'العميل',text:'"'.repeat(1000)},{value:'9007199254740993.000000'}];
 const tables = {facts:records.map(record=>JSON.stringify(record)),controls:[]};
 const payload = JSON.stringify({facts:records,controls:[]});
 assert.equal(releasePayloadBytes(tables),Buffer.byteLength(payload,'utf8'));
 assert.ok(JSON.stringify(tables).length > releasePayloadBytes(tables));
 assert.ok(Buffer.byteLength(payload,'utf8') > payload.length);
 assert.equal(releasePayloadBytes({}),2);
});
