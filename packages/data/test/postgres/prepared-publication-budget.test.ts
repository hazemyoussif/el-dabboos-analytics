import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,changedInvoice} from './business-delta-fixture.ts';
import {exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {prepareActivatedPublication} from '../../src/prepared/publication.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

test('background publication allows complete proofs and restores the caller deadline without changing runtime defaults',{skip:!enabled},async()=>{
 const fixture=await deltaFixture();
 try{
  await fixture.db.admin.query(`CREATE FUNCTION mart.test_preparation_deadline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
   IF current_setting('statement_timeout')<>'10min' THEN RAISE EXCEPTION 'Background proof deadline required'; END IF; RETURN NEW;
   END $$; CREATE TRIGGER test_preparation_deadline BEFORE INSERT ON mart.prepared_bindings FOR EACH ROW EXECUTE FUNCTION mart.test_preparation_deadline()`);
  const cutoff='2026-10-21T09:00:00.000Z';
  const publication=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,cutoff,[{object:'command_invoice',id:'10',facts:changedInvoice(fixture.initial,cutoff)}]));
  await tenantTransaction(fixture.db.ingestor,'a',async client=>{
   await prepareActivatedPublication(client,{tenantId:'a',revisionId:publication.revisionId});
   assert.equal((await client.query("SELECT current_setting('statement_timeout') timeout")).rows[0].timeout,'2s');
  },false,2000);
  await tenantTransaction(fixture.db.runtime,'a',async client=>{
   assert.equal((await client.query("SELECT current_setting('statement_timeout') timeout")).rows[0].timeout,'15s');
  },true);
 }finally{await fixture.db.close();}
});
