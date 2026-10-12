import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {analyticsOperatorTrigger} from '../src/analytics-jobs.ts';

test('scheduled CLI origin is explicit and invalid origins are rejected',()=>{
 assert.equal(analyticsOperatorTrigger({}),'operator');
 assert.equal(analyticsOperatorTrigger({ANALYTICS_JOB_TRIGGER:'scheduled'}),'scheduled');
 assert.throws(()=>analyticsOperatorTrigger({ANALYTICS_JOB_TRIGGER:'manual'}),/Invalid analytics operator trigger/);
});
test('staging schedule reuses pinned CLI jobs, propagates failure and skips overlapping execution',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'dabboos-schedule-'));
 const script=resolve('infra/staging/analytics-job.sh'),calls=join(directory,'calls');
 const environment={...process.env,PATH:directory+':'+process.env.PATH,STAGING_API_IMAGE:'el-dabboos-api:'+ 'a'.repeat(40),STAGING_DATABASE_NETWORK:'synthetic-network',STAGING_OPERATOR_ENV_FILE:join(directory,'operator'),STAGING_SOURCE_ENV_FILE:join(directory,'source'),STAGING_ANALYTICS_TENANT:'synthetic-tenant',STAGING_ANALYTICS_LOCK_FILE:join(directory,'lock'),SCHEDULE_CALLS:calls};
 try {
  await Promise.all([writeFile(environment.STAGING_OPERATOR_ENV_FILE,''),writeFile(environment.STAGING_SOURCE_ENV_FILE,''),writeFile(join(directory,'docker'),"#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$SCHEDULE_CALLS\"\nexit \"${DOCKER_EXIT:-0}\"\n",{mode:0o700})]);
  const run=(job:string,patch:Record<string,string>={})=>spawnSync('bash',[script,job],{env:{...environment,...patch},encoding:'utf8'});
  assert.equal(run('sync').status,0);assert.equal(run('daily').status,0);
  const recorded=(await readFile(calls,'utf8')).trim().split('\n');assert.equal(recorded.length,3);
  assert.ok(recorded[0]!.includes('sync --tenant synthetic-tenant'));
  assert.ok(recorded[1]!.includes('reconcile --tenant synthetic-tenant --mode daily'));
  assert.ok(recorded[2]!.includes('sweep --tenant synthetic-tenant'));
  for(const invocation of recorded){assert.ok(invocation.includes('--pull never'));assert.ok(invocation.includes('ANALYTICS_JOB_TRIGGER=scheduled'));assert.ok(invocation.includes('--read-only'));assert.ok(invocation.includes(environment.STAGING_API_IMAGE));}
  assert.equal(run('daily',{DOCKER_EXIT:'7'}).status,7);assert.equal((await readFile(calls,'utf8')).trim().split('\n').length,4);
  assert.equal(run('sync',{STAGING_API_IMAGE:'el-dabboos-api:latest'}).status,2);
  assert.equal(run('bootstrap').status,2);
  const held=spawnSync('flock',['-n',environment.STAGING_ANALYTICS_LOCK_FILE,'bash',script,'sync'],{env:environment,encoding:'utf8'});
  assert.equal(held.status,0);assert.match(held.stdout,/skipped/);assert.equal((await readFile(calls,'utf8')).trim().split('\n').length,4);
 }finally{await rm(directory,{recursive:true,force:true});}
});
