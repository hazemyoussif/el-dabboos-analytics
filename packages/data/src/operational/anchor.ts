import type { Pool } from 'pg';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { PostgresAnalyticsRepository } from '../postgres/repository.ts';
import { tenantTransaction } from '../postgres/session.ts';
/** Approved baseline outputs not covered by historical Phase A remain independently pinned. */
export async function storeAnchorCapabilities(pool:Pool,tenantId:string) {
 const prior=await tenantTransaction(pool,tenantId,async client=>(await client.query('SELECT capabilities FROM mart.analytics_anchor_capabilities WHERE tenant_id=$1',[tenantId])).rows[0]?.capabilities as PublishedAnalyticsCapabilities|undefined,true);
 if(prior)return prior;
 const caps=await new PostgresAnalyticsRepository(pool,{reportingCurrencies:{[tenantId]:'IQD'}}).getPublishedCapabilities({tenantId,locale:'en'});
 const dataset=caps.releases[0]?.datasetId;if(!dataset)throw new Error('Approved anchor capabilities required');
 await tenantTransaction(pool,tenantId,async client=>{await client.query('INSERT INTO mart.analytics_anchor_capabilities VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[tenantId,dataset,JSON.stringify(caps)]);});
 return caps;
}
