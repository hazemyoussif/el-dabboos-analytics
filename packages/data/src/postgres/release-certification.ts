import type { Pool, PoolClient } from 'pg';
import { validateReleaseCertification } from '@el-dabboos/domain';
import type { ReleaseCertification } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';

/** Only a dedicated trusted migrator may attest the externally authorized approver. */
export class PostgresReleaseCertification {
  constructor(private readonly pool: Pool) {}
  async record(evidence: ReleaseCertification): Promise<void> {
    validateReleaseCertification(evidence);
    await tenantTransaction(this.pool,evidence.tenantId,async client => {
      await assertPublicationOperator(client);
      await client.query(`INSERT INTO mart.release_certifications(tenant_id,dataset_id,reference,mapping_version,case_ids,specification)
        VALUES ($1,$2,$3,$4,$5,$6)`,[evidence.tenantId,evidence.datasetId,evidence.reference,evidence.mappingVersion,evidence.caseIds,JSON.stringify(evidence)]);
    });
  }
}
export async function assertPublicationOperator(client: PoolClient): Promise<void> {
  const role = (await client.query(`SELECT rolsuper,rolbypassrls,
    pg_has_role(current_user,'dabboos_migrator','MEMBER') migrator,
    pg_has_role(current_user,'dabboos_ingestor','MEMBER') ingestor,
    pg_has_role(current_user,'dabboos_runtime','MEMBER') runtime FROM pg_roles WHERE rolname=current_user`)).rows[0];
  if (!role?.migrator || role.rolsuper || role.rolbypassrls || role.ingestor || role.runtime) throw new Error('Publication requires dedicated migrator authority');
}
