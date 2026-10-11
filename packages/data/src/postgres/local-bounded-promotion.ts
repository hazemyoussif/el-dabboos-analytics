import type {Pool} from 'pg';
import {tenantTransaction} from './session.ts';
import {assertCertifiedMonthlyRelease,boundedReleaseFingerprint} from './bounded-release-transfer.ts';
import type {ReleasePromotionScope} from './release-promotion.ts';

/** Single-mart publication records evidence only; it never copies rows or binds serving. */
export async function promoteLocalBoundedRelease(pool:Pool,scope:ReleasePromotionScope) {
  if (![scope.tenantId,scope.datasetId,scope.reference].every(value=>typeof value==='string' && value.trim()===value && value.length>0 && value.length<=200)) throw new Error('Invalid promotion scope');
  return tenantTransaction(pool,scope.tenantId,async client=>{
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([scope.tenantId,scope.datasetId])]);
    // One stable snapshot covers current proof, every immutable row and the receipt write.
    await assertCertifiedMonthlyRelease(client,scope);
    const fingerprint=await boundedReleaseFingerprint(client,scope);
    const prior=(await client.query('SELECT reference,release_fingerprint FROM mart.release_promotions WHERE tenant_id=$1 AND dataset_id=$2',[scope.tenantId,scope.datasetId])).rows[0];
    if (prior && (prior.reference!==scope.reference || prior.release_fingerprint!==fingerprint)) throw new Error('Immutable local promotion receipt mismatch');
    if (!prior) await client.query('INSERT INTO mart.release_promotions(tenant_id,dataset_id,reference,release_fingerprint) VALUES($1,$2,$3,$4)',[scope.tenantId,scope.datasetId,scope.reference,fingerprint]);
    return {fingerprint,alreadyPromoted:!!prior};
  },'repeatable-write',120000);
}
