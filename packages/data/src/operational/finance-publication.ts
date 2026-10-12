import {promoteFinancePartition} from './snapshot-promotion.ts';
import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {isCanonicalDecimal} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {operationalDefinitionVersion} from './definition-version.ts';
import {receivableMeasures} from '../receivable-aging.ts';
export interface FinanceSnapshotCustomer {id:string;label?:string;actual:Record<string,string>;expected:Record<string,string>}
export interface FinanceSnapshotEvidence {tenantId:string;date:string;currency:string;sourceCutoff:string;sourceRevision:string;totals:Record<string,string>;customers:readonly FinanceSnapshotCustomer[]}
/** Offline publication only. Source controls and immutable stored totals must agree exactly. */
export async function publishFinanceSnapshot(pool:Pool,evidence:FinanceSnapshotEvidence,assertSource?:()=>Promise<void>) {
 validateFinanceEvidence(evidence);
 const snapshotId=createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
 return tenantTransaction(pool,evidence.tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${evidence.tenantId}`]);
  const prior=(await client.query('SELECT snapshot_id FROM mart.trusted_finance_snapshots WHERE tenant_id=$1 AND snapshot_date=$2',[evidence.tenantId,evidence.date])).rows[0];
  if(prior?.snapshot_id===snapshotId)return {snapshotId,alreadyPublished:true};
  await client.query('INSERT INTO mart.finance_snapshot_evidence VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[evidence.tenantId,snapshotId,evidence.date,null,operationalDefinitionVersion(),evidence.currency,evidence.sourceCutoff,evidence.sourceRevision,evidence.customers.length,JSON.stringify(evidence.totals)]);
  for(let offset=0;offset<evidence.customers.length;offset+=100){
   await client.query(`INSERT INTO mart.finance_snapshot_customers SELECT $1,$2,customer.id,customer.label,customer.actual,customer.expected FROM jsonb_to_recordset($3::jsonb) customer(id text,label text,actual jsonb,expected jsonb)`,[evidence.tenantId,snapshotId,JSON.stringify(evidence.customers.slice(offset,offset+100))]);
  }
  const revisionId=await promoteFinancePartition(client,{tenantId:evidence.tenantId,snapshotId,date:evidence.date,cutoff:evidence.sourceCutoff});
  await assertSource?.();
  return {snapshotId,revisionId,alreadyPublished:false};
 });
}
export function validateFinanceEvidence(evidence:FinanceSnapshotEvidence) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(evidence.date)||!evidence.customers.length||evidence.customers.length>50000||new Set(evidence.customers.map(customer=>customer.id)).size!==evidence.customers.length)throw new Error('Complete unique Finance population required');
 for(const measure of receivableMeasures){
  let total=0n;
  for(const customer of evidence.customers){
   const actual=customer.actual[measure],expected=customer.expected[measure];
   if(!customer.id||!actual||!isCanonicalDecimal(actual)||actual!==expected)throw new Error('Exact governed customer Finance control required');
   total+=BigInt(actual.replace('.',''));
  }
  if(!isCanonicalDecimal(evidence.totals[measure])||total!==BigInt(evidence.totals[measure]!.replace('.','')))throw new Error('Exact governed Finance summary required');
 }
}
