import { drillQuery, validateDrillRequest } from '@el-dabboos/domain';
import type { AuthorizationPolicy, DrillPage, DrillRequest, DrillThroughRepository, RequestContext } from '@el-dabboos/domain';
import { analyticsContext } from './security.ts';
/** Fresh server authorization applies to every page; clicked filters intersect rather than replace. */
export class DrillThroughService {
  constructor(private readonly repository: DrillThroughRepository, private readonly policy: AuthorizationPolicy) {}
  async execute(request: DrillRequest, context: RequestContext): Promise<DrillPage> {
    this.policy.authorize('dashboard:view',context);
    this.policy.authorize('analytics:query',context);
    validateDrillRequest(request,analyticsContext(context));
    this.policy.authorizeMetric(drillQuery(request).metric,context);
    return this.repository.drill(request,analyticsContext(context));
  }
}
