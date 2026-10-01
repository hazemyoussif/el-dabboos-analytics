import { useEffect, useRef, useState } from 'react';
import type { DashboardExecutionResult } from '@el-dabbous/application';
import type { DashboardRecord, DashboardSpec, Locale, ProductMetric, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import { ApiClientError, createSavedDashboard, executeDashboard, getCapabilities, getDemoUsers, getFilterOptions, getSavedDashboard, getSemanticCatalog,
  getTemplates, getTenantProfiles, instantiateTemplate, listSavedDashboards, updateSavedDashboard } from '../api/client.ts';
import type { AccessibleTemplate, ApiSession, DemoUser } from '../api/client.ts';
import type { FilterOptions } from '../builder/BuilderWorkspace.tsx';
import { discardSavedChanges, documentIsDirty, editDocument, generatedDocument, newManualDocument, openTemplateDocument, persistDocument, savedDocument } from '../dashboard-lifecycle.ts';
import type { DashboardDocument } from '../dashboard-lifecycle.ts';
import { preferredDemoUser, preferredLocale, preferredTenant, storeDemoUser, storeLocale, storeTenant } from '../ui-preferences.ts';
import { resolveSavedRoute } from '../saved-route.ts';
import type { PreferenceStore } from '../ui-preferences.ts';

const preferences = (): PreferenceStore | null => { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } };
const demoSessionPreference = (): PreferenceStore | null => { try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; } };
const defaultDemoUserId = 'demo-iq-admin';
const routeRecordId = (): string | null => typeof window === 'undefined' ? null : window.location.pathname.match(/^\/dashboards\/([^/]+)$/)?.[1] ?? null;
const navigate = (recordId: string | null) => {
  if (typeof window === 'undefined') return;
  const path = recordId ? `/dashboards/${encodeURIComponent(recordId)}` : '/';
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
};
export function useWorkspace() {
  const [locale, setLocale] = useState<Locale>(preferredLocale(preferences()) ?? 'ar');
  const [userId, setUserId] = useState('demo-iq-admin');
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<TenantProfile[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [catalog, setCatalog] = useState<Record<string, SemanticMetric>>({});
  const [metricRegistry, setMetricRegistry] = useState<ProductMetric[]>([]);
  const [templates, setTemplates] = useState<AccessibleTemplate[]>([]);
  const [savedDashboards, setSavedDashboards] = useState<DashboardRecord[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState('sales-performance');
  const [document, setDocument] = useState<DashboardDocument | null>(null);
  const [execution, setExecution] = useState<DashboardExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const requestId = useRef(0);
  const beginRequest = () => ++requestId.current;
  const isCurrent = (id: number) => id === requestId.current;
  const session = (selectedProfile: TenantProfile = profile!, selectedLocale: Locale = locale, selectedUserId = userId): ApiSession =>
    ({ userId: selectedUserId, tenantId: selectedProfile.id, locale: selectedLocale });
  const dashboard = document?.spec ?? null;
  const mode = document?.kind === 'template' ? 'template' : document?.kind === 'saved' ? 'saved' : document?.origin ?? 'template';
  const dirty = documentIsDirty(document);
  const confirmAbandon = () => !dirty || typeof window === 'undefined' || window.confirm(locale === 'ar'
    ? 'لديك تغييرات غير محفوظة. هل تريد تجاهلها؟' : 'You have unsaved changes. Discard them?');
  const loadWorkspace = async (nextUserId: string, nextTenantId?: string, restoreRoute = true) => {
    const id = beginRequest();
    setUserId(nextUserId); setLoading(true); setError(null); setDocument(null); setExecution(null); setSavedDashboards([]);
    setFilterOptions({});
    try {
      const users = await getDemoUsers(nextUserId);
      if (!users.users.some(user => user.id === nextUserId)) throw new Error('Unknown demo identity');
      const membership = await getTenantProfiles(nextUserId);
      const preferred = nextTenantId ? membership.profiles.find(item => item.id === nextTenantId)
        ?? preferredTenant(preferences(), membership.profiles, membership.defaultTenantId)
        : preferredTenant(preferences(), membership.profiles, membership.defaultTenantId);
      if (!preferred) throw new Error('No demo tenant membership is available');
      const nextLocale = preferredLocale(preferences()) ?? preferred.defaultLocale;
      const requestedRecordId = restoreRoute ? routeRecordId() : null;
      const resolved = requestedRecordId ? await resolveSavedRoute(requestedRecordId, preferred, membership.profiles,
        (tenant, recordId) => getSavedDashboard(session(tenant, nextLocale, nextUserId), recordId),
        error => error instanceof ApiClientError && (error.status === 404 || error.status === 403)) : null;
      const selected = resolved?.tenant ?? preferred;
      if (requestedRecordId && !resolved && isCurrent(id)) navigate(null);
      const selectedSession = session(selected, nextLocale, nextUserId);
      const [catalogResponse, templatesResponse, options, capabilities, saved] = await Promise.all([
        getSemanticCatalog(selectedSession), getTemplates(selectedSession), getFilterOptions(selectedSession),
        getCapabilities(selectedSession), listSavedDashboards(selectedSession),
      ]);
      const first = templatesResponse.templates.find(template => template.id === activeTemplateId && template.availability === 'available')
        ?? templatesResponse.templates.find(template => template.availability === 'available');
      let opened: DashboardDocument | null = resolved ? savedDocument(resolved.record) : null;
      let openedExecution: DashboardExecutionResult | null = null;
      if (resolved) openedExecution = await executeDashboard(selectedSession, resolved.record.spec);
      if (!opened && first) {
        const result = await instantiateTemplate(selectedSession, first.id);
        opened = openTemplateDocument(first.id, result.dashboard);
        openedExecution = result.execution;
      }
      if (!isCurrent(id)) return;
      setDemoUsers(users.users); setProfiles(membership.profiles); setProfile(selected); setLocale(nextLocale); storeTenant(preferences(), selected.id); storeDemoUser(demoSessionPreference(), nextUserId);
      setCatalog(Object.fromEntries(catalogResponse.metrics.map(metric => [metric.id, metric])));
      setMetricRegistry(catalogResponse.registry); setTemplates(templatesResponse.templates); setFilterOptions(options);
      setPermissions(capabilities.permissions); setSavedDashboards(saved.dashboards);
      setActiveTemplateId(first?.id ?? ''); setDocument(opened); setExecution(openedExecution);
      if (!restoreRoute) navigate(null);
    } catch (cause) {
      if (isCurrent(id)) {
        if (nextUserId !== defaultDemoUserId && cause instanceof ApiClientError && cause.status === 401) void loadWorkspace(defaultDemoUserId);
        else setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally { if (isCurrent(id)) setLoading(false); }
  };
  useEffect(() => { void loadWorkspace(preferredDemoUser(demoSessionPreference()) ?? defaultDemoUserId); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const onPopState = () => {
      if (!confirmAbandon()) { navigate(document?.kind === 'saved' ? document.record.id : null); return; }
      const recordId = routeRecordId();
      if (recordId) void loadWorkspace(userId, profile?.id, true);
      else void loadWorkspace(userId, profile?.id, false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });
  const openTemplate = async (templateId: string, selected: TenantProfile, selectedLocale: Locale) => {
    const id = beginRequest(); setError(null); setLoading(true);
    try {
      const result = await instantiateTemplate(session(selected, selectedLocale), templateId);
      if (isCurrent(id)) { setDocument(openTemplateDocument(templateId, result.dashboard)); setExecution(result.execution); setActiveTemplateId(templateId); navigate(null); }
    } catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  const openSaved = async (recordId: string, changePath = true) => {
    if (!profile) return;
    const id = beginRequest(); setError(null); setLoading(true);
    try {
      const record = await getSavedDashboard(session(), recordId);
      const result = await executeDashboard(session(), record.spec);
      if (isCurrent(id)) { setDocument(savedDocument(record)); setExecution(result); if (changePath) navigate(record.id); }
    } catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  const selectLocale = (next: Locale) => {
    setLocale(next); storeLocale(preferences(), next);
    if (profile) {
      const id = requestId.current;
      void getFilterOptions(session(profile, next)).then(options => { if (isCurrent(id)) setFilterOptions(options); })
        .catch(() => { if (isCurrent(id)) setFilterOptions({}); });
    }
  };
  const applyWorkingSpec = (spec: DashboardSpec | null) => setDocument(current => current ? editDocument(current, spec) : spec ? generatedDocument(spec) : newManualDocument());
  const startManual = () => { beginRequest(); setError(null); setDocument(newManualDocument()); setExecution(null); navigate(null); };
  const openGenerated = (spec: DashboardSpec, result: DashboardExecutionResult) => {
    setDocument(generatedDocument(spec)); setExecution(result); navigate(null);
  };
  const save = async (asNew = false, named?: DashboardSpec) => {
    if (!document?.spec || !profile) return false;
    const id = beginRequest(); setError(null); setLoading(true);
    try {
      const saved = await persistDocument(named ? editDocument(document, named) : document, asNew, {
        create: spec => createSavedDashboard(session(), spec),
        update: (recordId, spec, version) => updateSavedDashboard(session(), recordId, spec, version),
      });
      const list = await listSavedDashboards(session());
      if (isCurrent(id) && saved.kind === 'saved') { setDocument(saved); setSavedDashboards(list.dashboards); navigate(saved.record.id); return true; }
    } catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
    return false;
  };
  const discard = async () => {
    if (!document || !profile) return;
    if (document.kind !== 'saved') { await loadWorkspace(userId, profile.id, false); return; }
    const restored = discardSavedChanges(document)!;
    const id = beginRequest(); setDocument(restored); setError(null); setLoading(true);
    try { const result = await executeDashboard(session(), restored.spec!); if (isCurrent(id)) setExecution(result); }
    catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  return { locale, userId, demoUsers, permissions, profiles, profile, catalog, metricRegistry, templates, savedDashboards,
    activeTemplateId, document, dashboard, execution, loading, error, mode, dirty, filterOptions, setExecution, setLoading, setError,
    beginRequest, isCurrent, session, loadWorkspace, openTemplate, openSaved, selectLocale, applyWorkingSpec, startManual,
    openGenerated, save, discard, confirmAbandon };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
