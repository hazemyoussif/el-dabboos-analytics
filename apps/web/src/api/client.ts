import {apiErrorCopy} from './error-copy.ts';
import { apiLocation, validateApiBase } from './api-location.ts';
import type { DashboardExecutionResult, templateCompatibility, DashboardTemplate, DashboardFilterOverrides } from '@el-dabboos/application';
import { categoricalDimensions } from '@el-dabboos/domain';
import type { AccessControlledDashboardRecord as DashboardRecord, DashboardSpec, DimensionId, Locale, ProductMetric, PublishedAnalyticsCapabilities, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import type { FilterOptions } from '../builder/BuilderWorkspace.tsx';

export type DemoUser = { id: string; displayName: string };
export type AccessibleTemplate = DashboardTemplate & { availability: 'available' | 'restricted' | 'incompatible'; reason?: string; compatibility?: ReturnType<typeof templateCompatibility> };
export interface ApiSession { userId: string; tenantId: string; locale: Locale }
type ApiError = { error?: { code: string; message: string } };
export class ApiClientError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const apiBase = validateApiBase((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL);
let syntheticHeaders = (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD !== true;
export function configureIdentityMode(mode: string): void { syntheticHeaders = mode==='synthetic'; }
export async function request<T>(session: ApiSession, path: string, method: string, body?: unknown, signal?:AbortSignal): Promise<T> {
  const response = await fetch(apiLocation(path,apiBase), { method, ...(signal?{signal}:{}), credentials: 'include',headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(syntheticHeaders ? { 'x-demo-user-id': session.userId } : {}), 'x-tenant-id': session.tenantId, 'x-locale': session.locale }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json() as T & ApiError;
  if (response.status===401 && !syntheticHeaders && typeof window!=='undefined') window.dispatchEvent(new Event('dabboos-session-expired'));
  if (!response.ok) throw new ApiClientError(response.status, data.error?.code ?? 'REQUEST_FAILED', apiErrorCopy(data.error?.code??'REQUEST_FAILED',data.error?.message ?? `Request failed (${response.status})`,session.locale));
  return data;
}
const demoSession = (userId: string): ApiSession => ({ userId, tenantId: 'demo-iq', locale: 'ar' });
export const getDemoUsers = (userId: string) => request<{ users: DemoUser[] }>(demoSession(userId), '/api/demo-principals', 'GET');
export const getTenantProfiles = (userId: string) => request<{ profiles: TenantProfile[]; defaultTenantId: string }>(demoSession(userId), '/api/tenant-profiles', 'GET');
export const getSemanticCatalog = (session: ApiSession) => request<{ metrics: SemanticMetric[]; registry: ProductMetric[]; published?: PublishedAnalyticsCapabilities }>(session, '/api/semantic-catalog', 'GET');
export const getTemplates = (session: ApiSession) => request<{ templates: AccessibleTemplate[]; defaultTemplateId?:string }>(session, '/api/dashboard-templates', 'GET');
export const getCapabilities = (session: ApiSession) => request<{ permissions: string[] }>(session, '/api/demo-capabilities', 'GET');
export const instantiateTemplate = (session: ApiSession, templateId: string) => request<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(session, `/api/dashboard-templates/${encodeURIComponent(templateId)}/instantiate`, 'GET');
export const generateDashboard = (session: ApiSession, prompt: string) => request<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(session, '/api/dashboards/generate', 'POST', { prompt });
export const editDashboard = (session: ApiSession, dashboard: DashboardSpec, instruction: string) => request<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(session, '/api/dashboards/edit', 'POST', { dashboard, instruction });
export async function listSavedDashboards(session: ApiSession) {
  const dashboards: DashboardRecord[] = []; let cursor: string | undefined;
  do {
    const page = await request<{ dashboards: DashboardRecord[]; nextCursor?: string }>(session, `/api/saved-dashboards${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, 'GET');
    dashboards.push(...page.dashboards); cursor = page.nextCursor;
  } while (cursor);
  return { dashboards };
}
export const getSavedDashboard = (session: ApiSession, id: string) => request<DashboardRecord>(session, `/api/saved-dashboards/${encodeURIComponent(id)}`, 'GET');
export const createSavedDashboard = (session: ApiSession, dashboard: DashboardSpec) => request<DashboardRecord>(session, '/api/saved-dashboards', 'POST', { dashboard });
export const updateSavedDashboard = (session: ApiSession, id: string, dashboard: DashboardSpec, expectedVersion: number) => request<DashboardRecord>(session, `/api/saved-dashboards/${encodeURIComponent(id)}`, 'PUT', { dashboard, expectedVersion });
export const executeDashboard = (session: ApiSession, dashboard: DashboardSpec, overrides?: DashboardFilterOverrides) => request<DashboardExecutionResult>(session, '/api/dashboards/execute', 'POST', { dashboard, ...(overrides ? { overrides } : {}) });
export async function getFilterOptions(session: ApiSession,dimensions: readonly DimensionId[] = categoricalDimensions,onUnavailable?:(dimension:DimensionId)=>void): Promise<FilterOptions> {
  const values: Array<readonly [DimensionId, Array<{id:string;label:string}>]> = [];
  for(const dimension of dimensions.filter(dimension=>dimension!=='customer'&&categoricalDimensions.includes(dimension))) {
    try {
      const response = await request<{ dimension: DimensionId; values: Array<{ id: string; label: string }> }>(session, `/api/dimensions/${dimension}/values`, 'GET');
      values.push([dimension,response.values]);
    } catch(error) { if(!onUnavailable)throw error;onUnavailable(dimension); }
  }
  return Object.fromEntries(values);
}
export const searchCustomers=(session:ApiSession,query:import('@el-dabboos/domain').DimensionDiscoveryRequest)=>request<import('@el-dabboos/domain').DimensionDiscoveryPage>(session,'/api/dimensions/customer/search','POST',query);
export const getDashboardLibrary = (session: ApiSession) => request<{ folders: import('@el-dabboos/domain').DashboardFolder[]; preferences: import('@el-dabboos/domain').DashboardLibraryPreference[] }>(session, '/api/dashboard-library', 'GET');
export const createDashboardFolder = (session: ApiSession, name: string) => request<import('@el-dabboos/domain').DashboardFolder>(session, '/api/dashboard-library/folders', 'POST', { name });
export const renameDashboardFolder = (session: ApiSession, id: string, name: string) => request<import('@el-dabboos/domain').DashboardFolder>(session, `/api/dashboard-library/folders/${encodeURIComponent(id)}`, 'PUT', { name });
export const deleteDashboardFolder = (session: ApiSession, id: string) => request(session, `/api/dashboard-library/folders/${encodeURIComponent(id)}`, 'DELETE');
export const setDashboardPreference = (session: ApiSession, id: string, value: { favorite: boolean; folderId?: string }) => request<import('@el-dabboos/domain').DashboardLibraryPreference>(session, `/api/dashboard-library/dashboards/${encodeURIComponent(id)}`, 'PUT', value);

export const getAdministrationCapabilities = (userId: string) => request<{ platformPermissions: string[] }>(demoSession(userId), "/api/administration-capabilities", "GET");
export const executeSavedDashboard = (session: ApiSession, id: string) => request<DashboardExecutionResult>(session, `/api/saved-dashboards/${encodeURIComponent(id)}/execute`, "POST");

export const getManagementControlReview=(session:ApiSession)=>request<{review:import('@el-dabboos/application').ManagementControlReview|null}>(session,'/api/management-control-review','GET');

export const discoverDimension=(session:ApiSession,dimension:DimensionId,query:import('@el-dabboos/domain').DimensionDiscoveryRequest)=>request<import('@el-dabboos/domain').DimensionDiscoveryPage>(session,`/api/dimensions/${encodeURIComponent(dimension)}/search`,'POST',query);

export const drillThrough=(session:ApiSession,query:import('@el-dabboos/domain').DrillRequest)=>request<import('@el-dabboos/domain').DrillPage>(session,'/api/analytics/drill-through','POST',query);

export const readWidgetWindow=({session,dashboard,widgetId,window,overrides,signal}:{session:ApiSession;dashboard:DashboardSpec;widgetId:string;window:import('@el-dabboos/application').WidgetWindowRequest;overrides:DashboardFilterOverrides;signal?:AbortSignal})=>request<import('@el-dabboos/application').WidgetExecution>(session,`/api/dashboards/widgets/${encodeURIComponent(widgetId)}/window`,'POST',{dashboard,window,overrides},signal);
