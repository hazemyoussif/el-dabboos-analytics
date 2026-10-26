import {DefaultAuthorizationPolicy,ProductsWarehousesReport,validateProductsWarehousesInput,CustomerProductCoverageReport} from '@el-dabboos/application';
import {syntheticCapabilities,validateCoverageInput,CustomerProductCoverageUnavailable} from '@el-dabboos/domain';
import type {FastifyInstance} from 'fastify';
import type {RouteContext} from '../context.ts';
import {ApiError} from '../errors.ts';

export function registerProductsWarehousesRoutes(app:FastifyInstance,services:RouteContext):void {
 registerCoverageRoute(app,services);
 const report=new ProductsWarehousesReport({repository:services.deps.analyticsRepository,policy:services.deps.authorizationPolicy??new DefaultAuthorizationPolicy(),published:context=>services.deps.publishedCapabilities?.getPublishedCapabilities(context)??Promise.resolve(syntheticCapabilities(context)),clock:services.clock,options:{...(services.deps.executionConcurrency===undefined?{}:{maxConcurrency:services.deps.executionConcurrency})}});
 app.post('/api/reports/products-warehouses',async request=>{
  const {context,profile}=await services.session(request.headers);
  services.authorize(context,'dashboard:view','analytics:query');
  await services.requireData(context.tenant.tenantId);
  return services.checked(context,'analytics.query',async()=>{
   const input=request.body;
   try{validateProductsWarehousesInput(input);}catch{throw new ApiError(400,'INVALID_REPORT_FILTERS','Invalid Products & Warehouses filters.');}
   return report.execute(input,context,profile);
  });
 });
}
function registerCoverageRoute(app:FastifyInstance,services:RouteContext){
 app.post('/api/reports/products-warehouses/coverage',async request=>{
  const {context}=await services.session(request.headers);
  services.authorize(context,'dashboard:view','analytics:query');
  await services.requireData(context.tenant.tenantId);
  return services.checked(context,'analytics.query',async()=>{
   const input=request.body;
   try{validateCoverageInput(input);}catch{throw new ApiError(400,'INVALID_REPORT_FILTERS','Invalid customer product coverage filters.');}
   if(!services.deps.customerProductCoverage)throw new ApiError(503,'COVERAGE_UNAVAILABLE','Customer product coverage is not published.');
   const report=new CustomerProductCoverageReport(services.deps.customerProductCoverage,services.deps.authorizationPolicy??new DefaultAuthorizationPolicy());
   try{return await report.execute(input,context);}
   catch(error){if(error instanceof CustomerProductCoverageUnavailable)throw new ApiError(503,'COVERAGE_UNAVAILABLE',error.message);throw error;}
  });
 });
}
