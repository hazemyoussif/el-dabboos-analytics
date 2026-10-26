import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import type {OdooSourceConfig} from '../src/odoo/config.ts';
import {odooSourceIncrementalWindow} from '../src/odoo/source-incremental-window.ts';

const receipt='2026-10-25T12:00:00.000Z',startedAt='2026-10-25T11:15:00.000Z';
const schema='api_0123456789abcdef0123456789abcdef';
const config:OdooSourceConfig={tenantId:'synthetic',sourceId:'source',companyIds:['1'],connection:{},batchSize:500,statementTimeoutMs:120000,snapshotMaxDurationMs:600000,
 observedCopy:{schema,tenantId:'synthetic',sourceId:'source',companyIds:['1'],sourceAsOf:'2026-10-26T12:00:00.000Z',fingerprint:'a'.repeat(64),sourceEndpointFingerprint:'b'.repeat(64)}};
function sourcePool(responses:unknown[][]){
 const calls:{sql:string;parameters:unknown[]}[]=[];
 const pool={query:async(sql:string,parameters:unknown[]=[])=>{calls.push({sql,parameters});return {rows:responses.shift()??[]};}} as unknown as Pool;
 return {pool,calls};
}
const scope={cursor:{cutoff:receipt,objects:{}},cutoff:config.observedCopy!.sourceAsOf};

test('API discovery includes writes during the preceding collection and retains receipt evidence',async()=>{
 const source=sourcePool([[{schema_name:schema,started_at:startedAt}]]);
 const window=await odooSourceIncrementalWindow(source.pool,config,scope);
 assert.equal(window.modificationFrom,'2026-10-25 11:13:00.000000');
 assert.equal(window.sourceCutoff,scope.cutoff);
 assert.ok(Date.parse('2026-10-25T11:40:00Z')>=Date.parse(window.modificationFrom.replace(' ','T')+'Z'));
 assert.deepEqual(source.calls[0]!.parameters,[config.tenantId,config.sourceId,receipt,config.observedCopy!.sourceEndpointFingerprint]);
 await odooSourceIncrementalWindow(source.pool,config,scope);
 assert.equal(source.calls.length,1,'one scoped metadata read per source pool and receipt');
});
test('existing sealed copies recover collection start from their original immutable evidence',async()=>{
 const source=sourcePool([[{schema_name:schema,started_at:null}],[{started_at:startedAt}]]);
 assert.equal((await odooSourceIncrementalWindow(source.pool,config,scope)).modificationFrom,'2026-10-25 11:13:00.000000');
 assert.match(source.calls[1]!.sql,/__capture WHERE id=1 AND sealed/);
});
test('direct-source and initial cursors do not read the API catalog',async()=>{
 const source=sourcePool([]),{observedCopy,...direct}=config;void observedCopy;
 assert.equal((await odooSourceIncrementalWindow(source.pool,direct,scope)).modificationFrom,'2026-10-25 11:58:00.000000');
 assert.equal((await odooSourceIncrementalWindow(source.pool,config,{...scope,cursor:null})).modificationFrom,'1970-01-01 00:00:00.000000');
 assert.equal(source.calls.length,0);
});
test('former direct-source receipts preserve ordinary overlap and cutoff regression stays rejected',async()=>{
 const source=sourcePool([[]]);
 assert.equal((await odooSourceIncrementalWindow(source.pool,config,scope)).modificationFrom,'2026-10-25 11:58:00.000000');
 await assert.rejects(odooSourceIncrementalWindow(source.pool,config,{...scope,cutoff:'2026-10-25T11:00:00Z'}),/regress/);
 assert.equal(source.calls.length,1);
});
test('invalid API intervals and schema identifiers are rejected without interpolating SQL',async()=>{
 for(const row of [{schema_name:'public; DROP TABLE source',started_at:startedAt},{schema_name:schema,started_at:'invalid'},{schema_name:schema,started_at:'2026-10-25T12:30:00Z'}]){
  const source=sourcePool([[row]]);await assert.rejects(odooSourceIncrementalWindow(source.pool,config,scope),/Invalid API/);
  assert.equal(source.calls.length,1);
 }
});
