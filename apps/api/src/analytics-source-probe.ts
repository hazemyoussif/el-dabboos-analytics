import {createConnection} from 'node:net';
import {createOdooSourcePool,verifyOdooSourceIdentity,OdooOrmClient,odooOrmConfig} from '@el-dabboos/data';
import {resolveOdooSourceConfig,assertOrmSourceRegistration} from './source-connections.ts';
/** Fixed configured source scope; no session, report or browser-controlled destinations. */
export async function probeAnalyticsSource(environment:NodeJS.ProcessEnv,scope:{tenantId:string;sourceId:string}) {
 if(environment.ANALYTICS_SOURCE_MODE==='odoo-orm-observed')return probeObservedApi(environment,scope);
 if(environment.ANALYTICS_SOURCE_MODE && environment.ANALYTICS_SOURCE_MODE!=='odoo-postgres')throw new Error('Unknown analytics source mode');
 const config=await resolveOdooSourceConfig(environment,scope);
 const relayAvailable=environment.ANALYTICS_SOURCE_RELAY_SOCKET?await relaySocketAvailable(environment.ANALYTICS_SOURCE_RELAY_SOCKET):await loopbackAvailable(String(config.connection.host),Number(config.connection.port));
 if(!relayAvailable)return {relayAvailable,sourceAvailable:false};
 const source=createOdooSourcePool({...config,connection:{...config.connection,connectionTimeoutMillis:2000,statement_timeout:1000,query_timeout:2000}});
 try {await verifyOdooSourceIdentity(source,config.credentialPolicy);return {relayAvailable,sourceAvailable:true};}
 catch {return {relayAvailable,sourceAvailable:false};}
 finally {await source.end();}
}
async function probeObservedApi(environment:NodeJS.ProcessEnv,scope:{tenantId:string;sourceId:string}) {
 if(environment.ODOO_ORM_TENANT_ID!==scope.tenantId||environment.ODOO_ORM_SOURCE_ID!==scope.sourceId)throw new Error('Explicit scoped Odoo ORM approval required');
 const config=odooOrmConfig(environment);
 await assertOrmSourceRegistration(environment,{...scope,companyIds:config.companyIds});
 try {
  const client=new OdooOrmClient({...config,timeoutMs:2000});await client.authenticate();
  const companies=await client.searchRead('res.company',[],[]);
  const sourceAvailable=companies.map(company=>company.id).sort().join(',')===[...config.companyIds].sort().join(',');
  return {relayAvailable:true,sourceAvailable};
 }catch{return {relayAvailable:false,sourceAvailable:false};}
}
function loopbackAvailable(host:string,port:number):Promise<boolean> {
 return new Promise(resolve=>{
  const socket=createConnection({host,port});
  const finish=(available:boolean)=>{socket.destroy();resolve(available);};
  socket.setTimeout(2000);socket.once('connect',()=>finish(true));socket.once('timeout',()=>finish(false));socket.once('error',()=>finish(false));
 });
}

function relaySocketAvailable(path:string):Promise<boolean>{
 return new Promise(resolve=>{
  const socket=createConnection({path});
  const finish=(available:boolean)=>{socket.destroy();resolve(available);};
  socket.setTimeout(2000);socket.once('connect',()=>finish(true));socket.once('timeout',()=>finish(false));socket.once('error',()=>finish(false));
 });
}
