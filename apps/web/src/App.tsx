import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardExecutionResult, DashboardTemplate } from '@el-dabbous/application';
import type { DashboardSpec, Locale, ProductMetric, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import { DashboardRenderer } from './Renderer.tsx';
import { conversationalCopy, copy, formatDate, formatTimestamp } from './i18n.ts';

type ApiError = { error?: { code: string; message: string } };
async function api<T>(path: string, tenantId: string, locale: Locale, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId, 'x-locale': locale }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  return data;
}
export default function App() {
  const [locale, setLocale] = useState<Locale>('ar');
  const [profiles, setProfiles] = useState<TenantProfile[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [catalog, setCatalog] = useState<Record<string, SemanticMetric>>({});
  const [metricRegistry, setMetricRegistry] = useState<ProductMetric[]>([]);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState('sales-performance');
  const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
  const [execution, setExecution] = useState<DashboardExecutionResult | null>(null);
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'template' | 'generated'>('template');
  const requestId = useRef(0);
  const t = copy[locale];
  const conversation = profile ? conversationalCopy(locale, profile) : { placeholder: t.promptPlaceholder, examples: [] };
  const branchExample = profile ? (locale === 'ar'
    ? `اعرض ${profile.branchLabels[profile.exampleBranchIds[0]]?.ar} و${profile.branchLabels[profile.exampleBranchIds[1]]?.ar} فقط`
    : `Show only ${profile.branchLabels[profile.exampleBranchIds[0]]?.en} and ${profile.branchLabels[profile.exampleBranchIds[1]]?.en}`) : t.examples[1];
  const editExamples = t.examples.map((example, index) => index === 1 ? branchExample : example);
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  useEffect(() => {
    let live = true;
    const start = async () => {
      try {
        const [p, c, d] = await Promise.all([
          api<{ profiles: TenantProfile[]; defaultTenantId: string }>('/api/tenant-profiles', 'demo-iq', 'ar'),
          api<{ metrics: SemanticMetric[]; registry: ProductMetric[] }>('/api/semantic-catalog', 'demo-iq', 'ar'),
          api<{ templates: DashboardTemplate[] }>('/api/dashboard-templates', 'demo-iq', 'ar'),
        ]);
        if (!live) return;
        const selected = p.profiles.find(item => item.id === p.defaultTenantId);
        if (!selected) throw new Error('Default tenant profile is unavailable');
        setProfiles(p.profiles); setProfile(selected); setLocale(selected.defaultLocale);
        setCatalog(Object.fromEntries(c.metrics.map(metric => [metric.id, metric]))); setMetricRegistry(c.registry); setTemplates(d.templates);
        const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(`/api/dashboard-templates/sales-performance/instantiate`, selected.id, selected.defaultLocale);
        if (live) { setDashboard(result.dashboard); setExecution(result.execution); }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
      finally { if (live) setLoading(false); }
    };
    void start();
    return () => { live = false; };
  }, []);
  const metadata = useMemo(() => {
    if (!execution) return null;
    for (const widget of Object.values(execution.widgetResults)) for (const series of Object.values(widget.seriesResults))
      if (series.status === 'success') return series.result.metadata;
    return null;
  }, [execution]);
  const openTemplate = async (templateId: string, selected: TenantProfile, selectedLocale: Locale) => {
    const id = ++requestId.current;
    setError(null); setLoading(true);
    try {
      const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>(`/api/dashboard-templates/${encodeURIComponent(templateId)}/instantiate`, selected.id, selectedLocale);
      if (id === requestId.current) { setDashboard(result.dashboard); setExecution(result.execution); setMode('template'); setActiveTemplateId(templateId); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  const selectTenant = (selected: TenantProfile) => { setProfile(selected); setLocale(selected.defaultLocale); void openTemplate(activeTemplateId, selected, selected.defaultLocale); };
  const generate = async () => {
    if (!profile || !prompt.trim()) return;
    const id = ++requestId.current; setError(null); setLoading(true);
    try {
      const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>('/api/dashboards/generate', profile.id, locale, 'POST', { prompt });
      if (id === requestId.current) { setDashboard(result.dashboard); setExecution(result.execution); setMode('generated'); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  const edit = async () => {
    if (!profile || !dashboard || !instruction.trim()) return;
    const id = ++requestId.current; setError(null); setLoading(true);
    try {
      const result = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>('/api/dashboards/edit', profile.id, locale, 'POST', { dashboard, instruction });
      if (id === requestId.current) { setDashboard(result.dashboard); setExecution(result.execution); setInstruction(''); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">◈</div><div><strong>{t.product}</strong><span>{t.studio}</span></div></div>
      <div className="sidebar-section"><div className="section-caption">{t.workspace}</div><div className="workspace-pill"><span className="status-dot" />{t.ready}</div></div>
      <div className="sidebar-section"><div className="section-caption">{t.library}</div><nav className="demo-list">{templates.map(template => <button key={template.id} className={`demo-item ${dashboard?.id === template.id && mode === 'template' ? 'active' : ''}`} onClick={() => profile && void openTemplate(template.id, profile, locale)}><span className="demo-glyph">▥</span><span>{template.name[locale]}</span></button>)}</nav></div>
      <div className="sidebar-foot"><span className="status-dot" /> {locale === 'ar' ? 'بيانات تجريبية اصطناعية' : 'Synthetic demo data'}</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">{t.workspace} <span>/</span> {dashboard?.title[locale] ?? t.select}</div><div className="top-actions"><label className="tenant-control">{t.market}<select aria-label={t.market} value={profile?.id ?? 'demo-iq'} onChange={e => { const next = profiles.find(item => item.id === e.target.value); if (next) selectTenant(next); }}>{profiles.map(item => <option key={item.id} value={item.id}>{item.labels[locale]}</option>)}</select></label><div className="language-toggle" role="group" aria-label="Language"><button className={locale === 'en' ? 'selected' : ''} onClick={() => setLocale('en')}>EN</button><button className={locale === 'ar' ? 'selected' : ''} onClick={() => setLocale('ar')}>عربي</button></div></div></header>
      <div className="page-content"><section className="prompt-panel"><div className="prompt-copy"><span className="eyebrow"><span className="sparkle">✦</span> {t.studio}</span><h1>{t.tagline}</h1><p>{t.promptHint}</p></div><div className="prompt-form"><label htmlFor="dashboard-prompt">{t.promptTitle}</label><textarea id="dashboard-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={conversation.placeholder} rows={3} /><div className="prompt-examples">{conversation.examples.map(example => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}</button>)}</div><div className="prompt-actions"><span className="prompt-tip">✦ {locale === 'ar' ? 'اكتب طلبك بطريقتك' : 'Describe it in your own words'}</span><button className="primary-button" disabled={loading || !prompt.trim()} onClick={() => void generate()}>{t.generate} <span>↗</span></button></div></div></section>
      <details className="catalog-panel"><summary>{t.metricCatalog} · {metricRegistry.filter(item => item.availability === 'available').length} {t.available} · {metricRegistry.filter(item => item.availability === 'planned').length} {t.planned}</summary><div className="catalog-list">{metricRegistry.map(item => <div key={item.id} className="catalog-metric"><span>{item.labels[locale]}</span><span className={item.availability === 'available' ? 'metric-available' : 'metric-planned'}>{item.availability === 'available' ? t.available : t.planned}</span></div>)}</div></details>
      {error && <div className="global-error" role="alert"><span>!</span>{error}<button onClick={() => setError(null)} aria-label="Dismiss">×</button></div>}
      <section className="dashboard-section"><div className="dashboard-title-row"><div><div className="eyebrow eyebrow-light">{mode === 'generated' ? t.generated : t.manual}</div><h2>{dashboard?.title[locale] ?? t.noDashboard}</h2></div>{dashboard && <span className="widget-count">{dashboard.widgets.length} {t.widgets}</span>}</div>
      {dashboard && profile && <div className="meta-strip"><div><span>{t.period}</span><strong>{dashboard.filters.dateRange ? `${formatDate(dashboard.filters.dateRange.from, locale, profile)} — ${formatDate(dashboard.filters.dateRange.to, locale, profile)}` : '—'}</strong></div><div><span>{t.source}</span><strong>{metadata?.sourceId ?? '—'}</strong></div><div><span>{t.dataThrough}</span><strong>{metadata?.dataThrough ? formatDate(metadata.dataThrough, locale, profile) : '—'}</strong></div>{metadata?.sourceAsOf && <div><span>{t.sourceUpdated}</span><strong>{formatTimestamp(metadata.sourceAsOf, locale, profile)}</strong></div>}</div>}
      {execution?.metadata.failedSeries ? <div className="partial-note">{t.partial}: {execution.metadata.failedSeries}</div> : null}
      {loading && <div className="loading-state" role="status"><span className="spinner" />{t.loading}</div>}
      {!loading && execution && profile && <DashboardRenderer execution={execution} catalog={catalog} locale={locale} profile={profile} />}
      {!loading && !execution && !error && <div className="empty-workspace">{t.noDashboard}</div>}
      </section>
      {dashboard && <section className="edit-panel"><div><div className="eyebrow eyebrow-light">✦ {t.studio}</div><h3>{t.editTitle}</h3><div className="example-chips">{editExamples.map(example => <button key={example} onClick={() => setInstruction(example)}>{example}</button>)}</div></div><div className="edit-form"><input aria-label={t.editTitle} value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void edit(); }} placeholder={t.editPlaceholder} /><button className="primary-button" onClick={() => void edit()} disabled={loading || !instruction.trim()}>{t.apply} ↗</button></div></section>}
      <footer className="footer">© {new Date().getFullYear()} El-Dabbous · {locale === 'ar' ? 'منصة تحليلات تجريبية' : 'Analytics prototype'}</footer></div>
    </main>
  </div>;
}
