import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {ownedStageReaderConfig} from './stage-config.ts';
import type {ObservedCopyDescriptor} from './stage-config.ts';

function assertObservedScope(environment:Readonly<Record<string,string|undefined>>,scope:{tenantId:string;sourceId:string}):void {
 if(environment.ODOO_ORM_COMPANY_IDS!=='1'||environment.ODOO_ORM_ACCEPT_OBSERVED!=='true'||environment.ODOO_ORM_TENANT_ID!==scope.tenantId||environment.ODOO_ORM_SOURCE_ID!==scope.sourceId)throw new Error('Explicit owned API source scope required');
}
export async function resolveObservedCopyConfig(environment:Readonly<Record<string,string|undefined>>,scope:{tenantId:string;sourceId:string}):Promise<OdooSourceConfig>{
 assertObservedScope(environment,scope);
 const stage=ownedStageReaderConfig(environment),pool=new Pool(stage.reader);
 try{
  const rows=(await pool.query(`SELECT manifest FROM api_catalog.captures
   WHERE tenant_id=$1 AND source_id=$2 AND ($3::text IS NULL OR schema_name=$3) ORDER BY source_as_of DESC,schema_name DESC LIMIT 1`,
   [scope.tenantId,scope.sourceId,stage.schema??null])).rows;
  if(rows.length!==1)throw new Error('A sealed API input copy is required');
  const copy=rows[0].manifest as ObservedCopyDescriptor;
  const url=environment.ODOO_ORM_URL,database=environment.ODOO_ORM_DATABASE;
  if(!url||!database)throw new Error('Approved Odoo API endpoint identity required');
  const origin=new URL(url).origin;
  const expected=createHash('sha256').update(JSON.stringify([origin,database])).digest('hex');
  if(copy.tenantId!==scope.tenantId||copy.sourceId!==scope.sourceId||copy.sourceEndpointFingerprint!==expected||copy.companyIds.join(',')!=='1')throw new Error('Owned API copy source identity conflict');
  if(!/^api_[a-f0-9]{32}$/.test(copy.schema)||!/^[a-f0-9]{64}$/.test(copy.fingerprint)||!Number.isFinite(Date.parse(copy.sourceAsOf)))throw new Error('Invalid sealed API copy');
  return {...scope,companyIds:['1'],batchSize:500,statementTimeoutMs:15000,snapshotMaxDurationMs:600000,credentialPolicy:'least_privilege',
   observedCopy:copy,connection:{...stage.reader,max:1,options:`-c default_transaction_read_only=on -c search_path=${copy.schema},pg_catalog`}};
 }finally{await pool.end();}
}
