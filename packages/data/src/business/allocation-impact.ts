import type {SourceMapping} from '@el-dabboos/domain';
import type {RecordedAllocationDeletion} from '../operational/contracts.ts';
import type {CommandAllocationChange} from './allocation-changes.ts';
import {odooRevision} from '../odoo/cursor.ts';
export interface BusinessIdentityRequest {object:string;id:string}
interface RetainedAllocation {links:NonNullable<RecordedAllocationDeletion['allocationLinks']>;from:string}

/** Both accepted and current edges can invalidate roots after a relink. */
export function allocationChangeRequests(mapping:SourceMapping,change:CommandAllocationChange,retained:RetainedAllocation|undefined,
 scope:{previousCutoff:string;cutoff:string;objects:readonly string[];initialize:boolean}):BusinessIdentityRequest[]{
 if(!Number.isFinite(Date.parse(change.createdAt))||!Number.isFinite(Date.parse(change.updatedAt)))throw new Error('Allocation source timestamps required');
 const priorRevision=BigInt(odooRevision(scope.previousCutoff.replace('T',' ').replace('Z','000')));
 const created=BigInt(odooRevision(change.createdAt.replace('T',' ').replace('Z','')));
 const updated=BigInt(odooRevision(change.updatedAt.replace('T',' ').replace('Z','')));
 if(!scope.initialize&&!retained&&created<=priorRevision&&updated>priorRevision)throw new Error('Changed existing allocation has no accepted prior links; explicit recovery required');
 if(scope.initialize||!retained&&updated<=priorRevision)return [];
 const links=[...(retained?[retained]:[]),{links:change.links,from:change.from}];
 return links.flatMap(dependency=>allocationDeletionRequests(mapping,[{id:change.id,from:dependency.from,allocationLinks:dependency.links,
  dependencyCutoff:scope.cutoff,linksCutoff:scope.cutoff}])).filter(request=>scope.objects.includes(request.object));
}

/** Direct source edges only. This is an impact request, not a claim that every
 * Business recipe's indirect dependencies have been discovered.
 */
export function allocationDeletionRequests(mapping:SourceMapping,deletions:readonly RecordedAllocationDeletion[]):BusinessIdentityRequest[]{
 if(deletions.length>1000)throw new Error('Bounded allocation deletion page required');
 const objects=new Set(mapping.measures.map(rule=>rule.sourceObject)),requests:BusinessIdentityRequest[]=[];
 for(const deletion of deletions){
  const links=deletion.allocationLinks;
  if(!links||!deletion.linksCutoff||deletion.linksCutoff!==deletion.dependencyCutoff)throw new Error('Deleted allocation has unknown prior links; explicit recovery required');
  const linkedIds=[links.debitLineId,links.creditLineId,links.debitMoveId,links.creditMoveId];
  if(!(/^[1-9]\d*$/).test(deletion.id)||linkedIds.some(id=>!(/^[1-9]\d*$/).test(id)))throw new Error('Recorded allocation identity invalid');
  const affected:BusinessIdentityRequest[]=[{object:'command_allocation',id:deletion.id},
   ...[links.debitMoveId,links.creditMoveId].map(id=>({object:'command_invoice',id})),
   ...['command_receivable','business_receivable','business_payable'].flatMap(object=>[links.debitLineId,links.creditLineId].map(id=>({object,id})))];
  requests.push(...affected.filter(request=>objects.has(request.object)));
 }
 return requests;
}
