import type {Locale,SemanticMetric,AccessControlledDashboardRecord,DashboardSpec} from '@el-dabboos/domain';
import {executeSavedDashboard,getFilterOptions,instantiateTemplate} from './api/client.ts';
import type {AccessibleTemplate,ApiSession} from './api/client.ts';
import {openTemplateDocument,savedDocument} from './dashboard-lifecycle.ts';
import type {WorkspaceRoute} from './workspace-route.ts';
import {isManagementRoute,navigateWorkspace} from './workspace-route.ts';

/** Report execution owns loading; optional filter discovery cannot discard a completed report. */
export async function loadWorkspaceReport(session:ApiSession,route:WorkspaceRoute,metrics:SemanticMetric[],templates:{templates:AccessibleTemplate[];defaultTemplateId?:string},discovery:{record?:AccessControlledDashboardRecord;onOptions?:(options:Awaited<ReturnType<typeof getFilterOptions>>)=>void;onOptionsError?:()=>void}={}) {
 const {record,onOptions,onOptionsError}=discovery;
 const first=templates.templates.find(item=>item.id===templates.defaultTemplateId&&item.availability==='available')??templates.templates.find(item=>item.availability==='available');
 const special=isManagementRoute(route,templates.templates.some(item=>item.id==='customer-performance'&&item.availability==='available'));
 const destination=route.kind==='ask'?undefined:route.kind==='report'?route.id:first?.id;
 if(!record&&destination&&!special)navigateWorkspace({kind:'report',id:destination},route.kind==='workspace');
 const report=async()=>{
  if(record)return {opened:savedDocument(record),openedExecution:await executeSavedDashboard(session,record.id)};
  if(destination&&!special){const result=await instantiateTemplate(session,destination);return {opened:openTemplateDocument(destination,result.dashboard),openedExecution:result.execution};}
  return {opened:null,openedExecution:null};
 };
 const result=await report();
 void getFilterOptions(session,[...new Set(metrics.flatMap(metric=>metric.dimensions))],onOptionsError).then(options=>onOptions?.(options)).catch(()=>onOptionsError?.());
 return result;
}
export function workspaceDestinationTitle(route:WorkspaceRoute,templates:AccessibleTemplate[],records:AccessControlledDashboardRecord[],locale:Locale) {
 if(route.kind==='report')return templates.find(item=>item.id===route.id)?.name[locale];
 if(route.kind==='saved')return records.find(item=>item.id===route.id)?.spec.title[locale];
 return undefined;
}
export function workspaceDisplayTitle(loadedTitle:string,destinationTitle:string|undefined,loading:boolean,dashboard:DashboardSpec|null) {
 return (loading||!dashboard?destinationTitle:undefined)??loadedTitle;
}
