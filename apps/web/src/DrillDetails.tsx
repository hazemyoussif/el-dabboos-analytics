import { ExcelExportButton } from './export/ExcelExportButton.tsx';
import { rowWorkbook } from './export/row-workbook.ts';
import { DimensionDiscoveryContext } from './DimensionDiscoveryContext.ts';
import { useContext,useEffect,useRef,useState } from 'react';
import type { KeyboardEvent } from 'react';

import { governedDimensionLabel,semanticCatalog } from '@el-dabboos/domain';
import type { DrillPage,DrillRequest,Locale,TenantProfile } from '@el-dabboos/domain';
import type { ApiSession } from './api/client.ts';
import { ApiClientError,drillThrough } from './api/client.ts';
import { MetricInfo } from './metrics/MetricDefinition.tsx';
import { copy,formatDate,localeTag } from './i18n.ts';
const words={en:{details:'View details',close:'Close',loading:'Loading details…',empty:'No matching records.',error:'Details could not be loaded. Retry or refresh the parent report.',changed:'The trusted release changed. Close details and refresh the parent report.',next:'Load more',retry:'Retry',search:'Search customer name',sort:'Sort',direction:'Direction',asc:'Ascending',desc:'Descending',snapshotDate:'Snapshot date',date:'Date',amount:'Contribution',customer:'Customer',salesperson:'Salesperson',businessLine:'Business Line',documentType:'Document type',status:'Status',measure:'Supporting measure',currency:'Currency',trusted:'Trusted mart',loaded:'Loaded rows',asof:'As of',all:'All dates',grain:'Records contributing to the selected metric. Contributions total separately for each supporting measure.',finance:'Published customer balances by measure. Accounting-line and document details were not retained in this snapshot.',bases:'Supporting bases',apply:'Apply search',filters:'Applied filters'},ar:{details:'عرض التفاصيل',close:'إغلاق',loading:'جارٍ تحميل التفاصيل…',empty:'لا توجد سجلات مطابقة.',error:'تعذر تحميل التفاصيل. أعد المحاولة أو حدّث التقرير.',changed:'تغير إصدار البيانات المعتمد. أغلق التفاصيل وحدّث التقرير.',next:'تحميل المزيد',retry:'إعادة المحاولة',search:'البحث باسم العميل',sort:'الترتيب',direction:'الاتجاه',asc:'تصاعدي',desc:'تنازلي',snapshotDate:'تاريخ اللقطة',date:'التاريخ',amount:'المساهمة',customer:'العميل',salesperson:'مندوب المبيعات',businessLine:'خط الأعمال',documentType:'نوع المستند',status:'الحالة',measure:'المقياس الداعم',currency:'العملة',trusted:'مخزن البيانات المعتمد',loaded:'الصفوف المحملة',asof:'كما في',all:'كل التواريخ',grain:'السجلات الداعمة للمؤشر المحدد. تُجمع المساهمات لكل مقياس داعم بشكل منفصل.',finance:'أرصدة العملاء المنشورة لكل مقياس. لم تُحفظ تفاصيل المستندات والبنود المحاسبية في هذه اللقطة.',bases:'المقاييس الداعمة',apply:'تطبيق البحث',filters:'الفلاتر المطبقة'}};
export const drillActionLabel=(locale:Locale)=>words[locale].details;
interface Props {opener?:Element|null;selection:DrillRequest;session:ApiSession;profile:TenantProfile;onClose:()=>void;filterLabels:Record<string,string>}
export function DrillDetails(props:Props) {
  const {selection,session,profile,onClose}=props,locale=session.locale,text=words[locale];
  const ref=useRef<HTMLDialogElement>(null),owner=useRef(0);
  const [page,setPage]=useState<DrillPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [query,setQuery]=useState(selection),[search,setSearch]=useState('');
  useEffect(()=>{
    const dialog=ref.current,opener=props.opener??document.activeElement;
    const markLabel=opener?.classList.contains('chart-drill-mark')?opener.getAttribute('aria-label'):null;
    dialog?.showModal();
    return ()=>{owner.current++;dialog?.close();requestAnimationFrame(()=>restoreDrillFocus(opener,markLabel));};
  },[]);
  async function load(request:DrillRequest,append=false) {
    const generation=++owner.current;setBusy(true);setError(null);
    try {const result=await drillThrough(session,request);if(generation!==owner.current)return;setPage(previous=>append&&previous?{...result,rows:[...previous.rows,...result.rows]}:result);}
    catch(failure){if(generation===owner.current)setError(failure instanceof ApiClientError&&failure.code==='DRILL_RELEASE_CHANGED'?text.changed:text.error);}
    finally {if(generation===owner.current)setBusy(false);}
  }
  useEffect(()=>{setPage(null);void load(query);return ()=>{owner.current++;};},[query,session.tenantId,session.userId,session.locale]);
  const metric=semanticCatalog[selection.query.metric];
  return <dialog ref={ref} className="drill-dialog" dir={locale==='ar'?'rtl':'ltr'} aria-label={text.details} onKeyDown={containDrillFocus} onCancel={event=>{event.preventDefault();onClose();}}>
    <header><h2>{metric.labels[locale]}<MetricInfo metric={metric} locale={locale} currency={profile.reportingCurrency}/></h2><button autoFocus onClick={onClose}>{text.close}</button></header>
    <p>{selection.query.dateRange?`${formatDate(selection.query.dateRange.from,locale,profile)} — ${formatDate(selection.query.dateRange.to,locale,profile)}`:text.all}</p>
    <DrillFilters selection={selection} locale={locale} labels={props.filterLabels}/>
    {page&&<DetailSummary page={page} selection={selection} locale={locale} profile={profile}/>}
    <form className="drill-controls" onSubmit={event=>{event.preventDefault();setQuery({...selection,sort:query.sort??{field:'date',direction:'desc'},search});}}><div className="drill-search-row"><label>{text.search}<input maxLength={100} value={search} onChange={event=>setSearch(event.target.value)}/></label><button disabled={busy}>{text.apply}</button></div><label>{text.sort}<select aria-label={text.sort} value={query.sort?.field??'date'} onChange={event=>setQuery({...selection,search:query.search??'',sort:{field:event.target.value as 'date'|'amount'|'customer'|'salesperson',direction:query.sort?.direction??'desc'}})}>{(['date','amount','customer','salesperson'] as const).map(field=><option key={field} value={field}>{text[field]}</option>)}</select></label><label>{text.direction}<select aria-label={text.direction} value={query.sort?.direction??'desc'} onChange={event=>setQuery({...selection,search:query.search??'',sort:{field:query.sort?.field??'date',direction:event.target.value as 'asc'|'desc'}})}><option value="asc">{text.asc}</option><option value="desc">{text.desc}</option></select></label></form>
    {busy&&<p role="status">{text.loading}</p>}{error&&<p role="alert">{error} <button disabled={busy} onClick={()=>void load(query)}>{text.retry}</button></p>}
    {page&&<DetailTable page={page} locale={locale} profile={profile}/>}
    {page?.hasMore&&<button disabled={busy} onClick={()=>void load({...query,cursor:page.nextCursor!},true)}>{text.next}</button>}
  </dialog>;
}
function restoreDrillFocus(opener:Element|null,markLabel:string|null) {
 const target=opener?.isConnected?opener:markLabel?Array.from(document.querySelectorAll('.chart-drill-mark')).find(mark=>mark.getAttribute('aria-label')===markLabel):null;
 if(target instanceof HTMLElement||target instanceof SVGElement)target.focus();
}
export function DetailTable({page,locale,profile}:{page:DrillPage;locale:Locale;profile:TenantProfile}) {
  const text=words[locale];
  if(!page.rows.length)return <p>{text.empty}</p>;
  const columns=page.grain==='customer_snapshot'?['date','customer','measure','amount','currency'] as const:['date','customer','salesperson','businessLine','documentType','status','measure','amount','currency'] as const;
  const workbook=()=>rowWorkbook(text.details, [[text.loaded,page.rows.length],['Release',page.release],...(page.snapshotAsOf?[[text.asof,page.snapshotAsOf]]:[]),columns.map(column=>column==='date'&&page.grain==='customer_snapshot'?text.snapshotDate:text[column]),...page.rows.map(row=>columns.map(column=>column==='measure'?semanticCatalog[row.measure as keyof typeof semanticCatalog]?.labels[locale]??row.measure:row[column]))],locale);
  return <div className="table-wrap" tabIndex={0} role="region" aria-label={locale==='ar'?'تفاصيل السجلات':'Record details'}><ExcelExportButton locale={locale} kind="table" createWorkbook={workbook}/><p className="muted">{locale==='ar'?'يُصدّر الصفوف المحملة. استخدم تحميل المزيد لإضافة صفوف.':'Exports loaded rows. Use Load more to include additional rows.'}</p><table><thead><tr>{columns.map(column=><th key={column}>{column==='date'&&page.grain==='customer_snapshot'?text.snapshotDate:text[column]}</th>)}</tr></thead><tbody>{page.rows.map((row,index)=><tr key={index}>{columns.map(column=><td key={column}>{column==='date'?formatDate(row.date,locale,profile):column==='amount'?<bdi>{new Intl.NumberFormat(localeTag(locale,profile),{maximumFractionDigits:6}).format(Number(row.amount))}</bdi>:column==='measure'?semanticCatalog[row.measure as keyof typeof semanticCatalog]?.labels[locale]??text.measure:recordLabel(row[column],column,locale)}</td>)}</tr>)}</tbody></table></div>;
}

function DetailSummary({page,selection,locale,profile}:{page:DrillPage;selection:DrillRequest;locale:Locale;profile:TenantProfile}) {
 const text=words[locale],metric=semanticCatalog[selection.query.metric];
 const number=(value:string)=>new Intl.NumberFormat(localeTag(locale,profile),{maximumFractionDigits:6}).format(Number(value));
 return <><p>{text.trusted}{page.snapshotAsOf?` · ${text.asof} ${formatDate(page.snapshotAsOf,locale,profile)}`:''} · {page.value===null?'—':number(page.value)} {metric.type==='currency'?profile.reportingCurrency:metric.presentation.unit??''} · {text.loaded}: {page.rows.length}</p><p>{page.grain==='customer_snapshot'?text.finance:text.grain}</p><details><summary>{text.bases}</summary>{Object.entries(page.bases).map(([measure,value])=><p key={measure}>{semanticCatalog[measure as keyof typeof semanticCatalog]?.labels[locale]??text.measure}: <bdi>{number(value)}</bdi></p>)}</details></>;
}

function DrillFilters({selection,locale,labels}:{selection:DrillRequest;locale:Locale;labels:Record<string,string>}) {
 const load=useContext(DimensionDiscoveryContext),[hydrated,setHydrated]=useState<Record<string,string>>({});
 useEffect(()=>{
  let current=true;
  const filters=[...(selection.query.filters??[]),...(selection.clicked?[selection.clicked]:[])];
  if(load)void Promise.all(filters.map(filter=>load(filter.dimension,{limit:1,selectedIds:filter.values,metric:selection.query.metric,...(selection.query.dateRange?{asOf:selection.query.dateRange.to}:{})}).then(page=>Object.fromEntries(page.selected.map(option=>[option.id,option.label??'']))))).then(pages=>{if(current)setHydrated(Object.assign({},...pages));}).catch(()=>{});
  return ()=>{current=false;};
 },[load,selection]);
 return <p>{words[locale].filters}: {[...(selection.query.filters??[]),...(selection.clicked?[selection.clicked]:[])].map(filter=>`${copy[locale].dimensions[filter.dimension]}: ${filter.values.map(value=>governedDimensionLabel(value,hydrated[value]??labels[value],locale,filter.dimension)).join('، ')}`).join(' · ')||'—'}</p>;
}

function containDrillFocus(event:KeyboardEvent<HTMLDialogElement>) {
 if(event.key!=='Tab'||document.activeElement?.closest('dialog')!==event.currentTarget)return;
 const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(control=>control.getClientRects().length>0);
 const first=controls[0],last=controls.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
}

function recordLabel(value:string|null,column:string,locale:Locale) {
 if(column!=='status'&&column!=='documentType')return value??'—';
 const labels:Record<string,{en:string;ar:string}>={order:{en:'Order',ar:'طلب'},out_invoice:{en:'Invoice',ar:'فاتورة'},customer_invoice:{en:'Invoice',ar:'فاتورة'},out_refund:{en:'Refund',ar:'إشعار دائن'},sale:{en:'Confirmed',ar:'مؤكد'},done:{en:'Completed',ar:'مكتمل'},posted:{en:'Posted',ar:'مرحّل'},draft:{en:'Draft',ar:'مسودة'},cancel:{en:'Cancelled',ar:'ملغى'}};
 return value===null?'—':labels[value]?.[locale]??value;
}
