import {createConnection} from 'node:net';
import {createOdooSourcePool,verifyOdooSourceIdentity} from '@el-dabboos/data';
import {resolveOdooSourceConfig} from './source-connections.ts';
/** Fixed configured source scope; no session, report or browser-controlled destinations. */
export async function probeAnalyticsSource(environment:NodeJS.ProcessEnv,scope:{tenantId:string;sourceId:string}) {
 const config=await resolveOdooSourceConfig(environment,scope);
 const relayAvailable=environment.ANALYTICS_SOURCE_RELAY_SOCKET?await relaySocketAvailable(environment.ANALYTICS_SOURCE_RELAY_SOCKET):await loopbackAvailable(String(config.connection.host),Number(config.connection.port));
 if(!relayAvailable)return {relayAvailable,sourceAvailable:false};
 const source=createOdooSourcePool({...config,connection:{...config.connection,connectionTimeoutMillis:2000,statement_timeout:1000,query_timeout:2000}});
 try {await verifyOdooSourceIdentity(source,config.credentialPolicy);return {relayAvailable,sourceAvailable:true};}
 catch {return {relayAvailable,sourceAvailable:false};}
 finally {await source.end();}
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
