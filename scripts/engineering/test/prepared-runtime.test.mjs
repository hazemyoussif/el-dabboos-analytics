import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {preparedRuntimeDiagnostics} from '../prepared-runtime.mjs';
test('prepared dashboard runtime has no transitive source or history reconstruction dependency',()=>{
 assert.deepEqual(preparedRuntimeDiagnostics(process.cwd()),[]);
});
test('prepared runtime boundary follows helpers and reexports but permits erased type imports',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'dabboos-prepared-boundary-'));
 try{
  const directory=path.join(root,'packages/data/src/prepared');await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'repository.ts'),"export {read} from './helper.ts';");
  await writeFile(path.join(directory,'helper.ts'),"export const read='SELECT * FROM mart.review_facts';");
  assert.match(preparedRuntimeDiagnostics(root)[0],/raw-history read reachable/);
  await writeFile(path.join(directory,'helper.ts'),"import type {Plan} from './preparation.ts'; export const read='SELECT * FROM mart.prepared_cells';");
  await writeFile(path.join(directory,'preparation.ts'),"export type Plan = string; export const write='INSERT INTO mart.review_facts';");
  assert.deepEqual(preparedRuntimeDiagnostics(root),[]);
  await writeFile(path.join(directory,'helper.ts'),"export * from './preparation.ts';");
  assert.match(preparedRuntimeDiagnostics(root)[0],/forbidden prepared runtime dependency/);
 }finally{await rm(root,{recursive:true,force:true});}
});
