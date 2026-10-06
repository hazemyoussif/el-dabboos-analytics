import { useEffect,useRef,useState } from 'react';
import type { ManagementControlReview } from '@el-dabboos/application';
import { getManagementControlReview } from '../api/client.ts';
import type { WorkspaceController } from '../hooks/useWorkspace.ts';
import type { useDashboardProductFlow } from '../hooks/useDashboardProductFlow.ts';
import type { ManagementPage } from './ManagementReports.tsx';
export function useManagementReports(workspace:WorkspaceController,flow:ReturnType<typeof useDashboardProductFlow>,onNavigate:()=>void) {
 const [page,setPage]=useState<ManagementPage|null>(null);
 const [review,setReview]=useState<ManagementControlReview|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState(false);
 const requestId=useRef(0);
 useEffect(()=>{requestId.current++;setPage(null);setReview(null);setError(false);setLoading(false);},[workspace.profile?.id,workspace.userId,workspace.navigationRevision]);
 const reload=async()=>{
  if(!workspace.profile)return;
  const identity=++requestId.current;
  setLoading(true);setError(false);setReview(null);
  try {
   const result=await getManagementControlReview({userId:workspace.userId,tenantId:workspace.profile.id,locale:workspace.locale});
   if(identity===requestId.current)setReview(result.review);
  } catch {if(identity===requestId.current)setError(true);}
  finally {if(identity===requestId.current)setLoading(false);}
 };
 const select=(id:string)=>{
  if(!workspace.profile)return;
  if(id==='finance-control'||id==='data-status') {
   if(!workspace.confirmAbandon())return;
   onNavigate();flow.close();setPage(id);void reload();return;
  }
  const template=workspace.templates.find(item=>item.id===id);
  if(template?.availability!=='available') {
   if(!workspace.confirmAbandon())return;
   onNavigate();flow.close();setPage('customer-unavailable');return;
  }
  onNavigate();setPage(null);flow.openTemplate(id,workspace.profile,workspace.locale);
 };
 return {page,review,loading,error,reload,select,close:()=>setPage(null)};
}
