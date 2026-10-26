import {semanticCatalog} from '@el-dabboos/domain';
import {useState} from 'react';
import type {ProductReportResult,ProductsWarehousesInput,ProductsWarehousesResult} from '@el-dabboos/application';
import type {AnalyticsFilter,DateRange,Locale,SemanticMetric,TenantProfile} from '@el-dabboos/domain';
import type {ApiSession} from '../api/client.ts';
import {DimensionFilterControl} from '../DimensionFilterControl.tsx';
import type {FilterOptions} from '../DimensionFilterControl.tsx';
import {DashboardRenderer} from '../Renderer.tsx';
import {DashboardSkeleton,Notice} from '../presentation/Feedback.tsx';
import {formatDate,formatTimestamp} from '../i18n.ts';
import type {WorkspaceController} from '../hooks/useWorkspace.ts';
import {productReportIssue,productsWarehousesCopy} from './products-warehouses-copy.ts';
import {useProductsWarehouses} from './useProductsWarehouses.ts';
import {CustomerProductCoverage} from './CustomerProductCoverage.tsx';

interface Props {session:ApiSession;profile:TenantProfile;catalog:Record<string,SemanticMetric>;options:FilterOptions}
export function ProductsWarehousesView({workspace,active}:{workspace:WorkspaceController;active:boolean}){
 if(!active)return null;
 const text=productsWarehousesCopy[workspace.locale];
 if(workspace.loading)return <DashboardSkeleton label={text.loading}/>;
 if(workspace.error||!workspace.profile||!workspace.published)return <><Notice tone="danger">{text.error}</Notice><button type="button" onClick={()=>void workspace.loadWorkspace(workspace.userId,workspace.profile?.id)}>{text.refresh}</button></>;
 const {userId,profile,locale,catalog,filterOptions}=workspace;
 return <ProductsWarehousesPage key={`${userId}-${profile.id}`} session={{userId,tenantId:profile.id,locale}} profile={profile} catalog={catalog} options={filterOptions}/>;
}
export function ProductsWarehousesPage(props:Props){
 const {session}=props,locale=session.locale,text=productsWarehousesCopy[locale],report=useProductsWarehouses(session);
 const [range,setRange]=useState<DateRange>(),[productFilters,setProductFilters]=useState<AnalyticsFilter[]>([]),[salesFilters,setSalesFilters]=useState<AnalyticsFilter[]>([]),[warehouse,setWarehouse]=useState<string[]>([]);
 const selected=range??report.result?.metadata.selectedRange;
 const input:ProductsWarehousesInput={...(selected?{dateRange:selected}:{}),productFilters,salesFilters,...(warehouse[0]?{warehouse:warehouse[0]}:{})};
 const reset=()=>{setRange(undefined);setProductFilters([]);setSalesFilters([]);setWarehouse([]);void report.reload({});};
 return <section className="products-warehouses" aria-labelledby="products-warehouses-title">
  <header><h1 id="products-warehouses-title">{text.title}</h1><p>{text.description}</p></header>
  <form onSubmit={event=>{event.preventDefault();void report.reload(input);}} aria-busy={report.busy}>
   <fieldset disabled={report.busy}><legend>{text.products}</legend><ProductFilterFields dimensions={['product_category','brand','product']} filters={productFilters} onChange={setProductFilters} {...props}/></fieldset>
   <fieldset disabled={report.busy}><legend>{text.warehouse}</legend><DimensionFilterControl dimension="warehouse" values={warehouse} options={props.options.warehouse??[]} locale={locale} onChange={setWarehouse}/></fieldset>
   <fieldset disabled={report.busy}><legend>{text.salesFilters}</legend>
    <label>{text.from}<input type="date" required value={selected?.from??''} max={selected?.to} onChange={event=>setRange({from:event.target.value,to:selected?.to??event.target.value})}/></label>
    <label>{text.to}<input type="date" required value={selected?.to??''} min={selected?.from} onChange={event=>setRange({from:selected?.from??event.target.value,to:event.target.value})}/></label>
    <ProductFilterFields dimensions={['customer','salesperson','state']} filters={salesFilters} onChange={setSalesFilters} {...props}/><p>{text.salesScope}</p>
   </fieldset>
   <div className="products-report-actions"><button type="submit" disabled={report.busy||!selected}>{text.apply}</button><button type="button" disabled={report.busy} onClick={reset}>{text.reset}</button><button type="button" disabled={report.busy} onClick={()=>void report.reload()}>{text.refresh}</button></div>
  </form>
  <details className="products-report-scope"><summary>{locale==='ar'?'نطاق المرشحات والتحديث':'Filter scope and refresh'}</summary><p>{text.scope}</p><p>{text.refreshNote}</p></details>
  {report.busy&&<DashboardSkeleton label={text.loading}/>}{report.failed&&<Notice tone="danger">{text.error}</Notice>}
  {report.result&&<ProductsWarehousesSections {...props} result={report.result}/>}
  <CustomerProductCoverage session={session} options={props.options} productFilters={productFilters}/>
 </section>;
}
function ProductFilterFields({dimensions,filters,onChange,...props}:Props&{dimensions:AnalyticsFilter['dimension'][];filters:AnalyticsFilter[];onChange:(filters:AnalyticsFilter[])=>void}){
 return <>{dimensions.map(dimension=><DimensionFilterControl key={dimension} dimension={dimension} values={filters.find(filter=>filter.dimension===dimension)?.values??[]} options={props.options[dimension]??[]} locale={props.session.locale} onChange={values=>onChange([...filters.filter(filter=>filter.dimension!==dimension),...(values.length?[{dimension,values}]:[])])}/>)}</>;
}
export function ProductsWarehousesSections({result,...props}:Props&{result:ProductsWarehousesResult}){
 const locale=props.session.locale,text=productsWarehousesCopy[locale];
 return <><p role="status">{result.metadata.mode==='synthetic'?text.demo:text.certified} · {text.executed}: {formatTimestamp(result.metadata.executedAt,locale,props.profile)}</p>{(['inventory','sales'] as const).map(section=><section className="products-report-section" key={section} aria-labelledby={`products-${section}`}><h2 id={`products-${section}`}>{text[section]}</h2>{section==='inventory'&&<p>{text.stockBasis}</p>}{result.readings.filter(entry=>entry.section===section).map(entry=><ProductReportReading key={entry.widget.id} {...props} entry={entry}/>)}</section>)}</>;
}
function ProductReportReading({entry,...props}:Props&{entry:ProductReportResult}){
 const locale=props.session.locale,text=productsWarehousesCopy[locale];
 return <div className="products-report-reading"><p>{text.requested}: {formatDate(entry.period.from,locale,props.profile)} — {formatDate(entry.period.to,locale,props.profile)}</p>
  {entry.execution?<><DashboardRenderer execution={entry.execution} dashboardOverride={entry.dashboard} catalog={{...semanticCatalog,...props.catalog}} locale={locale} profile={props.profile} session={props.session}/><ProductReportProvenance entry={entry} locale={locale} profile={props.profile}/></>:<><h3>{entry.widget.title?.[locale]}</h3><Notice>{text.unavailable}</Notice><details><summary>{text.details}</summary><ul>{[...new Set(entry.issues.map(issue=>productReportIssue(issue,locale)))].map(reason=><li key={reason}>{reason}</li>)}</ul></details></>}
 </div>;
}
function ProductReportProvenance({entry,locale,profile}:{entry:ProductReportResult;locale:Locale;profile:TenantProfile}){
 const text=productsWarehousesCopy[locale],series=entry.execution?.widgetResults[entry.widget.id]?.seriesResults[entry.widget.series[0]!.id];
 if(series?.status!=='success')return null;
 const metadata=series.result.metadata,partial=!entry.complete;
 return <div className="products-report-provenance">{partial&&<Notice>{text.incomplete}</Notice>}{entry.section==='inventory'&&metadata.snapshotAsOf&&metadata.snapshotAsOf<entry.period.to&&<Notice>{text.olderStock}</Notice>}<p>{text.through}: {metadata.dataThrough?formatDate(metadata.dataThrough,locale,profile):text.unknown} · {text.source}: {metadata.sourceAsOf?formatTimestamp(metadata.sourceAsOf,locale,profile):text.unknown}{entry.section==='inventory'&&<> · {text.snapshot}: {metadata.snapshotAsOf?formatDate(metadata.snapshotAsOf,locale,profile):text.unknown}</>}{metadata.release?.financeReview==='pending'&&<> · {text.review}</>}</p></div>;
}
