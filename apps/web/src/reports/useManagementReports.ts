import {navigateWorkspace} from '../workspace-route.ts';
import { useEffect,useRef,useState } from 'react';
import type { ManagementControlReview } from '@el-dabboos/application';
import { getManagementControlReview } from '../api/client.ts';
import type { WorkspaceController } from '../hooks/useWorkspace.ts';
import type { useDashboardProductFlow } from '../hooks/useDashboardProductFlow.ts';
import type { ManagementPage } from './ManagementReports.tsx';
export function useManagementReports(workspace:WorkspaceController,flow:ReturnType<typeof useDashboardProductFlow>,onNavigate:()=>void) {
 const page:ManagementPage|null=workspace.route.kind==='report'?(workspace.route.id==='products-warehouses'?'products-warehouses':workspace.route.id==='sales-command-center'?'sales-command-center':workspace.route.id==='data-status'?'data-status':workspace.route.id==='finance-control'?'finance-control':workspace.route.id==='customer-performance'&&!workspace.templates.some(item=>item.id==='customer-performance'&&item.availability==='available')?'customer-unavailable':null):null;
 const [review,setReview]=useState<ManagementControlReview|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState(false);
 const requestId=useRef(0);
 useEffect(()=>{requestId.current++;setReview(null);setError(false);setLoading(false);},[workspace.profile?.id,workspace.userId,workspace.navigationRevision]);
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
  if(id==='finance-control'||id==='data-status'||id==='sales-command-center'||id==='products-warehouses') {
   if(!workspace.confirmAbandon())return;
   workspace.beginRequest();workspace.setLoading(false);onNavigate();flow.close();navigateWorkspace({kind:'report',id});return;
  }
  const template=workspace.templates.find(item=>item.id===id);
  if(template?.availability!=='available') {
   if(!workspace.confirmAbandon())return;
   workspace.beginRequest();workspace.setLoading(false);onNavigate();flow.close();navigateWorkspace({kind:'report',id});return;
  }
  onNavigate();flow.openTemplate(id,workspace.profile,workspace.locale);
 };
 useEffect(()=>{if(page==='finance-control'||page==='data-status')void reload();},[page,workspace.profile?.id]);
 return {page,review,loading,error,reload,select,close:()=>navigateWorkspace({kind:'workspace'})};
}
