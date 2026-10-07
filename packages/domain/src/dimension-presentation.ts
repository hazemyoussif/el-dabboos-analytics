import type {Locale,DimensionId} from './contracts.ts';
/** Missing/unsafe labels never reveal technical identities; filter keys stay intact. */
export function governedDimensionLabel(id:string,label:string|undefined,locale:Locale,dimension?:DimensionId):string {
 if(id==='unassigned')return locale==='ar'?'غير مسند':'Unassigned';
 if(!label?.trim() || label.trim().startsWith('{') || label===id&&id.includes(':') || /^[\w.-]+:\d+$/u.test(label.trim()))return '—';
 if(dimension==='business_line'){
  const normalized=label.trim().toLowerCase().replaceAll('_',' ');
  if(normalized==='general')return locale==='ar'?'عام':'General';
  if(normalized==='no sugar')return locale==='ar'?'بدون سكر':'No Sugar';
 }
 return label;
}
