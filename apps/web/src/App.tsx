import { useEffect, useMemo, useState } from 'react';
import type { DashboardExecutionResult } from '@el-dabbous/application';
import type { DashboardSpec, Locale, SemanticMetric } from '@el-dabbous/domain';
import { DashboardRenderer } from './Renderer.tsx';
import { copy } from './i18n.ts';

type ApiError = { error?: { code: string; message: string } };
async function api<T>(path: string, locale: Locale, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: { 'content-type': 'application/json', 'x-tenant-id': 'demo', 'x-locale': locale }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  return data;
}
export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [catalog, setCatalog] = useState<Record<string, SemanticMetric>>({});
  const [demos, setDemos] = useState<DashboardSpec[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
  const [execution, setExecution] = useState<DashboardExecutionResult | null>(null);
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'manual' | 'generated'>('manual');
  const t = copy[locale];
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  useEffect(() => {
    let live = true;
    Promise.all([api<{ metrics: SemanticMetric[] }>('/api/semantic-catalog', 'en'), api<{ dashboards: DashboardSpec[] }>('/api/dashboards/demos', 'en')])
      .then(async ([c, d]) => { if (!live) return; setCatalog(Object.fromEntries(c.metrics.map(m => [m.id, m]))); setDemos(d.dashboards); if (d.dashboards[0]) { const first = d.dashboards[0]; const result = await api<DashboardExecutionResult>('/api/dashboards/execute', 'en', 'POST', { dashboard: first }); if (live) { setDashboard(first); setExecution(result); } } })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, []);
  const freshness = useMemo(() => execution && Object.values(execution.widgetResults).find(entry => entry.status === 'success'), [execution]);
  const metadata = freshness?.status === 'success' ? freshness.result.metadata : null;
  const selectDemo = async (spec: DashboardSpec) => { setError(null); setLoading(true); try { const result = await api<DashboardExecutionResult>('/api/dashboards/execute', locale, 'POST', { dashboard: spec }); setDashboard(spec); setExecution(result); setMode('manual'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); } };
  const generate = async () => { if (!prompt.trim()) return; setError(null); setLoading(true); try { const response = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>('/api/dashboards/generate', locale, 'POST', { prompt }); setDashboard(response.dashboard); setExecution(response.execution); setMode('generated'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); } };
  const edit = async () => { if (!dashboard || !instruction.trim()) return; setError(null); setLoading(true); try { const response = await api<{ dashboard: DashboardSpec; execution: DashboardExecutionResult }>('/api/dashboards/edit', locale, 'POST', { dashboard, instruction }); setDashboard(response.dashboard); setExecution(response.execution); setInstruction(''); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); } };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">◈</div><div><strong>{t.product}</strong><span>{t.studio}</span></div></div>
      <div className="sidebar-section"><div className="section-caption">{t.workspace}</div><div className="workspace-pill"><span className="status-dot" />{t.ready}</div></div>
      <div className="sidebar-section"><div className="section-caption">{t.library}</div><nav className="demo-list">{demos.map(spec => <button key={spec.id} className={`demo-item ${dashboard?.id === spec.id && mode === 'manual' ? 'active' : ''}`} onClick={() => void selectDemo(spec)}><span className="demo-glyph">{spec.id === 'maintenance' ? '⚙' : spec.id === 'finance-receivables' ? '◫' : '▥'}</span><span>{spec.title[locale]}</span></button>)}</nav></div>
      <div className="sidebar-foot"><span className="status-dot" /> {locale === 'ar' ? 'بيانات تجريبية آمنة' : 'Demo data environment'}</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">{t.workspace} <span>/</span> {dashboard?.title[locale] ?? t.select}</div><div className="top-actions"><span className="top-status"><span className="status-dot" />{locale === 'ar' ? 'متصل' : 'Connected'}</span><div className="language-toggle" role="group" aria-label="Language"><button className={locale === 'en' ? 'selected' : ''} onClick={() => setLocale('en')}>EN</button><button className={locale === 'ar' ? 'selected' : ''} onClick={() => setLocale('ar')}>عربي</button></div></div></header>
      <div className="page-content"><section className="prompt-panel"><div className="prompt-copy"><span className="eyebrow"><span className="sparkle">✦</span> {t.studio}</span><h1>{t.tagline}</h1><p>{t.promptHint}</p></div><div className="prompt-form"><label htmlFor="dashboard-prompt">{t.promptTitle}</label><textarea id="dashboard-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t.promptPlaceholder} rows={3} /><div className="prompt-actions"><span className="prompt-tip">✦ {locale === 'ar' ? 'اكتب طلبك بطريقتك' : 'Describe it in your own words'}</span><button className="primary-button" disabled={loading || !prompt.trim()} onClick={() => void generate()}>{t.generate} <span>↗</span></button></div></div></section>
      {error && <div className="global-error" role="alert"><span>!</span>{error}<button onClick={() => setError(null)} aria-label="Dismiss">×</button></div>}
      <section className="dashboard-section"><div className="dashboard-title-row"><div><div className="eyebrow eyebrow-light">{mode === 'generated' ? t.generated : t.manual}</div><h2>{dashboard?.title[locale] ?? t.noDashboard}</h2></div>{dashboard && <span className="widget-count">{dashboard.widgets.length} {t.widgets}</span>}</div>
      {dashboard && <div className="meta-strip"><div><span>{t.period}</span><strong>{dashboard.filters.dateRange ? `${new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${dashboard.filters.dateRange.from}T00:00:00Z`))} — ${new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${dashboard.filters.dateRange.to}T00:00:00Z`))}` : '—'}</strong></div><div><span>{t.source}</span><strong>{metadata?.sourceId ?? '—'}</strong></div><div><span>{t.fresh}</span><strong>{metadata?.sourceAsOf ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(metadata.sourceAsOf)) : '—'}</strong></div></div>}
      {execution?.metadata.failed ? <div className="partial-note">{t.partial}: {execution.metadata.failed}</div> : null}
      {loading && <div className="loading-state" role="status"><span className="spinner" />{t.loading}</div>}
      {!loading && execution && <DashboardRenderer execution={execution} catalog={catalog} locale={locale} />}
      {!loading && !execution && !error && <div className="empty-workspace">{t.noDashboard}</div>}
      </section>
      {dashboard && <section className="edit-panel"><div><div className="eyebrow eyebrow-light">✦ {t.studio}</div><h3>{t.editTitle}</h3><div className="example-chips">{t.examples.map(example => <button key={example} onClick={() => setInstruction(example)}>{example}</button>)}</div></div><div className="edit-form"><input aria-label={t.editTitle} value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void edit(); }} placeholder={t.editPlaceholder} /><button className="primary-button" onClick={() => void edit()} disabled={loading || !instruction.trim()}>{t.apply} ↗</button></div></section>}
      <footer className="footer">© {new Date().getFullYear()} El-Dabbous · {locale === 'ar' ? 'منصة تحليلات تجريبية' : 'Analytics prototype'}</footer></div>
    </main>
  </div>;
}
