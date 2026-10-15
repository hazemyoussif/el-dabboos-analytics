import type {FastifyInstance} from 'fastify';
import {assertPublishedDashboard,validateDashboardFilterOverrides,windowedWidget} from '@el-dabboos/application';
import type {WidgetWindowRequest} from '@el-dabboos/application';
import {workspacePublishedCapabilities} from '../published-analytics.ts';
import {analyticsContext} from '../context.ts';
import type {RouteContext} from '../context.ts';
import {ApiError,object} from '../errors.ts';

export function registerResultWindowRoutes(app:FastifyInstance,services:RouteContext){
 app.post<{Params:{id:string}}>('/api/dashboards/widgets/:id/window',async request=>{
  const {context,profile}=await services.session(request.headers);
  return services.checked(context,'dashboard.execute',async()=>{
   services.authorize(context,'dashboard:view','analytics:query');
   await services.requireData(context.tenant.tenantId);
   if(!object(request.body)||Object.keys(request.body).some(key=>!['dashboard','overrides','window'].includes(key)))throw invalidWindow();
   const dashboard=services.ensureDashboard(request.body.dashboard,context),window=validateWindow(request.body.window);
   const widget=dashboard.widgets.find(widget=>widget.id===request.params.id);
   if(!widget||!windowedWidget(widget)||!services.deps.analyticsRepository.supportsResultWindows)throw invalidWindow();
   if(request.body.overrides!==undefined)validateDashboardFilterOverrides(request.body.overrides);
   const overrides=request.body.overrides as import('@el-dabboos/application').DashboardFilterOverrides|undefined;
   assertPublishedDashboard(dashboard,await workspacePublishedCapabilities(services,context),profile.timeZone,services.clock(),overrides);
   return services.executor.executeWidget(dashboard,request.params.id,analyticsContext(context),{timeZone:profile.timeZone,...(overrides?{overrides}:{}),windows:{[request.params.id]:window}});
  },request.params.id);
 });
}
function invalidWindow(){return new ApiError(400,'INVALID_RESULT_WINDOW','Invalid result window.');}
function validateWindow(input:unknown):WidgetWindowRequest{
 if(!object(input)||Object.keys(input).some(key=>!['limit','cursor','search'].includes(key)))throw invalidWindow();
 if(input.limit!==undefined&&(!Number.isInteger(input.limit)||Number(input.limit)<1||Number(input.limit)>1000))throw invalidWindow();
 if(input.search!==undefined&&(typeof input.search!=='string'||input.search.length>200))throw invalidWindow();
 if(input.cursor!==undefined)validateCursor(input.cursor);
 return input as WidgetWindowRequest;
}
function validateCursor(cursor:unknown){
 if(!object(cursor)||Object.keys(cursor).some(key=>!['after','scope','position'].includes(key)))throw invalidWindow();
 if(typeof cursor.after!=='string'||!cursor.after||cursor.after.length>200)throw invalidWindow();
 if(typeof cursor.scope!=='string'||!/^[a-f0-9]{64}$/.test(cursor.scope))throw invalidWindow();
 if(cursor.position!==undefined&&(!Number.isSafeInteger(cursor.position)||Number(cursor.position)<1))throw invalidWindow();
}
