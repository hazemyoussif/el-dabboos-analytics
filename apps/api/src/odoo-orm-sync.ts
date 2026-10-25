import { executeAnalyticsJob } from './analytics-jobs.ts';

/** Explicit operator opt-in for the accepted independent-request consistency mode. */
export async function executeOdooOrmSync(args: readonly string[], environment: NodeJS.ProcessEnv) {
  if (args.length !== 3 || args[0] !== '--tenant' || !args[1] || args[2] !== '--accept-observed') {
    throw new Error('Usage: odoo:orm sync --tenant ID --accept-observed');
  }
  if (args[1] !== environment.ODOO_ORM_TENANT_ID) throw new Error('Odoo ORM tenant scope conflict');
  const result = await executeAnalyticsJob('sync', args[1], undefined, {
    ...environment, ANALYTICS_SOURCE_MODE: 'odoo-orm-observed', ODOO_ORM_ACCEPT_OBSERVED: 'true',
  });
  if (!('run' in result)) throw new Error('Expected Odoo ORM sync result');
  const { run } = result;
  return { runId: run.runId, status: run.status, recordsChanged: run.recordsChanged, partitionsAffected: run.partitionsAffected,
    caseCount: run.caseCount, mismatchCount: run.mismatchCount, servingUpdated: run.status === 'passed' && run.partitionsAffected > 0,
    consistency: run.sourceRevision.startsWith('orm-observed-copy-v1:') ? 'api_observed' : 'retained_candidate', receivableOperandsSupported: true };
}
