import {useSyncExternalStore} from 'react';
export type WorkspaceRoute={kind:'report'|'saved';id:string}|{kind:'workspace'}|{kind:'ask';id?:string};
const routeEvent='el-dabboos-workspace-route';
export function parseWorkspaceRoute(path:string):WorkspaceRoute {
 if(path==='/ask-business')return {kind:'ask'};
 const analyst=path.match(/^\/ask-business\/([a-zA-Z0-9-]+)$/);if(analyst)return {kind:'ask',id:analyst[1]!};
 const match=path.match(/^\/(reports|dashboards)\/([^/]+)$/);
 if(!match)return {kind:'workspace'};
 try{return {kind:match[1]==='reports'?'report':'saved',id:decodeURIComponent(match[2]!)};}catch{return {kind:'workspace'};}
}
export function workspaceRoutePath(route:WorkspaceRoute) {
 if(route.kind==='ask')return `/ask-business${route.id?'/'+encodeURIComponent(route.id):''}`;
 return route.kind==='workspace'?'/':`/${route.kind==='report'?'reports':'dashboards'}/${encodeURIComponent(route.id)}`;
}
export function navigateWorkspace(route:WorkspaceRoute,replace=false) {
 if(typeof window==='undefined')return;
 const path=workspaceRoutePath(route);
 if(window.location.pathname===path)return;
 window.history[replace?'replaceState':'pushState']({},'',path);
 window.dispatchEvent(new Event(routeEvent));
}
const pathname=()=>typeof window==='undefined'?'/':window.location.pathname;
function subscribeRoute(notify:()=>void) {
 window.addEventListener('popstate',notify);window.addEventListener(routeEvent,notify);
 return()=>{window.removeEventListener('popstate',notify);window.removeEventListener(routeEvent,notify);};
}
/** Browser history is the destination source; loaded report data remains independent. */
export function useWorkspaceRoute(){return parseWorkspaceRoute(useSyncExternalStore(subscribeRoute,pathname,()=>'/'));}
export const managementRouteIds=['finance-control','data-status','customer-performance','sales-command-center','products-warehouses'] as const;
export function isManagementRoute(route:WorkspaceRoute,customerAvailable:boolean) {
 return route.kind==='report'&&(route.id==='products-warehouses'||route.id==='sales-command-center'||route.id==='finance-control'||route.id==='data-status'||route.id==='customer-performance'&&!customerAvailable);
}
