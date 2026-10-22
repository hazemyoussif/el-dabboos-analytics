import test from 'node:test';
import assert from 'node:assert/strict';
import {businessMapping} from '../src/business/definitions.ts';
import {withSalesCommandMapping} from '../src/business/sales-command-mapping.ts';
import {allocationChangeRequests,allocationDeletionRequests} from '../src/business/allocation-impact.ts';

const mapping=withSalesCommandMapping(businessMapping({tenantId:'synthetic',sourceId:'synthetic',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'SYNTHETIC',current:true}),true);
const previousCutoff='2026-10-20T09:00:00.000Z',cutoff='2026-10-20T10:00:00.000Z';
const prior={links:{debitLineId:'100',creditLineId:'200',debitMoveId:'10',creditMoveId:'20'},from:'2026-10-01'};
const change={id:'1',from:'2026-10-02',createdAt:'2026-10-01T00:00:00.000000Z',updatedAt:'2026-10-20T09:30:00.000001Z',
 links:{debitLineId:'300',creditLineId:'400',debitMoveId:'30',creditMoveId:'40'}};

test('allocation relinks request both old and new roots, bounded by observed recipes',()=>{
 const scope={previousCutoff,cutoff,objects:['command_invoice','command_receivable'],initialize:false};
 const requests=allocationChangeRequests(mapping,change,prior,scope);
 assert.deepEqual(requests.filter(request=>request.object==='command_invoice').map(request=>request.id).sort(),['10','20','30','40']);
 assert.deepEqual(requests.filter(request=>request.object==='command_receivable').map(request=>request.id).sort(),['100','200','300','400']);
 assert.equal(requests.length,8);
 assert.deepEqual(allocationChangeRequests(mapping,change,undefined,{...scope,initialize:true}),[]);
 assert.throws(()=>allocationChangeRequests(mapping,change,undefined,scope),/no accepted prior links/);
 const created={...change,createdAt:change.updatedAt};
 assert.deepEqual(allocationChangeRequests(mapping,created,undefined,scope).filter(request=>request.object==='command_invoice').map(request=>request.id),['30','40']);
});

test('allocation deletions require actual retained edges and never fabricate absent graph history',()=>{
 const deletion={id:'1',from:prior.from,allocationLinks:prior.links,dependencyCutoff:previousCutoff,linksCutoff:previousCutoff};
 const requests=allocationDeletionRequests(mapping,[deletion]);
 assert.ok(requests.some(request=>request.object==='command_allocation'&&request.id==='1'));
 assert.deepEqual(requests.filter(request=>request.object==='command_invoice').map(request=>request.id),['10','20']);
 assert.throws(()=>allocationDeletionRequests(mapping,[{...deletion,linksCutoff:cutoff}]),/unknown prior links/);
 assert.throws(()=>allocationDeletionRequests(mapping,[{...deletion,allocationLinks:null}]),/unknown prior links/);
});
