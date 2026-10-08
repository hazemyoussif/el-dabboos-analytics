import type { Pool } from 'pg';
import { validateDerivedCertification } from '@el-dabboos/domain';
import type { DerivedMetricCertification,ReconciliationCase } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { assertPublicationOperator } from './release-certification.ts';
export class PostgresDerivedMetricCertification {
  constructor(private readonly pool: Pool,private readonly statementTimeoutMs=15000) {}
  async record(certification: DerivedMetricCertification): Promise<void> {
    await tenantTransaction(this.pool,certification.tenantId,async client => {
      await assertPublicationOperator(client);
      const cases=(await client.query<{ specification: ReconciliationCase }>('SELECT specification FROM mart.reconciliation_evidence WHERE tenant_id=$1 AND dataset_id=$2 AND case_id=ANY($3::text[])',[certification.tenantId,certification.datasetId,certification.caseIds])).rows.map(row=>row.specification);
      validateDerivedCertification(certification,cases);
      await client.query(`INSERT INTO mart.derived_metric_certifications(tenant_id,dataset_id,reference,metric,grouping,period_from,period_to,case_ids,specification) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[certification.tenantId,certification.datasetId,certification.reference,certification.metric,certification.grouping,certification.from,certification.to,certification.caseIds,JSON.stringify(certification)]);
    },false,this.statementTimeoutMs);
  }
}
