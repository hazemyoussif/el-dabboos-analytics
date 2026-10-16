import type {AnalyticsOperationalStatus} from '@el-dabboos/domain';

/** Publication structure is required before source access; freshness gates activation after replay. */
export function assertAnalyticsScheduleReady(status:AnalyticsOperationalStatus,requireFresh:boolean) {
 if(!status.definitionVersion||!status.mappingVersion||!status.trustedServingRevision||!status.cursor)throw new Error('Schedule requires an established trusted baseline');
 const aggregates=status.eventAggregates;
 if(!aggregates||aggregates.pendingPartitions!==0||aggregates.dailyPartitions<1||aggregates.monthlyPartitions<1)throw new Error('Schedule requires completed event aggregate coverage');
 // A failed candidate is retained evidence; the normal sync lifecycle can retry safely.
 // Only activation requires that evidence to have been resolved by a successful run.
 if(requireFresh){
  if(status.pendingCandidateRun!==null)throw new Error('Schedule activation requires no unresolved candidate');
  assertFreshSchedule(status);
 }
}
function assertFreshSchedule(status:AnalyticsOperationalStatus) {
 const success=status.lastSuccessfulSync,age=status.freshnessAgeSeconds,target=status.freshnessTargetSeconds;
 if(!success||!['passed','unchanged'].includes(success.status)||success.mismatchCount!==0)throw new Error('Schedule activation requires a successful exact sync');
 if(typeof age!=='number'||!Number.isFinite(age)||age<0||!Number.isFinite(target)||target<=0||age>target)throw new Error('Schedule activation requires source freshness within the configured target');
 if(status.latestFailure&&Date.parse(status.latestFailure.failedAt)>=Date.parse(success.completedAt))throw new Error('Schedule activation cannot ignore a failure after the latest successful sync');
}
