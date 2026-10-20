import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {database} from './support.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';

export async function sourceFixture() {
  const db = await database();
  const username = `source_${randomUUID().replaceAll('-','')}`;
  const url = new URL(process.env.PG_TEST_ADMIN_URL!);
  url.pathname=(await db.admin.query('SELECT current_database() name')).rows[0].name;
  const setup = `
 CREATE TABLE public.res_currency(id int primary key,name text);
 CREATE TABLE public.res_partner(id int primary key,name text,city text,state_id int,area text,is_company boolean,write_date timestamp);
 CREATE TABLE public.res_country_state(id int primary key,name text,write_date timestamp);
 CREATE TABLE public.res_users(id int primary key,partner_id int,write_date timestamp);
 CREATE TABLE public.business_line(id int primary key,name text,write_date timestamp);
 CREATE TABLE public.sale_order(id int primary key,company_id int,write_date timestamp,date_order timestamp,state text,currency_id int,user_id int,create_uid int,partner_id int,business_line_id int,amount_untaxed numeric,amount_tax numeric,amount_total numeric);
 CREATE TABLE public.account_move(id int primary key,company_id int,write_date timestamp,invoice_date date,state text,currency_id int,invoice_user_id int,partner_id int,business_line_id int,amount_untaxed_signed numeric,amount_tax_signed numeric,amount_total_signed numeric,move_type text,payment_state text);
 CREATE TABLE public.sale_order_line(id int primary key,order_id int);
 CREATE TABLE public.account_move_line(id int primary key,move_id int);
 CREATE TABLE public.sale_order_line_invoice_rel(order_line_id int,invoice_line_id int);
 INSERT INTO public.res_currency VALUES (87,'IQD');
 INSERT INTO public.res_partner VALUES (20,'Synthetic Outlet',NULL,NULL,NULL,false,'2026-09-01'),(70,'Synthetic Rep',NULL,NULL,NULL,false,'2026-09-01');
 INSERT INTO public.res_users VALUES (7,70,'2026-09-01');
 INSERT INTO public.business_line VALUES (1,'General','2026-09-01'),(2,'No Sugar','2026-10-01');
 INSERT INTO public.sale_order
 SELECT id,1,'2026-10-01 10:00:00.123456','2026-09-15','sale',87,7,999,20,1,
 CASE WHEN id=2893 THEN 14597500 ELSE 500000 END,0,CASE WHEN id=2893 THEN 14597500 ELSE 500000 END FROM generate_series(1,2893) id;
 INSERT INTO public.sale_order VALUES (4000,2,'2026-10-01','2026-09-15','sale',87,7,999,20,1,999,0,999);
 INSERT INTO public.account_move VALUES
 (1,1,'2026-10-01 10:00:00.123456','2026-09-15','posted',87,7,20,1,1465712000,0,1465712000,'out_invoice','not_paid'),
 (2,1,'2026-10-01 10:00:00.123456','2026-09-20','posted',87,NULL,20,1,-18545500,0,-18545500,'out_refund','not_paid'),
 (3,1,'2026-10-01 10:00:00.123456','2026-10-01','posted',87,7,20,2,-100,0,-100,'out_refund','not_paid');
 INSERT INTO public.sale_order_line VALUES (11,1),(12,1);
 INSERT INTO public.account_move_line VALUES (21,1),(22,1);
 INSERT INTO public.sale_order_line_invoice_rel VALUES (11,21),(12,22);
 `;
  try {
    await db.admin.query(setup);
    await db.admin.query('ALTER TABLE public.res_users ADD COLUMN state text');
    await db.admin.query(`CREATE ROLE ${username} LOGIN PASSWORD 'SYNTHETIC_SOURCE_ONLY' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
    await db.admin.query(`GRANT USAGE ON SCHEMA public TO ${username}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${username}`);
    url.username=username;url.password='SYNTHETIC_SOURCE_ONLY';
    const source = new Pool({ connectionString: url.toString(),max: 1 });
    const ownerPool = new Pool({ connectionString: url.toString(),max: 1 });
    const snapshots: OdooSnapshotLease[] = [];
    return { db,source,async openSnapshot(durationMs=600000) { const snapshot = await OdooSnapshotLease.open(ownerPool,{ tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg' },durationMs); snapshots.push(snapshot); return snapshot; },async close() { for (const snapshot of snapshots) await snapshot.close(); await ownerPool.end(); await source.end(); await db.close(); const admin = new Pool({ connectionString: process.env.PG_TEST_ADMIN_URL }); try { await admin.query(`DROP ROLE ${username}`); } finally { await admin.end(); } } };
  } catch (error) { await db.close(); throw error; }
}
