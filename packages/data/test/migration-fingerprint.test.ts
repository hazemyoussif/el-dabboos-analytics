import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {loadPostgresMigrations,migrationDirectory} from '../src/postgres/migrations.ts';

test('migration 040 fingerprint covers SQL and its self-contained adoption companion',async()=>{
 const directory=await mkdtemp('/tmp/migration-fingerprint-'),url=pathToFileURL(directory+'/');
 try{
  await cp(migrationDirectory,url,{recursive:true});
  const original=(await loadPostgresMigrations(url)).at(-1)!;
  for(const name of ['040_unified_serving.sql','040_unified_serving.adoption.cjs']){
   const path=new URL(name,url),source=await readFile(path,'utf8');
   await writeFile(path,source+'\n'+(name.endsWith('.sql')?'-- SQL mutation':'// adoption mutation'));
   assert.notEqual((await loadPostgresMigrations(url)).at(-1)!.checksum,original.checksum);
   await writeFile(path,source);
   assert.equal((await loadPostgresMigrations(url)).at(-1)!.checksum,original.checksum);
  }
  await rm(new URL('040_unified_serving.adoption.cjs',url));
  await assert.rejects(loadPostgresMigrations(url),/ENOENT/);
 }finally{await rm(directory,{recursive:true});}
});
