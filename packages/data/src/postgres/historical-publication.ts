import type {Pool} from 'pg';
import {tenantTransaction} from './session.ts';
import {assertPublicationOperator} from './release-certification.ts';
import {assertCertifiedRelease} from './release-transfer.ts';
import {boundedReleaseFingerprint} from './bounded-release-transfer.ts';
export interface HistoricalServingManifest {
  tenantId:string;reference:string;anchorDatasetId:string;from:string;to:string;approvalReference:string;
  members:readonly {datasetId:string;from:string;to:string;kind:'events'|'aging';fingerprint:string}[];
}
/** Publication is explicit. The normal September binding is never changed. */
export class PostgresHistoricalPublication {
  constructor(private readonly pool:Pool) {}
  async activate(manifest:HistoricalServingManifest) {
    if (!manifest.members.length || manifest.members.length>48 || new Set(manifest.members.map(member=>`${member.from}/${member.kind}`)).size!==manifest.members.length) throw new Error('Bounded distinct historical membership required');
    return tenantTransaction(this.pool,manifest.tenantId,async client=>{
      await assertPublicationOperator(client);await client.query("SET LOCAL TIME ZONE 'UTC'");
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[manifest.tenantId]);
      const prior=(await client.query('SELECT reference,anchor_dataset_id,period_from::text,period_to::text,approval_reference FROM mart.historical_serving_bindings WHERE tenant_id=$1',[manifest.tenantId])).rows[0];
      if (prior && (prior.reference!==manifest.reference || prior.anchor_dataset_id!==manifest.anchorDatasetId || prior.period_from!==manifest.from || prior.period_to!==manifest.to || prior.approval_reference!==manifest.approvalReference)) throw new Error('Immutable historical serving conflict');
      for (const member of manifest.members) {
        const scope={tenantId:manifest.tenantId,datasetId:member.datasetId,reference:manifest.reference};
        await assertCertifiedRelease(client,scope);
        const receipt=(await client.query('SELECT release_fingerprint FROM mart.release_promotions WHERE tenant_id=$1 AND dataset_id=$2',[manifest.tenantId,member.datasetId])).rows[0];
        if (receipt?.release_fingerprint!==member.fingerprint || await boundedReleaseFingerprint(client,scope)!==member.fingerprint) throw new Error('Exact immutable monthly promotion required');
        if (!prior) await client.query('INSERT INTO mart.historical_release_members(tenant_id,reference,dataset_id,period_from,period_to,kind) VALUES($1,$2,$3,$4,$5,$6)',[manifest.tenantId,manifest.reference,member.datasetId,member.from,member.to,member.kind]);
      }
      const members=(await client.query('SELECT dataset_id,period_from::text,period_to::text,kind FROM mart.historical_release_members WHERE tenant_id=$1 AND reference=$2',[manifest.tenantId,manifest.reference])).rows;
      if (members.length!==manifest.members.length || manifest.members.some(member=>!members.some(row=>row.dataset_id===member.datasetId && row.period_from===member.from && row.period_to===member.to && row.kind===member.kind))) throw new Error('Immutable historical membership conflict');
      if (!prior) await client.query('INSERT INTO mart.historical_serving_bindings(tenant_id,reference,anchor_dataset_id,period_from,period_to,approval_reference) VALUES($1,$2,$3,$4,$5,$6)',[manifest.tenantId,manifest.reference,manifest.anchorDatasetId,manifest.from,manifest.to,manifest.approvalReference]);
      return {reference:manifest.reference,alreadyBound:!!prior};
    },false,120000);
  }
}
