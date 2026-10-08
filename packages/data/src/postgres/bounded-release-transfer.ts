import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import type {Pool,PoolClient} from 'pg';
import {tenantTransaction} from './session.ts';
import {assertPublicationOperator} from './release-certification.ts';
import {assertCertifiedRelease,martSchemaFingerprint,releaseTables} from './release-transfer.ts';
import type {ReleasePromotionScope} from './release-promotion.ts';

/** Bounded monthly transfer retains all links; client memory is one 250-record page. */
export async function promoteBoundedRelease(source:Pool,target:Pool,scope:ReleasePromotionScope) {
  return tenantTransaction(source,scope.tenantId,async reader=>{
    await reader.query("SET LOCAL TIME ZONE 'UTC'");
    await assertCertifiedRelease(reader,scope);
    const certified=(await reader.query('SELECT certificate.specification FROM mart.release_certifications certificate JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id) WHERE mapping.tenant_id=$1 AND mapping.dataset_id=$2 AND certificate.reference=mapping.approval_reference',[scope.tenantId,scope.datasetId])).rows[0]?.specification;
    validateMonthlyCertificate(certified);
    const schema=await martSchemaFingerprint(reader);
    return tenantTransaction(target,scope.tenantId,async writer=>{
      await writer.query("SET LOCAL TIME ZONE 'UTC'");
      await assertPublicationOperator(writer);
      await writer.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([scope.tenantId,scope.datasetId])]);
      if (await martSchemaFingerprint(writer)!==schema) throw new Error('Promotion schema mismatch');
      const prior=(await writer.query('SELECT release_fingerprint FROM mart.release_promotions WHERE tenant_id=$1 AND dataset_id=$2',[scope.tenantId,scope.datasetId])).rows[0];
      let mapping:Record<string,unknown>|undefined;
      const fingerprint=await walkRelease(reader,scope,async(table,page)=>{
        if (prior) return;
        let rows=page.map(row=>JSON.parse(row));
        if (table==='mapping_releases') {
          mapping=rows[0];
          rows=rows.map(row=>({...row,approval_status:'pending',approval_reference:null,approved_at:null,approval_case_ids:[]}));
        }
        await writer.query(`INSERT INTO mart.${table} OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::mart.${table},$1::jsonb)`,[JSON.stringify(rows)]);
      });
      if (!prior) {
        if (!mapping) throw new Error('Certified mapping required');
        await writer.query(`UPDATE mart.mapping_releases SET approval_status='approved',approval_reference=$3,approved_at=$4,approval_case_ids=$5 WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status='pending'`,[scope.tenantId,scope.datasetId,mapping.approval_reference,mapping.approved_at,mapping.approval_case_ids]);
      }
      await assertCertifiedRelease(writer,scope);
      if (await walkRelease(writer,scope)!==fingerprint || prior && prior.release_fingerprint!==fingerprint) throw new Error('Immutable promoted release fingerprint mismatch');
      if (!prior) await writer.query('INSERT INTO mart.release_promotions(tenant_id,dataset_id,reference,release_fingerprint) VALUES($1,$2,$3,$4)',[scope.tenantId,scope.datasetId,scope.reference,fingerprint]);
      return {fingerprint,alreadyPromoted:!!prior};
    },false,120000);
  },true,120000);
}

/** Same canonical hash framing as releaseFingerprint; ordered server cursors avoid full client arrays. */
async function walkRelease(client:PoolClient,scope:ReleasePromotionScope,consume?:(table:typeof releaseTables[number],rows:string[])=>Promise<void>) {
  const hash=createHash('sha256');hash.update('[');
  let bytes=0;
  for (const [index,table] of releaseTables.entries()) {
    if (index) hash.update(',');
    hash.update(`[${JSON.stringify(table)},[`);
    const predicate=table==='data_quality_rejects'?'tenant_id=$1 AND batch_id IN (SELECT batch_id FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=$2)':'tenant_id=$1 AND dataset_id=$2';
    await client.query(`DECLARE historical_transfer NO SCROLL CURSOR FOR SELECT to_jsonb(record)::text payload FROM mart.${table} record WHERE ${predicate} ORDER BY to_jsonb(record)::text COLLATE "C"`,[scope.tenantId,scope.datasetId]);
    let first=true;
    try {
      while (true) {
        const rows=(await client.query('FETCH FORWARD 250 FROM historical_transfer')).rows.map(row=>row.payload as string);
        if (!rows.length) break;
        for (const row of rows) {
          bytes+=Buffer.byteLength(row,'utf8');
          if (bytes>512*1024*1024) throw new Error('Bounded monthly promotion byte budget exceeded');
          if (!first) hash.update(',');first=false;hash.update(JSON.stringify(row));
        }
        await consume?.(table,rows);
      }
    } finally {await client.query('CLOSE historical_transfer').catch(()=>{});}
    hash.update(']]');
  }
  hash.update(']');return hash.digest('hex');
}
export function boundedReleaseFingerprint(client:PoolClient,scope:ReleasePromotionScope) {return walkRelease(client,scope);}
function validateMonthlyCertificate(certificate:{from:string;to:string}|undefined) {
  if (!certificate || !certificate.from.endsWith('-01')) throw new Error('Bounded promotion requires one certified calendar month');
  const first=new Date(`${certificate.from}T00:00:00Z`);
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).toISOString().slice(0,10);
  if (certificate.to!==last) throw new Error('Bounded promotion requires one certified calendar month');
}
