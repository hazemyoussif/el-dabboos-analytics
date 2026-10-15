import {useContext,useEffect,useRef,useState} from 'react';
import {governedDimensionLabel} from '@el-dabboos/domain';
import type {DateRange,DimensionId,DimensionDiscoveryPage,Locale,MetricId} from '@el-dabboos/domain';
import {copy} from './i18n.ts';
import {DimensionDiscoveryContext} from './DimensionDiscoveryContext.ts';
/** Search opens on demand; saved selections hydrate without full population discovery. */
export function DimensionSearchControl({dimension,values,locale,disabled,onChange,metric,asOf,dateRange}:{dimension:DimensionId;dateRange?:DateRange;values:string[];locale:Locale;disabled?:boolean;onChange:(values:string[])=>void;metric?:MetricId;asOf?:string}){
 const load=useContext(DimensionDiscoveryContext),generation=useRef(0);
 const periodKey=JSON.stringify(dateRange);
 const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[options,setOptions]=useState<DimensionDiscoveryPage['values']>([]),[hydrated,setHydrated]=useState<DimensionDiscoveryPage['selected']>([]),[cursor,setCursor]=useState<string>(),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const selectionKey=JSON.stringify(values);
 const request=async(continuation?:string,selectedOnly=false)=>{
  if(!load)return;
  const current=++generation.current;setBusy(true);setFailed(false);
  try {
   const page=await load(dimension,{search: selectedOnly?'':search,...(continuation?{cursor:continuation}:{}),limit:selectedOnly?1:50,selectedIds:values,...(metric?{metric}:{}),...(dateRange?{dateRange}:asOf?{asOf}:{})});
   if(current!==generation.current)return;
   setHydrated(page.selected);
   if(!selectedOnly){setOptions(previous=>continuation?[...previous,...page.values]:page.values);setCursor(page.nextCursor);}
  }catch{if(current===generation.current)setFailed(true);}finally{if(current===generation.current)setBusy(false);}
 };
 useEffect(()=>{
  generation.current++;setOpen(false);setOptions([]);setCursor(undefined);setHydrated([]);setBusy(false);setFailed(false);
  if(values.length)void request(undefined,true);
  return()=>{generation.current++;};
 // Scope changes cancel pending responses and independently hydrate saved identities.
 },[load,selectionKey,dimension,metric,asOf,periodKey]);
 const labels=values.map(id=>governedDimensionLabel(id,hydrated.find(option=>option.id===id)?.label??options.find(option=>option.id===id)?.label,locale,dimension));
 const dimensionLabel=copy[locale].dimensions[dimension];
 const text=locale==='ar'?{customer:dimensionLabel,all:'الكل',search:`البحث في ${dimensionLabel}`,find:'بحث',more:'عرض المزيد',loading:'جارٍ البحث…',failed:'تعذر تحميل الخيارات. حاول مرة أخرى.'}:{customer:dimensionLabel,all:'All',search:`Search ${dimensionLabel.toLowerCase()}`,find:'Search',more:'Load more',loading:'Searching…',failed:'Choices could not be loaded. Try again.'};
 return <div className="customer-filter dimension-search"><button type="button" disabled={disabled||!load} aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)void request();}}>{text.customer}: {values.length?labels.join('، '):text.all}</button>
  {open&&<div><label>{text.search}<input type="search" value={search} disabled={busy} onInput={event=>{setSearch(event.currentTarget.value);setCursor(undefined);}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void request();}}}/></label><button type="button" disabled={busy} onClick={()=>void request()}>{text.find}</button>
   <label>{text.customer}<select disabled={disabled||busy} value={selectionKey} onChange={event=>onChange(JSON.parse(event.target.value))}>
    <option value="[]">{text.all}</option>
    {values.length>0&&!options.some(option=>JSON.stringify([option.id])===selectionKey)&&<option value={selectionKey}>{labels.join('، ')}</option>}
    {options.map(option=><option key={option.id} value={JSON.stringify([option.id])}>{governedDimensionLabel(option.id,option.label,locale,dimension)}</option>)}
   </select></label>
   {cursor&&<button type="button" disabled={busy} onClick={()=>void request(cursor)}>{text.more}</button>}
  </div>}
  {busy&&<p role="status">{text.loading}</p>}{failed&&<p role="alert">{text.failed}</p>}
 </div>;
}
