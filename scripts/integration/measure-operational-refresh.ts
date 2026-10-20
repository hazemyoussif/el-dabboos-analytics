import {randomUUID} from 'node:crypto';
import {open} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {tenantTransaction} from '../../packages/data/src/postgres/session.ts';
import {createMartPool} from '../../packages/data/src/postgres/session.ts';
import {refreshOperationalMonths} from '../../packages/data/src/operational/aggregates.ts';

type MartClient=Parameters<Parameters<typeof tenantTransaction>[2]>[0];
interface Options {tenantId:string;budgetMs:number;output:string;connection:string}
interface Timing {calls:number;elapsedMs:number;maxMs:number}
interface Anchor {revisionId:string;partitions:number}
interface RefreshInput {months:string[];days:string[];facts:number;parent:string;cutoff:string}
interface Report {
 kind:'local-refresh-measurement';budgetMs:number;sourceAccess:false;publication:false;companyParity:false;
 completed:boolean;completedMonths:number;timings:Record<string,Timing>;months?:number;activeFacts?:number;affectedDays?:number;
 refreshMs?:number;errorCode?:string;errorPosition?:string;failedStage?:string;cleanupErrorCode?:string;
 trustedRevisionUnchanged?:boolean;partitionCountUnchanged?:boolean;
}
const stages=[
 ['SELECT member.partition_id','prior_proofs'],
 ['INSERT INTO mart.analytics_serving_revisions','candidate_manifest'],
 ['INSERT INTO mart.analytics_serving_members SELECT','carry_manifest'],
 ['INSERT INTO mart.analytics_partitions','partition'],
 ['INSERT INTO mart.analytics_aggregate_bases SELECT','copy_daily'],
 ['INSERT INTO mart.analytics_aggregate_bases\n SELECT','rebuild_daily'],
 ['INSERT INTO mart.analytics_partition_facts SELECT link','copy_membership'],
 ['INSERT INTO mart.analytics_partition_facts SELECT tenant_id','rebuild_membership'],
 ['INSERT INTO mart.analytics_monthly_bases','monthly_rollup'],
 ['INSERT INTO mart.analytics_aggregate_proofs','aggregate_proof'],
 ['INSERT INTO mart.analytics_drill_partitions','drill_proof'],
 ['INSERT INTO mart.analytics_serving_members VALUES','membership_guard'],
] as const;
function options():Options {
 const args=process.argv.slice(2),values=new Map<string,string>();
 if(args.length!==6)throw new Error('Expected --tenant <tenant> --budget-ms <1..150000> --output <new-file>');
 for(let index=0;index<args.length;index+=2){const key=args[index]!,value=args[index+1]!;if(!['--tenant','--budget-ms','--output'].includes(key)||values.has(key))throw new Error('Invalid measurement arguments');values.set(key,value);}
 const tenantId=values.get('--tenant')!,budget=values.get('--budget-ms')!,output=values.get('--output')!;
 if(!tenantId?.trim()||tenantId.trim()!==tenantId||tenantId.length>200||!/^\d+$/.test(budget)||!output)throw new Error('Invalid measurement arguments');
 const budgetMs=Number(budget),connection=process.env.MART_INGESTOR_URL;
 let hostname:string;
 try{hostname=new URL(connection??'').hostname;}catch{throw new Error('Bounded local ingestor connection required');}
 if(budgetMs<1||budgetMs>150000||!connection||!['localhost','127.0.0.1','[::1]'].includes(hostname))throw new Error('Bounded local ingestor connection required');
 return {tenantId,budgetMs,connection,output:resolve(output)};
}
/** There is deliberately no COMMIT path, including successful measurements. */
async function rollbackTenant<T>(client:MartClient,tenantId:string,readOnly:boolean,operation:()=>Promise<T>):Promise<T> {
 await client.query(readOnly?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN');
 try {
  await client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true)",[tenantId]);
  return await operation();
 }finally{await client.query('ROLLBACK');}
}
async function requireIngestor(client:MartClient) {
 const row=(await client.query(`SELECT pg_has_role(current_user,'dabboos_ingestor','MEMBER') ingestor,
 pg_has_role(current_user,'dabboos_migrator','MEMBER') migrator,rolsuper,rolbypassrls
 FROM pg_roles WHERE rolname=current_user`)).rows[0];
 if(!row?.ingestor||row.migrator||row.rolsuper||row.rolbypassrls)throw Object.assign(new Error('Dedicated ingestor required'),{code:'WRONG_ROLE'});
}
async function anchor(client:MartClient,tenantId:string):Promise<Anchor> {
 return rollbackTenant(client,tenantId,true,async()=>{
  const row=(await client.query(`SELECT revision_id AS revision_id,
  (SELECT count(*)::int FROM mart.analytics_partitions WHERE tenant_id=$1) AS partition_count
  FROM mart.analytics_trusted_serving WHERE tenant_id=$1`,[tenantId])).rows[0];
  if(!row)throw Object.assign(new Error('Trusted local revision required'),{code:'NO_LOCAL_REVISION'});
  return {revisionId:row.revision_id,partitions:row.partition_count};
 });
}
async function refreshInput(client:MartClient,tenantId:string):Promise<RefreshInput> {
 const parent=(await client.query(`SELECT trusted.revision_id AS revision_id,revision.cutoff AS cutoff
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id)
 WHERE trusted.tenant_id=$1`,[tenantId])).rows[0];
 if(!parent)throw Object.assign(new Error('Trusted local revision required'),{code:'NO_LOCAL_REVISION'});
 const months=(await client.query("SELECT to_char(month,'YYYY-MM') AS period FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND family='facts' ORDER BY month",[tenantId,parent.revision_id])).rows.map(row=>String(row.period));
 if(!months.length)throw Object.assign(new Error('Published local fact months required'),{code:'NO_LOCAL_MONTHS'});
 const days=(await client.query(`SELECT DISTINCT payload->>'businessDate' AS business_day
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=ANY($2::text[])`,[tenantId,months])).rows.map(row=>String(row.business_day));
 const facts=(await client.query("SELECT count(*)::int AS fact_count FROM mart.analytics_fact_heads WHERE tenant_id=$1 AND status='active' AND business_month=ANY($2::text[])",[tenantId,months])).rows[0].fact_count;
 return {months,days,facts,parent:parent.revision_id,cutoff:parent.cutoff.toISOString()};
}
function recordTiming(report:Report,stage:string,elapsedMs:number) {
 const previous=report.timings[stage]??{calls:0,elapsedMs:0,maxMs:0};
 report.timings[stage]={calls:previous.calls+1,elapsedMs:previous.elapsedMs+elapsedMs,maxMs:Math.max(previous.maxMs,elapsedMs)};
}
async function measureRefresh(client:MartClient,input:RefreshInput,scope:Options,report:Report,cancel:()=>Promise<unknown>) {
 const query=client.query.bind(client);
 const started=performance.now();let expired=false,cancellation:Promise<unknown>|undefined;
 const timer=setTimeout(()=>{expired=true;cancellation=cancel().catch(()=>undefined);},scope.budgetMs);
 client.query=(async(sql:string,values?:unknown[])=>{
  if(expired)throw Object.assign(new Error('Refresh measurement deadline'),{code:'MEASUREMENT_DEADLINE'});
  const stage=stages.find(([prefix])=>sql.startsWith(prefix))?.[1]??'other',began=performance.now();
  try {
   const result=await query(sql,values);
   if(stage==='membership_guard'){report.completedMonths++;process.stdout.write(JSON.stringify({phase:'month_complete',completedMonths:report.completedMonths,totalMonths:input.months.length,elapsedMs:Math.round(performance.now()-started)})+'\n');}
   return result;
  }catch(error){report.failedStage=stage;throw error;}
  finally{recordTiming(report,stage,performance.now()-began);}
 }) as MartClient['query'];
 try {
  await refreshOperationalMonths(client,{tenantId:scope.tenantId,revisionId:randomUUID(),parent:input.parent,runId:null,cutoff:input.cutoff,days:input.days,purpose:'adoption'},input.months);
  if(expired)throw Object.assign(new Error('Refresh measurement deadline'),{code:'MEASUREMENT_DEADLINE'});
  report.completed=true;
 }finally{clearTimeout(timer);await cancellation;client.query=query as MartClient['query'];report.refreshMs=performance.now()-started;}
}
function safeError(error:unknown):{errorCode:string;errorPosition?:string} {
 if(!error||typeof error!=='object')return {errorCode:'MEASUREMENT_FAILED'};
 const code='code' in error&&typeof error.code==='string'?error.code:'MEASUREMENT_FAILED';
 return {errorCode:code,...('position' in error&&typeof error.position==='string'?{errorPosition:error.position}:{})};
}
async function run(scope:Options):Promise<Report> {
 const report:Report={kind:'local-refresh-measurement',budgetMs:scope.budgetMs,sourceAccess:false,publication:false,companyParity:false,completed:false,completedMonths:0,timings:{}};
 const pool=createMartPool(scope.connection,1),control=createMartPool(scope.connection,1);
 let client:MartClient|undefined,before:Anchor|undefined,locked=false,broken=false;
 try {
  client=await pool.connect();const selected=client;
  await rollbackTenant(selected,scope.tenantId,true,()=>requireIngestor(selected));
  locked=(await selected.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[`analytics:${scope.tenantId}`])).rows[0].locked;
  if(!locked)throw Object.assign(new Error('Local analytics job active'),{code:'LOCAL_JOB_ACTIVE'});
  before=await anchor(selected,scope.tenantId);
  await rollbackTenant(selected,scope.tenantId,false,async()=>{
   const input=await refreshInput(selected,scope.tenantId);
   Object.assign(report,{months:input.months.length,activeFacts:input.facts,affectedDays:input.days.length});
   process.stdout.write(JSON.stringify({phase:'refresh_start',months:report.months,activeFacts:report.activeFacts,affectedDays:report.affectedDays,budgetMs:scope.budgetMs,companyParity:false})+'\n');
   const pid=(await selected.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   await measureRefresh(selected,input,scope,report,()=>control.query('SELECT pg_cancel_backend($1)',[pid]));
  });
 }catch(error){Object.assign(report,safeError(error),{completed:false});}
 finally{
  if(client&&before)try {
   const after=await anchor(client,scope.tenantId);
   report.trustedRevisionUnchanged=before.revisionId===after.revisionId;report.partitionCountUnchanged=before.partitions===after.partitions;
  }catch(error){report.cleanupErrorCode=safeError(error).errorCode;broken=true;}
  if(client&&locked)try{await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`analytics:${scope.tenantId}`]);}catch{broken=true;report.cleanupErrorCode='LOCK_RELEASE_FAILED';}
  client?.release(broken);await Promise.all([pool.end(),control.end()]);
 }
 return report;
}
// Reserve a fresh owner-only result file before opening a database connection.
const scope=options(),output=await open(scope.output,'wx',0o600);
try {
 const report=await run(scope);
 await output.writeFile(JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify({phase:'refresh_result',...report})+'\n');
 if(!report.completed||report.cleanupErrorCode||!report.trustedRevisionUnchanged||!report.partitionCountUnchanged)process.exitCode=1;
}finally{await output.close();}
