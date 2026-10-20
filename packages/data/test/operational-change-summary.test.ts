import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import type {TransactionEvidence} from '@el-dabboos/domain';
import {summarizeCandidateChanges} from '../src/operational/candidate-change-summary.ts';
import {planOperationalFacts,operationalFactKey} from '../src/operational/facts.ts';
import type {OperationalBaseline} from '../src/operational/contracts.ts';
import {fact,mapping} from './postgres/fixtures.ts';

function transaction():TransactionEvidence {
 return {sourceCompanyId:'private-company-sentinel',state:'posted',documentType:'out_invoice',paymentState:'not_paid',
  untaxedAmount:'100.000000',taxAmount:'0.000000',totalAmount:'100.000000',currency:'IQD',area:null,
  labels:{customer:'private-old-label',salesperson:null,businessLine:null,state:null},relatedLines:[],
  location:{latitude:'12.000000',longitude:null,shopGps:null}};
}

test('candidate summary counts entries across repeated keys, objects, months and tombstones',()=>{
 const first=fact('same',{sourceObject:'sale_order',businessDate:'2026-01-02'});
 const correction={...first,businessDate:'2026-01-03',sourceRevision:'2'};
 const retired={...correction,status:'tombstone' as const};
 const summary=summarizeCandidateChanges([{next:first},{previous:first,next:correction},{previous:correction,next:retired},
  {next:fact('invoice',{sourceObject:'account_move',businessDate:'2026-02-01'})},
  {next:fact('snapshot',{sourceObject:'receivable_cutoff',businessDate:'2026-03-31',measureId:'outstanding_amount'})}]);
 const {groups,...totals}=summary;
 assert.deepEqual(totals,{entries:5,withoutPrevious:3,withPrevious:2,active:4,tombstone:1});
 assert.deepEqual(groups.map(group=>[group.sourceObject,group.month]),[['account_move','2026-02'],['receivable_cutoff','2026-03'],['sale_order','2026-01']]);
 assert.deepEqual(groups[2],{sourceObject:'sale_order',month:'2026-01',entries:3,withoutPrevious:1,withPrevious:2,
  active:2,tombstone:1,changedFields:{businessDate:1,status:1}});
 assert.deepEqual(groups[0]?.changedFields,{});
 assert.equal(groups.reduce((total,group)=>total+group.entries,0),summary.entries);
});

test('candidate summary attributes nested business fields and never emits their values or identities',()=>{
 const previous=fact('private-record-sentinel',{sourceObject:'account_move',transaction:transaction(),
  dimensions:{customer:'private-old-identity'},displayLabels:{customer:'private-old-label'}});
 const next={...previous,dimensions:{customer:'private-new-identity'},displayLabels:{customer:'private-new-label'},
  transaction:{...previous.transaction!,paymentState:'paid',totalAmount:'987654.123456',labels:{...previous.transaction!.labels,customer:'private-new-label'},
   location:{...previous.transaction!.location!,latitude:'34.000000'},
   relatedLines:[{sourceOrderId:'private-order-sentinel',sourceOrderLineId:'private-line-sentinel',sourceInvoiceLineId:'private-invoice-line-sentinel'}]}};
 const summary=summarizeCandidateChanges([{previous,next}]);
 const changed=summary.groups[0]!.changedFields;
 assert.deepEqual(Object.keys(changed).sort(),['dimensions','dimensions.customer','displayLabels','displayLabels.customer','transaction',
  'transaction.labels','transaction.labels.customer','transaction.location','transaction.location.latitude',
  'transaction.paymentState','transaction.relatedLines','transaction.totalAmount'].sort());
 assert.ok(Object.values(changed).every(count=>count===1));
 assert.equal(summary.entries,1,'parent and child counts are overlapping attributes of one entry');
 const output=JSON.stringify(summary);
 for(const secret of ['private-record-sentinel','private-company-sentinel','private-old-identity','private-new-identity',
  'private-old-label','private-new-label','987654.123456','private-order-sentinel','private-line-sentinel','private-invoice-line-sentinel'])assert.ok(!output.includes(secret));
});

test('candidate planning excludes observation-only and object-key-order differences before diagnostics',async()=>{
 const previous=fact('same',{transaction:transaction()});
 const next={...previous,batchId:'different-batch',sourceAsOf:'2026-10-02T10:00:00.000Z',frozenRevision:'different-freeze',
  sourceRevision:'2',sourceVersion:'v2',sourceUpdatedAt:'2026-10-02T09:00:00.000Z',
  transaction:Object.fromEntries(Object.entries(previous.transaction!).reverse()) as unknown as TransactionEvidence};
 const calls:string[]=[];
 const client={query:async(sql:string)=>{calls.push(sql);return {rows:[{fact_key:operationalFactKey(previous),payload:previous}]};}} as unknown as PoolClient;
 const approved=mapping();
 const baseline:OperationalBaseline={tenantId:'a',sourceId:approved.sourceId,reportingCurrency:'IQD',datasets:[approved.datasetId],
  definitionVersion:'synthetic',mappingVersion:approved.mappingVersion,mappings:[approved],capabilities:{tenantId:'a',mode:'synthetic',releases:[]},from:'2026-01-01',to:'2026-12-31'};
 const changes=await planOperationalFacts(client,baseline,[next]);
 assert.deepEqual(changes,[]);
 assert.deepEqual(summarizeCandidateChanges(changes),{entries:0,withoutPrevious:0,withPrevious:0,active:0,tombstone:0,groups:[]});
 assert.equal(calls.length,1);assert.ok(calls[0]!.startsWith('SELECT'));
});

test('candidate summary distinguishes missing transaction location from explicit null components',()=>{
 const before=transaction();delete before.location;
 const previous=fact('same',{transaction:before});
 const next={...previous,transaction:{...before,location:{latitude:null,longitude:null,shopGps:null}}};
 const fields=summarizeCandidateChanges([{previous,next}]).groups[0]!.changedFields;
 assert.deepEqual(fields,{transaction:1,'transaction.location':1,'transaction.location.latitude':1,
  'transaction.location.longitude':1,'transaction.location.shopGps':1});
});

test('candidate summary buckets unknown source/date content and suppresses unknown field names',()=>{
 const previous=Object.assign(fact('private-record'),{'private-field-sentinel':'private-value-sentinel'});
 const next={...fact('private-record'),sourceObject:'private-object-sentinel',businessDate:'private-date-sentinel'};
 const summary=summarizeCandidateChanges([{previous:{...previous,sourceObject:next.sourceObject,businessDate:next.businessDate},next}]);
 assert.deepEqual(summary.groups[0],{sourceObject:'other',month:'other',entries:1,withoutPrevious:0,withPrevious:1,
  active:1,tombstone:0,changedFields:{unclassified_business_content:1}});
 assert.ok(!JSON.stringify(summary).includes('private-'));
});
