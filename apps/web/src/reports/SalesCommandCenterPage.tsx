import {governedDimensionLabel} from '@el-dabboos/domain';
import {useState} from 'react';
import type {SalesCommandInput,SalesCommandResult,SalesCommandWidgetResult} from '@el-dabboos/application';
import type {AnalyticsResult,DateRange,Locale,SemanticMetric,TenantProfile} from '@el-dabboos/domain';
import type {ApiSession} from '../api/client.ts';
import {DimensionFilterControl} from '../DimensionFilterControl.tsx';
import type {FilterOptions} from '../DimensionFilterControl.tsx';
import {WidgetCard} from '../Renderer.tsx';
import {DashboardSkeleton,Notice} from '../presentation/Feedback.tsx';
import {copy,formatDate,formatTimestamp} from '../i18n.ts';
import {salesCommandCopy,salesCommandReason} from './sales-command-copy.ts';
import {useSalesCommandCenter} from './useSalesCommandCenter.ts';
import type {WorkspaceController} from '../hooks/useWorkspace.ts';

interface Props {session:ApiSession;profile:TenantProfile;catalog:Record<string,SemanticMetric>;options:FilterOptions}
export function SalesCommandCenterView({workspace,active}:{workspace:WorkspaceController;active:boolean}){
 if(!active)return null;
 const text=salesCommandCopy[workspace.locale];
 if(workspace.loading)return <DashboardSkeleton label={text.loading}/>;
 if(workspace.error||!workspace.profile||!workspace.published)return <><Notice tone="danger">{text.error}</Notice><button type="button" onClick={()=>void workspace.loadWorkspace(workspace.userId,workspace.profile?.id)}>{text.refresh}</button></>;
 const {userId,profile,locale,catalog,filterOptions}=workspace;
 return <SalesCommandCenterPage key={`${userId}-${profile.id}`} session={{userId,tenantId:profile.id,locale}} profile={profile} catalog={catalog} options={filterOptions}/>;
}
export function SalesCommandCenterPage(props:Props){
 const {session,profile}=props,locale=session.locale,text=salesCommandCopy[locale];
 const report=useSalesCommandCenter(session);
 const [range,setRange]=useState<DateRange>(),[customer,setCustomer]=useState<string[]>([]),[salesperson,setSalesperson]=useState<string[]>([]);
 const selected=range??report.result?.metadata.selectedRange;
 const filters:SalesCommandInput['filters']=[...(customer.length?[{dimension:'customer' as const,values:customer}]:[]),...(salesperson.length?[{dimension:'salesperson' as const,values:salesperson}]:[])];
 const reset=()=>{setRange(undefined);setCustomer([]);setSalesperson([]);void report.reload({});};
 return <section className="sales-command-center" aria-labelledby="sales-command-title">
  <header><h1 id="sales-command-title">{text.title}</h1><p>{text.description}</p></header>
  <form className="dashboard-view-filters" onSubmit={event=>{event.preventDefault();void report.reload({...(selected?{dateRange:selected}:{}),filters});}}>
   <label>{text.from}<input type="date" required disabled={report.busy} value={selected?.from??''} max={selected?.to} onInput={event=>setRange({from:event.currentTarget.value,to:selected?.to??event.currentTarget.value})}/></label>
   <label>{text.to}<input type="date" required disabled={report.busy} value={selected?.to??''} min={selected?.from} onInput={event=>setRange({from:selected?.from??event.currentTarget.value,to:event.currentTarget.value})}/></label>
   <DimensionFilterControl dimension="customer" values={customer} options={props.options.customer??[]} locale={locale} disabled={report.busy} onChange={setCustomer}/>
   <DimensionFilterControl dimension="salesperson" values={salesperson} options={props.options.salesperson??[]} locale={locale} disabled={report.busy} onChange={setSalesperson}/>
   <button type="submit" disabled={report.busy}>{text.apply}</button><button type="button" disabled={report.busy} onClick={reset}>{text.reset}</button>
   <button type="button" disabled={report.busy} onClick={()=>void report.reload()}>{text.refresh}</button>
  </form>
  <details className="sales-command-help"><summary>{locale==='ar'?'الفترات والمرشحات والتحديث':'Periods, filters and refresh'}</summary><p>{text.scope}</p><p>{text.refreshNote}</p></details>
  {report.busy&&<DashboardSkeleton label={text.loading}/>}
  {report.failed&&<Notice tone="danger">{text.error}</Notice>}
  {report.result&&<><p role="status">{report.result.metadata.mode==='synthetic'?text.demo:text.certified} · {text.executed}: {formatTimestamp(report.result.metadata.executedAt,locale,profile)}</p><SalesCommandSections {...props} result={report.result}/></>}
 </section>;
}
export function SalesCommandSections({result,catalog,session,profile}:Props&{result:SalesCommandResult}){
 const locale=session.locale,text=salesCommandCopy[locale];
 return <>{result.sections.map(section=>{
  const available=section.widgets.filter(entry=>entry.execution),unavailable=section.widgets.filter(entry=>!entry.execution);
  return <section className="sales-command-section" key={section.id} aria-labelledby={`sales-section-${section.id}`}><h2 id={`sales-section-${section.id}`}>{section.title[locale]}</h2>
   <div className="sales-command-grid">{available.filter(entry=>entry.definition.widget?.type!=='table').map(entry=><SalesCommandReading key={entry.definition.id} {...{entry,catalog,locale,profile}}/>)}</div>
   {available.some(entry=>entry.definition.widget?.type==='table')&&<details className="sales-command-tables" open={section.id==='follow-up'||section.id==='customers'}><summary>{locale==='ar'?'الجداول والتفاصيل':'Tables and details'}</summary><div className="sales-command-grid">{available.filter(entry=>entry.definition.widget?.type==='table').map(entry=><SalesCommandReading key={entry.definition.id} {...{entry,catalog,locale,profile}}/>)}</div></details>}
   {!available.length&&<p>{text.empty}</p>}
   {unavailable.length>0&&<details className="sales-command-unavailable"><summary>{text.unavailable} ({unavailable.length})</summary><ul>{unavailable.map(entry=><li key={entry.definition.id}><strong>{entry.definition.title[locale]||catalog[entry.definition.widget?.series[0]?.metric??'']?.labels[locale]}</strong><p>{entry.issues.length?text.unsupported:salesCommandReason(entry.definition.reason,locale)}</p><SalesCommandPeriod {...{entry,locale,profile}}/>{entry.issues.length>0&&<details><summary>{text.details}</summary><ul>{entry.issues.map((issue,index)=><li key={`${issue}-${index}`}><bdi>{issue}</bdi></li>)}</ul></details>}</li>)}</ul></details>}
  </section>;
 })}</>;
}
function SalesCommandReading({entry,catalog,locale,profile}:{entry:SalesCommandWidgetResult;catalog:Record<string,SemanticMetric>;locale:Locale;profile:TenantProfile}){
 const execution=entry.execution!,widget=entry.definition.widget!,text=salesCommandCopy[locale];
 return <div className={`sales-command-reading sales-command-${widget.type}`}><SalesCommandPeriod {...{entry,locale,profile}}/>
  {entry.unsupportedFilters.length>0&&<Notice>{text.excluded}: {entry.unsupportedFilters.map(dimension=>copy[locale].dimensions[dimension]).join(' · ')}</Notice>}
  {entry.insight&&<p className="sales-command-insight"><strong>{entry.definition.insight==='top_customer_share'?(locale==='ar'?'الحصة المجمعة لأبرز عشرة عملاء':'Combined top-ten customer share'):(locale==='ar'?'حصة المحافظة الأولى':'Leading governorate share')}: {entry.insight.percentage===null?text.unknown:new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(entry.insight.percentage)+'%'}{entry.insight.label&&<> · {entry.insight.label}</>}</strong></p>}
  <WidgetCard widget={widget} entry={execution.widgetResults[widget.id]} catalog={catalog} locale={locale} profile={profile} exportMetadata={execution.metadata}/>
  {entry.definition.reason&&<p className="sales-command-basis">{salesCommandReason(entry.definition.reason,locale)}</p>}
  {entry.customerOwners&&<SalesCommandOwners entry={entry} locale={locale}/>}
  {entry.comparison&&<SalesCommandComparison entry={entry} locale={locale} profile={profile}/>}
  <SalesCommandProvenance {...{entry,locale,profile,catalog}}/>
 </div>;
}
function SalesCommandPeriod({entry,locale,profile}:{entry:SalesCommandWidgetResult;locale:Locale;profile:TenantProfile}){
 return <p className="sales-command-period">{salesCommandCopy[locale].period}: {formatDate(entry.period.from,locale,profile)} — {formatDate(entry.period.to,locale,profile)}</p>;
}
function SalesCommandProvenance({entry,locale,profile,catalog}:{entry:SalesCommandWidgetResult;locale:Locale;profile:TenantProfile;catalog:Record<string,SemanticMetric>}){
 const text=salesCommandCopy[locale],results=Object.values(entry.execution!.widgetResults).flatMap(widget=>Object.values(widget.seriesResults).flatMap(series=>series.status==='success'?[series.result]:[]));
 const olderSnapshot=results.some(result=>result.metadata.snapshotAsOf&&result.metadata.snapshotAsOf<entry.period.to);
 return <div className="sales-command-provenance">{olderSnapshot&&<Notice>{locale==='ar'?'تاريخ قطع الرصيد أقدم من اليوم المطلوب؛ أيام التأخر محسوبة عند القطع المعروض.':'Balance cutoff precedes the requested day; overdue days are measured at the displayed cutoff.'}</Notice>}{entry.disposition!=='usable_now'&&<Notice>{text.stale}</Notice>}{results.map(result=><p key={result.metric}>{results.length>1&&<>{catalog[result.metric]?.labels[locale]} · </>}{text.through}: {result.metadata.dataThrough?formatDate(result.metadata.dataThrough,locale,profile):text.unknown}<SalesCommandSnapshot {...{result,locale,profile}}/> · {text.source}: {result.metadata.sourceAsOf?formatTimestamp(result.metadata.sourceAsOf,locale,profile):text.unknown}{result.metadata.release?.financeReview==='pending'&&<> · <strong>{text.review}</strong></>}</p>)}</div>;
}
function SalesCommandSnapshot({result,locale,profile}:{result:AnalyticsResult;locale:Locale;profile:TenantProfile}){
 if(result.metadata.semantics!=='snapshot')return null;
 return <> · {locale==='ar'?'تاريخ قطع الرصيد':'Balance cutoff'}: {result.metadata.snapshotAsOf?formatDate(result.metadata.snapshotAsOf,locale,profile):salesCommandCopy[locale].unknown}</>;
}

function SalesCommandComparison({entry,locale,profile}:{entry:SalesCommandWidgetResult;locale:Locale;profile:TenantProfile}){
 const comparison=entry.comparison!,arabic=locale==='ar';
 const label=comparison.kind==='four_weekdays'?(arabic?'مقارنة بمتوسط أربعة أيام أسبوع مماثلة':'Versus mean of four previous same weekdays'):(arabic?'مقارنة بالأيام المنقضية نفسها من الشهر السابق':'Versus same elapsed days last month');
 return <div className="sales-command-comparison"><strong>{label}</strong><p>{comparison.complete&&comparison.baseline!==null?<>{arabic?'الأساس':'Baseline'}: {new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(comparison.baseline)} {profile.reportingCurrency} · {comparison.percentageChange===null?(arabic?'النسبة غير متاحة':'Percentage unavailable'):<>{new Intl.NumberFormat(locale,{maximumFractionDigits:1,signDisplay:'always'}).format(comparison.percentageChange)}%</>}</>:(arabic?'المقارنة غير متاحة: يلزم اكتمال بيانات جميع الفترات.':'Comparison unavailable: all operand periods require complete coverage.')}</p><details><summary>{arabic?'فترات المقارنة':'Comparison periods'}</summary><p>{salesCommandCopy[locale].source}: {comparison.sourceAsOf?formatTimestamp(comparison.sourceAsOf,locale,profile):salesCommandCopy[locale].unknown}</p><ul>{comparison.periods.map(period=><li key={period.from}>{formatDate(period.from,locale,profile)} — {formatDate(period.to,locale,profile)}</li>)}</ul></details></div>;
}

function SalesCommandOwners({entry,locale}:{entry:SalesCommandWidgetResult;locale:Locale}){
 const arabic=locale==='ar';
 return <section className="sales-command-owners"><h3>{arabic?'مسؤولو حسابات العملاء المعروضين':'Account owners of displayed customers'}</h3><p>{arabic?'مسؤول العميل الحالي، ثم مندوب بند الذمة عند غيابه. يظهر الإسناد المتعدد كاملاً.':'Current customer owner, then receivable-line salesperson when missing. Multiple assignments remain explicit.'}</p><dl>{entry.customerOwners!.map(customer=><div key={customer.customer}><dt>{governedDimensionLabel(customer.customer,customer.label,locale,'customer')}</dt><dd>{customer.complete?customer.owners.map(owner=>governedDimensionLabel(owner.id,owner.label,locale,'salesperson')).join(' · ')||salesCommandCopy[locale].unknown:salesCommandCopy[locale].unknown}</dd></div>)}</dl></section>;
}
