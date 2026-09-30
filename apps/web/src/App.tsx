import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardExecutionResult, DashboardTemplate } from '@el-dabbous/application';
import type { DashboardSpec, DimensionId, Locale, ProductMetric, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import { DashboardRenderer } from './Renderer.tsx';
const BuilderWorkspace = lazy(() => import('./builder/BuilderWorkspace.tsx').then(module => ({ default: module.BuilderWorkspace })));
import type { FilterOptions } from './builder/BuilderWorkspace.tsx';
import { blankDashboardDraft, commitBuilderCommand, redoBuilder, startBuilder, undoBuilder, withLocale } from './builder/model.ts';
import type { BuilderCommand, BuilderHistory, BuilderTransition } from './builder/model.ts';
import { conversationalCopy, copy, formatDate, formatTimestamp } from './i18n.ts';

type ApiError = { error?: { code: string; message: string } };
type DemoUser = { id: string; displayName: string };
type AccessibleTemplate = DashboardTemplate & { availability: 'available' | 'restricted'; reason?: string };
async function api<T>(path: string, tenantId: string, locale: Locale, method: string, body: unknown, userId: string): Promise<T> {
  const response = await fetch(path, { method, headers: { 'content-type': 'application/json', 'x-demo-user-id': userId, 'x-tenant-id': tenantId, 'x-locale': locale }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  return data;
}
const builderFilterDimensions: DimensionId[] = ['branch', 'region', 'salesperson', 'product_category', 'warehouse'];
async function fetchFilterOptions(profile: TenantProfile, locale: Locale, userId: string): Promise<FilterOptions> {
  const values = await Promise.all(builderFilterDimensions.map(async dimension => {
    const response = await api<{ dimension: DimensionId; values: Array<{ id: string; label: string }> }>(`/api/dimensions/${dimension}/values`, profile.id, locale, 'GET', undefined, userId);
    return [dimension, response.values] as const;
  }));
  return Object.fromEntries(values);
}
export default function App() {
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
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'template' | 'generated' | 'manual'>('template');
  const [builderHistory, setBuilderHistory] = useState<BuilderHistory | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [builderBusy, setBuilderBusy] = useState(false);
  const requestId = useRef(0);
  const t = copy[locale];
  const conversation = profile ? conversationalCopy(locale, profile) : { placeholder: t.promptPlaceholder, examples: [] };
  const branchExample = profile ? (locale === 'ar'
    ? `اعرض ${profile.branchLabels[profile.exampleBranchIds[0]]?.ar} و${profile.branchLabels[profile.exampleBranchIds[1]]?.ar} فقط`
    : `Show only ${profile.branchLabels[profile.exampleBranchIds[0]]?.en} and ${profile.branchLabels[profile.exampleBranchIds[1]]?.en}`) : t.examples[1];
  const editExamples = t.examples.map((example, index) => index === 1 ? branchExample : example);
  const activeDashboard = builderHistory?.present.kind === 'dashboard' ? builderHistory.present.spec : dashboard;
  const activeTitle = builderHistory?.present.kind === 'empty' ? builderHistory.present.base.title[locale] : activeDashboard?.title[locale] ?? t.noDashboard;
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  const loadWorkspace = async (nextUserId: string, nextTenantId?: string) => {
    const id = ++requestId.current;
    setUserId(nextUserId); setLoading(true); setError(null); setBuilderHistory(null); setDashboard(null); setExecution(null);
    setFilterOptions({}); setPrompt(''); setInstruction(''); setBuilderBusy(false);
    try {
      const users = await api<{ users: DemoUser[] }>('/api/demo-principals', 'demo-iq', 'ar', 'GET', undefined, nextUserId);
      const membership = await api<{ profiles: TenantProfile[]; defaultTenantId: string }>('/api/tenant-profiles', 'demo-iq', 'ar', 'GET', undefined, nextUserId);
      const selected = membership.profiles.find(item => item.id === nextTenantId) ?? membership.profiles.find(item => item.id === membership.defaultTenantId);
      if (!selected) throw new Error('No demo tenant membership is available');
      const nextLocale = selected.defaultLocale;
      const [catalogResponse, templatesResponse, options, capabilities] = await Promise.all([
        api<{ metrics: SemanticMetric[]; registry: ProductMetric[] }>('/api/semantic-catalog', selected.id, nextLocale, 'GET', undefined, nextUserId),
        api<{ templates: AccessibleTemplate[] }>('/api/dashboard-templates', selected.id, nextLocale, 'GET', undefined, nextUserId),
        fetchFilterOptions(selected, nextLocale, nextUserId),
        api<{ permissions: string[] }>('/api/demo-capabilities', selected.id, nextLocale, 'GET', undefined, nextUserId),
      ]);
      const first = templatesResponse.templates.find(template => template.id === activeTemplateId && template.availability === 'available')
        ?? templatesResponse.templates.find(template => template.availability === 'available');
      const result = first ? await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(`/api/dashboard-templates/${first.id}/instantiate`, selected.id, nextLocale, 'GET', undefined, nextUserId) : null;
      if (id !== requestId.current) return;
      setDemoUsers(users.users); setProfiles(membership.profiles); setProfile(selected); setLocale(nextLocale);
      setCatalog(Object.fromEntries(catalogResponse.metrics.map(metric => [metric.id, metric])));
      setMetricRegistry(catalogResponse.registry); setTemplates(templatesResponse.templates); setFilterOptions(options); setPermissions(capabilities.permissions);
      setActiveTemplateId(first?.id ?? ''); setDashboard(result?.dashboard ?? null); setExecution(result?.execution ?? null); setMode('template');
    } catch (cause) { if (id === requestId.current) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  useEffect(() => { void loadWorkspace('demo-iq-admin'); }, []);
  const metadata = useMemo(() => {
    if (!execution) return null;
    for (const widget of Object.values(execution.widgetResults)) for (const series of Object.values(widget.seriesResults))
      if (series.status === 'success') return series.result.metadata;
    return null;
  }, [execution]);
  const openTemplate = async (templateId: string, selected: TenantProfile, selectedLocale: Locale) => {
    const id = ++requestId.current;
    setError(null); setBuilderHistory(null); setLoading(true);
    try {
      const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(`/api/dashboard-templates/${encodeURIComponent(templateId)}/instantiate`, selected.id, selectedLocale, 'GET', undefined, userId);
      if (id === requestId.current) { setDashboard(result.dashboard); setExecution(result.execution); setMode('template'); setActiveTemplateId(templateId); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  const selectTenant = (selected: TenantProfile) => { void loadWorkspace(userId, selected.id); };
  const selectLocale = (next: Locale) => {
    setLocale(next);
    setDashboard(current => current ? { ...current, locale: next } : current);
    setBuilderHistory(current => current ? { past: current.past.map(document => withLocale(document, next)), present: withLocale(current.present, next), future: current.future.map(document => withLocale(document, next)) } : null);
    if (profile) { const id = requestId.current; void fetchFilterOptions(profile, next, userId).then(options => { if (id === requestId.current) setFilterOptions(options); }).catch(() => { if (id === requestId.current) setFilterOptions({}); }); }
  };
  const generate = async () => {
    if (!profile || !prompt.trim()) return;
    const id = ++requestId.current; setError(null); setLoading(true);
    try {
      const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>('/api/dashboards/generate', profile.id, locale, 'POST', { prompt }, userId);
      if (id === requestId.current) { setDashboard(result.dashboard); setExecution(result.execution); setMode('generated'); setBuilderHistory(null); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  const edit = async () => {
    if (!profile || !dashboard || !instruction.trim()) return;
    const id = ++requestId.current; setError(null); setLoading(true);
    try {
      const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>('/api/dashboards/edit', profile.id, locale, 'POST', { dashboard, instruction }, userId);
      if (id === requestId.current) { setDashboard(result.dashboard); setExecution(result.execution); setInstruction(''); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  const executeBuilderTransition = (transition: BuilderTransition) => {
    if (transition.history === builderHistory) return;
    setBuilderHistory(transition.history);
    const next = transition.history.present;
    if (next.kind === 'empty') { ++requestId.current; setDashboard(null); setExecution(null); setBuilderBusy(false); return; }
    setDashboard(next.spec);
    if (!transition.execute || !profile) return;
    const id = ++requestId.current;
    setBuilderBusy(true); setError(null);
    void api<DashboardExecutionResult>('/api/dashboards/execute', profile.id, locale, 'POST', { dashboard: next.spec }, userId)
      .then(result => { if (id === requestId.current) setExecution(result); })
      .catch(cause => { if (id === requestId.current) { setExecution(null); setError(cause instanceof Error ? cause.message : String(cause)); } })
      .finally(() => { if (id === requestId.current) setBuilderBusy(false); });
  };
  const builderCommand = (command: BuilderCommand) => {
    if (!builderHistory) return;
    try { executeBuilderTransition(commitBuilderCommand(builderHistory, command)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const startManual = () => {
    if (!profile) return;
    ++requestId.current; setError(null); setLoading(false); setMode('manual'); setDashboard(null); setExecution(null);
    setBuilderHistory(startBuilder(blankDashboardDraft(profile, locale)));
  };
  const enterBuilder = () => { if (dashboard) { setBuilderHistory(startBuilder({ kind: 'dashboard', spec: dashboard })); setError(null); } };
  const exitBuilder = () => { setBuilderHistory(null); setBuilderBusy(false); };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">◈</div><div><strong>{t.product}</strong><span>{t.studio}</span></div></div>
      <div className="sidebar-section"><div className="section-caption">{t.workspace}</div><div className="workspace-pill"><span className="status-dot" />{t.ready}</div></div>
      <div className="sidebar-section"><div className="section-caption">{t.library}</div><nav className="demo-list">{templates.map(template => <button key={template.id} disabled={template.availability === 'restricted'} title={template.reason} className={`demo-item ${dashboard?.id === template.id && mode === 'template' ? 'active' : ''}`} onClick={() => profile && void openTemplate(template.id, profile, locale)}><span className="demo-glyph">▥</span><span>{template.name[locale]}</span></button>)}</nav></div>
      <div className="sidebar-foot"><span className="status-dot" /> {locale === 'ar' ? 'بيانات تجريبية اصطناعية' : 'Synthetic demo data'}</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">{t.workspace} <span>/</span> {activeTitle}</div><div className="top-actions"><label className="tenant-control demo-identity">{locale === 'ar' ? 'هوية تجريبية' : 'Demo identity'}<select aria-label="Demo identity" value={userId} onChange={e => void loadWorkspace(e.target.value)}>{demoUsers.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label><label className="tenant-control">{t.market}<select aria-label={t.market} value={profile?.id ?? 'demo-iq'} onChange={e => { const next = profiles.find(item => item.id === e.target.value); if (next) selectTenant(next); }}>{profiles.map(item => <option key={item.id} value={item.id}>{item.labels[locale]}</option>)}</select></label><div className="language-toggle" role="group" aria-label="Language"><button className={locale === 'en' ? 'selected' : ''} onClick={() => selectLocale('en')}>EN</button><button className={locale === 'ar' ? 'selected' : ''} onClick={() => selectLocale('ar')}>عربي</button></div></div></header>
      <div className="page-content"><section className="prompt-panel"><div className="prompt-copy"><span className="eyebrow"><span className="sparkle">✦</span> {t.studio}</span><h1>{t.tagline}</h1><p>{t.promptHint}</p></div><div className="prompt-form"><label htmlFor="dashboard-prompt">{t.promptTitle}</label><textarea id="dashboard-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={conversation.placeholder} rows={3} /><div className="prompt-examples">{conversation.examples.map(example => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}</button>)}</div><div className="prompt-actions"><span className="prompt-tip">✦ {locale === 'ar' ? 'اكتب طلبك بطريقتك' : 'Describe it in your own words'}</span><button className="primary-button" disabled={loading || !prompt.trim() || !permissions.includes('ai:generate')} onClick={() => void generate()}>{t.generate} <span>↗</span></button></div></div></section>
      <details className="catalog-panel"><summary>{t.metricCatalog} · {metricRegistry.filter(item => item.availability === 'available').length} {t.available} · {metricRegistry.filter(item => item.availability === 'planned').length} {t.planned}</summary><div className="catalog-list">{metricRegistry.map(item => <div key={item.id} className="catalog-metric"><span>{item.labels[locale]}</span><span className={item.availability === 'available' ? 'metric-available' : 'metric-planned'}>{item.availability === 'available' ? t.available : t.planned}</span></div>)}</div></details>
      {error && <div className="global-error" role="alert"><span>!</span>{error}<button onClick={() => setError(null)} aria-label="Dismiss">×</button></div>}
      <section className="dashboard-section"><div className="dashboard-title-row"><div><div className="eyebrow eyebrow-light">{mode === 'generated' ? t.generated : t.manual}</div><h2>{activeTitle}</h2></div><div className="dashboard-actions"><button onClick={startManual}>{locale === 'ar' ? 'لوحة جديدة' : 'New dashboard'}</button>{(activeDashboard || builderHistory) && <div className="builder-mode-switch"><button className={!builderHistory ? 'active' : ''} disabled={!builderHistory} onClick={exitBuilder}>{locale === 'ar' ? 'عرض' : 'View'}</button><button className={builderHistory ? 'active' : ''} disabled={!!builderHistory || !activeDashboard} onClick={enterBuilder}>{locale === 'ar' ? 'تحرير' : 'Edit'}</button></div>}{activeDashboard && <span className="widget-count">{activeDashboard.widgets.length} {t.widgets}</span>}</div></div>
      {activeDashboard && profile && <div className="meta-strip"><div><span>{t.period}</span><strong>{activeDashboard.filters.dateRange ? `${formatDate(activeDashboard.filters.dateRange.from, locale, profile)} — ${formatDate(activeDashboard.filters.dateRange.to, locale, profile)}` : '—'}</strong></div><div><span>{t.source}</span><strong>{metadata?.sourceId ?? '—'}</strong></div><div><span>{t.dataThrough}</span><strong>{metadata?.dataThrough ? formatDate(metadata.dataThrough, locale, profile) : '—'}</strong></div>{metadata?.sourceAsOf && <div><span>{t.sourceUpdated}</span><strong>{formatTimestamp(metadata.sourceAsOf, locale, profile)}</strong></div>}</div>}
      {execution?.metadata.failedSeries ? <div className="partial-note">{t.partial}: {execution.metadata.failedSeries}</div> : null}
      {loading && <div className="loading-state" role="status"><span className="spinner" />{t.loading}</div>}
      {!loading && builderHistory && profile && <Suspense fallback={<div className="loading-state">{t.loading}</div>}><BuilderWorkspace history={builderHistory} execution={execution} catalog={catalog} registry={metricRegistry} profile={profile} locale={locale} filterOptions={filterOptions} busy={builderBusy} onCommand={builderCommand} onUndo={() => executeBuilderTransition(undoBuilder(builderHistory))} onRedo={() => executeBuilderTransition(redoBuilder(builderHistory))} /></Suspense>}
      {!loading && !builderHistory && execution && profile && <DashboardRenderer execution={execution} dashboardOverride={dashboard ?? undefined} catalog={catalog} locale={locale} profile={profile} />}
      {!loading && !builderHistory && !execution && !error && <div className="empty-workspace">{t.noDashboard}</div>}
      </section>
      {dashboard && !builderHistory && <section className="edit-panel"><div><div className="eyebrow eyebrow-light">✦ {t.studio}</div><h3>{t.editTitle}</h3><div className="example-chips">{editExamples.map(example => <button key={example} onClick={() => setInstruction(example)}>{example}</button>)}</div></div><div className="edit-form"><input aria-label={t.editTitle} value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void edit(); }} placeholder={t.editPlaceholder} /><button className="primary-button" onClick={() => void edit()} disabled={loading || !instruction.trim() || !permissions.includes('ai:edit')}>{t.apply} ↗</button></div></section>}
      <footer className="footer">© {new Date().getFullYear()} El-Dabbous · {locale === 'ar' ? 'منصة تحليلات تجريبية' : 'Analytics prototype'}</footer></div>
    </main>
  </div>;
}
