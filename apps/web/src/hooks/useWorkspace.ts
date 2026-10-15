import { discoverWorkspaceAccess, isPlatformOnlyAccess, selectWorkspaceProfile } from '../admin/workspace-access.ts';
import { useEffect, useRef, useState } from 'react';
import type { DashboardExecutionResult } from '@el-dabboos/application';
import type { AccessControlledDashboardRecord as DashboardRecord, DashboardSpec, Locale, ProductMetric, PublishedAnalyticsCapabilities, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import { ApiClientError, createSavedDashboard, executeDashboard, getCapabilities, getSavedDashboard, getSemanticCatalog,
  executeSavedDashboard, getTemplates, instantiateTemplate, listSavedDashboards, updateSavedDashboard } from '../api/client.ts';
import type { AccessibleTemplate, ApiSession, DemoUser } from '../api/client.ts';
import type { FilterOptions } from '../builder/BuilderWorkspace.tsx';
import { discardSavedChanges, documentIsDirty, editDocument, generatedDocument, newManualDocument, openTemplateDocument, persistDocument, savedDocument } from '../dashboard-lifecycle.ts';
import type { DashboardDocument } from '../dashboard-lifecycle.ts';
import { preferredDemoUser, preferredLocale, storeDemoUser, storeLocale, storeTenant } from '../ui-preferences.ts';
import {loadWorkspaceReport} from '../workspace-bootstrap.ts';
import {useWorkspaceRoute,navigateWorkspace,isManagementRoute,parseWorkspaceRoute} from '../workspace-route.ts';
import { resolveSavedRoute } from '../saved-route.ts';
import type { PreferenceStore } from '../ui-preferences.ts';

const preferences = (): PreferenceStore | null => { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } };
const demoSessionPreference = (): PreferenceStore | null => { try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; } };
const defaultDemoUserId = 'demo-iq-admin';
const navigate = (recordId:string|null) => navigateWorkspace(recordId?{kind:'saved',id:recordId}:{kind:'workspace'});
export function useWorkspace(authenticatedUser?: DemoUser) {
  const [locale, setLocale] = useState<Locale>(preferredLocale(preferences()) ?? 'ar');
  const [userId, setUserId] = useState('demo-iq-admin');
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [platformPermissions, setPlatformPermissions] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<TenantProfile[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [catalog, setCatalog] = useState<Record<string, SemanticMetric>>({});
  const [published, setPublished] = useState<PublishedAnalyticsCapabilities>();
  const [metricRegistry, setMetricRegistry] = useState<ProductMetric[]>([]);
  const [templates, setTemplates] = useState<AccessibleTemplate[]>([]);
  const [savedDashboards, setSavedDashboards] = useState<DashboardRecord[]>([]);
  const route=useWorkspaceRoute();
  const activeTemplateId=route.kind==='report'?route.id:'';
  const activeSavedId=route.kind==='saved'?route.id:undefined;
  const [document, setDocument] = useState<DashboardDocument | null>(null);
  const [execution, setExecution] = useState<DashboardExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [navigationRevision, setNavigationRevision] = useState(0);
  const nextNavigation = () => setNavigationRevision(value => value + 1);
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
  const publishWorkspaceMetadata = ({ users, membership, selected, nextLocale, nextUserId, catalogResponse, templatesResponse, capabilities, saved }: {
    users: Awaited<ReturnType<typeof import('../api/client.ts').getDemoUsers>>;
    membership: Awaited<ReturnType<typeof import('../api/client.ts').getTenantProfiles>>;
    selected: TenantProfile; nextLocale: Locale; nextUserId: string;
    catalogResponse: Awaited<ReturnType<typeof getSemanticCatalog>>;
    templatesResponse: Awaited<ReturnType<typeof getTemplates>>;
    capabilities: Awaited<ReturnType<typeof getCapabilities>>;
    saved: Awaited<ReturnType<typeof listSavedDashboards>>;
  }) => {
      setDemoUsers(users.users); setProfiles(membership.profiles); setProfile(selected); setLocale(nextLocale); storeTenant(preferences(), selected.id); storeDemoUser(demoSessionPreference(), nextUserId);
      setCatalog(Object.fromEntries(catalogResponse.metrics.map(metric => [metric.id, metric])));
      setPublished(catalogResponse.published); setMetricRegistry(catalogResponse.registry); setTemplates(templatesResponse.templates);
      setPermissions(capabilities.permissions); setSavedDashboards(saved.dashboards);
  };
  const enterPlatformWorkspace = (nextUserId: string) => {
    setPublished(undefined); setCatalog({}); setMetricRegistry([]); setTemplates([]);
    storeDemoUser(demoSessionPreference(), nextUserId); navigate(null);
  };
  const loadWorkspace = async (nextUserId: string, nextTenantId?: string, restoreRoute = true) => {
    nextNavigation();
    const id = beginRequest();
    setUserId(nextUserId); setLoading(true); setError(null); setDocument(null); setExecution(null); setSavedDashboards([]);
    setFilterOptions({}); setPermissions([]); setPlatformPermissions([]); setProfile(null); setProfiles([]);
    if(!restoreRoute)navigateWorkspace({kind:'workspace'},true);
    try {
      const { users, platform, membership } = await discoverWorkspaceAccess(nextUserId,authenticatedUser);
      if (!isCurrent(id)) return;
      setPlatformPermissions(platform.platformPermissions);
      if (isPlatformOnlyAccess(membership.profiles, platform.platformPermissions)) {
        enterPlatformWorkspace(nextUserId); return;
      }
      const preferred = selectWorkspaceProfile(membership.profiles, membership.defaultTenantId, nextTenantId, preferences());
      const nextLocale = preferredLocale(preferences()) ?? preferred.defaultLocale;
      const requestedRoute=restoreRoute&&typeof window!=='undefined'?parseWorkspaceRoute(window.location.pathname):{kind:'workspace'} as const;
      const requestedRecordId=requestedRoute.kind==='saved'?requestedRoute.id:null;
      const resolved = requestedRecordId ? await resolveSavedRoute(requestedRecordId, preferred, membership.profiles,
        (tenant, recordId) => getSavedDashboard(session(tenant, nextLocale, nextUserId), recordId),
        error => error instanceof ApiClientError && (error.status === 404 || error.status === 403)) : null;
      const selected = resolved?.tenant ?? preferred;
      if (requestedRecordId && !resolved && isCurrent(id)) navigate(null);
      const selectedSession = session(selected, nextLocale, nextUserId);
      // Load metadata capability independently: a workspace may be administrable before data is ready.
      const initialCapabilities = await getCapabilities(selectedSession);
      if (!isCurrent(id)) return;
      setProfile(selected); setProfiles(membership.profiles); setLocale(nextLocale); setPermissions(initialCapabilities.permissions);
      const [catalogResponse, templatesResponse, saved] = await Promise.all([
        getSemanticCatalog(selectedSession), getTemplates(selectedSession),listSavedDashboards(selectedSession),
      ]);
      if(!isCurrent(id))return;
      const capabilities=initialCapabilities;
      publishWorkspaceMetadata({users,membership,selected,nextLocale,nextUserId,catalogResponse,templatesResponse,capabilities,saved});
      const report=await loadWorkspaceReport(selectedSession,requestedRoute,templatesResponse,{record:resolved?.record});
      if (!isCurrent(id)) return;
      setDocument(report.opened);setExecution(report.openedExecution);

    } catch (cause) {
      if (isCurrent(id)) {
        if (!authenticatedUser && nextUserId !== defaultDemoUserId && cause instanceof ApiClientError && cause.status === 401) void loadWorkspace(defaultDemoUserId);
        else setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally { if (isCurrent(id)) setLoading(false); }
  };
  useEffect(() => { void loadWorkspace(authenticatedUser?.id ?? preferredDemoUser(demoSessionPreference()) ?? defaultDemoUserId); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const onPopState = () => {
      if (!confirmAbandon()) { navigateWorkspace(route,true); return; }
      const destination=parseWorkspaceRoute(window.location.pathname);
      if(destination.kind==='report'&&profile) {
        if(isManagementRoute(destination,templates.some(item=>item.id==='customer-performance'&&item.availability==='available'))) {beginRequest();setLoading(false);nextNavigation();}
        else void openTemplate(destination.id,profile,locale,false);
      } else if(destination.kind==='saved'&&profile)void openSaved(destination.id,false);
      else void loadWorkspace(userId,profile?.id,true);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });
  const openTemplate = async (templateId: string, selected: TenantProfile, selectedLocale: Locale,changePath=true) => {
    if(changePath)navigateWorkspace({kind:'report',id:templateId});
    nextNavigation(); setExecution(null);
    const id = beginRequest(); setError(null); setLoading(true);
    try {
      const result = await instantiateTemplate(session(selected, selectedLocale), templateId);
      if (isCurrent(id)) { setDocument(openTemplateDocument(templateId, result.dashboard)); setExecution(result.execution); }
    } catch (cause) { if (isCurrent(id)) { setDocument(null); if(cause instanceof ApiClientError && (cause.status===403||cause.status===404)) {setDocument(null);setExecution(null);setSavedDashboards([]);} setError(cause instanceof Error ? cause.message : String(cause)); } }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  const openSaved = async (recordId: string, changePath = true) => {
    if (!profile) return;
    if(changePath)navigate(recordId);
    nextNavigation(); setExecution(null);
    const id = beginRequest(); setError(null); setLoading(true);
    try {
      const record = await getSavedDashboard(session(), recordId);
      const result = await executeSavedDashboard(session(), record.id);
      if (isCurrent(id)) { setDocument(savedDocument(record)); setExecution(result); }
    } catch (cause) { if (isCurrent(id)) { setDocument(null); if(cause instanceof ApiClientError && (cause.status===403||cause.status===404)) {setDocument(null);setExecution(null);setSavedDashboards([]);} setError(cause instanceof Error ? cause.message : String(cause)); } }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  const selectLocale = (next: Locale) => {
    setLocale(next); storeLocale(preferences(), next);
  };
  const applyWorkingSpec = (spec: DashboardSpec | null) => setDocument(current => current ? editDocument(current, spec) : spec ? generatedDocument(spec) : newManualDocument());
  const startManual = () => { nextNavigation(); beginRequest(); setError(null); setDocument(newManualDocument()); setExecution(null); navigate(null); };
  const openGenerated = (spec: DashboardSpec, result: DashboardExecutionResult) => {
    nextNavigation(); setDocument(generatedDocument(spec)); setExecution(result); navigate(null);
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
    } catch (cause) { if (isCurrent(id)) { if(cause instanceof ApiClientError && (cause.status===403||cause.status===404)) {setDocument(null);setExecution(null);setSavedDashboards([]);} setError(cause instanceof Error ? cause.message : String(cause)); } }
    finally { if (isCurrent(id)) setLoading(false); }
    return false;
  };
  const discard = async () => {
    if (!document || !profile) return;
    if (document.kind !== 'saved') { await loadWorkspace(userId, profile.id, false); return; }
    nextNavigation();
    const restored = discardSavedChanges(document)!;
    const id = beginRequest(); setDocument(restored); setError(null); setLoading(true);
    try { const result = await executeDashboard(session(), restored.spec!); if (isCurrent(id)) setExecution(result); }
    catch (cause) { if (isCurrent(id)) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (isCurrent(id)) setLoading(false); }
  };
  return { locale, userId, demoUsers, permissions, platformPermissions, profiles, profile, catalog, published, metricRegistry, templates, savedDashboards,
    navigationRevision, route, activeTemplateId, activeSavedId, document, dashboard, execution, loading, error, mode, dirty, filterOptions, setExecution, setLoading, setError,
    beginRequest, isCurrent, session, loadWorkspace, openTemplate, openSaved, selectLocale, applyWorkingSpec, startManual,
    openGenerated, save, discard, confirmAbandon };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
