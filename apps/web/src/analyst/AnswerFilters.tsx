import { useContext, useEffect, useState } from 'react';
import { dimensionLabels, governedDimensionLabel } from '@el-dabboos/domain';
import type { AnalystPanel, Locale } from '@el-dabboos/domain';
import { DimensionDiscoveryContext } from '../DimensionDiscoveryContext.ts';
import { analystCopy } from './copy.ts';
export function AnswerFilters({panel,locale,labels}:{panel:AnalystPanel;locale:Locale;labels:Record<string,string>}) {
 const discover=useContext(DimensionDiscoveryContext),[hydrated,setHydrated]=useState<Record<string,string>>({});
 const filters=[...(panel.query.filters??[]),...(panel.scopeFilters??[])];
 useEffect(()=>{
  let current=true;
  if(discover)void Promise.all(filters.map(filter=>discover(filter.dimension,{limit:1,selectedIds:filter.values,metric:panel.query.metric,...(panel.query.dateRange?{asOf:panel.query.dateRange.to}:{})}).then(page=>Object.fromEntries(page.selected.map(option=>[option.id,option.label??'']))))).then(evidence=>{if(current)setHydrated(Object.assign({},...evidence));}).catch(()=>{});
  return()=>{current=false;};
 },[discover,panel]);
 return <>{filters.map(filter=>`${dimensionLabels[locale][filter.dimension]}: ${filter.values.map(value=>governedDimensionLabel(value,panel.result.metadata.dimensionLabels?.[value]??hydrated[value]??labels[value],locale,filter.dimension)).join('، ')}`).join(' · ')||analystCopy[locale].all}</>;
}
