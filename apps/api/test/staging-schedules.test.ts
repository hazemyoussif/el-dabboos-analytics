import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {analyticsOperatorTrigger} from '../src/analytics-jobs.ts';
import {assertAnalyticsScheduleReady} from '../src/analytics-schedule-status.ts';
import type {AnalyticsOperationalStatus} from '@el-dabboos/domain';

const image='el-dabboos-api:'+ 'a'.repeat(40),digest='sha256:'+ 'b'.repeat(64);
async function scheduleFixture() {
 const directory=await mkdtemp(join(tmpdir(),'dabboos-schedule-')),calls=join(directory,'calls');
 const environment={...process.env,PATH:directory+':'+process.env.PATH,STAGING_API_CONTAINER:'synthetic-api',STAGING_API_IMAGE:'ignored-old-pin',STAGING_DATABASE_NETWORK:'synthetic-network',STAGING_OPERATOR_ENV_FILE:join(directory,'operator'),STAGING_RUNTIME_ENV_FILE:join(directory,'runtime'),STAGING_SOURCE_ENV_FILE:join(directory,'source'),STAGING_ANALYTICS_TENANT:'synthetic-tenant',STAGING_ANALYTICS_LOCK_FILE:join(directory,'lock'),SCHEDULE_CALLS:calls,DEPLOYED_IMAGE:image,DEPLOYED_DIGEST:digest};
 const docker=`#!/bin/bash
set -eu
printf '%s\n' "$*" >> "$SCHEDULE_CALLS"
case "$1" in
 ps) printf '%s' "\${ACTIVE_JOBS:-}" ;;
 inspect) printf '%s %s running %s\n' "$DEPLOYED_IMAGE" "$DEPLOYED_DIGEST" "\${API_HEALTH:-healthy}" ;;
 run)
  arguments="$*"
  while [[ $# -gt 0 ]]; do
   if [[ "$1" == --cidfile ]]; then printf '%064d' 1 > "$2"; fi
   shift
  done
  if [[ "$arguments" == *staging-cli.ts* ]]; then exit "\${VERIFY_EXIT:-0}"; fi
  if [[ "$arguments" == *verify-schedule* ]]; then exit "\${PREFLIGHT_EXIT:-0}"; fi
  if [[ "\${SIGNAL_SOURCE:-0}" == 1 ]]; then kill -TERM "$PPID"; exit 0; fi
  if [[ "$arguments" == *'--mode daily'* ]]; then exit "\${DAILY_EXIT:-0}"; fi
  exit "\${SOURCE_EXIT:-0}" ;;
 compose)
  if [[ "$*" != *'build api web'* ]]; then
   if /usr/bin/flock -n "$STAGING_ANALYTICS_LOCK_FILE" true; then exit 90; fi
  fi
  printf 'images=%s,%s\n' "$STAGING_API_IMAGE" "$STAGING_WEB_IMAGE" >> "$SCHEDULE_CALLS"
  if [[ -n "\${FAIL_COMPOSE:-}" && "$*" == *"$FAIL_COMPOSE"* ]]; then exit 7; fi ;;
 rm) ;;
 *) exit 99 ;;
esac
`;
 const git=`#!/bin/sh
case "$*" in
 'rev-parse HEAD') printf '%s\n' '${'c'.repeat(40)}' ;;
 'status --porcelain --untracked-files=all') if [ "\${GIT_STATUS_FAIL:-0}" = 1 ]; then exit 7; fi; printf '%s' "\${DIRTY_CHECKOUT:-}" ;;
 'rev-list --count HEAD') echo 269 ;;
 *) exit 99 ;;
esac
`;
 const flock=`#!/bin/sh
if [ "$1" = -w ] && [ "\${FAIL_LOCK_WAIT:-0}" = 1 ]; then exit 1; fi
if [ "\${FLOCK_ERROR:-0}" != 0 ]; then exit "$FLOCK_ERROR"; fi
exec /usr/bin/flock "$@"
`;
 await Promise.all([writeFile(environment.STAGING_OPERATOR_ENV_FILE,''),writeFile(environment.STAGING_SOURCE_ENV_FILE,''),writeFile(environment.STAGING_RUNTIME_ENV_FILE,''),writeFile(join(directory,'docker'),docker,{mode:0o700}),writeFile(join(directory,'git'),git,{mode:0o700}),writeFile(join(directory,'flock'),flock,{mode:0o700})]);
 return {directory,environment,run:(script:string,args:string[],patch:Record<string,string>={})=>spawnSync('bash',[resolve('infra/staging',script),...args],{env:{...environment,...patch},encoding:'utf8'}),calls:async()=>(await readFile(calls,'utf8').catch(()=>'' )).trim().split('\n').filter(Boolean),clear:()=>writeFile(calls,''),close:()=>rm(directory,{recursive:true,force:true})};
}

test('scheduled CLI origin is explicit and invalid origins are rejected',()=>{
 assert.equal(analyticsOperatorTrigger({}),'operator');
 assert.equal(analyticsOperatorTrigger({ANALYTICS_JOB_TRIGGER:'scheduled'}),'scheduled');
 assert.throws(()=>analyticsOperatorTrigger({ANALYTICS_JOB_TRIGGER:'manual'}),/Invalid analytics operator trigger/);
});
test('scheduled jobs follow the healthy deployed digest, verifying schema before source access',async()=>{
 const fixture=await scheduleFixture();
 try {
  assert.equal(fixture.run('analytics-job.sh',['sync']).status,0);
  const calls=(await fixture.calls()).filter(call=>call.startsWith('run '));
  assert.equal(calls.length,3);
  assert.ok(calls[0]!.includes('apps/api/src/staging-cli.ts verify'));
  assert.ok(!calls[0]!.includes(fixture.environment.STAGING_SOURCE_ENV_FILE));
  assert.ok(calls[1]!.includes('verify-schedule --tenant synthetic-tenant'));
  assert.ok(!calls[1]!.includes(fixture.environment.STAGING_SOURCE_ENV_FILE));
  assert.ok(calls[2]!.includes('sync --tenant synthetic-tenant'));
  assert.ok(calls[2]!.includes(fixture.environment.STAGING_SOURCE_ENV_FILE));
  for(const invocation of calls){assert.ok(invocation.includes('--pull never'));assert.ok(invocation.includes('--read-only'));assert.ok(invocation.includes(digest));assert.ok(!invocation.includes('ignored-old-pin'));}
  assert.ok(calls[2]!.indexOf(fixture.environment.STAGING_SOURCE_ENV_FILE)<calls[2]!.indexOf(fixture.environment.STAGING_OPERATOR_ENV_FILE));
  await fixture.clear();
  const nextDigest='sha256:'+'d'.repeat(64);
  assert.equal(fixture.run('analytics-job.sh',['sync'],{DEPLOYED_IMAGE:'el-dabboos-api:'+'e'.repeat(40),DEPLOYED_DIGEST:nextDigest}).status,0);
  assert.ok((await fixture.calls()).filter(call=>call.startsWith('run ')).every(call=>call.includes(nextDigest)));
 }finally{await fixture.close();}
});
test('schema or deployment health failures stop before receiving source configuration',async()=>{
 const fixture=await scheduleFixture();
 try {
  assert.equal(fixture.run('analytics-job.sh',['sync'],{VERIFY_EXIT:'7'}).status,7);
  const calls=(await fixture.calls()).filter(call=>call.startsWith('run '));
  assert.equal(calls.length,1);assert.ok(!calls[0]!.includes(fixture.environment.STAGING_SOURCE_ENV_FILE));
  for(const patch of [{API_HEALTH:'starting'},{DEPLOYED_IMAGE:'el-dabboos-api:latest'},{DEPLOYED_DIGEST:'sha256:invalid'}]){
   await fixture.clear();
   assert.equal(fixture.run('analytics-job.sh',['sync'],patch).status,2);
   assert.ok(!(await fixture.calls()).some(call=>call.startsWith('run ')));
  }
 }finally{await fixture.close();}
});
test('daily jobs stop on failed reconciliation; offline checks never inject source configuration',async()=>{
 const fixture=await scheduleFixture();
 try {
  assert.equal(fixture.run('analytics-job.sh',['daily'],{DAILY_EXIT:'7'}).status,7);
  let calls=(await fixture.calls()).filter(call=>call.startsWith('run '));
  assert.equal(calls.length,3);assert.ok(calls[2]!.includes('reconcile --tenant synthetic-tenant --mode daily'));assert.ok(!calls.some(call=>call.includes('sweep --tenant')));
  await fixture.clear();
  assert.equal(fixture.run('analytics-job.sh',['daily']).status,0);
  calls=(await fixture.calls()).filter(call=>call.startsWith('run '));
  assert.equal(calls.length,4);assert.ok(calls[3]!.includes('sweep --tenant synthetic-tenant'));
  await fixture.clear();
  assert.equal(fixture.run('analytics-job.sh',['check'],{STAGING_JOB_REQUIRE_FRESH:'1'}).status,0);
  calls=(await fixture.calls()).filter(call=>call.startsWith('run '));
  assert.equal(calls.length,2);assert.ok(calls[1]!.includes('verify-schedule --tenant synthetic-tenant --require-fresh'));assert.ok(calls.every(call=>!call.includes(fixture.environment.STAGING_SOURCE_ENV_FILE)));
 }finally{await fixture.close();}
});
test('shared lock skips scheduled overlap, refuses false foreground success and detects orphan containers',async()=>{
 const fixture=await scheduleFixture();
 try {
  const script=resolve('infra/staging/analytics-job.sh');
  const held=spawnSync('/usr/bin/flock',['-n',fixture.environment.STAGING_ANALYTICS_LOCK_FILE,'bash',script,'sync'],{env:fixture.environment,encoding:'utf8'});
  assert.equal(held.status,0);assert.match(held.stdout,/skipped/);assert.equal((await fixture.calls()).length,0);
  const foreground=spawnSync('/usr/bin/flock',['-n',fixture.environment.STAGING_ANALYTICS_LOCK_FILE,'bash',script,'sync'],{env:{...fixture.environment,STAGING_JOB_REQUIRE_RUN:'1'},encoding:'utf8'});
  assert.equal(foreground.status,75);
  assert.equal(fixture.run('analytics-job.sh',['sync'],{ACTIVE_JOBS:'orphan'}).status,1);
  assert.deepEqual((await fixture.calls()).map(call=>call.split(' ')[0]),['ps']);
  assert.equal(fixture.run('analytics-job.sh',['bootstrap']).status,2);
  assert.equal(fixture.run('analytics-job.sh',['sync'],{FLOCK_ERROR:'64'}).status,64);
 }finally{await fixture.close();}
});
test('deployment locks migration, verification and restart while jobs follow the next healthy image',async()=>{
 const fixture=await scheduleFixture();
 try {
  assert.equal(fixture.run('deploy.sh',[]).status,0);
  const calls=(await fixture.calls()).filter(call=>call.startsWith('compose '));
  assert.equal(calls.length,5);
  assert.ok(calls[0]!.includes('build api web'));
  assert.ok(calls[1]!.includes('stop web api'));
  assert.ok(calls[2]!.endsWith('operator migrate'));
  assert.ok(calls[3]!.endsWith('operator verify'));
  assert.ok(calls[4]!.endsWith('up -d --wait api web'));
  assert.ok((await fixture.calls()).filter(call=>call.startsWith('images=')).every(call=>call.includes('c'.repeat(40))));
 }finally{await fixture.close();}
});
test('failed maintenance cannot restart an incompatible release; lock and orphan failures stop before maintenance',async()=>{
 const fixture=await scheduleFixture();
 try {
  for(const patch of [{FAIL_COMPOSE:'operator migrate'},{FAIL_COMPOSE:'operator verify'}]){
   await fixture.clear();assert.equal(fixture.run('deploy.sh',[],patch).status,7);
   assert.ok(!(await fixture.calls()).some(call=>call.includes('up -d')));
  }
  for(const patch of [{FAIL_LOCK_WAIT:'1'},{ACTIVE_JOBS:'orphan'}]){
   await fixture.clear();assert.notEqual(fixture.run('deploy.sh',[],patch).status,0);
   assert.ok(!(await fixture.calls()).some(call=>/stop web|operator migrate|operator verify|up -d/.test(call)));
  }
  await fixture.clear();assert.equal(fixture.run('deploy.sh',[],{DIRTY_CHECKOUT:' M packages/data/example.ts'}).status,2);assert.equal((await fixture.calls()).length,0);
  assert.equal(fixture.run('deploy.sh',[],{GIT_STATUS_FAIL:'1'}).status,7);assert.equal((await fixture.calls()).length,0);
 }finally{await fixture.close();}
});

test('activation requires complete trusted publication and fresh successful sync evidence',()=>{
 const success={kind:'sync' as const,runId:'synthetic-run',status:'passed' as const,sourceCutoff:'2026-10-16T01:00:00Z',completedAt:'2026-10-16T01:00:10Z',recordsChanged:0,partitionsAffected:0,caseCount:1,mismatchCount:0,servingRelease:'synthetic-revision'};
 const status:AnalyticsOperationalStatus={tenantId:'synthetic-tenant',definitionVersion:'definition',mappingVersion:'1',trustedServingRevision:'synthetic-revision',trustedCertificationRelease:'certification',pendingCandidateRun:null,freshnessAgeSeconds:30,freshnessTargetSeconds:600,cursor:{cutoff:success.sourceCutoff,objects:{}},eventAggregates:{from:'2026-10-01',throughMonth:'2026-10-01',dailyPartitions:1,monthlyPartitions:1,pendingPartitions:0,dailyRows:1,monthlyRows:1,latestRefresh:success.completedAt},latest:[success],lastSuccessfulSync:success,historicalCoverage:null};
 assert.doesNotThrow(()=>assertAnalyticsScheduleReady(status,true));
 const stale={...status,freshnessAgeSeconds:601};
 assert.doesNotThrow(()=>assertAnalyticsScheduleReady(stale,false));
 assert.doesNotThrow(()=>assertAnalyticsScheduleReady({...status,pendingCandidateRun:'failed-candidate'},false));
 assert.throws(()=>assertAnalyticsScheduleReady(stale,true),/freshness/);
 for(const patch of [{trustedServingRevision:null},{definitionVersion:null},{cursor:null},{eventAggregates:{...status.eventAggregates!,pendingPartitions:1}}])assert.throws(()=>assertAnalyticsScheduleReady({...status,...patch},false));
 for(const patch of [{pendingCandidateRun:'candidate'},{lastSuccessfulSync:null},{lastSuccessfulSync:{...success,mismatchCount:1}},{lastSuccessfulSync:{...success,status:'failed' as const}},{freshnessAgeSeconds:null},{freshnessAgeSeconds:NaN},{freshnessTargetSeconds:NaN},{latestFailure:{runId:'failed-run',kind:'daily',failedAt:'2026-10-16T01:00:11Z'}}])assert.throws(()=>assertAnalyticsScheduleReady({...status,...patch},true));
 assert.doesNotThrow(()=>assertAnalyticsScheduleReady({...status,latestFailure:{runId:'old-failure',kind:'sync',failedAt:'2026-10-15T01:00:00Z'}},true));
});
test('pending publication stops source access; signal cleanup removes only the created worker',async()=>{
 const fixture=await scheduleFixture();
 try {
  assert.equal(fixture.run('analytics-job.sh',['sync'],{PREFLIGHT_EXIT:'7'}).status,7);
  let calls=(await fixture.calls()).filter(call=>call.startsWith('run '));
  assert.equal(calls.length,2);assert.ok(calls.every(call=>!call.includes(fixture.environment.STAGING_SOURCE_ENV_FILE)));
  await fixture.clear();
  assert.equal(fixture.run('analytics-job.sh',['sync'],{SIGNAL_SOURCE:'1'}).status,143);
  calls=await fixture.calls();
  assert.ok(calls.some(call=>call==='rm -f '+'1'.padStart(64,'0')));
  assert.ok(!calls.some(call=>call.includes('rm -f synthetic-api')));
 }finally{await fixture.close();}
});


test('observed API scheduling retains daily reconciliation, sweeps and Command preparation against the owned copy',async()=>{
 const fixture=await scheduleFixture();
 try {
  await writeFile(fixture.environment.STAGING_SOURCE_ENV_FILE,'ANALYTICS_SOURCE_MODE=odoo-orm-observed\n');
  assert.equal(fixture.run('analytics-job.sh',['daily']).status,0);
  let calls=await fixture.calls();
  assert.ok(calls.some(call=>call.includes('stage:capture --tenant synthetic-tenant --accept-observed')));
  assert.ok(calls.some(call=>call.includes('refresh --tenant synthetic-tenant --accept-observed')));
  assert.ok(calls.some(call=>call.includes('reconcile --tenant synthetic-tenant --mode daily')));
  assert.ok(calls.some(call=>call.includes('sweep --tenant synthetic-tenant')));
  await fixture.clear();
  assert.equal(fixture.run('analytics-job.sh',['command-background']).status,0);
  calls=await fixture.calls();
  assert.ok(calls.some(call=>call.includes('command-background --tenant synthetic-tenant')&&call.includes(fixture.environment.STAGING_SOURCE_ENV_FILE)));
 }finally{await fixture.close();}
});
