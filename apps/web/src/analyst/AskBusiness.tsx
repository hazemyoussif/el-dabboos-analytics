import { useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowUpRight } from 'lucide-react';
import { analyticsResultDrillRequest } from '@el-dabboos/application';
import { semanticCatalog } from '@el-dabboos/domain';
import type { AnalystMessage, AnalyticsIntent, DashboardSpec, DrillRequest, TenantProfile } from '@el-dabboos/domain';
import type { DashboardExecutionResult } from '@el-dabboos/application';
import type { ApiSession } from '../api/client.ts';
import { DatePeriodControl } from '../DatePeriodControl.tsx';
import { DrillDetails } from '../DrillDetails.tsx';
import { formatDate, formatTimestamp } from '../i18n.ts';
import { answerDashboard, answerDetails } from './client.ts';
import { analystCopy, analystStateLabel } from './copy.ts';
import { useAnalyst } from './useAnalyst.ts';
import { AnswerEvidence } from './AnswerEvidence.tsx';
import { AnswerVisual } from './AnswerVisual.tsx';
interface Props {session:ApiSession;profile:TenantProfile;id?:string;defaultContext:AnalyticsIntent['context'];demo:boolean;canCreate:boolean;labels:Record<string,string>;onNavigate:(id?:string)=>void;onDashboard:(spec:DashboardSpec,execution:DashboardExecutionResult)=>void}
export function AskBusiness(props:Props) {
 const {session,profile}=props,locale=session.locale,text=analystCopy[locale];
 const [context,setContext]=useState(props.defaultContext),[question,setQuestion]=useState(''),[action,setAction]=useState<'dashboard'|'details'|null>(null),[actionError,setActionError]=useState(false),[selection,setSelection]=useState<DrillRequest|null>(null),[drillLabels,setDrillLabels]=useState<Record<string,string>>({});
 const actionOwner=useRef(0);
 useEffect(()=>()=>{actionOwner.current++;},[session.userId,session.tenantId,session.locale,props.id]);
 const actionBusy=action!==null;
 const analyst=useAnalyst(session,props.id,props.onNavigate);
 useEffect(()=>{if(analyst.conversation?.pageContext)setContext(analyst.conversation.pageContext);},[analyst.conversation?.id]);
 async function dashboard(message:AnalystMessage) {
  const owner=actionOwner.current;setAction('dashboard');setActionError(false);
  try{const result=await answerDashboard(session,analyst.conversation!.id,message.id);if(owner===actionOwner.current)props.onDashboard(result.dashboard,result.execution);}catch{if(owner===actionOwner.current)setActionError(true);}finally{if(owner===actionOwner.current)setAction(null);}
 }
 async function details(message:AnalystMessage,panel:number,key:string|null) {
  const owner=actionOwner.current;setAction('details');setActionError(false);
  try{const result=await answerDetails(session,analyst.conversation!.id,message.id,panel,key);if(owner===actionOwner.current){setSelection(result.selection);setDrillLabels({...props.labels,...message.answer.panels[panel]?.result.metadata.dimensionLabels});}}catch{if(owner===actionOwner.current)setActionError(true);}finally{if(owner===actionOwner.current)setAction(null);}
 }
 const messages=analyst.conversation?.messages??[];
 return <section className="ask-business" aria-labelledby="ask-business-title"><header className="analyst-heading"><div><div className="eyebrow eyebrow-light">{profile.labels[locale]}</div><h1 id="ask-business-title">{text.title}</h1><p>{text.intro}</p></div><button disabled={analyst.busy||actionBusy} onClick={()=>{setQuestion('');props.onNavigate();}}>{text.new}</button></header>
 <AnalystContext context={context} setContext={setContext} analyst={analyst} props={props}/>
 <form className="analyst-question" onSubmit={event=>{event.preventDefault();void analyst.send(question,context).then(sent=>{if(sent)setQuestion('');});}}><label htmlFor="business-question">{text.question}</label><textarea id="business-question" value={question} onChange={event=>setQuestion(event.target.value)} placeholder={text.placeholder} maxLength={2000} rows={2} disabled={analyst.busy||analyst.loading}/><div className="analyst-question-actions"><span>{text.retention}</span><button className="primary" disabled={!question.trim()||analyst.busy||analyst.loading||actionBusy}>{text.ask}<ArrowUpRight aria-hidden="true"/></button></div></form>
 {analyst.loading&&<p role="status">{text.loading}</p>}{analyst.busy&&<p role="status">{text.busy}</p>}{action&&<p role="status">{{dashboard:text.creating,details:text.loadingDetails}[action]}</p>}
 {(analyst.error||actionError)&&<p role="alert">{text.error} <button disabled={analyst.busy} onClick={()=>{setActionError(false);void analyst.reload();}}>{text.retry}</button></p>}
 {!messages.length&&!analyst.loading&&<div className="analyst-empty"><MessageCircle aria-hidden="true"/><h2>{text.empty}</h2><p>{text.hint}</p><div className="analyst-examples">{text.examples.map(example=><button key={example} onClick={()=>{setQuestion(example);document.getElementById('business-question')?.focus();}}>{example}</button>)}</div></div>}
 <div className="analyst-answers">{[...messages].reverse().map(message=><article key={message.id} className="analyst-answer"><header><h2>{message.question}</h2><time dateTime={message.createdAt}>{formatTimestamp(message.createdAt,locale,profile)}</time></header>
 {message.answer.failedAnalyses?<p className="partial-note">{text.failedAnalyses}</p>:null}
 {message.answer.status==='AMBIGUOUS'&&<><p>{text.clarify}</p><div className="analyst-examples">{message.answer.choices?.map(choice=><button key={choice} disabled={analyst.busy||message!==messages.at(-1)} onClick={()=>void analyst.send('',context,choice)}>{semanticCatalog[choice].labels[locale]}</button>)}</div></>}
 {analystStateLabel(message.answer.status,locale)&&<p>{analystStateLabel(message.answer.status,locale)}</p>}
 {message.answer.synthesisReferences?.length?<div className="analyst-highlights"><h3>{text.synthesis}</h3>{message.answer.synthesisReferences.map(reference=><p key={reference}>{message.answer.panels[reference]?.summary[locale]}</p>)}</div>:null}
 {message.answer.panels.map((panel,index)=><section className="analyst-panel" key={index}><h3>{semanticCatalog[panel.query.metric].labels[locale]}</h3><p className="analyst-period">{text.period}: {panel.query.dateRange?`${formatDate(panel.query.dateRange.from,locale,profile)} — ${formatDate(panel.query.dateRange.to,locale,profile)}`:'—'}</p>{panel.result.metadata.snapshotAsOf&&<p className="analyst-snapshot">{text.snapshot}: {formatDate(panel.result.metadata.snapshotAsOf,locale,profile)}</p>}<p className="analyst-direct">{panel.summary[locale]}</p>
 {panel.status==='PARTIAL_COVERAGE'&&<p className="partial-note">{text.partial}</p>}{panel.status==='DATA_NOT_READY'&&<p>{analystStateLabel(panel.status,locale)}</p>}
 <AnswerVisual panel={panel} locale={locale} profile={profile} {...(panel.result.rows.some(row=>analyticsResultDrillRequest(panel,row.key))?{onDetails:(key:string|null)=>{if(!actionBusy)void details(message,index,key);}}:{})}/>
 <AnswerEvidence panel={panel} locale={locale} profile={profile} labels={props.labels} demo={props.demo}/></section>)}
 {message.answer.intent&&<div className="analyst-answer-actions"><button disabled={message.answer.conversion!=='available'||!props.canCreate||actionBusy} onClick={()=>void dashboard(message)}>{text.dashboard}</button>{message.answer.conversion==='semantic_limit'&&<span>{text.conversion}</span>}</div>}
 </article>)}</div>
 {selection&&<DrillDetails selection={selection} session={session} profile={profile} filterLabels={drillLabels} onClose={()=>setSelection(null)}/>}
 </section>;
}

function AnalystContext({context,setContext,analyst,props}:{context:AnalyticsIntent['context'];setContext:(context:AnalyticsIntent['context'])=>void;analyst:ReturnType<typeof useAnalyst>;props:Props}) {
 const {profile,session}=props,locale=session.locale,text=analystCopy[locale];
 return <>
 <div className="analyst-context"><DatePeriodControl excludeAllTime filters={context} timeZone={profile.timeZone} locale={locale} disabled={analyst.busy} onChange={period=>setContext({...context.dimensions?{dimensions:context.dimensions}:{},...(period?.mode==='absolute'?{dateRange:period.range}:period?.mode==='relative'?{datePreset:period.preset}:{datePreset:'current_year' as const})})}/>
 {analyst.history.length>0&&<label>{text.history}<select value={props.id??''} disabled={analyst.busy} onChange={event=>props.onNavigate(event.target.value||undefined)}><option value="">{text.select}</option>{analyst.history.map(record=><option key={record.id} value={record.id}>{formatTimestamp(record.updatedAt,locale,profile)}</option>)}</select></label>}
 </div>
 </>;
}
