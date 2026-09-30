import { lazy, Suspense, useEffect, useMemo } from 'react';
import { DashboardRenderer } from './Renderer.tsx';
import { useWorkspace } from './hooks/useWorkspace.ts';
import { useDashboardBuilder } from './hooks/useDashboardBuilder.ts';
import { useDashboardPlanner } from './hooks/useDashboardPlanner.ts';
import { conversationalCopy, copy, formatDate, formatTimestamp } from './i18n.ts';
import type { Locale, TenantProfile } from '@el-dabbous/domain';

const BuilderWorkspace = lazy(() => import('./builder/BuilderWorkspace.tsx').then(module => ({ default: module.BuilderWorkspace })));
export default function App() {
  const workspace = useWorkspace();
  const builder = useDashboardBuilder(workspace);
  const planner = useDashboardPlanner(workspace, builder.reset);
  const { locale, userId, demoUsers, permissions, profiles, profile, catalog, metricRegistry, templates,
    dashboard, execution, loading, error, mode, filterOptions, setError } = workspace;
  const { prompt, setPrompt, instruction, setInstruction } = planner;
  const builderHistory = builder.history;
  const t = copy[locale];
  const conversation = profile ? conversationalCopy(locale, profile) : { placeholder: t.promptPlaceholder, examples: [] };
  const branchExample = profile ? (locale === 'ar'
    ? `اعرض ${profile.branchLabels[profile.exampleBranchIds[0]]?.ar} و${profile.branchLabels[profile.exampleBranchIds[1]]?.ar} فقط`
    : `Show only ${profile.branchLabels[profile.exampleBranchIds[0]]?.en} and ${profile.branchLabels[profile.exampleBranchIds[1]]?.en}`) : t.examples[1];
  const editExamples = t.examples.map((example, index) => index === 1 ? branchExample : example);
  const activeDashboard = builderHistory?.present.kind === 'dashboard' ? builderHistory.present.spec : dashboard;
  const activeTitle = builderHistory?.present.kind === 'empty' ? builderHistory.present.base.title[locale] : activeDashboard?.title[locale] ?? t.noDashboard;
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  const metadata = useMemo(() => {
    if (!execution) return null;
    for (const widget of Object.values(execution.widgetResults)) for (const series of Object.values(widget.seriesResults))
      if (series.status === 'success') return series.result.metadata;
    return null;
  }, [execution]);
  const switchIdentity = (nextUserId: string) => { builder.reset(); planner.reset(); void workspace.loadWorkspace(nextUserId); };
  const selectTenant = (selected: TenantProfile) => { builder.reset(); planner.reset(); void workspace.loadWorkspace(userId, selected.id); };
  const selectLocale = (next: Locale) => { workspace.selectLocale(next); builder.setLocale(next); };
  const openTemplate = (templateId: string, selected: TenantProfile, selectedLocale: Locale) => {
    builder.reset(); void workspace.openTemplate(templateId, selected, selectedLocale);
  };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">◈</div><div><strong>{t.product}</strong><span>{t.studio}</span></div></div>
      <div className="sidebar-section"><div className="section-caption">{t.workspace}</div><div className="workspace-pill"><span className="status-dot" />{t.ready}</div></div>
      <div className="sidebar-section"><div className="section-caption">{t.library}</div><nav className="demo-list">{templates.map(template => <button key={template.id} disabled={template.availability === 'restricted'} title={template.reason} className={`demo-item ${dashboard?.id === template.id && mode === 'template' ? 'active' : ''}`} onClick={() => profile && void openTemplate(template.id, profile, locale)}><span className="demo-glyph">▥</span><span>{template.name[locale]}</span></button>)}</nav></div>
      <div className="sidebar-foot"><span className="status-dot" /> {locale === 'ar' ? 'بيانات تجريبية اصطناعية' : 'Synthetic demo data'}</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">{t.workspace} <span>/</span> {activeTitle}</div><div className="top-actions"><label className="tenant-control demo-identity">{locale === 'ar' ? 'هوية تجريبية' : 'Demo identity'}<select aria-label="Demo identity" value={userId} onChange={e => switchIdentity(e.target.value)}>{demoUsers.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label><label className="tenant-control">{t.market}<select aria-label={t.market} value={profile?.id ?? 'demo-iq'} onChange={e => { const next = profiles.find(item => item.id === e.target.value); if (next) selectTenant(next); }}>{profiles.map(item => <option key={item.id} value={item.id}>{item.labels[locale]}</option>)}</select></label><div className="language-toggle" role="group" aria-label="Language"><button className={locale === 'en' ? 'selected' : ''} onClick={() => selectLocale('en')}>EN</button><button className={locale === 'ar' ? 'selected' : ''} onClick={() => selectLocale('ar')}>عربي</button></div></div></header>
      <div className="page-content"><section className="prompt-panel"><div className="prompt-copy"><span className="eyebrow"><span className="sparkle">✦</span> {t.studio}</span><h1>{t.tagline}</h1><p>{t.promptHint}</p></div><div className="prompt-form"><label htmlFor="dashboard-prompt">{t.promptTitle}</label><textarea id="dashboard-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={conversation.placeholder} rows={3} /><div className="prompt-examples">{conversation.examples.map(example => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}</button>)}</div><div className="prompt-actions"><span className="prompt-tip">✦ {locale === 'ar' ? 'اكتب طلبك بطريقتك' : 'Describe it in your own words'}</span><button className="primary-button" disabled={loading || !prompt.trim() || !permissions.includes('ai:generate')} onClick={() => void planner.generate()}>{t.generate} <span>↗</span></button></div></div></section>
      <details className="catalog-panel"><summary>{t.metricCatalog} · {metricRegistry.filter(item => item.availability === 'available').length} {t.available} · {metricRegistry.filter(item => item.availability === 'planned').length} {t.planned}</summary><div className="catalog-list">{metricRegistry.map(item => <div key={item.id} className="catalog-metric"><span>{item.labels[locale]}</span><span className={item.availability === 'available' ? 'metric-available' : 'metric-planned'}>{item.availability === 'available' ? t.available : t.planned}</span></div>)}</div></details>
      {error && <div className="global-error" role="alert"><span>!</span>{error}<button onClick={() => setError(null)} aria-label="Dismiss">×</button></div>}
      <section className="dashboard-section"><div className="dashboard-title-row"><div><div className="eyebrow eyebrow-light">{mode === 'generated' ? t.generated : t.manual}</div><h2>{activeTitle}</h2></div><div className="dashboard-actions"><button onClick={builder.startManual}>{locale === 'ar' ? 'لوحة جديدة' : 'New dashboard'}</button>{(activeDashboard || builderHistory) && <div className="builder-mode-switch"><button className={!builderHistory ? 'active' : ''} disabled={!builderHistory} onClick={builder.exit}>{locale === 'ar' ? 'عرض' : 'View'}</button><button className={builderHistory ? 'active' : ''} disabled={!!builderHistory || !activeDashboard} onClick={builder.enter}>{locale === 'ar' ? 'تحرير' : 'Edit'}</button></div>}{activeDashboard && <span className="widget-count">{activeDashboard.widgets.length} {t.widgets}</span>}</div></div>
      {activeDashboard && profile && <div className="meta-strip"><div><span>{t.period}</span><strong>{activeDashboard.filters.dateRange ? `${formatDate(activeDashboard.filters.dateRange.from, locale, profile)} — ${formatDate(activeDashboard.filters.dateRange.to, locale, profile)}` : '—'}</strong></div><div><span>{t.source}</span><strong>{metadata?.sourceId ?? '—'}</strong></div><div><span>{t.dataThrough}</span><strong>{metadata?.dataThrough ? formatDate(metadata.dataThrough, locale, profile) : '—'}</strong></div>{metadata?.sourceAsOf && <div><span>{t.sourceUpdated}</span><strong>{formatTimestamp(metadata.sourceAsOf, locale, profile)}</strong></div>}</div>}
      {execution?.metadata.failedSeries ? <div className="partial-note">{t.partial}: {execution.metadata.failedSeries}</div> : null}
      {loading && <div className="loading-state" role="status"><span className="spinner" />{t.loading}</div>}
      {!loading && builderHistory && profile && <Suspense fallback={<div className="loading-state">{t.loading}</div>}><BuilderWorkspace history={builderHistory} execution={execution} catalog={catalog} registry={metricRegistry} profile={profile} locale={locale} filterOptions={filterOptions} busy={builder.busy} onCommand={builder.command} onUndo={builder.undo} onRedo={builder.redo} /></Suspense>}
      {!loading && !builderHistory && execution && profile && <DashboardRenderer execution={execution} dashboardOverride={dashboard ?? undefined} catalog={catalog} locale={locale} profile={profile} />}
      {!loading && !builderHistory && !execution && !error && <div className="empty-workspace">{t.noDashboard}</div>}
      </section>
      {dashboard && !builderHistory && <section className="edit-panel"><div><div className="eyebrow eyebrow-light">✦ {t.studio}</div><h3>{t.editTitle}</h3><div className="example-chips">{editExamples.map(example => <button key={example} onClick={() => setInstruction(example)}>{example}</button>)}</div></div><div className="edit-form"><input aria-label={t.editTitle} value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void planner.edit(); }} placeholder={t.editPlaceholder} /><button className="primary-button" onClick={() => void planner.edit()} disabled={loading || !instruction.trim() || !permissions.includes('ai:edit')}>{t.apply} ↗</button></div></section>}
      <footer className="footer">© {new Date().getFullYear()} El-Dabbous · {locale === 'ar' ? 'منصة تحليلات تجريبية' : 'Analytics prototype'}</footer></div>
    </main>
  </div>;
}
