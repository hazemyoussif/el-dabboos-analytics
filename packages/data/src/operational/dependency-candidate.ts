import type {OdooLookupDependency} from '../odoo/lookup-types.ts';
import type {OperationalPage,OperationDetails,ReceivableDependency} from './contracts.ts';
/** Buffer discovery metadata without writing it under the source snapshot lease. */
export class OperationalDependencyCandidate {
 private readonly receivables:ReceivableDependency[]=[];
 private readonly lookups:OdooLookupDependency[]=[];
 private receivablesComplete=false;
 private lookupProjectionVersion:string|undefined;
 accept(page:OperationalPage) {
  this.receivables.push(...page.receivableDependencies??[]);
  this.lookups.push(...page.lookupDependencies??[]);
  if(page.receivableDependenciesComplete)this.receivablesComplete=true;
  if(page.lookupProjectionVersion)this.lookupProjectionVersion=page.lookupProjectionVersion;
 }
 complete(details:OperationDetails,receivablesInitialized:boolean) {
  if(this.receivablesComplete){details.receivableDependencyRows=this.receivables.length;details.receivableDependencyInitialization=!receivablesInitialized;}
  if(this.lookupProjectionVersion)details.lookupDependencyRows=this.lookups.length;
  return {receivableDependencies:this.receivablesComplete?this.receivables:undefined,
   lookupDependencies:this.lookupProjectionVersion?{dependencies:this.lookups,projectionVersion:this.lookupProjectionVersion}:undefined};
 }
}
