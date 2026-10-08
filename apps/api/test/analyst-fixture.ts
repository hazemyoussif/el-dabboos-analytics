import { DatabaseSync } from 'node:sqlite';
import { buildApi } from '../src/app.ts';
import { MockAnalyticsRepository, SqliteAdministrationStore, migrateMetadata, seedDemoAdministration } from '@el-dabboos/data';
import { demoUsers, StructuredAnalyticsPlanner } from '@el-dabboos/application';
import type { AnalyticsContext, AnalyticsQuery, AnalystConversation, LLMProvider, StructuredOutputRequest } from '@el-dabboos/domain';
export const analystClock=()=>new Date('2026-10-08T12:00:00.000Z');
export const analystPeriod={dateRange:{from:'2026-09-01',to:'2026-09-30'}};
export const analystHeaders={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'en'};
export const scalarIntent={status:'SUPPORTED',intent:{context:{},analyses:[{series:[{metric:'order_revenue'}]}]}};
export class AnalystFixtureProvider implements LLMProvider {
 requests:StructuredOutputRequest[]=[];
 constructor(public outputs:unknown[]){}
 async generateStructured(request:StructuredOutputRequest) {this.requests.push(request);const output=this.outputs.shift();if(output instanceof Error)throw output;return {output:structuredClone(output),providerId:'synthetic-local-compatible',latencyMs:1,attempts:1};}
}
export async function analystFixture(outputs:unknown[],synthesis?:LLMProvider) {
 const database=new DatabaseSync(':memory:');migrateMetadata(database,{reconcile:seedDemoAdministration});const store=new SqliteAdministrationStore(database);
 const provider=new AnalystFixtureProvider(outputs);
 const facts=[{tenantId:'demo-iq',measureId:'order_revenue' as const,date:'2026-09-10',value:100,dimensions:{salesperson:'rep:a',branch:'baghdad',business_line:'general'}},{tenantId:'demo-iq',measureId:'order_revenue' as const,date:'2026-09-10',value:250,dimensions:{salesperson:'rep:b',branch:'basra',business_line:'no_sugar'}},{tenantId:'demo-iq',measureId:'order_revenue' as const,date:'2026-09-10',value:75,dimensions:{salesperson:'rep:c',branch:'baghdad',business_line:'general'}}];
 for(const month of ['05','06','07','08'])facts.push({tenantId:'demo-iq',measureId:'order_revenue',date:`2026-${month}-10`,value:5,dimensions:{salesperson:'rep:c',branch:'baghdad',business_line:'general'}});
 const base=new MockAnalyticsRepository([...facts,...facts.map(fact=>({...fact,measureId:'revenue' as const}))],{clock:analystClock}),queries:AnalyticsQuery[]=[],contexts:AnalyticsContext[]=[];
 const repository={listDimensionValues:base.listDimensionValues.bind(base),execute:async(query:AnalyticsQuery,context:AnalyticsContext)=>{queries.push(query);contexts.push(context);const result=await base.execute(query,context);result.metadata.dimensionLabels={'rep:a':'Ahmed Ali','rep:b':'Noor Hassan','rep:c':'Sara Omar',general:'General',no_sugar:'No Sugar'};result.metadata.sourceAsOf=analystClock().toISOString();result.metadata.release={datasetId:'test-release',sourceId:'test-mart',mappingId:'mapping',mappingVersion:'1',certificationReference:'fixture-certification'};return result;}};
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,clock:analystClock,analystRepository:store.analyst,analystPlanner:new StructuredAnalyticsPlanner(provider,{clock:analystClock}),...(synthesis?{analystSynthesis:synthesis}:{}),administration:{unitOfWork:store,directory:store.directory,profiles:store.profiles,dataReady:async()=>true,principals:async()=>demoUsers,authenticate:async headers=>{const user=headers['x-demo-user-id'];if(typeof user!=='string')throw Object.assign(new Error('Identity required'),{statusCode:401});return `synthetic:${user}`;}},drillThroughRepository:{drill:async request=>({rows:[],hasMore:false,release:request.release,grain:'canonical_measure_fact',bases:{order_revenue:'250.000000'},value:'250.000000'})}},{identityMode:'synthetic'});
 // Synthetic scoped manager is explicitly granted the analyst role in this fixture only.
 database.prepare("INSERT INTO membership_roles VALUES ('iq-baghdad','analyst','demo-iq')").run();
 async function create(headers=analystHeaders) {const response=await app.inject({method:'POST',url:'/api/ai-analyst/conversations',headers});return response.json() as AnalystConversation;}
 async function ask(conversation:AnalystConversation,question:string,extra:object={},headers=analystHeaders) {return app.inject({method:'POST',url:`/api/ai-analyst/conversations/${conversation.id}/messages`,headers,payload:{question,expectedVersion:conversation.version,...extra}});}
 return {app,provider,database,store,queries,contexts,create,ask,async close(){await app.close();database.close();}};
}
