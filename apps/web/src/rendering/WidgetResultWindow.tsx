import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {DashboardExecutionResult,WidgetExecution,DashboardFilterOverrides} from '@el-dabboos/application';
import type {DashboardSpec,AnalyticsResultCursor,Locale} from '@el-dabboos/domain';
import {readWidgetWindow} from '../api/client.ts';
import type {ApiSession} from '../api/client.ts';

interface Props {entry:WidgetExecution|undefined;execution:DashboardExecutionResult;dashboard:DashboardSpec;widgetId:string;session:ApiSession|undefined;locale:Locale;onChange?:(entry:WidgetExecution)=>void;children:(entry:WidgetExecution|undefined,controls:ReactNode)=>ReactNode}
function useWidgetWindow({entry,execution,dashboard,widgetId,session,onChange}:Props){
 const [current,setCurrent]=useState(entry),[history,setHistory]=useState<Array<AnalyticsResultCursor|undefined>>([undefined]),[page,setPage]=useState(0);
 const [search,setSearch]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),request=useRef<AbortController|null>(null);
 useEffect(()=>{request.current?.abort();setCurrent(entry);setHistory([undefined]);setPage(0);setSearch('');setBusy(false);setFailed(false);return()=>request.current?.abort();},[entry,session?.tenantId,session?.locale,widgetId]);
 const window=current?.window;
 async function load(cursor:AnalyticsResultCursor|undefined,nextPage:number,newSearch=window?.search??''){
  if(!session||!window)return;
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setFailed(false);
  const filters=execution.metadata.effectiveFilters;
  const overrides:DashboardFilterOverrides={date:filters?.dateRange?{mode:'absolute',range:filters.dateRange}:null,dimensions:filters?.dimensions??[]};
  try{
   const result=await readWidgetWindow({session,dashboard,widgetId,window:{limit:window.limit,...(cursor?{cursor}:{}),...(newSearch?{search:newSearch}:{})},overrides,signal:controller.signal});
   if(controller.signal.aborted)return;
   if(result.status==='error'){setFailed(true);return;}
   setCurrent(result);onChange?.(result);setPage(nextPage);setHistory(previous=>nextPage===0?[undefined]:[...previous.slice(0,nextPage),cursor]);
  }catch{if(!controller.signal.aborted)setFailed(true);}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return {current,history,page,search,setSearch,busy,failed,load,window};
}
export function WidgetResultWindow(props:Props){
 const state=useWidgetWindow(props);
 return props.children(state.current,<ResultWindowControls state={state} locale={props.locale} enabled={Boolean(props.session)}/>);
}
function ResultWindowControls({state,locale,enabled}:{state:ReturnType<typeof useWidgetWindow>;locale:Locale;enabled:boolean}){
 const {window,history,page,search,setSearch,busy,failed,load}=state,text=windowCopy[locale];
 const controls=window&&enabled?<section className="result-window" aria-label={text.pages} aria-busy={busy}>
  <form onSubmit={event=>{event.preventDefault();void load(undefined,0,search.trim());}}><label>{text.searchLabel}<input value={search} maxLength={200} disabled={busy} onChange={event=>setSearch(event.currentTarget.value)}/></label><button type="submit" disabled={busy}>{text.search}</button></form>
  <nav className="row-pages" aria-label={text.navigation}><span role="status">{windowStatus(page,window.total,locale)}</span>
   <button type="button" disabled={busy||page===0} onClick={()=>void load(history[page-1],page-1)}>{text.previous}</button><button type="button" disabled={busy||!window.nextCursor} onClick={()=>void load(window.nextCursor,page+1)}>{text.next}</button></nav>
  <small>{text.export}</small>{failed&&<p role="alert">{text.failure}</p>}
 </section>:null;
 return controls;
}

const windowCopy={
 en:{pages:'Result pages',searchLabel:'Search row labels',search:'Search',navigation:'Result navigation',previous:'Previous',next:'Next',export:'Export includes loaded rows only.',failure:'Could not load this result page. Retry or refresh the report.'},
 ar:{pages:'صفحات النتائج',searchLabel:'بحث في أسماء الصفوف',search:'بحث',navigation:'التنقل في النتائج',previous:'السابق',next:'التالي',export:'التصدير يشمل الصفوف المحملة فقط.',failure:'تعذر تحميل صفحة النتائج. أعد المحاولة أو حدّث التقرير.'},
};
function windowStatus(page:number,total:number|undefined,locale:Locale){const arabic=locale==='ar',format=new Intl.NumberFormat(arabic?'ar-IQ':'en-IQ');return `${arabic?'الصفحة':'Page'} ${format.format(page+1)}${total===undefined?'':` · ${format.format(total)} ${arabic?'صف':'rows'}`}`;}
