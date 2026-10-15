import {useEffect,useState} from 'react';
import type {Locale} from '@el-dabboos/domain';
/** Presentation pages never change loaded results, query scope, calculations or exports. */
export function useRowPages<T>(rows:readonly T[],limit:number){
 const [selected,setSelected]=useState(0);
 useEffect(()=>setSelected(0),[rows]);
 const size=rows.length>limit*2?limit:Math.max(1,rows.length);
 const count=Math.max(1,Math.ceil(rows.length/size)),page=Math.min(selected,count-1),start=page*size;
 return {rows:rows.slice(start,start+size),start,end:Math.min(start+size,rows.length),total:rows.length,page,count,setPage:setSelected};
}
interface PageControls {start:number;end:number;total:number;page:number;count:number;setPage:(page:number)=>void}
export function RowPages({paging,locale,kind}:{paging:PageControls;locale:Locale;kind:'table'|'chart'}){
 if(paging.count<=1)return null;
 const arabic=locale==='ar',format=new Intl.NumberFormat(arabic?'ar-IQ':'en-IQ');
 const label=kind==='table'?(arabic?'صفحات الجدول':'Table pages'):(arabic?'صفحات الرسم':'Chart pages');
 return <nav className="row-pages" aria-label={label}><span role="status" aria-live="polite">{format.format(paging.start+1)}–{format.format(paging.end)} {arabic?'من':'of'} {format.format(paging.total)}</span><button type="button" disabled={paging.page===0} onClick={()=>paging.setPage(paging.page-1)}>{arabic?'السابق':'Previous'}</button><button type="button" disabled={paging.page===paging.count-1} onClick={()=>paging.setPage(paging.page+1)}>{arabic?'التالي':'Next'}</button></nav>;
}
