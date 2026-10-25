import type { WidgetExecution } from '@el-dabboos/application';
import type { AnalyticsResult,Locale,TenantProfile } from '@el-dabboos/domain';
import {formatDate,localeTag} from '../i18n.ts';
import {SourceObservation} from './SourceObservation.tsx';
/** Availability and source freshness are independent of the latest fact date. */
export function DataAvailability({entry,locale,profile}:{entry:WidgetExecution;locale:Locale;profile:TenantProfile}) {
 const results=Object.values(entry.seriesResults).flatMap(series=>series.status==='success'?[series.result.metadata]:[]);
 return <>{results.some(metadata=>metadata.sourceConsistency==='api_observed')&&<SourceObservation metadata={results.find(metadata=>metadata.sourceConsistency==='api_observed')!} locale={locale}/>}<AvailabilityStatus results={results} locale={locale} profile={profile}/></>;
}
function AvailabilityStatus({results,locale,profile}:{results:AnalyticsResult['metadata'][];locale:Locale;profile:TenantProfile}) {
 if(results.some(metadata=>metadata.availability?.state==='DATA_NOT_READY'))return <p role="status">{locale==='ar'?'لا تتوفر بيانات موثوقة لهذه الفترة.':'Trusted data is not available for this period.'}</p>;
 const coverage=results.find(metadata=>metadata.availability?.state==='PARTIAL_COVERAGE')?.coverage;
 if(!coverage){
  const older=results.some(metadata=>metadata.snapshotAsOf&&metadata.sourceAsOf&&metadata.snapshotAsOf<metadata.sourceAsOf.slice(0,10));
  return older?<p role="status">{locale==='ar'?'تاريخ الرصيد أقدم من آخر تحديث للمصدر.':'Snapshot is older than current source freshness.'}</p>:null;
 }
 const through=coverage.cutoff&&coverage.through>=coverage.cutoff.slice(0,10)?new Intl.DateTimeFormat(localeTag(locale,profile),{timeZone:profile.timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(coverage.cutoff)):formatDate(coverage.through,locale,profile);
 return <p role="status">{locale==='ar'?'تغطية جزئية — البيانات متاحة حتى ':'Partial coverage — data available through '}<bdi>{through}</bdi></p>;
}
