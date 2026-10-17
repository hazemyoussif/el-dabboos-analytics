import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePreparationOptions,executeAnalyticsPreparation} from '../src/analytics-preparation.ts';
const args=['--database','synthetic_mart','--revision','synthetic-revision','--max-cells','1000','--max-chunks','10'];
test('preparation commands require explicit database, publication and finite build budgets',()=>{
 assert.deepEqual(parsePreparationOptions(args),{database:'synthetic_mart',revisionId:'synthetic-revision',bounds:{maxCellsPerChunk:1000,maxChunks:10}});
 for(const invalid of [[],args.slice(0,6),args.concat('--force'),args.map(value=>value==='1000'?'Infinity':value),args.map(value=>value==='10'?'0':value)])assert.throws(()=>parsePreparationOptions(invalid));
});
test('preparation refuses an unintended database before opening a pool',async()=>{
 await assert.rejects(executeAnalyticsPreparation('prepare','synthetic',args,{MART_INGESTOR_URL:'postgresql://synthetic:synthetic@127.0.0.1/wrong'}),/database mismatch/);
});
