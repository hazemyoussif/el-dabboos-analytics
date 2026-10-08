import type { WidgetExecution } from '@el-dabboos/application';
import type { Locale, TenantProfile } from '@el-dabboos/domain';
import { formatDate } from '../i18n.ts';

export function SnapshotAsOf({entry,locale,profile}:{entry:WidgetExecution|undefined;locale:Locale;profile:TenantProfile}) {
  const dates=[...new Set(Object.values(entry?.seriesResults??{}).flatMap(series=>series.status==='success' && series.result.metadata.snapshotAsOf ? [series.result.metadata.snapshotAsOf] : []))].sort();
  if(!dates.length)return null;
  return <p className="snapshot-as-of">{locale==='ar'?'الرصيد كما في ':'As of '}{dates.map((date,index)=><span key={date}>{index>0?' · ':''}<bdi>{formatDate(date,locale,profile)}</bdi></span>)}</p>;
}
