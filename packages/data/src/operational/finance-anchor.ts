import type {Pool} from 'pg';
import {tenantTransaction} from '../postgres/session.ts';
import {operationalDefinitionVersion} from './definition-version.ts';

export async function resolveFinanceAnchor(pool:Pool,tenantId:string,reportingCurrency:string,date:string):Promise<string> {
 return tenantTransaction(pool,tenantId,async client=>{
  const row=(await client.query<{dataset_id:string}>(`
    WITH legacy AS (
      SELECT anchor.dataset_id,0 priority
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
    ), historical AS (
      SELECT member.dataset_id,1 priority
      FROM mart.historical_serving_bindings binding
      JOIN mart.historical_release_members member USING(tenant_id,reference)
      JOIN mart.mapping_releases mapping
        ON mapping.tenant_id=member.tenant_id
       AND mapping.dataset_id=member.dataset_id
      JOIN mart.analytics_baselines baseline
        ON baseline.tenant_id=binding.tenant_id
      WHERE binding.tenant_id=$1
        AND member.kind='aging'
        AND member.period_to=$4::date
        AND mapping.approval_status='approved'
        AND baseline.definition_version=$2
        AND baseline.reporting_currency=$3
    )
    SELECT dataset_id FROM (
      SELECT * FROM legacy
      UNION ALL
      SELECT * FROM historical
    ) candidates
    ORDER BY priority
    LIMIT 1
  `,[tenantId,operationalDefinitionVersion(),reportingCurrency,date])).rows[0];
  if(!row) throw new Error('Current certified customer Finance anchor required');
  return row.dataset_id;
 },true);
}
