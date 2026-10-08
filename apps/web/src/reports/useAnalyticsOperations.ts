import { refreshTrustedView } from './refresh-trusted-view.ts';
import { useEffect,useRef,useState } from 'react';
import type { AnalyticsOperationalStatus,AnalyticsOperationResult } from '@el-dabboos/domain';
import { request } from '../api/client.ts';
import type { WorkspaceController } from '../hooks/useWorkspace.ts';
import type { DashboardFilterOverrides } from '@el-dabboos/application';
type Status=AnalyticsOperationalStatus & {commandsAvailable?:boolean;commandsConfigured?:boolean};
export function useAnalyticsOperations(workspace:WorkspaceController,overrides:DashboardFilterOverrides) {
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(false);
 const [busy,setBusy]=useState<'refresh'|'sync'|'affected'|'daily'|null>(null),[result,setResult]=useState<AnalyticsOperationResult|null>(null),[failed,setFailed]=useState(false),[refreshComplete,setRefreshComplete]=useState(false);
 const generation=useRef(0),statusRequest=useRef(0),locked=useRef(false);
 const destination='id' in workspace.route?workspace.route.id:workspace.route.kind;
 const canRefresh=destination==='data-status'||!!workspace.dashboard&&!workspace.loading;
 const eligible=!!workspace.profile&&workspace.published?.mode==='certified'&&workspace.permissions.includes('analytics:query');
 const reload=async()=>{
  if(!eligible)return;
  const owner=generation.current,requestId=++statusRequest.current;
  const ownsStatus=()=>owner===generation.current&&requestId===statusRequest.current;setLoading(true);setError(false);
  try {const value=await request<Status>(workspace.session(),'/api/analytics/status','GET');if(ownsStatus())setStatus(value);}
  catch {if(ownsStatus())setError(true);}
  finally {if(ownsStatus())setLoading(false);}
 };
 useEffect(()=>{
  generation.current++;locked.current=false;setStatus(null);setBusy(null);setResult(null);setFailed(false);setRefreshComplete(false);setError(false);
  void reload();
  const timer=setInterval(()=>{void reload();},30000);
  return ()=>{generation.current++;clearInterval(timer);};
 },[workspace.userId,workspace.profile?.id,workspace.navigationRevision,destination,eligible]);
 const act=async(kind:NonNullable<typeof busy>)=>{
  if(!eligible||locked.current||kind==='refresh'&&!canRefresh)return;
  locked.current=true;const owner=generation.current;setBusy(kind);setResult(null);setFailed(false);setRefreshComplete(false);
  try {
   if(kind==='refresh') {
    if(workspace.route.kind!=='report'||workspace.route.id!=='data-status')await refreshTrustedView(workspace,overrides,()=>owner===generation.current);
    if(owner===generation.current)setRefreshComplete(true);
   } else {
    const value=await request<AnalyticsOperationResult>(workspace.session(),'/api/analytics/operations','POST',{kind});
    if(owner===generation.current)setResult(value);
   }
  } catch {if(owner===generation.current)setFailed(true);}
  finally {if(owner===generation.current){setBusy(null);locked.current=false;void reload();}}
 };
 return {status,error,loading,busy,result,failed,refreshComplete,reload,act,eligible,canRefresh,canOperate:workspace.permissions.includes('tenant:manage')};
}
export type OperationsController=ReturnType<typeof useAnalyticsOperations>;
