import assert from 'node:assert/strict';
import test from 'node:test';
import {inventoryAvailabilityMetricIds,productMetricCatalog,semanticCatalog,validateQuery,preparedReadDimensions} from '@el-dabboos/domain';
import {businessMapping,businessDefinitionVersion} from '../src/business/definitions.ts';
import {withInventoryAvailabilityMapping,inventoryAvailabilityObject} from '../src/business/inventory-availability-mapping.ts';
import {compatibleBusinessDeltaMapping} from '../src/business/delta-mapping.ts';
import {withSalesCommandMapping} from '../src/business/sales-command-mapping.ts';
import {registeredInventoryAvailabilityMapping,discoverInventoryAvailability} from '../src/business/inventory-availability-observation.ts';
import {executeFacts} from '../src/engine.ts';
const context={tenantId:'fixture',locale:'en' as const};
test('inventory availability preserves source definitions, quantity safety, tenant policy and snapshot selection',()=>{
 const base=businessMapping({tenantId:'fixture',sourceId:'source',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'SYNTHETIC AVAILABILITY',current:true});
 assert.throws(()=>withInventoryAvailabilityMapping(base),/extended Business/);
 const original=withSalesCommandMapping(base,true);
 const before=businessDefinitionVersion(),extended=withInventoryAvailabilityMapping(original);
 assert.deepEqual(extended.measures.slice(0,original.measures.length),original.measures);
 assert.deepEqual(extended.capabilities.slice(0,original.capabilities.length),original.capabilities);
 assert.equal(extended.measures.filter(rule=>rule.sourceObject===inventoryAvailabilityObject).length,3);
 assert.equal(businessDefinitionVersion(),before);
 assert.deepEqual(registeredInventoryAvailabilityMapping(original),extended);
 assert.deepEqual(registeredInventoryAvailabilityMapping(extended),extended);
 assert.ok(compatibleBusinessDeltaMapping(original,extended));
 assert.throws(()=>withInventoryAvailabilityMapping(extended),/already present/);
 const modified={...extended,measures:extended.measures.map((rule,index)=>index===0?{...rule,signConvention:'changed'}:rule)};
 assert.equal(compatibleBusinessDeltaMapping(original,modified),false);
 assert.throws(()=>registeredInventoryAvailabilityMapping({...extended,measures:extended.measures.map(rule=>rule.sourceObject===inventoryAvailabilityObject?{...rule,signConvention:'changed'}:rule)}),/Registered inventory/);
 for(const metric of inventoryAvailabilityMetricIds){
  assert.equal(productMetricCatalog.find(entry=>entry.id===metric)?.domain,'inventory');
  assert.equal(semanticCatalog[metric].semantics.kind,'snapshot');
 }
 assert.throws(()=>validateQuery({metric:'free_stock_quantity'},context),/Quantity/);
 assert.deepEqual(preparedReadDimensions({metric:'free_stock_quantity',groupBy:'product'},context),['product','uom']);
 const query={metric:'free_stock_value' as const,groupBy:'product' as const,dateRange:{from:'2026-10-01',to:'2026-10-25'}};
 const rows=executeFacts([
  {tenantId:'fixture',measureId:'free_stock_value',date:'2026-10-15',value:100,entityId:'product-warehouse',dimensions:{product:'p',warehouse:'w'}},
  {tenantId:'fixture',measureId:'free_stock_value',date:'2026-10-24',value:40,entityId:'product-warehouse',dimensions:{product:'p',warehouse:'w'}},
  {tenantId:'other',measureId:'free_stock_value',date:'2026-10-24',value:999,entityId:'foreign',dimensions:{product:'p',warehouse:'w'}},
 ],query,context,{sourceId:'synthetic',executedAt:'2026-10-25T00:00:00Z'}).rows;
 assert.deepEqual(rows,[{key:'p',value:40}]);
});
test('complete inventory discovery requires independent population counts, including explicit empty evidence',async()=>{
 const summaries=(count:string)=>inventoryAvailabilityMetricIds.map(measure=>({measure,dimensions:null,value:'0.000000',count}));
 const requested:string[]=[];
 await discoverInventoryAvailability({identities:async(_object,consume)=>consume(['10:1','10:unassigned']),controls:async()=>summaries('2')},async(object,ids)=>{assert.equal(object,inventoryAvailabilityObject);requested.push(...ids);});
 assert.deepEqual(requested,['10:1','10:unassigned']);
 await discoverInventoryAvailability({identities:async()=>{},controls:async()=>summaries('0')},async()=>{throw new Error('Empty population must not request identities');});
 for(const controls of [summaries('1'),[],summaries('0').slice(1)])await assert.rejects(discoverInventoryAvailability({identities:async()=>{},controls:async()=>controls},async()=>{}),/population controls/);
});
