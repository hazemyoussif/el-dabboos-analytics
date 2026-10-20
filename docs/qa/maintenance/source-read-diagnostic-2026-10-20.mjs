import {createMartPool,verifyMartRuntimeRole,tenantTransaction,readBaseline,createOdooSourcePool,OdooOperationalSource} from '../../../packages/data/src/index.ts';
import {resolveOdooSourceConfig} from '../../../apps/api/src/source-connections.ts';

// Explicit operator diagnostic: source reads and read-only mart metadata only.
const began=performance.now(),tenantId=process.env.DIAGNOSTIC_TENANT;
const emit=details=>console.log(JSON.stringify({diagnostic:'source_read_only',elapsedMs:Math.round(performance.now()-began),...details}));
const sqlState=error=>typeof error?.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:null;
const deadline=setTimeout(()=>{emit({phase:'overall_deadline',limitMs:75000});process.exit(124);},75000);
const mart=createMartPool(process.env.MART_RUNTIME_URL,1);
let owner,reader,snapshot,phase='mart_metadata',pages=0;
function statementKind(text){
 if(text.includes('FROM sale_order transaction'))return 'sale_order_page';
 if(text.includes('FROM account_move transaction'))return 'account_move_page';
 if(text.includes('SELECT min(date)::text date FROM ('))return 'receivable_change_discovery';
 if(text.includes('current_residual_mismatches'))return 'receivable_quality';
 if(text.includes('missing FROM eligible'))return 'receivable_currency_quality';
 if(text.includes('classified AS (SELECT reconstructed'))return 'receivable_summary';
 if(text.includes('FROM report_components'))return 'receivable_independent_control';
 return null;
}
function observeStatements(pool){
 pool.on('connect',client=>{
  const query=client.query.bind(client);
  client.query=(...args)=>{
   const text=typeof args[0]==='string'?args[0]:args[0]?.text??'',kind=statementKind(text);
   if(!kind)return query(...args);
   const started=performance.now();emit({phase:kind,event:'start'});
   return Promise.resolve(query(...args)).then(result=>{emit({phase:kind,event:'complete',durationMs:Math.round(performance.now()-started)});return result;},error=>{emit({phase:kind,event:'failed',durationMs:Math.round(performance.now()-started),sqlState:sqlState(error)});throw error;});
  };
 });
}
try{
 if(!tenantId)throw Error('Explicit diagnostic tenant required');
 await verifyMartRuntimeRole(mart);
 const {baseline,cursor}=await tenantTransaction(mart,tenantId,async client=>{
  const identity=(await client.query("SELECT current_setting('transaction_read_only') AS read_only")).rows[0];
  if(identity.read_only!=='on')throw Error('Read-only mart required');
  const baseline=await readBaseline(client,tenantId);
  const row=(await client.query('SELECT cutoff,object_cursors FROM mart.analytics_source_cursors WHERE tenant_id=$1',[tenantId])).rows[0];
  if(!row)throw Error('Existing operational cursor required');
  return {baseline,cursor:{cutoff:row.cutoff.toISOString(),objects:row.object_cursors}};
 },true,10000);
 phase='source_configuration';
 const resolved=await resolveOdooSourceConfig(process.env,{tenantId,sourceId:baseline.sourceId});
 const statementTimeoutMs=Math.min(resolved.statementTimeoutMs,15000);
 const config={...resolved,statementTimeoutMs,connection:{...resolved.connection,query_timeout:statementTimeoutMs+5000,application_name:'el-dabboos-source-read-diagnostic'}};
 emit({phase:'bounds',statementTimeoutMs,overallLimitMs:75000,maxPages:100,coveredMonths:baseline.coveredMonths.length,sourceSnapshotLimitMs:config.snapshotMaxDurationMs});
 owner=createOdooSourcePool(config);reader=createOdooSourcePool(config);observeStatements(reader);
 phase='source_open';snapshot=await new OdooOperationalSource(owner,reader,config,baseline).open(tenantId);
 emit({phase:'source_open',event:'complete'});
 phase='source_read';
 for await(const page of snapshot.records(baseline,cursor)){
  pages++;emit({phase:'source_page',object:['sale_order','account_move','receivable_cutoff'].includes(page.object)?page.object:'other',page:pages,rows:page.rows,facts:page.facts.length});
  if(pages>=100){emit({phase:'page_limit',complete:false});break;}
 }
 emit({phase:'source_read',event:'complete',pages,complete:pages<100});
}catch(error){emit({phase,event:'failed',sqlState:sqlState(error)});process.exitCode=1;}
finally{
 if(snapshot)try{await snapshot.close();}catch(error){emit({phase:'source_close',event:'failed',sqlState:sqlState(error)});process.exitCode=1;}
 await Promise.all([mart.end(),owner?.end(),reader?.end()]);clearTimeout(deadline);
}
