import type { AnalyticsOperationalStatus,AnalyticsOperationResult,AnalyticsResult,DashboardSpec,Locale,TenantProfile } from '@el-dabboos/domain';
import type { ReactNode } from 'react';
import { formatDate,formatTimestamp } from '../i18n.ts';
import { operationsCopy } from './operations-copy.ts';
import { freshnessState,reconciliationWarning,lastSyncAttemptAt } from './operations-state.ts';
import type { OperationsController } from './useAnalyticsOperations.ts';
interface Props {operations:OperationsController;locale:Locale;profile:TenantProfile;snapshotAsOf?:string|undefined}
export function OperationalTrust(props:Props) {
 const {operations,locale}=props,text=operationsCopy[locale],status=operations.status;
 if(!operations.eligible)return null;
 return <details className="operational-trust"><summary>{status?.trustedServingRevision?text.trusted:operations.loading?text.loading:text.unavailable}{status&&<> · {operations.error?text.unavailable:reconciliationWarning(status)?text.warning:text[freshnessState(status)]}</>}{status?.lastSuccessfulSync && <small>{text.sync} · {new Intl.RelativeTimeFormat(locale,{numeric:'auto'}).format(-Math.max(0,Math.floor((Date.now()-Date.parse(status.lastSuccessfulSync.completedAt))/60000)),'minute')}</small>}</summary><OperationalDetails {...props}/></details>;
}
export function OperationalStatusPage(props:Omit<Props,'profile'>&{profile:TenantProfile|null}) {
 if(!props.profile)return null;
 return <section className="management-info" dir={props.locale==='ar'?'rtl':'ltr'}><h2>{operationsCopy[props.locale].title}</h2><OperationalActions {...props} profile={props.profile}/><OperationalDetails {...props} profile={props.profile}/></section>;
}
export function OperationalActions({operations,locale}:Props) {
 const text=operationsCopy[locale];
 if(!operations.eligible)return null;
 return <div className="operational-actions"><div className="operational-buttons"><button disabled={!!operations.busy||operations.canRefresh===false} onClick={()=>void operations.act('refresh')}>{text.refresh}</button>{operations.canOperate&&<><button disabled={!!operations.busy||!operations.status?.commandsAvailable} onClick={()=>void operations.act('sync')}>{text.syncNow}</button><label>{text.reconcileNow}<select aria-label={text.reconcileNow} disabled={!!operations.busy||!operations.status?.commandsAvailable} value="" onChange={event=>{if(event.target.value)void operations.act(event.target.value as 'affected'|'daily');}}><option value="">—</option><option value="affected">{text.affectedNow}</option><option value="daily">{text.dailyNow}</option></select></label></>}</div>{operations.canOperate&&operations.status&&!operations.status.commandsAvailable&&<p>{operations.status.commandsConfigured?text.sourceUnavailable:text.notConfigured}</p>}
 <OperationFeedback operations={operations} locale={locale}/></div>;
}
function OperationFeedback({operations,locale}:Pick<Props,'operations'|'locale'>) {
 const text=operationsCopy[locale];
 return <div role="status" aria-live="polite">{operations.busy&&<p>{operations.busy==='sync'?text.syncing:operations.busy==='refresh'?text.running:text.validating} — {text.waiting}</p>}{operations.refreshComplete&&<p>{text.viewRefreshed}</p>}{operations.failed&&<p>{text.failed}</p>}{operations.result&&<OperationResult result={operations.result} locale={locale}/>}</div>;
}
function OperationResult({result,locale}:{result:AnalyticsOperationResult;locale:Locale}) {
 const text=operationsCopy[locale];
 return <><p>{result.run.status==='unchanged'?text.unchanged:result.run.status==='failed'?text.previous:text.complete}</p><StatusGroup title={text.run} rows={[[text.changed,result.run.recordsChanged],[text.canonical,result.canonicalRevisions],[text.partitions,result.run.partitionsAffected],[text.reconciliation,result.run.status==='unchanged'?'—':result.run.status==='passed'?text.pass:text.fail],[text.updated,result.servingUpdated?text.yes:text.no],[text.run,<bdi>{result.run.runId}</bdi>]]}/></>;
}

function OperationalDetails({operations,locale,profile,snapshotAsOf}:Props) {
 const text=operationsCopy[locale],status=operations.status;
 if(!status)return <div role="status"><p>{operations.loading?text.loading:text.unavailable}</p>{operations.error&&<button onClick={()=>void operations.reload()}>{text.retry}</button>}</div>;
 const timestamp=(value:string|null|undefined)=>value?formatTimestamp(value,locale,profile):'—';
 return <div className="operational-details">{operations.error&&<p role="alert">{text.unavailable} <button onClick={()=>void operations.reload()}>{text.retry}</button></p>}{reconciliationWarning(status)&&operations.result?.run.status!=='failed'&&<p role="status">{text.previous}</p>}
 <SourceConnectionStatus status={status} locale={locale} profile={profile}/>
 <HealthStatus status={status} locale={locale} profile={profile} snapshotAsOf={snapshotAsOf}/>
 <p>{text.closed}</p>
 <SynchronizationStatus status={status} locale={locale} profile={profile} snapshotAsOf={snapshotAsOf}/>
 <StatusGroup title={text.reconciliation} rows={reconciliationRows(status,locale,timestamp)}/>
 <ServingStatus status={status} locale={locale} profile={profile} snapshotAsOf={snapshotAsOf}/>
 <CertificationStatus status={status} locale={locale} profile={profile} snapshotAsOf={snapshotAsOf}/>
 <FinanceStatus status={status} locale={locale} profile={profile} snapshotAsOf={snapshotAsOf}/>
 </div>;
}
function StatusGroup({title,rows}:{title:string;rows:[string,ReactNode][]}) {return <section><h3>{title}</h3><dl>{rows.map(([label,value])=><div className="operational-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>;}
function reconciliationRows(status:AnalyticsOperationalStatus,locale:Locale,timestamp:(value:string|undefined)=>string):[string,ReactNode][] {
 const text=operationsCopy[locale];
 return (['affected','daily'] as const).flatMap(kind=>{
  const run=status.latest.find(item=>item.kind===kind);
  return [[text[kind],run?`${timestamp(run.completedAt)} · ${run.status==='passed'?text.pass:text.fail}`:'—'],[`${text.mismatches} · ${text[kind]}`,run?.mismatchCount??'—']] as [string,ReactNode][];
 });
}

interface StatusProps {status:AnalyticsOperationalStatus;locale:Locale;profile:TenantProfile;snapshotAsOf?:string|undefined}

function SourceConnectionStatus({status,locale,profile}:StatusProps){
 const source=status.sourceAvailability,text=operationsCopy[locale];
 if(!source)return null;
 const timestamp=(value:string|null)=>value?formatTimestamp(value,locale,profile):'—';
 return <StatusGroup title={text.source} rows={[[text.relay,source.relayAvailable?text.connected:text.disconnected],[text.source,source.sourceAvailable?text.connected:text.disconnected],[text.lastConnection,timestamp(source.lastSuccessfulConnection)],[text.checked,timestamp(source.checkedAt)]]}/>;
}

function HealthStatus({status,locale,profile}:StatusProps) {
 const text=operationsCopy[locale];
 const timestamp=(value:string|null|undefined)=>value?formatTimestamp(value,locale,profile):'—';
 const date=(value:string|null|undefined)=>value?formatDate(value,locale,profile):'—';
 return <StatusGroup title={text.health} rows={[[text.serving,status.trustedServingRevision?text.trusted:text.unknown],[text.freshness,text[freshnessState(status)]],[text.age,status.freshnessAgeSeconds==null?'—':`${Math.floor(status.freshnessAgeSeconds/60)} ${text.minutes}`],[text.target,`${status.freshnessTargetSeconds/60} ${text.minutes}`],[text.cutoff,timestamp(status.cursor?.cutoff)],[text.coverage,status.historicalCoverage?`${date(status.historicalCoverage.from)} — ${date(status.historicalCoverage.to)}`:'—']]}/>;
}

function SynchronizationStatus({status,locale,profile}:StatusProps) {
 const text=operationsCopy[locale];
 const timestamp=(value:string|null|undefined)=>value?formatTimestamp(value,locale,profile):'—';
 return <StatusGroup title={text.synchronization} rows={[[text.sync,timestamp(status.lastSuccessfulSync?.completedAt)],[text.attempt,timestamp(lastSyncAttemptAt(status))],[text.changed,status.latest.find(run=>run.kind==='sync')?.recordsChanged??'—'],[text.cursor,timestamp(status.cursor?.cutoff)]]}/>;
}

function ServingStatus({status,locale}:StatusProps) {
 const text=operationsCopy[locale];
 return <StatusGroup title={text.serving} rows={[[text.revision,<bdi>{status.trustedServingRevision??'—'}</bdi>],[text.aggregates,status.eventAggregates?.from?`${formatMonth(status.eventAggregates.from,locale)} — ${formatMonth(status.eventAggregates.throughMonth,locale)}`:'—'],[text.dailyCoverage,status.eventAggregates?.dailyPartitions??'—'],[text.monthlyCoverage,status.eventAggregates?.monthlyPartitions??'—']]}/>;
}

function CertificationStatus({status,locale}:StatusProps) {
 const text=operationsCopy[locale];
 return <StatusGroup title={text.certification} rows={[[text.certification,status.trustedCertificationRelease?text.trusted:text.unknown],[text.definition,<bdi>{status.definitionVersion??'—'}</bdi>],[text.mapping,<bdi>{status.mappingVersion??'—'}</bdi>]]}/>;
}

function FinanceStatus({status,locale,profile,snapshotAsOf}:StatusProps) {
 const text=operationsCopy[locale];
 const date=(value:string|null|undefined)=>value?formatDate(value,locale,profile):'—';
 return <StatusGroup title={text.finance} rows={[[text.snapshot,date(snapshotAsOf??status.financeSnapshots?.at(-1))],[text.snapshots,status.financeSnapshots?.map(date).join(locale==='ar'?'، ':', ')||'—']]}/>;
}

export function ReportOperationalSurface({profile,metadata,kind,dashboard,editing=false,...props}:Omit<Props,'profile'>&{profile:TenantProfile|null;metadata:AnalyticsResult['metadata']|null;kind:'trust'|'actions';dashboard?:DashboardSpec|null;editing?:boolean}) {
 if(!profile)return null;
 if(kind==='actions'&&(!dashboard||editing))return null;
 if(kind==='trust')return <OperationalTrust {...props} profile={profile} snapshotAsOf={metadata?.snapshotAsOf}/>;
 return <><OperationalActions {...props} profile={profile}/>{metadata?.snapshotAsOf&&<p>{operationsCopy[props.locale].asOf} {formatDate(metadata.snapshotAsOf,props.locale,profile)}</p>}</>;
}

function formatMonth(value:string|null|undefined,locale:Locale) {return value?new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',timeZone:'UTC'}).format(new Date(value)):'—';}
