import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceDisplayLabel } from '../src/postgres/query-labels.ts';
test('stored translated labels resolve by locale without becoming identity',()=>{
 assert.equal(sourceDisplayLabel('{"en_US":"General","ar_001":"عام"}','ar'),'عام');
 assert.equal(sourceDisplayLabel('{"en_US":"General"}','ar'),'General');
 assert.equal(sourceDisplayLabel('Plain source label','en'),'Plain source label');
 assert.equal(sourceDisplayLabel('{invalid','ar'),'{invalid');
});
