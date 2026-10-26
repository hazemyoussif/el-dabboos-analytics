import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {database,enabled} from './support.ts';
import {initializeOwnedOdooStage} from '../../src/odoo-orm/stage-initialize.ts';
import {createStageSchema,writeStagePage,sealStage} from '../../src/odoo-orm/stage-store.ts';
import {stageModel} from '../../src/odoo-orm/stage-manifest.ts';
import {resolveObservedCopyConfig} from '../../src/odoo-orm/stage-resolve.ts';
import {openOdooReadLease} from '../../src/odoo/read-lease.ts';
import {odooSourceIncrementalWindow} from '../../src/odoo/source-incremental-window.ts';
import type {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';

test('sealed API input resolves exact identity and permits concurrent read-only leases only',{skip:!enabled},async()=>{
 const db=await database(false),lock=await db.admin.connect();
 const pools:Pool[]=[],leases:OdooSnapshotLease[]=[];
 let created=false;
 try{
  await lock.query('SELECT pg_advisory_lock(7415,2)');
  assert.equal((await lock.query("SELECT count(*)::int count FROM pg_roles WHERE rolname IN ('odoo_api_stage_writer','odoo_api_stage_reader')")).rows[0].count,0,'isolated fixture roles must not preexist');
  await lock.query("CREATE ROLE odoo_api_stage_writer LOGIN PASSWORD 'synthetic_writer_only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;CREATE ROLE odoo_api_stage_reader LOGIN PASSWORD 'synthetic_reader_only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE");
  created=true;
  await lock.query('CREATE DATABASE el_dabboos_api_stage OWNER odoo_api_stage_writer');
  await lock.query('REVOKE ALL ON DATABASE el_dabboos_api_stage FROM PUBLIC;GRANT CONNECT ON DATABASE el_dabboos_api_stage TO odoo_api_stage_reader');
  const url=(role:string,password:string)=>{const value=new URL(process.env.PG_TEST_ADMIN_URL!);value.pathname='/el_dabboos_api_stage';value.username=role;value.password=password;return value.toString();};
  const writerUrl=url('odoo_api_stage_writer','synthetic_writer_only'),readerUrl=url('odoo_api_stage_reader','synthetic_reader_only');
  const config={writer:{connectionString:writerUrl},reader:{connectionString:readerUrl}};
  await initializeOwnedOdooStage(config);await initializeOwnedOdooStage(config);
  const writer=new Pool(config.writer);pools.push(writer);
  const schema='api_0123456789abcdef0123456789abcdef';
  const model=stageModel({model:'sale.order',table:'sale_order'},{id:{type:'integer'},amount_total:{type:'monetary'}});
  await createStageSchema(writer,schema,[model]);
  const client=await writer.connect();
  try{await writeStagePage(client,{schema,model},[{id:'7',amount_total:'123.000001'}]);}finally{client.release();}
  const scope={tenantId:'synthetic',sourceId:'synthetic-odoo'};
  const environment={ODOO_ORM_COMPANY_IDS:'1',ODOO_ORM_ACCEPT_OBSERVED:'true',ODOO_ORM_TENANT_ID:scope.tenantId,ODOO_ORM_SOURCE_ID:scope.sourceId,ODOO_ORM_URL:'https://synthetic.invalid/',ODOO_ORM_DATABASE:'synthetic',ODOO_API_STAGE_WRITER_URL:writerUrl,ODOO_API_STAGE_READER_URL:readerUrl};
  await assert.rejects(resolveObservedCopyConfig(environment,scope),/sealed/);
  await sealStage(writer,{schema,...scope,companyIds:['1'],sourceAsOf:'2026-10-25T12:00:00.000Z',fingerprint:'a'.repeat(64),sourceEndpointFingerprint:createHash('sha256').update(JSON.stringify(['https://synthetic.invalid','synthetic'])).digest('hex')},{startedAt:'2026-10-25T11:15:00.000Z'});
  await assert.rejects(resolveObservedCopyConfig({...environment,ODOO_ORM_DATABASE:'foreign'},scope),/identity/);
  const resolved=await resolveObservedCopyConfig({...environment,ODOO_API_STAGE_WRITER_URL:undefined},scope),owner=new Pool({...resolved.connection,max:2});pools.push(owner);
  const first=await openOdooReadLease(owner,{...resolved,snapshotMaxDurationMs:1});leases.push(first);
  await new Promise(resolve=>setTimeout(resolve,10));await first.assertAlive();
  const second=await openOdooReadLease(owner,resolved);leases.push(second);
  assert.equal(first.evidence.sourceAsOf,'2026-10-25T12:00:00.000Z');
  assert.equal(first.evidence.frozenRevision,'orm-observed-copy-v1:'+'a'.repeat(64));
  const reader=new Pool(resolved.connection);pools.push(reader);
  assert.equal((await odooSourceIncrementalWindow(reader,resolved,{cursor:{cutoff:first.evidence.sourceAsOf,objects:{}},cutoff:'2026-10-26T12:00:00.000Z'})).modificationFrom,'2026-10-25 11:13:00.000000');
  const read=await reader.connect();
  try{
   await read.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await first.importInto(read);
   assert.equal((await read.query('SELECT amount_total::text value FROM sale_order')).rows[0].value,'123.000001');
   await assert.rejects(read.query('UPDATE sale_order SET amount_total=0'));
  }finally{await read.query('ROLLBACK');read.release();}
  await Promise.all(leases.map(lease=>lease.close()));
  await writer.query(`GRANT UPDATE ON ${schema}.sale_order TO odoo_api_stage_reader`);
  await assert.rejects(openOdooReadLease(owner,resolved),/no write privileges/);
 }finally{
  await Promise.all(leases.map(lease=>lease.close()));await Promise.all(pools.map(pool=>pool.end()));
  if(created){await lock.query('DROP DATABASE IF EXISTS el_dabboos_api_stage');await lock.query('DROP ROLE odoo_api_stage_reader;DROP ROLE odoo_api_stage_writer');}
  await lock.query('SELECT pg_advisory_unlock(7415,2)');lock.release();await db.close();
 }
});
