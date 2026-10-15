import type {MouseEvent,ReactNode} from 'react';
import {workspaceRoutePath} from './workspace-route.ts';
import type {WorkspaceRoute} from './workspace-route.ts';
interface Props {
 route:WorkspaceRoute;onNavigate:()=>void;children:ReactNode;
 className?:string;title?:string;disabled?:boolean;
 'aria-label'?:string;'aria-current'?:'page';
}
/** Native link actions leave this tab and its unsaved draft untouched. */
export function followWorkspaceLink(event:Pick<MouseEvent,'button'|'metaKey'|'ctrlKey'|'shiftKey'|'altKey'|'defaultPrevented'|'preventDefault'>,onNavigate:()=>void){
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();onNavigate();
}
export function WorkspaceLink({route,onNavigate,children,disabled,className,...attributes}:Props){
 if(disabled)return <button type="button" disabled className={className} {...attributes}>{children}</button>;
 return <a href={workspaceRoutePath(route)} className={`workspace-link ${className??''}`} {...attributes} onClick={event=>followWorkspaceLink(event,onNavigate)}>{children}</a>;
}
