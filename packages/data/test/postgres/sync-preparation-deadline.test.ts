import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {SyncContext} from '../../src/operational/sync-context.ts';

test('background sync preparation allows the established finite budget and restores ordinary transaction limits',{skip:!enabled},async()=>{
 const db=await database(false),client=await db.admin.connect();
 try{
  const context=new SyncContext(client,'synthetic');
  const original=(await client.query('SHOW statement_timeout')).rows[0].statement_timeout;
  await context.transaction(async()=>{assert.equal((await client.query('SHOW statement_timeout')).rows[0].statement_timeout,'10min');},undefined,600000);
  assert.equal((await client.query('SHOW statement_timeout')).rows[0].statement_timeout,original);
  await context.transaction(async()=>{assert.equal((await client.query('SHOW statement_timeout')).rows[0].statement_timeout,'15s');});
  await assert.rejects(context.transaction(async()=>{throw new Error('synthetic preparation failure');},undefined,600000),/synthetic preparation failure/);
  assert.equal((await client.query('SHOW statement_timeout')).rows[0].statement_timeout,original);
 }finally{client.release();await db.close();}
});
