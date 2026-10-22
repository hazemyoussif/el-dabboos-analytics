import type {Pool} from 'pg';
import type {AnalyticsCursor} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {readOdooLookupProjection,readOdooLookupDependencies} from '../odoo/lookup-source.ts';
import type {OdooLookupChanges} from '../odoo/lookup-types.ts';
import type {LookupDependencyContext,OperationalPage} from './contracts.ts';
import {measureOperationalWork} from './progress.ts';
import type {OperationalProgressObserver} from './progress.ts';
/** Fully observe lookups before opening document streams; no extra source client is held. */
export async function* discoverLookupChanges(scope:{pool:Pool;lease:OdooSnapshotLease;config:OdooSourceConfig;observe:OperationalProgressObserver|undefined},cursor:AnalyticsCursor|null,context:LookupDependencyContext|undefined):AsyncGenerator<OperationalPage,{changes:OdooLookupChanges;initialize:boolean}|undefined> {
 if(!context)return;
 const {pool,lease,config,observe}=scope;
 const projection=await measureOperationalWork(observe,'source_lookup_discovery',()=>readOdooLookupProjection(pool,lease,config));
 if(context.projectionVersion&&context.projectionVersion!==projection.version)throw new Error('Lookup projection changed; explicit baseline migration required');
 // A missing fingerprint means that a *polled* lookup is conservatively changed.
 // It does not invalidate the accepted source cursor or select untouched lookups.
 const initialize=!cursor;
 const changes:Record<keyof OdooLookupChanges,string[]>={customer:[],salesperson:[],business_line:[],state:[]};
 const pages=readOdooLookupDependencies(pool,lease,config,{cursor,initialize,projection});
 try {
  while(true) {
   const page=await measureOperationalWork(observe,'source_lookup_discovery',()=>pages.next());
   if(page.done)break;
   const changed=await context.changed(page.value);
   for(const dependency of changed)changes[dependency.object].push(dependency.id);
   yield {object:'lookup_dependency',facts:[],rows:0,lookupDependencies:changed};
  }
 }finally{await pages.return(undefined);}
 yield {object:'lookup_dependency',facts:[],rows:0,lookupProjectionVersion:projection.version};
 return {changes,initialize};
}
