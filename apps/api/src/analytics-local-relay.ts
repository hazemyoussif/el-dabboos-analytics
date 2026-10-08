import {createConnection,createServer} from 'node:net';
import type {Socket} from 'node:net';
/** Local staging only: protected Unix socket -> API loopback, never a public/container-network listener. */
export async function localAnalyticsSourceRelay(environment:NodeJS.ProcessEnv) {
 if(environment.ANALYTICS_MANUAL_OPERATIONS!=='enabled'||!environment.ANALYTICS_SOURCE_RELAY_SOCKET)return undefined;
 if(environment.ANALYTICS_SOURCE_RELAY_SOCKET!=='/run/dabboos-source/source.sock'||environment.ODOO_SOURCE_HOST!=='127.0.0.1'||environment.ODOO_SOURCE_PORT!=='5432')return undefined;
 const sockets=new Set<Socket>();
 const server=createServer(client=>{
  const upstream=createConnection(environment.ANALYTICS_SOURCE_RELAY_SOCKET!);sockets.add(client);sockets.add(upstream);
  upstream.setTimeout(5000,()=>upstream.destroy());upstream.once('connect',()=>upstream.setTimeout(0));
  client.pipe(upstream);upstream.pipe(client);
  client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());
  client.on('close',()=>{sockets.delete(client);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);client.destroy();});
 });
 await new Promise<void>(resolve=>{server.once('error',()=>resolve());server.listen(5432,'127.0.0.1',()=>resolve());});
 return {close:async()=>{for(const socket of sockets)socket.destroy();if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
