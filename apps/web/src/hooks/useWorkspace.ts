import { useEffect, useRef, useState } from 'react';
import type { DashboardExecutionResult } from '@el-dabbous/application';
import type { DashboardSpec, Locale, ProductMetric, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import { getCapabilities, getDemoUsers, getFilterOptions, getSemanticCatalog, getTemplates, getTenantProfiles, instantiateTemplate } from '../api/client.ts';
import type { AccessibleTemplate, ApiSession, DemoUser } from '../api/client.ts';
import type { FilterOptions } from '../builder/BuilderWorkspace.tsx';

export type WorkspaceMode = 'template' | 'generated' | 'manual';
export function useWorkspace() {
  const [locale, setLocale] = useState<Locale>('ar');
  const [userId, setUserId] = useState('demo-iq-admin');
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<TenantProfile[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [catalog, setCatalog] = useState<Record<string, SemanticMetric>>({});
  const [metricRegistry, setMetricRegistry] = useState<ProductMetric[]>([]);
  const [templates, setTemplates] = useState<AccessibleTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState('sales-performance');
  const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
  const [execution, setExecution] = useState<DashboardExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>('template');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const requestId = useRef(0);
  const beginRequest = () => ++requestId.current;
  const isCurrent = (id: number) => id === requestId.current;
  const session = (selectedProfile: TenantProfile = profile!, selectedLocale: Locale = locale, selectedUserId = userId): ApiSession =>
    ({ userId: selectedUserId, tenantId: selectedProfile.id, locale: selectedLocale });
  const loadWorkspace = async (nextUserId: string, nextTenantId?: string) => {
    const id = beginRequest();
    setUserId(nextUserId); setLoading(true); setError(null); setDashboard(null); setExecution(null);
    setFilterOptions({});
    try {
      const users = await getDemoUsers(nextUserId);
      const membership = await getTenantProfiles(nextUserId);
      const selected = membership.profiles.find(item => item.id === nextTenantId) ?? membership.profiles.find(item => item.id === membership.defaultTenantId);
      if (!selected) throw new Error('No demo tenant membership is available');
      const nextLocale = selected.defaultLocale;
      const selectedSession = session(selected, nextLocale, nextUserId);
      const [catalogResponse, templatesResponse, options, capabilities] = await Promise.all([
        getSemanticCatalog(selectedSession), getTemplates(selectedSession), getFilterOptions(selectedSession), getCapabilities(selectedSession),
      ]);
      const first = templatesResponse.templates.find(template => template.id === activeTemplateId && template.availability === 'available')
        ?? templatesResponse.templates.find(template => template.availability === 'available');
      const result = first ? await instantiateTemplate(selectedSession, first.id) : null;
      if (!isCurrent(id)) return;
      setDemoUsers(users.users); setProfiles(membership.profiles); setProfile(selected); setLocale(nextLocale);
      setCatalog(Object.fromEntries(catalogResponse.metrics.map(metric => [metric.id, metric])));
      setMetricRegistry(catalogResponse.registry); setTemplates(templatesResponse.templates); setFilterOptions(options); setPermissions(capabilities.permissions);
      setActiveTemplateId(first?.id ?? ''); setDashboard(result?.dashboard ?? null); setExecution(result?.execution ?? null); setMode('template');
    } catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  useEffect(() => { void loadWorkspace('demo-iq-admin'); }, []);
  const openTemplate = async (templateId: string, selected: TenantProfile, selectedLocale: Locale) => {
    const id = beginRequest();
    setError(null); setLoading(true);
    try {
      const result = await instantiateTemplate(session(selected, selectedLocale), templateId);
      if (isCurrent(id)) { setDashboard(result.dashboard); setExecution(result.execution); setMode('template'); setActiveTemplateId(templateId); }
    } catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  const selectLocale = (next: Locale) => {
    setLocale(next);
    setDashboard(current => current ? { ...current, locale: next } : current);
    if (profile) {
      const id = requestId.current;
      void getFilterOptions(session(profile, next)).then(options => { if (isCurrent(id)) setFilterOptions(options); })
        .catch(() => { if (isCurrent(id)) setFilterOptions({}); });
    }
  };
  return { locale, userId, demoUsers, permissions, profiles, profile, catalog, metricRegistry, templates, activeTemplateId,
    dashboard, execution, loading, error, mode, filterOptions, setDashboard, setExecution, setLoading, setError, setMode,
    beginRequest, isCurrent, session, loadWorkspace, openTemplate, selectLocale };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
