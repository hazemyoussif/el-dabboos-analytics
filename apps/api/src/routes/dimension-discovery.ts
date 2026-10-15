import {dimensionOptionLabels} from './dimension-option-labels.ts';
import type {FastifyInstance} from 'fastify';
import {semanticCatalog,categoricalDimensions,UncertifiedDimensionError} from '@el-dabboos/domain';
import type {DimensionDiscoveryRequest,DimensionId} from '@el-dabboos/domain';
import type {RouteContext} from '../context.ts';
import {analyticsContext} from '../context.ts';
import {ApiError} from '../errors.ts';
export function registerDimensionDiscovery(app:FastifyInstance,services:RouteContext){
 app.post<{Body:DimensionDiscoveryRequest;Params:{dimension:string}}>('/api/dimensions/:dimension/search',{schema:{body:{type:'object',additionalProperties:false,properties:{search:{type:'string',maxLength:100},cursor:{type:'string',maxLength:2000},limit:{type:'integer',minimum:1,maximum:100},selectedIds:{type:'array',maxItems:1000,uniqueItems:true,items:{type:'string',minLength:1,maxLength:500}},metric:{type:'string',enum:Object.keys(semanticCatalog)},dateRange:{type:'object',additionalProperties:false,required:['from','to'],properties:{from:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},to:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}}},asOf:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}}}}},async request=>{
  const {context,profile}=await services.session(request.headers);services.authorize(context,'analytics:query');await services.requireData(context.tenant.tenantId);
  const dimension=request.params.dimension as DimensionId;
  if(!categoricalDimensions.includes(dimension))throw new ApiError(400,'INVALID_DISCOVERY','Dimension search is unavailable.');
  const repository=services.deps.dimensionValues;
  if(!repository.searchDimensionOptions)throw new ApiError(503,'DATA_NOT_READY','Dimension search is unavailable.');
  try {
   const page=await repository.searchDimensionOptions(dimension,analyticsContext(context),request.body);
   const labels=(options:typeof page.values)=>dimensionOptionLabels(options,dimension,context.locale,profile);
   return {...page,values:labels(page.values),selected:labels(page.selected)};
  }catch(error){
   if(error instanceof Error&&error.message.startsWith('Invalid '))throw new ApiError(400,'INVALID_DISCOVERY','Dimension search is invalid.');
   if(error instanceof UncertifiedDimensionError)throw new ApiError(403,'ACCESS_DENIED','Dimension search is unavailable.');
   throw error;
  }
 });
}
