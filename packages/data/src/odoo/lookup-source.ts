import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import type {AnalyticsCursor} from '@el-dabboos/domain';
import type {OdooSourceConfig} from './config.ts';
import type {OdooSnapshotLease} from './snapshot.ts';
import {odooSourceIncrementalWindow} from './source-incremental-window.ts';
import {odooPartnerProjection,odooPartnerPresentation} from './partner-projection.ts';
import type {OdooLookupDependency,OdooLookupRole} from './lookup-types.ts';
export interface OdooLookupProjection {fields:readonly string[];version:string}

function lookupSql(fields:readonly string[]) {
 const presentation=odooPartnerPresentation(fields);
 return `WITH document_links AS MATERIALIZED (
 SELECT partner_id customer_id,user_id salesperson_id,business_line_id FROM sale_order WHERE company_id=ANY($1::int[])
 UNION ALL SELECT partner_id,invoice_user_id,business_line_id FROM account_move WHERE company_id=ANY($1::int[]) AND move_type IN ('out_invoice','out_refund')
 )
 SELECT 'customer'::text object,partner.id::text id,
 jsonb_build_array(partner.name,partner.city,state.id::text,${presentation.area},${presentation.latitude},${presentation.longitude},${presentation.shopGps}) payload
 FROM res_partner partner LEFT JOIN res_country_state state ON state.id=partner.state_id
 WHERE EXISTS(SELECT 1 FROM document_links WHERE customer_id=partner.id)
 AND ($2::timestamp IS NULL OR partner.write_date BETWEEN $2::timestamp AND ($3::timestamptz AT TIME ZONE 'UTC'))
 UNION ALL SELECT 'salesperson',rep.id::text,jsonb_build_array(rep_partner.name)
 FROM res_users rep LEFT JOIN res_partner rep_partner ON rep_partner.id=rep.partner_id
 WHERE EXISTS(SELECT 1 FROM document_links WHERE salesperson_id=rep.id)
 AND ($2::timestamp IS NULL OR greatest(rep.write_date,rep_partner.write_date) BETWEEN $2::timestamp AND ($3::timestamptz AT TIME ZONE 'UTC'))
 UNION ALL SELECT 'business_line',business.id::text,jsonb_build_array(business.name::text)
 FROM business_line business WHERE EXISTS(SELECT 1 FROM document_links WHERE business_line_id=business.id)
 AND ($2::timestamp IS NULL OR business.write_date BETWEEN $2::timestamp AND ($3::timestamptz AT TIME ZONE 'UTC'))
 UNION ALL SELECT 'state',state.id::text,jsonb_build_array(state.name)
 FROM res_country_state state WHERE EXISTS(SELECT 1 FROM res_partner partner JOIN document_links ON customer_id=partner.id WHERE partner.state_id=state.id)
 AND ($2::timestamp IS NULL OR state.write_date BETWEEN $2::timestamp AND ($3::timestamptz AT TIME ZONE 'UTC'))`;
}
/** Version the selected source fields as well as the mapped business projection. */
export async function readOdooLookupProjection(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig):Promise<OdooLookupProjection> {
 const client=await pool.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  const fields=await odooPartnerProjection(pool,client);
  await lease.assertAlive();await client.query('COMMIT');
  return {fields,version:createHash('sha256').update(JSON.stringify(['mapped-lookups-v1',odooPartnerPresentation(fields)])).digest('hex')};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function* readOdooLookupDependencies(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,scope:{cursor:AnalyticsCursor|null;initialize:boolean;projection:OdooLookupProjection}):AsyncGenerator<OdooLookupDependency[]> {
 const lower=scope.initialize?null:(await odooSourceIncrementalWindow(pool,config,{cursor:scope.cursor,cutoff:lease.evidence.sourceAsOf})).modificationFrom;
 const client=await pool.connect();let committed=false;
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  await client.query(`DECLARE odoo_lookup_dependencies NO SCROLL CURSOR WITHOUT HOLD FOR ${lookupSql(scope.projection.fields)}`,[config.companyIds,lower,lease.evidence.sourceAsOf]);
  while(true) {
   await lease.assertAlive();
   const result=await client.query(`FETCH FORWARD ${config.batchSize} FROM odoo_lookup_dependencies`);
   await lease.assertAlive();if(!result.rows.length)break;
   yield result.rows.map(row=>lookupDependency(row));
  }
  await lease.assertAlive();await client.query('COMMIT');committed=true;
 }finally{try{if(!committed)await client.query('ROLLBACK');}finally{client.release();}}
}
function lookupDependency(row:{object:OdooLookupRole;id:string;payload:unknown[]}):OdooLookupDependency {
 const payload=[...row.payload];
 // Canonical city assignment trims whitespace and uses the approved unknown value.
 if(row.object==='customer')payload[1]=typeof payload[1]==='string'?payload[1].trim()||'unassigned':'unassigned';
 return {object:row.object,id:row.id,fingerprint:createHash('sha256').update(JSON.stringify(payload)).digest('hex')};
}
