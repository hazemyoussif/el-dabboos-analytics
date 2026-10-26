import {useState} from 'react';
import type {AnalyticsFilter,CustomerProductCoverageInput,CustomerProductCoverageResult,Locale} from '@el-dabboos/domain';
import type {ApiSession} from '../api/client.ts';
import {DimensionFilterControl} from '../DimensionFilterControl.tsx';
import type {FilterOptions} from '../DimensionFilterControl.tsx';
import {Notice,DashboardSkeleton} from '../presentation/Feedback.tsx';
import {useCustomerProductCoverage} from './useCustomerProductCoverage.ts';
import {SourceObservation} from '../rendering/SourceObservation.tsx';
const coverageCopy={
 en:{title:'Customer product coverage',basis:'Eligible products have forecasted stock > 0 across company warehouses, excluding display stands. Sold means signed net quantity > 0 per customer in the calendar year. Never purchased, fully returned and negative net quantities are unsold. Current customer owner, governorate and actual tags apply here.',year:'Calendar year',status:'Product status',all:'All',sold:'Sold',unsold:'Unsold',apply:'Apply coverage filters',reset:'Reset coverage',refresh:'Refresh coverage',next:'Next page',first:'First page',loading:'Loading customer product coverage…',error:'Coverage could not be read for this selection. Retry, or check that complete coverage is published for your access scope.',empty:'No customer/product pairs match this selection.',customer:'Customer',owner:'Current salesperson',state:'Current governorate',tags:'Actual tags',product:'Product',unit:'Base unit',forecast:'Forecast quantity',quantity:'Signed net quantity',through:'Source business day',excluded:'Purchased products outside the eligible list',total:'Matching customer/product pairs'},
 ar:{title:'تغطية منتجات العملاء',basis:'المنتجات المؤهلة لها مخزون متوقع > ٠ بجميع مخازن الشركة، باستثناء العارضات والاستاندات. مباع يعني صافي كمية موقعة > ٠ لكل عميل خلال السنة التقويمية. غير المشترى والمرتجع بالكامل والصافي السالب غير مباع. تطبق هنا بيانات المندوب والمحافظة الحالية وتاجات العميل الفعلية.',year:'السنة التقويمية',status:'حالة المنتج',all:'الكل',sold:'مباع',unsold:'غير مباع',apply:'تطبيق مرشحات التغطية',reset:'إعادة ضبط التغطية',refresh:'تحديث التغطية',next:'الصفحة التالية',first:'الصفحة الأولى',loading:'جارٍ تحميل تغطية منتجات العملاء…',error:'تعذرت قراءة التغطية لهذا الاختيار. أعد المحاولة أو تحقق من نشر التغطية المكتملة ضمن صلاحياتك.',empty:'لا توجد أزواج عميل ومنتج تطابق هذا الاختيار.',customer:'العميل',owner:'المندوب الحالي',state:'المحافظة الحالية',tags:'التاجات الفعلية',product:'المنتج',unit:'الوحدة الأساسية',forecast:'الكمية المتوقعة',quantity:'صافي الكمية الموقعة',through:'يوم عمل المصدر',excluded:'المنتجات المشتراة خارج القائمة المؤهلة',total:'أزواج العميل والمنتج المطابقة'},
};
export function CustomerProductCoverage({session,options,productFilters}:{session:ApiSession;options:FilterOptions;productFilters:AnalyticsFilter[]}){
 const locale=session.locale,text=coverageCopy[locale],report=useCustomerProductCoverage(session);
 const [filters,setFilters]=useState<AnalyticsFilter[]>([]),[year,setYear]=useState<number>(),[status,setStatus]=useState<'all'|'sold'|'unsold'>('all');
 const [applied,setApplied]=useState<CustomerProductCoverageInput>({});
 const load=(input:CustomerProductCoverageInput)=>{setApplied(input);void report.reload(input);};
 const reset=()=>{setFilters([]);setYear(undefined);setStatus('all');load({filters:productFilters});};
 return <section className="products-report-section" aria-labelledby="customer-product-coverage-title">
  <h2 id="customer-product-coverage-title">{text.title}</h2><p>{text.basis}</p>
  <form onSubmit={event=>{event.preventDefault();load({year:year??report.result?.year,status,filters:[...productFilters,...filters]});}}>
   <fieldset disabled={report.busy}><legend>{text.title}</legend>
    <label>{text.year}<input type="number" min="1900" max="9999" step="1" value={year??report.result?.year??''} onChange={event=>setYear(event.target.value?Number(event.target.value):undefined)} list="coverage-years"/><datalist id="coverage-years">{report.result?.years.map(value=><option key={value} value={value}/>)}</datalist></label>
    <label>{text.status}<select aria-label={text.status} value={status} onChange={event=>setStatus(event.target.value as typeof status)}>{(['all','sold','unsold'] as const).map(value=><option key={value} value={value}>{text[value]}</option>)}</select></label>
    {(['customer','customer_salesperson','customer_state','customer_tag'] as const).map(dimension=><DimensionFilterControl key={dimension} dimension={dimension} locale={locale} metric={dimension==='customer_tag'?'coverage_tag_membership':'coverage_customer_population'} values={filters.find(filter=>filter.dimension===dimension)?.values??[]} options={options[dimension]??[]} onChange={values=>setFilters([...filters.filter(filter=>filter.dimension!==dimension),...(values.length?[{dimension,values}]:[])])}/>)}
   </fieldset>
   <div className="products-report-actions"><button disabled={report.busy} type="submit">{text.apply}</button><button disabled={report.busy} type="button" onClick={reset}>{text.reset}</button><button disabled={report.busy} type="button" onClick={()=>void report.reload(applied)}>{text.refresh}</button></div>
  </form>
  {report.busy&&<DashboardSkeleton label={text.loading}/>}{report.failed&&<Notice tone="danger">{text.error}</Notice>}
  {report.result&&<><CoverageRows result={report.result} locale={locale}/><div className="products-report-actions"><button type="button" disabled={report.busy} onClick={()=>void report.reload(applied)}>{text.first}</button><button type="button" disabled={report.busy||!report.result.nextCursor} onClick={()=>void report.reload({...applied,cursor:report.result!.nextCursor})}>{text.next}</button></div></>}
 </section>;
}
export function CoverageRows({result,locale}:{result:CustomerProductCoverageResult;locale:Locale}){
 const text=coverageCopy[locale],number=new Intl.NumberFormat(locale==='ar'?'ar-IQ':'en-IQ',{maximumFractionDigits:6});
 return <><SourceObservation metadata={result} locale={locale}/><p role="status">{text.total}: {number.format(result.total)} · {text.sold}: {number.format(result.sold)} · {text.unsold}: {number.format(result.unsold)} · {text.year}: {result.year} · {text.through}: {result.through}</p><p>{text.excluded}: {number.format(result.excludedProducts)}</p>
  {!result.rows.length?<Notice>{text.empty}</Notice>:<div className="coverage-table-scroll" role="region" aria-label={text.title} tabIndex={0}><table><caption>{text.title} — {result.year}</caption><thead><tr>{(['customer','owner','state','tags','product','unit','forecast','quantity','status'] as const).map(column=><th key={column} scope="col">{text[column]}</th>)}</tr></thead><tbody>{result.rows.map(row=><tr key={`${row.customer.id}:${row.product.id}`}><td>{row.customer.label}</td><td>{row.salesperson.label}</td><td>{row.state.label}</td><td>{row.tags.map(tag=>tag.label).join(locale==='ar'?'، ':', ')||'—'}</td><td>{row.product.label}</td><td>{row.uom.label}</td><td className="numeric">{number.format(Number(row.forecast))}</td><td className="numeric">{number.format(Number(row.netQuantity))}</td><td>{text[row.status]}</td></tr>)}</tbody></table></div>}
 </>;
}
