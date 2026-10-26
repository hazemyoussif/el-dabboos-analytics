import {customerCoverageMetricIds,validateCoverageInput,validateCoverageFilters} from '@el-dabboos/domain';
import type {AuthorizationPolicy,CustomerProductCoverageInput,CustomerProductCoverageRepository,RequestContext} from '@el-dabboos/domain';
import {analyticsContext,AuthorizationError} from './security.ts';
export class CustomerProductCoverageReport {
 constructor(private readonly repository:CustomerProductCoverageRepository,private readonly policy:AuthorizationPolicy){}
 async execute(input:CustomerProductCoverageInput,actor:RequestContext){
  validateCoverageInput(input);
  try{validateCoverageFilters(actor.authorization.enforcedFilters);}catch{throw new AuthorizationError('FILTER_FORBIDDEN','Coverage cannot honor the required access scope.');}
  this.policy.authorize('dashboard:view',actor);this.policy.authorize('analytics:query',actor);
  for(const metric of customerCoverageMetricIds)this.policy.authorizeMetric(metric,actor);
  return this.repository.readCoverage(input,analyticsContext(actor));
 }
}
