import {useContext,useEffect,useState} from 'react';
import {DimensionDiscoveryContext} from './DimensionDiscoveryContext.ts';
import {governedDimensionLabel} from '@el-dabboos/domain';
import type { DimensionId, Locale } from '@el-dabboos/domain';
import { copy } from './i18n.ts';
import {CustomerFilterControl} from './CustomerFilterControl.tsx';
export type FilterOptions = Partial<Record<DimensionId, Array<{ id: string; label: string }>>>;
/** Preserve existing multi-value or no-longer-discovered defaults until the user replaces them. */
export function DimensionFilterControl({ dimension, values, options, locale, disabled, onChange,metric,asOf }: {
  dimension: DimensionId; values: string[]; options: Array<{ id: string; label: string }>; locale: Locale; disabled?: boolean; onChange: (values: string[]) => void;metric?:import('@el-dabboos/domain').MetricId;asOf?:string;
}) {
  if(dimension==='customer')return <CustomerFilterControl values={values} locale={locale} disabled={disabled} onChange={onChange} metric={metric} asOf={asOf}/>;
  return <BoundedDimensionControl {...{dimension,values,options,locale,disabled,onChange,metric,asOf}}/>;
}
function BoundedDimensionControl({dimension,values,options,locale,disabled,onChange,metric,asOf}:Parameters<typeof DimensionFilterControl>[0]) {
  const load=useContext(DimensionDiscoveryContext);
  const [hydrated,setHydrated]=useState<Array<{id:string;label?:string}>>([]);
  const missingIds=JSON.stringify(values.filter(id=>!options.some(option=>option.id===id)));
  useEffect(()=>{
    let current=true;setHydrated([]);
    const selectedIds=JSON.parse(missingIds) as string[];
    if(load&&selectedIds.length)void load(dimension,{limit:1,selectedIds,...(metric?{metric}:{}),...(asOf?{asOf}:{})}).then(page=>{if(current)setHydrated(page.selected);}).catch(()=>{/* Keep the product-safe fallback; never replace stored identities. */});
    return()=>{current=false;};
  },[load,dimension,missingIds,metric,asOf]);
  const labels = values.map(id => governedDimensionLabel(id,options.find(option => option.id === id)?.label??hydrated.find(option=>option.id===id)?.label,locale,dimension));
  const missing = values.length === 1 && !options.some(option => option.id === values[0]);
  return <label>{copy[locale].dimensions[dimension]}<select disabled={disabled} value={JSON.stringify(values)} onChange={event => onChange(JSON.parse(event.target.value) as string[])}>
    <option value="[]">{locale === 'ar' ? 'الكل' : 'All'}</option>
    {(values.length > 1 || missing) && <option value={JSON.stringify(values)} disabled={values.length > 1}>{labels.join('، ')}</option>}
    {options.map(option => <option key={option.id} value={JSON.stringify([option.id])}>{governedDimensionLabel(option.id,option.label,locale,dimension)}</option>)}
  </select></label>;
}
