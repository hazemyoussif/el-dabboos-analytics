import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm,readdir,stat } from 'node:fs/promises';
import { join } from 'node:path';
import { writeHistoricalCheckpoint } from '../../../scripts/integration/historical-checkpoint.ts';
test('durable checkpoint publication refuses replacement and never leaves a partial success file',async()=>{
  const directory=await mkdtemp('/tmp/synthetic-historical-checkpoint-'),path=join(directory,'month.events.json');
  try {
    await writeHistoricalCheckpoint(path,{status:'passed',synthetic:true});
    const bytes=await readFile(path,'utf8');
    assert.equal((await stat(path)).mode & 0o777,0o600);
    await assert.rejects(writeHistoricalCheckpoint(path,{status:'different'}),{code:'EEXIST'});
    assert.equal(await readFile(path,'utf8'),bytes);
    assert.deepEqual(await readdir(directory),['month.events.json']);
  } finally {await rm(directory,{recursive:true});}
});
