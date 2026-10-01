import type { DashboardExecutionResult, DashboardTemplate } from '@el-dabbous/application';
import type { DashboardRecord, DashboardSpec, DimensionId, Locale, ProductMetric, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import type { FilterOptions } from '../builder/BuilderWorkspace.tsx';

export type DemoUser = { id: string; displayName: string };
export type AccessibleTemplate = DashboardTemplate & { availability: 'available' | 'restricted'; reason?: string };
export interface ApiSession { userId: string; tenantId: string; locale: Locale }
type ApiError = { error?: { code: string; message: string } };
export class ApiClientError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
async function request<T>(session: ApiSession, path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: { 'content-type': 'application/json', 'x-demo-user-id': session.userId, 'x-tenant-id': session.tenantId, 'x-locale': session.locale }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json() as T & ApiError;
  if (!response.ok) throw new ApiClientError(response.status, data.error?.code ?? 'REQUEST_FAILED', data.error?.message ?? `Request failed (${response.status})`);
  return data;
}
const demoSession = (userId: string): ApiSession => ({ userId, tenantId: 'demo-iq', locale: 'ar' });
export const getDemoUsers = (userId: string) => request<{ users: DemoUser[] }>(demoSession(userId), '/api/demo-principals', 'GET');
export const getTenantProfiles = (userId: string) => request<{ profiles: TenantProfile[]; defaultTenantId: string }>(demoSession(userId), '/api/tenant-profiles', 'GET');
export const getSemanticCatalog = (session: ApiSession) => request<{ metrics: SemanticMetric[]; registry: ProductMetric[] }>(session, '/api/semantic-catalog', 'GET');
export const getTemplates = (session: ApiSession) => request<{ templates: AccessibleTemplate[] }>(session, '/api/dashboard-templates', 'GET');
export const getCapabilities = (session: ApiSession) => request<{ permissions: string[] }>(session, '/api/demo-capabilities', 'GET');
export const instantiateTemplate = (session: ApiSession, templateId: string) => request<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(session, `/api/dashboard-templates/${encodeURIComponent(templateId)}/instantiate`, 'GET');
export const generateDashboard = (session: ApiSession, prompt: string) => request<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(session, '/api/dashboards/generate', 'POST', { prompt });
export const editDashboard = (session: ApiSession, dashboard: DashboardSpec, instruction: string) => request<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(session, '/api/dashboards/edit', 'POST', { dashboard, instruction });
export const listSavedDashboards = (session: ApiSession) => request<{ dashboards: DashboardRecord[] }>(session, '/api/saved-dashboards', 'GET');
export const getSavedDashboard = (session: ApiSession, id: string) => request<DashboardRecord>(session, `/api/saved-dashboards/${encodeURIComponent(id)}`, 'GET');
export const createSavedDashboard = (session: ApiSession, dashboard: DashboardSpec) => request<DashboardRecord>(session, '/api/saved-dashboards', 'POST', { dashboard });
export const updateSavedDashboard = (session: ApiSession, id: string, dashboard: DashboardSpec, expectedVersion: number) => request<DashboardRecord>(session, `/api/saved-dashboards/${encodeURIComponent(id)}`, 'PUT', { dashboard, expectedVersion });
export const executeDashboard = (session: ApiSession, dashboard: DashboardSpec) => request<DashboardExecutionResult>(session, '/api/dashboards/execute', 'POST', { dashboard });
const builderFilterDimensions: DimensionId[] = ['branch', 'region', 'salesperson', 'product_category', 'warehouse'];
export async function getFilterOptions(session: ApiSession): Promise<FilterOptions> {
  const values = await Promise.all(builderFilterDimensions.map(async dimension => {
    const response = await request<{ dimension: DimensionId; values: Array<{ id: string; label: string }> }>(session, `/api/dimensions/${dimension}/values`, 'GET');
    return [dimension, response.values] as const;
  }));
  return Object.fromEntries(values);
}
