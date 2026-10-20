import {dimensions} from '@el-dabboos/domain';
import type {FactRevisionChange} from '@el-dabboos/domain';
import {stableContent} from './facts.ts';

interface FieldSelection {readonly [field:string]:FieldSelection|null}
interface ObservedField {key:string;path:string;children:readonly ObservedField[]}
// Closed schema field names only. Never enumerate source/customer property names into logs.
const fields:FieldSelection={
 tenantId:null,datasetId:null,measureId:null,kind:null,businessDate:null,value:null,entityId:null,
 sourceId:null,sourceObject:null,sourceRecordId:null,componentId:null,mappingId:null,mappingVersion:null,status:null,
 dimensions:Object.fromEntries(dimensions.map(dimension=>[dimension,null])),
 currency:{mode:null,transactionCurrency:null,transactionValue:null,baseCurrency:null,reportingCurrency:null,
  policyReference:null,rate:null,rateDate:null,rateReference:null},
 transaction:{sourceCompanyId:null,state:null,documentType:null,paymentState:null,untaxedAmount:null,taxAmount:null,
  totalAmount:null,currency:null,area:null,relatedLines:null,
  labels:{customer:null,salesperson:null,businessLine:null,state:null},
  location:{latitude:null,longitude:null,shopGps:null}},
 displayLabels:{invoice_document_state:null,invoice_payment_state:null,receipt_state:null,order_state:null,
  customer:null,salesperson:null,businessLine:null,product:null,product_category:null,brand:null,customer_segment:null,
  customer_class:null,uom:null,journal:null,supplier:null,warehouse:null,state:null},
};
const observedFields=selectFields(fields);
export interface CandidateChangeCounts {entries:number;withoutPrevious:number;withPrevious:number;active:number;tombstone:number}
export interface CandidateChangeGroup extends CandidateChangeCounts {
 sourceObject:'sale_order'|'account_move'|'receivable_cutoff'|'other';month:string;changedFields:Record<string,number>;
}
export interface CandidateChangeSummary extends CandidateChangeCounts {groups:CandidateChangeGroup[]}
/** Counts candidate entries, not distinct identities or accepted/committed facts. */
export function summarizeCandidateChanges(changes:readonly FactRevisionChange[]):CandidateChangeSummary {
 const summary:CandidateChangeSummary={...emptyCounts(),groups:[]},groups=new Map<string,CandidateChangeGroup>();
 for(const change of changes) {
  const sourceObject=observedObject(change.next.sourceObject),month=observedMonth(change.next.businessDate);
  const key=`${sourceObject}:${month}`;
  const group=groups.get(key)??{...emptyCounts(),sourceObject,month,changedFields:{}};
  countChange(summary,change);countChange(group,change);
  if(change.previous) {
   if(!countChangedFields(change.previous,change.next,observedFields,group.changedFields))increment(group.changedFields,'unclassified_business_content');
  }
  groups.set(key,group);
 }
 summary.groups=[...groups.values()].sort((left,right)=>left.sourceObject.localeCompare(right.sourceObject)||left.month.localeCompare(right.month));
 return summary;
}
function emptyCounts():CandidateChangeCounts {return {entries:0,withoutPrevious:0,withPrevious:0,active:0,tombstone:0};}
function countChange(counts:CandidateChangeCounts,change:FactRevisionChange) {
 counts.entries++;counts[change.previous?'withPrevious':'withoutPrevious']++;counts[change.next.status]++;
}
function observedObject(object:string):CandidateChangeGroup['sourceObject'] {
 return object==='sale_order'||object==='account_move'||object==='receivable_cutoff'?object:'other';
}
function observedMonth(date:string):string {const month=date.slice(0,7);return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)?month:'other';}
function selectFields(selection:FieldSelection,prefix=''):ObservedField[] {
 return Object.entries(selection).map(([key,children])=>{
  const path=prefix?`${prefix}.${key}`:key;
  return {key,path,children:children?selectFields(children,path):[]};
 });
}
function countChangedFields(previous:unknown,next:unknown,selection:readonly ObservedField[],counts:Record<string,number>):number {
 const before=fieldValues(previous),after=fieldValues(next);let changed=0;
 for(const field of selection) {
  const oldValue=before?.[field.key],newValue=after?.[field.key];
  if(oldValue===newValue||stableContent(oldValue)===stableContent(newValue))continue;
  increment(counts,field.path);changed++;
  if(field.children.length)countChangedFields(oldValue,newValue,field.children,counts);
 }
 return changed;
}
function fieldValues(value:unknown):Record<string,unknown>|undefined {
 return value!==null&&typeof value==='object'?value as Record<string,unknown>:undefined;
}
function increment(counts:Record<string,number>,field:string) {counts[field]=(counts[field]??0)+1;}
