import type { ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import type { DashboardExecutionResult } from '@el-dabboos/application';
import type { DashboardSpec } from '@el-dabboos/domain';
import type { WorkspaceController } from '../hooks/useWorkspace.ts';
import { navigateWorkspace } from '../workspace-route.ts';
import { analystCopy } from './copy.ts';
import { AskBusiness } from './AskBusiness.tsx';
export const isAnalystDestination=(workspace:WorkspaceController)=>workspace.route.kind==='ask';
export function AnalystNavigation({workspace,onOpen}:{workspace:WorkspaceController;onOpen:()=>void}) {
 if(!workspace.permissions.includes('analytics:query')||!workspace.permissions.includes('ai:generate'))return null;
 const title=analystCopy[workspace.locale].title;
 return <nav className="sidebar-section management-navigation" aria-label={title}><button title={title} aria-current={isAnalystDestination(workspace)?'page':undefined} onClick={onOpen}><MessageCircle aria-hidden="true"/><span className="nav-label">{title}</span></button></nav>;
}
export function AnalystWorkspace({workspace,onDashboard}:{workspace:WorkspaceController;onDashboard:(spec:DashboardSpec,result:DashboardExecutionResult)=>void}) {
 const {userId,profile,locale,published,filterOptions,route}=workspace;
 if(!profile || route.kind!=='ask')return null;
 const defaultContext=published?.mode==='certified'&&published.releases[0]?.period?{dateRange:published.releases[0].period}:{datePreset:'current_year' as const};
 const labels=Object.fromEntries(Object.values(filterOptions).flatMap(options=>options?.map(option=>[option.id,option.label])??[]));
 return <AskBusiness key={`${userId}-${profile.id}`} session={{userId,tenantId:profile.id,locale}} profile={profile} {...(route.id?{id:route.id}:{})} defaultContext={defaultContext} demo={published?.mode==='synthetic'} canCreate={workspace.permissions.includes('dashboard:create')} labels={labels} onNavigate={id=>navigateWorkspace(id?{kind:'ask',id}:{kind:'ask'})} onDashboard={onDashboard}/>;
}

export function AnalystArea({workspace,onDashboard,children}:{workspace:WorkspaceController;onDashboard:(spec:DashboardSpec,result:DashboardExecutionResult)=>void;children:ReactNode}) {
 return isAnalystDestination(workspace)?<AnalystWorkspace workspace={workspace} onDashboard={onDashboard}/>:<>{children}</>;
}
export function AnalystBreadcrumb({workspace,children}:{workspace:WorkspaceController;children:ReactNode}) {
 return isAnalystDestination(workspace)?<>{analystCopy[workspace.locale].title}</>:<>{children}</>;
}
