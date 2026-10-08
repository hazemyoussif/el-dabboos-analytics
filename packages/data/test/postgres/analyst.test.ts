import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enabled } from './support.ts';
import { controlDatabase } from './control-support.ts';
import { migrateMetadata } from '../../src/metadata/migrations.ts';
import { seedDemoAdministration } from '../../src/metadata/demo-seed.ts';
import { importSqliteControl } from '../../src/control/import-sqlite.ts';
import { PostgresAdministrationStore } from '../../src/control/administration.ts';
import { DemoIdentityProvider } from '../../../application/src/security.ts';
import { conversationFixture, auditFixture, verifyConversationStorage } from '../analyst-persistence-support.ts';
test('PostgreSQL analyst persistence: control identity separation, private reads, concurrent CAS, audit rollback and fresh scoped actor', {skip:!enabled},async()=>{
 const database=await controlDatabase(),directory=await mkdtemp(join(tmpdir(),'analyst-control-')),path=join(directory,'metadata.db'),sqlite=new DatabaseSync(path);
 migrateMetadata(sqlite,{reconcile:seedDemoAdministration});sqlite.close();
 try{
  await importSqliteControl(path,database.migrator);const store=new PostgresAdministrationStore(database.app),actor=new DemoIdentityProvider().resolve('demo-iq-admin','demo-iq','en');
  await verifyConversationStorage(store.analyst,actor);
  assert.equal((await database.app.query('SELECT COUNT(*) AS count FROM control.analyst_question_audit')).rows[0].count,'1');
  for(const pool of [database.martRuntime,database.martIngestor])await assert.rejects(pool.query('SELECT * FROM control.analyst_conversations'));
  await database.migrator.query("UPDATE control.memberships SET status='suspended' WHERE id='iq-admin'");assert.equal(await store.analyst.append({...conversationFixture(),version:3},2,auditFixture('revoked'),actor),false);
 }finally{await database.close();await rm(directory,{recursive:true,force:true});}
});
