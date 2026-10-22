import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {database} from '../postgres/support.ts';
import {deploy,batch} from '../postgres/fixtures.ts';
import {odooComparisonCandidate} from '../../src/odoo/mapping.ts';
import {mapOdooRecord} from '../../src/odoo/mapper.ts';
import {odooRevision,sourceTimestamp} from '../../src/odoo/cursor.ts';
import type {OdooSourceRow} from '../../src/odoo/rows.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {bootstrapOperationalServing,readBaseline} from '../../src/operational/baseline.ts';
import {refreshOperationalMonths} from '../../src/operational/aggregates.ts';
import {operationalFactKey} from '../../src/operational/facts.ts';

export const historyRowsPerObject=35000;
export const changedRowsPerObject=2000;
export const benchmarkMapping=odooComparisonCandidate({tenantId:'a',sourceId:'fixture',datasetId:'release',mappingId:'synthetic',mappingVersion:'1',businessOwner:'SYNTHETIC PERFORMANCE ONLY',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'});
export const benchmarkBatch={...batch(),companyIds:['1'],sourceAsOf:'2026-01-01T10:00:00.000Z',frozenRevision:'synthetic'};
export function benchmarkRow(object:'sale_order'|'account_move',id='fixture-record'):OdooSourceRow {
 const common={id,company_id:'1',write_date:'2026-01-01 00:00:00.000000',business_date:'2026-01-15',currency:'IQD',currency_id:'87',salesperson_id:'1',salesperson_name:'Synthetic Rep',partner_id:'1',partner_name:'Synthetic Outlet',business_line_id:'1',business_line_name:'Synthetic Line',city:'City 1',state_id:'1',state_name:'Synthetic State',area:null,latitude:null,longitude:null,shop_gps:null,amount_untaxed:'100',amount_tax:'15',amount_total:'115'};
 return object==='sale_order'?{...common,object,state:'sale'}:{...common,object,state:'posted',move_type:'out_invoice',payment_state:'not_paid',order_lineage:[]};
}
export function benchmarkRecord(row:OdooSourceRow){return {object:row.object,recordId:row.id,version:row.write_date,revision:odooRevision(row.write_date),sourceUpdatedAt:sourceTimestamp(row.write_date),change:'upsert' as const,payload:row};}

const sourceSchema=`
 CREATE TABLE public.res_currency(id int primary key,name text);
 CREATE TABLE public.res_partner(id int primary key,name text,city text,state_id int,area text,write_date timestamp);
 CREATE TABLE public.res_country_state(id int primary key,name text,write_date timestamp);
 CREATE TABLE public.res_users(id int primary key,partner_id int,write_date timestamp);
 CREATE TABLE public.business_line(id int primary key,name text,write_date timestamp);
 CREATE TABLE public.sale_order(id int primary key,company_id int,write_date timestamp,date_order timestamp,state text,currency_id int,user_id int,partner_id int,business_line_id int,amount_untaxed numeric,amount_tax numeric,amount_total numeric);
 CREATE TABLE public.account_move(id int primary key,company_id int,write_date timestamp,invoice_date date,state text,currency_id int,invoice_user_id int,partner_id int,business_line_id int,amount_untaxed_signed numeric,amount_tax_signed numeric,amount_total_signed numeric,move_type text,payment_state text);
 CREATE TABLE public.sale_order_line(id int primary key,order_id int);
 CREATE TABLE public.account_move_line(id int primary key,move_id int);
 CREATE TABLE public.sale_order_line_invoice_rel(order_line_id int,invoice_line_id int);
 INSERT INTO public.res_currency VALUES(87,'IQD');
 INSERT INTO public.res_country_state SELECT id,'Synthetic State','2025-01-01' FROM generate_series(1,8) id;
 INSERT INTO public.res_partner SELECT id,'Synthetic Outlet','City '||(id%10+1),id%8+1,NULL,'2025-01-01' FROM generate_series(1,2000) id;
 INSERT INTO public.res_partner VALUES(3000,'Synthetic Rep',NULL,NULL,NULL,'2025-01-01');
 INSERT INTO public.res_users SELECT id,3000,'2025-01-01' FROM generate_series(1,30) id;
 INSERT INTO public.business_line SELECT id,'Synthetic Line','2025-01-01' FROM generate_series(1,6) id;
`;
const businessDate="(date '2025-10-01'+((id-1)%12)*interval '1 month'+((id-1)/12%27)*interval '1 day')::date";
async function seedHistory(db:Awaited<ReturnType<typeof database>>,rowsPerObject:number) {
 await db.admin.query(sourceSchema);
 await db.admin.query(`INSERT INTO public.sale_order SELECT id,1,'2026-01-01',${businessDate},'sale',87,id%30+1,id%2000+1,id%6+1,100,15,115 FROM generate_series(1,$1::int) id`,[rowsPerObject]);
 await db.admin.query(`INSERT INTO public.account_move SELECT id,1,'2026-01-01',${businessDate},'posted',87,id%30+1,id%2000+1,id%6+1,100,15,115,'out_invoice','not_paid' FROM generate_series(1,$1::int) id`,[rowsPerObject]);
 // Fixture-only bulk setup: payload templates come from the production mapper. No measured path bypasses validation.
 for(const object of ['sale_order','account_move'] as const) {
  const templates=mapOdooRecord(benchmarkRecord(benchmarkRow(object)),benchmarkMapping,benchmarkBatch);
  for(const payload of templates)await db.admin.query(`INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload)
   SELECT 'a',replace($1,'"fixture-record"',to_json(id::text)::text),'seed',$2::jsonb||jsonb_build_object('sourceRecordId',id::text,'businessDate',${businessDate}::text,'dimensions',jsonb_build_object('customer','fixture:'||(id%2000+1),'salesperson','fixture:'||(id%30+1),'business_line','fixture:1:'||(id%6+1),'city','City '||((id%2000+1)%10+1),'state','fixture:'||((id%2000+1)%8+1)))
   FROM generate_series(1,$3::int) id`,[operationalFactKey(payload),JSON.stringify(payload),rowsPerObject]);
 }
 await db.admin.query("INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id) SELECT tenant_id,fact_key,revision_id FROM mart.analytics_fact_revisions WHERE tenant_id='a'");
 await db.admin.query('ANALYZE');
}
export async function operationalPerformanceFixture(rowsPerObject=historyRowsPerObject) {
 const db=await database();
 let source:Pool|undefined,owner:Pool|undefined;
 const username=`perf_source_${randomUUID().replaceAll('-','')}`;
 try {
  await deploy(db.migrator,benchmarkMapping);
  await bootstrapOperationalServing(db.migrator,'a');
  await seedHistory(db,rowsPerObject);
  const months=Array.from({length:13},(_,index)=>new Date(Date.UTC(2025,9+index,1)).toISOString().slice(0,7));
  await tenantTransaction(db.migrator,'a',async client=>{
   const parent=(await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
   const revisionId=randomUUID();
   await refreshOperationalMonths(client,{tenantId:'a',revisionId,parent,runId:null,cutoff:benchmarkBatch.sourceAsOf,purpose:'adoption'},months);
   await client.query("UPDATE mart.analytics_trusted_serving SET revision_id=$1 WHERE tenant_id='a'",[revisionId]);
  });
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);
  await db.admin.query(`CREATE ROLE ${username} LOGIN PASSWORD 'SYNTHETIC_PERFORMANCE_ONLY' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  await db.admin.query(`GRANT USAGE ON SCHEMA public TO ${username}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${username}`);
  const url=new URL(process.env.PG_TEST_ADMIN_URL!);url.pathname=(await db.admin.query('SELECT current_database() name')).rows[0].name;url.username=username;url.password='SYNTHETIC_PERFORMANCE_ONLY';
  source=new Pool({connectionString:url.toString(),max:1});owner=new Pool({connectionString:url.toString(),max:1});
  return {db,source,owner,baseline,async close(){await source!.end();await owner!.end();await db.close();const admin=new Pool({connectionString:process.env.PG_TEST_ADMIN_URL});try{await admin.query(`DROP ROLE ${username}`);}finally{await admin.end();}}};
 }catch(error){await source?.end();await owner?.end();await db.close();throw error;}
}
export async function changeSource(db:Awaited<ReturnType<typeof database>>) {
 await db.admin.query("UPDATE public.sale_order SET amount_total=125,amount_tax=25,write_date='2026-10-01' WHERE id<=$1",[changedRowsPerObject]);
 await db.admin.query("UPDATE public.account_move SET amount_untaxed_signed=110,amount_total_signed=125,write_date='2026-10-01' WHERE id<=$1",[changedRowsPerObject]);
 await db.admin.query("UPDATE public.sale_order SET date_order='2026-10-01',partner_id=2000 WHERE id<=20");
 await db.admin.query("UPDATE public.account_move SET invoice_date=NULL,state='draft',write_date='2026-10-01' WHERE id BETWEEN 2001 AND 2100");
 await db.admin.query("INSERT INTO public.account_move SELECT id,1,'2026-10-01',NULL,'draft',87,1,1,1,100,15,115,'out_invoice','not_paid' FROM generate_series(35001,35100) id");
}
