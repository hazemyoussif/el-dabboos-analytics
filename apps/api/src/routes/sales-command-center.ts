import {DefaultAuthorizationPolicy,SalesCommandCenter,validateSalesCommandInput} from '@el-dabboos/application';
import {syntheticCapabilities} from '@el-dabboos/domain';
import type {FastifyInstance} from 'fastify';
import type {RouteContext} from '../context.ts';
import {ApiError} from '../errors.ts';

export function registerSalesCommandCenterRoutes(app:FastifyInstance,services:RouteContext):void {
 const report=new SalesCommandCenter({repository:services.deps.analyticsRepository,policy:services.deps.authorizationPolicy??new DefaultAuthorizationPolicy(),published:context=>services.deps.publishedCapabilities?.getPublishedCapabilities(context)??Promise.resolve(syntheticCapabilities(context)),clock:services.clock,options:{...(services.deps.executionConcurrency===undefined?{}:{maxConcurrency:services.deps.executionConcurrency})}});
 app.post('/api/reports/sales-command-center',async request=>{
  const {context,profile}=await services.session(request.headers);
  services.authorize(context,'dashboard:view','analytics:query');
  await services.requireData(context.tenant.tenantId);
  return services.checked(context,'analytics.query',async()=>{
   const input=request.body;
   try{validateSalesCommandInput(input);}catch{throw new ApiError(400,'INVALID_REPORT_FILTERS','Invalid Sales Command Center filters.');}
   return report.execute(input,context,profile);
  });
 });
}
