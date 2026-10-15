import {useContext} from 'react';
import {DimensionDiscoveryContext} from './DimensionDiscoveryContext.ts';
import {governedDimensionLabel} from '@el-dabboos/domain';
import type { DateRange,DimensionId, Locale } from '@el-dabboos/domain';
import { copy } from './i18n.ts';
import {DimensionSearchControl} from './DimensionSearchControl.tsx';
export type FilterOptions = Partial<Record<DimensionId, Array<{ id: string; label: string }>>>;
/** Preserve existing multi-value or no-longer-discovered defaults until the user replaces them. */
export function DimensionFilterControl({ dimension, values, options, locale, disabled, onChange,metric,asOf,dateRange }: {
  dimension: DimensionId; values: string[]; options: Array<{ id: string; label: string }>; locale: Locale; disabled?: boolean; onChange: (values: string[]) => void;metric?:import('@el-dabboos/domain').MetricId;asOf?:string;dateRange?:DateRange;
}) {
  const discovery=useContext(DimensionDiscoveryContext);
  if(discovery)return <DimensionSearchControl {...{dimension,values,locale,disabled,onChange,metric,asOf,dateRange}}/>;
  return <BoundedDimensionControl {...{dimension,values,options,locale,disabled,onChange,metric,asOf}}/>;
}
function BoundedDimensionControl({dimension,values,options,locale,disabled,onChange}:Parameters<typeof DimensionFilterControl>[0]) {
  const labels = values.map(id => governedDimensionLabel(id,options.find(option => option.id === id)?.label,locale,dimension));
  const missing = values.length === 1 && !options.some(option => option.id === values[0]);
  return <label>{copy[locale].dimensions[dimension]}<select disabled={disabled} value={JSON.stringify(values)} onChange={event => onChange(JSON.parse(event.target.value) as string[])}>
    <option value="[]">{locale === 'ar' ? 'الكل' : 'All'}</option>
    {(values.length > 1 || missing) && <option value={JSON.stringify(values)} disabled={values.length > 1}>{labels.join('، ')}</option>}
    {options.map(option => <option key={option.id} value={JSON.stringify([option.id])}>{governedDimensionLabel(option.id,option.label,locale,dimension)}</option>)}
  </select></label>;
}
