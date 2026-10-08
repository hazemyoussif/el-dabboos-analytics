import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SqliteAdministrationStore, migrateMetadata, seedDemoAdministration } from '../src/index.ts';
import { DemoIdentityProvider } from '../../application/src/security.ts';
import { conversationFixture, auditFixture, verifyConversationStorage } from './analyst-persistence-support.ts';
const actor=new DemoIdentityProvider().resolve('demo-iq-admin','demo-iq','en');
test('SQLite analyst control records: private persistence, expiry, atomic audit rollback, concurrent CAS and fresh membership',async()=>{
 const database=new DatabaseSync(':memory:');migrateMetadata(database,{reconcile:seedDemoAdministration});const store=new SqliteAdministrationStore(database);
 try{
  await verifyConversationStorage(store.analyst,actor);assert.equal(database.prepare('SELECT COUNT(*) AS count FROM analyst_question_audit').get()!.count,1);
  database.prepare("UPDATE memberships SET status='suspended' WHERE id='iq-admin'").run();assert.equal(await store.analyst.append({...conversationFixture(),version:3},2,auditFixture('revoked'),actor),false);
 }finally{database.close();}
});
test('SQLite retention removes expired records and caps private conversation history at twenty',async()=>{
 const database=new DatabaseSync(':memory:');migrateMetadata(database,{reconcile:seedDemoAdministration});const store=new SqliteAdministrationStore(database);
 try{
  for(let index=0;index<23;index++)await store.analyst.create({...conversationFixture('conversation-'+index),updatedAt:`2026-10-08T12:00:${String(index).padStart(2,'0')}.000Z`});
  assert.equal((await store.analyst.list({tenantId:'demo-iq',userId:'demo-iq-admin'},conversationFixture().createdAt)).length,20);
  await store.analyst.create({...conversationFixture('new'),createdAt:'2026-12-01T00:00:00.000Z',updatedAt:'2026-12-01T00:00:00.000Z',expiresAt:'2026-12-31T00:00:00.000Z'});assert.equal(database.prepare('SELECT COUNT(*) AS count FROM analyst_conversations').get()!.count,1);
 }finally{database.close();}
});
