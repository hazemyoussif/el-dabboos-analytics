import type {PoolClient} from 'pg';
import type {AnalyticsContext,AnalyticsQuery} from '@el-dabboos/domain';
import {preparedPublication,preparedQueryFamilies} from './publication-metadata.ts';
import type {PreparedPublication} from './publication-metadata.ts';
import {readPreparedBindings} from './selection.ts';
import type {PreparedBinding} from './read-plan.ts';
import type {PreparedFamily} from './contracts.ts';

/** One authorized execution owns these immutable projections, including failed in-flight loads. */
export class PreparedExecutionReads {
 private readonly publications=new Map<string,Promise<PreparedPublication>>();
 private readonly bindingGroups=new Map<string,Promise<PreparedBinding[]>>();
 constructor(private readonly context:AnalyticsContext){}
 publication(client:PoolClient,query:AnalyticsQuery,revision:string|undefined){
  const families=preparedQueryFamilies(query,this.context),key=JSON.stringify([revision,families]);
  let publication=this.publications.get(key);
  if(!publication){publication=preparedPublication(client,this.context,revision,families);this.publications.set(key,publication);}
  return publication;
 }
 bindings(client:PoolClient,tenantId:string,revision:string,family:PreparedFamily,kind:'event'|'snapshot'){
  if(tenantId!==this.context.tenantId)throw new Error('Prepared execution tenant changed');
  const key=JSON.stringify([revision,family,kind]);
  let bindings=this.bindingGroups.get(key);
  if(!bindings){bindings=readPreparedBindings(client,this.context.tenantId,revision,family,kind);this.bindingGroups.set(key,bindings);}
  return bindings;
 }
}
