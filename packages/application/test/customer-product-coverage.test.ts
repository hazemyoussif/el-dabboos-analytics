import assert from 'node:assert/strict';
import test from 'node:test';
import {validateCoverageInput} from '@el-dabboos/domain';
import type {CustomerProductCoverageRepository} from '@el-dabboos/domain';
import {CustomerProductCoverageReport,DefaultAuthorizationPolicy,DemoIdentityProvider} from '../src/index.ts';

test('coverage input is closed, bounded and cannot override tenant, publication or access scope',()=>{
 for(const input of [null,[],{tenantId:'other'},{revision:'other'},{year:2026.5},{status:'unknown'},{limit:0},{limit:201},{cursor:1},{filters:[{dimension:'state',values:['invoice-state']}]},{filters:[{dimension:'customer_tag',values:[]}]},{filters:[{dimension:'customer',values:['']}]},{filters:[{dimension:'customer',values:['one'],operator:'exclude'}]}])assert.throws(()=>validateCoverageInput(input));
 validateCoverageInput({year:2026,status:'unsold',limit:100,filters:[{dimension:'customer_tag',values:['one','two']}]});
});
test('coverage authorizes sales, customers and inventory and preserves every enforced predicate',async()=>{
 const identity=new DemoIdentityProvider(),admin=identity.resolve('demo-iq-admin','demo-iq','en');
 let calls=0;
 const repository:CustomerProductCoverageRepository={async readCoverage(input,context){calls++;assert.equal(context.tenantId,'demo-iq');assert.deepEqual(context.enforcedFilters,admin.authorization.enforcedFilters);assert.equal(input.status,'unsold');return {rows:[],years:[2026],year:2026,total:0,sold:0,unsold:0,excludedProducts:0,through:'2026-10-25',revision:'synthetic'};}};
 const report=new CustomerProductCoverageReport(repository,new DefaultAuthorizationPolicy());
 await report.execute({status:'unsold'},admin);assert.equal(calls,1);
 await assert.rejects(report.execute({},identity.resolve('demo-iq-sales-analyst','demo-iq','en')));
 await assert.rejects(report.execute({},identity.resolve('demo-iq-baghdad-manager','demo-iq','en')));
 assert.equal(calls,1,'unsupported policy filters must fail closed before reading');
});
