import type { Pool, PoolClient } from 'pg';
import type { AnalyticsCursor, AnalyticsJobRun, AnalyticsOperationalStatus, OperationalRunSummary } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';

/** Use the lifecycle's transaction; a failed audit/cursor write rolls back its promotion. */
export async function recordOperationalRun(client: PoolClient, run: AnalyticsJobRun, caseIds: readonly string[]) {
  if (run.caseCount !== caseIds.length) throw new Error('Incomplete operational case set');
  await client.query(`INSERT INTO mart.analytics_operation_runs
    (tenant_id,run_id,kind,actor_id,trigger_type,source_cutoff,source_revision,mapping_version,definition_version,started_at,completed_at,status,records_changed,partitions_affected,case_ids,case_count,mismatch_count,evidence_hash,serving_release)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
  [run.tenantId,run.runId,run.kind,run.actorId,run.trigger,run.sourceCutoff,run.sourceRevision,run.mappingVersion,run.definitionVersion,run.startedAt,run.completedAt,run.status,run.recordsChanged,run.partitionsAffected,caseIds,run.caseCount,run.mismatchCount,run.evidenceHash,run.servingRelease]);
}

/** Exact evidence hash is computed from persisted case content, never customer payloads. */
export async function readOperationalEvidenceHash(client:PoolClient,tenantId:string,caseIds:readonly string[]) {
 const result=await client.query(`SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(evidence)-'recorded_at' ORDER BY evidence.case_id)::text,'[]'),'UTF8')),'hex') hash
 FROM mart.reconciliation_evidence evidence WHERE tenant_id=$1 AND case_id=ANY($2::text[])`,[tenantId,caseIds]);
 return String(result.rows[0].hash);
}

/** Caller holds the tenant job lock. DB guard also refuses failed/mismatched-cutoff runs. */
export async function writeOperationalCursor(client: PoolClient, scope: { tenantId: string; runId: string; cursor: AnalyticsCursor }) {
  await client.query(`INSERT INTO mart.analytics_source_cursors(tenant_id,run_id,cutoff,object_cursors) VALUES($1,$2,$3,$4)
    ON CONFLICT(tenant_id) DO UPDATE SET run_id=EXCLUDED.run_id,cutoff=EXCLUDED.cutoff,object_cursors=EXCLUDED.object_cursors`,
  [scope.tenantId,scope.runId,scope.cursor.cutoff,JSON.stringify(scope.cursor.objects)]);
}

export class PostgresOperationalStatus {
  constructor(private readonly pool: Pool, private readonly freshnessTargetSeconds = 600) {
    if (!Number.isInteger(freshnessTargetSeconds) || freshnessTargetSeconds < 1 || freshnessTargetSeconds > 86400) throw new Error('Invalid freshness target');
  }
  async status(tenantId: string):Promise<AnalyticsOperationalStatus> {
    return tenantTransaction(this.pool,tenantId,async client => {
      const latest=(await client.query(`SELECT DISTINCT ON(kind) kind,run_id,status,source_cutoff,completed_at,records_changed,partitions_affected,case_count,mismatch_count,serving_release
        FROM mart.analytics_operation_runs WHERE tenant_id=$1 ORDER BY kind,completed_at DESC,run_id DESC`,[tenantId])).rows;
      const lastSuccessfulSync=(await client.query(`SELECT kind,run_id,status,source_cutoff,completed_at,records_changed,partitions_affected,case_count,mismatch_count,serving_release FROM mart.analytics_operation_runs WHERE tenant_id=$1 AND kind='sync' AND status IN ('passed','unchanged') ORDER BY completed_at DESC,run_id DESC LIMIT 1`,[tenantId])).rows[0]??null;
      const cursor=(await client.query('SELECT cutoff,object_cursors,run_id FROM mart.analytics_source_cursors WHERE tenant_id=$1',[tenantId])).rows[0] ?? null;
      const trusted=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenantId])).rows[0]?.revision_id??null;
      const pending=(await client.query("SELECT run_id FROM mart.analytics_operation_runs WHERE tenant_id=$1 AND status='failed' AND completed_at>coalesce((SELECT max(completed_at) FROM mart.analytics_operation_runs WHERE tenant_id=$1 AND status IN ('passed','unchanged') AND kind IN ('sync','sweep')),'epoch'::timestamptz) ORDER BY completed_at DESC LIMIT 1",[tenantId])).rows[0]?.run_id??null;
      const failure=(await client.query('SELECT run_id,kind,failed_at FROM mart.analytics_operation_failures WHERE tenant_id=$1 ORDER BY failed_at DESC LIMIT 1',[tenantId])).rows[0];
      const binding=(await client.query('SELECT dataset_id FROM mart.serving_bindings WHERE tenant_id=$1',[tenantId])).rows[0]?.dataset_id ?? null;
      const history=(await client.query('SELECT reference,period_from::text,period_to::text FROM mart.historical_serving_bindings WHERE tenant_id=$1',[tenantId])).rows[0] ?? null;
      return {tenantId,trustedServingRevision:trusted,pendingCandidateRun:pending,freshnessAgeSeconds:lastSuccessfulSync?Math.max(0,Math.floor((Date.now()-lastSuccessfulSync.source_cutoff.getTime())/1000)):null,latestFailure:failure?{runId:failure.run_id,kind:failure.kind,failedAt:failure.failed_at.toISOString()}:null,freshnessTargetSeconds:this.freshnessTargetSeconds,cursor:cursor?{cutoff:cursor.cutoff.toISOString(),objects:cursor.object_cursors}:null,latest:latest.map(operationSummary),lastSuccessfulSync:lastSuccessfulSync?operationSummary(lastSuccessfulSync):null,trustedCertificationRelease:binding,historicalCoverage:history?{reference:history.reference,from:history.period_from,to:history.period_to}:null};
    },true);
  }
}

interface OperationalRow {kind:OperationalRunSummary['kind'];run_id:string;status:OperationalRunSummary['status'];source_cutoff:Date;completed_at:Date;records_changed:string;partitions_affected:string;case_count:number;mismatch_count:number;serving_release:string|null}
function operationSummary(row:OperationalRow):OperationalRunSummary {
 return {kind:row.kind,runId:row.run_id,status:row.status,sourceCutoff:row.source_cutoff.toISOString(),completedAt:row.completed_at.toISOString(),recordsChanged:Number(row.records_changed),partitionsAffected:Number(row.partitions_affected),caseCount:row.case_count,mismatchCount:row.mismatch_count,servingRelease:row.serving_release};
}
