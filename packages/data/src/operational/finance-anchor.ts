import type {Pool} from 'pg';
import {tenantTransaction} from '../postgres/session.ts';
import {operationalDefinitionVersion} from './definition-version.ts';

export async function resolveFinanceAnchor(pool:Pool,tenantId:string,reportingCurrency:string):Promise<string> {
 return tenantTransaction(pool,tenantId,async client=>{
  const row=(await client.query<{dataset_id:string}>(`
    SELECT anchor.dataset_id
    FROM mart.analytics_anchor_capabilities anchor
    JOIN mart.mapping_releases mapping
      ON mapping.tenant_id=anchor.tenant_id
     AND mapping.dataset_id=anchor.dataset_id
    JOIN mart.analytics_baselines baseline
      ON baseline.tenant_id=anchor.tenant_id
    WHERE anchor.tenant_id=$1
      AND mapping.approval_status='approved'
      AND baseline.definition_version=$2
      AND baseline.reporting_currency=$3
      AND EXISTS(
        SELECT 1
        FROM jsonb_array_elements(anchor.capabilities->'releases') release,
             jsonb_array_elements(release->'capabilities') capability
        WHERE release->>'datasetId'=anchor.dataset_id
          AND capability->>'metric'='net_aged_receivable'
          AND capability->'dimensions' ? 'customer'
      )
  `,[tenantId,operationalDefinitionVersion(),reportingCurrency])).rows[0];
  if(!row) throw new Error('Current certified customer Finance anchor required');
  return row.dataset_id;
 },true);
}
