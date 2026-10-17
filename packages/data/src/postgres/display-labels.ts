import {categoricalDimensions} from '@el-dabboos/domain';
import type {AnalyticsQuery,Locale} from '@el-dabboos/domain';
export function sourceDisplayLabel(raw:string,locale:Locale):string {
 if(!raw.trim().startsWith('{'))return raw;
 try {
  const translations=JSON.parse(raw) as Record<string,unknown>;
  const preferred=locale==='ar'?translations.ar_001??translations.ar:translations.en_US??translations.en;
  if(typeof preferred==='string'&&preferred.trim())return preferred;
  const fallback=translations.en_US??Object.values(translations).find(value=>typeof value==='string'&&value.trim());
  return typeof fallback==='string'?fallback:raw;
 } catch {return raw;}
}

export function dimensionLabelField(dimension:AnalyticsQuery['groupBy']) {
 return dimension==='business_line'?'businessLine':dimension&&categoricalDimensions.includes(dimension)?dimension:null;
}

