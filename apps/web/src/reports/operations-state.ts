import type { AnalyticsOperationalStatus } from '@el-dabboos/domain';
export function reconciliationWarning(status:AnalyticsOperationalStatus) {
 const successful=status.lastSuccessfulSync?.completedAt??'';
 return !!status.pendingCandidateRun || !!(status.latestFailure && status.latestFailure.failedAt>successful) || status.latest.some(run=>run.status==='failed'&&run.completedAt>successful);
}
export function freshnessState(status:AnalyticsOperationalStatus):'fresh'|'stale'|'unknown' {
 if(status.freshnessAgeSeconds==null)return 'unknown';
 return status.freshnessAgeSeconds<=status.freshnessTargetSeconds?'fresh':'stale';
}

export function lastSyncAttemptAt(status:AnalyticsOperationalStatus) {
 const completed=status.latest.find(run=>run.kind==='sync')?.completedAt;
 const failed=status.latestFailure?.kind==='sync'?status.latestFailure.failedAt:undefined;
 if(!completed)return failed;
 return failed&&failed>completed?failed:completed;
}
