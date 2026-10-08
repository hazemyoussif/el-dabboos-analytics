import type {FastifyInstance} from 'fastify';
import {governedDimensionLabel,semanticCatalog} from '@el-dabboos/domain';
import type {DimensionDiscoveryRequest} from '@el-dabboos/domain';
import type {RouteContext} from '../context.ts';
import {analyticsContext} from '../context.ts';
import {ApiError} from '../errors.ts';
export function registerCustomerDiscovery(app:FastifyInstance,services:RouteContext){
 app.post<{Body:DimensionDiscoveryRequest}>('/api/dimensions/customer/search',{schema:{body:{type:'object',additionalProperties:false,properties:{search:{type:'string',maxLength:100},cursor:{type:'string',maxLength:2000},limit:{type:'integer',minimum:1,maximum:100},selectedIds:{type:'array',maxItems:1000,uniqueItems:true,items:{type:'string',minLength:1,maxLength:500}},metric:{type:'string',enum:Object.keys(semanticCatalog)},asOf:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}}}}},async request=>{
  const {context}=await services.session(request.headers);services.authorize(context,'analytics:query');await services.requireData(context.tenant.tenantId);
  const repository=services.deps.dimensionValues;
  if(!repository.searchDimensionOptions)throw new ApiError(503,'DATA_NOT_READY','Customer search is unavailable.');
  try {
   const page=await repository.searchDimensionOptions('customer',analyticsContext(context),request.body);
   const labels=(options:typeof page.values)=>options.map(option=>({...option,label:governedDimensionLabel(option.id,option.label,context.locale,'customer')}));
   return {...page,values:labels(page.values),selected:labels(page.selected)};
  }catch(error){
   if(error instanceof Error&&error.message.startsWith('Invalid '))throw new ApiError(400,'INVALID_DISCOVERY','Customer search is invalid.');
   if(error instanceof Error&&error.message==='Uncertified customer discovery')throw new ApiError(403,'ACCESS_DENIED','Customer search is unavailable.');
   throw error;
  }
 });
}
