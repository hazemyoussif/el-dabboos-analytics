import type {Pool} from 'pg';
import {inventoryAvailabilityMetricIds,validateSourceMapping} from '@el-dabboos/domain';
import type {SourceMapping} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {reviewBusinessDate} from '../review/cutoff.ts';
import {exposeBusinessDeltaMonth} from '../review/exposure.ts';
import {commandSyncMembers} from './command-sync.ts';
import {OdooBusinessReader} from './source.ts';
import {inventoryAvailabilityObject,withInventoryAvailabilityMapping} from './inventory-availability-mapping.ts';
import {stableContent} from '../operational/facts.ts';

/** Observe one complete current recipe through the shared controlled publication
 * path. Every unrelated accepted recipe and its source clock remain unchanged.
 * This operator is never called from a report request or a source timer.
 */
export async function observeInventoryAvailability(scope:{mart:Pool;owner:Pool;reader:Pool;config:OdooSourceConfig;month:string}){
 const member=(await commandSyncMembers(scope.mart,scope.config.tenantId)).find(candidate=>candidate.month===scope.month);
 if(!member)throw new Error('Accepted current Business member required');
 const mapping=registeredInventoryAvailabilityMapping(member.mapping);
 const lease=await OdooSnapshotLease.open(scope.owner,scope.config,scope.config.snapshotMaxDurationMs,scope.config.credentialPolicy);
 try{
  if(scope.month!==reviewBusinessDate(lease.evidence.sourceAsOf,mapping.measures[0]!.timeZone).slice(0,7))throw new Error('Inventory observation requires the current source month');
  const source=new OdooBusinessReader(scope.reader,scope.config,lease,{month:scope.month,mapping,objects:[inventoryAvailabilityObject]});
  return await exposeBusinessDeltaMonth(scope.mart,{
   tenantId:scope.config.tenantId,month:scope.month,mapping,cutoff:lease.evidence.sourceAsOf,revision:lease.evidence.frozenRevision,
   observedObjects:[inventoryAvailabilityObject],replaceObjects:[inventoryAvailabilityObject],replacements:emptyReplacements(),
   discover:request=>discoverInventoryAvailability(source,request),
   readReplacements:(object,ids)=>source.replacements(object,ids),identityControls:(object,ids)=>source.identityControls(object,ids),
   controls:()=>source.controls(),assertAlive:()=>lease.assertAlive(),completeSourceRead:async()=>{await lease.assertAlive();await lease.close();},
  });
 }finally{await lease.close();}
}
/** Full source counts prove the discovered population, including an empty one.
 * The shared publisher independently compares every requested identity's values.
 */
export async function discoverInventoryAvailability(source:Pick<OdooBusinessReader,'identities'|'controls'>,request:(object:string,ids:readonly string[])=>Promise<void>){
 let identities=0;
 await source.identities(inventoryAvailabilityObject,async ids=>{identities+=ids.length;await request(inventoryAvailabilityObject,ids);});
 const controls=await source.controls();
 const summaries=controls.filter(control=>control.dimensions===null);
 if(summaries.length!==inventoryAvailabilityMetricIds.length||inventoryAvailabilityMetricIds.some(measure=>summaries.find(control=>control.measure===measure)?.count!==String(identities)))throw new Error('Complete inventory source population controls required');
}
export function registeredInventoryAvailabilityMapping(mapping:SourceMapping):SourceMapping{
 validateSourceMapping(mapping);
 const owns=(metric:string)=>inventoryAvailabilityMetricIds.some(candidate=>candidate===metric);
 const previous={...mapping,measures:mapping.measures.filter(rule=>!owns(rule.measureId)),capabilities:mapping.capabilities.filter(capability=>!owns(capability.metric))};
 const expected=withInventoryAvailabilityMapping(previous);
 if(mapping.measures.some(rule=>owns(rule.measureId))&&stableContent(mapping)!==stableContent(expected))throw new Error('Registered inventory availability definitions required');
 return expected;
}
async function* emptyReplacements():AsyncGenerator<never>{/* Shared discovery supplies complete current and disappeared identities. */}
