import { DashboardLibrary } from './library/DashboardLibrary.tsx';
import { TemplateBrowser } from './library/TemplateBrowser.tsx';
import { DashboardNameDialog } from './library/DashboardNameDialog.tsx';
import { useDashboardLibrary } from './hooks/useDashboardLibrary.ts';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import type { Locale } from '@el-dabbous/domain';
import { DashboardRenderer } from './Renderer.tsx';
import { useWorkspace } from './hooks/useWorkspace.ts';
import { useDashboardBuilder } from './hooks/useDashboardBuilder.ts';
import { useDashboardPlanner } from './hooks/useDashboardPlanner.ts';
import { useDashboardProductFlow } from './hooks/useDashboardProductFlow.ts';
import { DashboardCreationPanel } from './product/DashboardCreationPanel.tsx';
import { DashboardActions } from './product/DashboardActions.tsx';
import { DashboardSection } from './product/DashboardSection.ts';
import { DashboardAiEditor } from './product/DashboardAiEditor.tsx';
import { copy, formatDate, formatTimestamp } from './i18n.ts';
import { showCreationPanel, showAiEditor } from './product-flow.ts';

const BuilderWorkspace = lazy(() => import('./builder/BuilderWorkspace.tsx').then(module => ({ default: module.BuilderWorkspace })));
export default function App() {
  const workspace = useWorkspace();
  const library = useDashboardLibrary(workspace);
  const builder = useDashboardBuilder(workspace);
  const planner = useDashboardPlanner(workspace, builder.reset);
  const flow = useDashboardProductFlow(workspace, builder, planner);
  const { locale, userId, demoUsers, permissions, profiles, profile, catalog, metricRegistry, templates,
    dashboard, document: dashboardDocument, savedDashboards, execution, loading, error, filterOptions, setError } = workspace;
  const t = copy[locale];
  const builderHistory = builder.history;
  const activeDashboard = builderHistory?.present.kind === 'dashboard' ? builderHistory.present.spec : dashboard;
  const activeTitle = builderHistory?.present.kind === 'empty' ? builderHistory.present.base.title[locale] : activeDashboard?.title[locale] ?? t.noDashboard;
  const isCreating = showCreationPanel(flow.panel);
  const statusText = flow.status === 'template' ? t.templateBadge : flow.status === 'saved' ? t.savedDashboard
    : flow.status === 'modified' ? t.modified : t.unsaved;
  const breadcrumb = flow.status === 'template' ? t.library : flow.status === 'saved' || flow.status === 'modified' && dashboardDocument?.kind === 'saved'
    ? t.savedDashboards : t.newDashboard;
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  const metadata = useMemo(() => {
    if (!execution) return null;
    for (const widget of Object.values(execution.widgetResults)) for (const series of Object.values(widget.seriesResults))
      if (series.status === 'success') return series.result.metadata;
    return null;
  }, [execution]);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">◈</div><div><strong>{t.product}</strong><span>{t.studio}</span></div></div>
      <div className="sidebar-section"><div className="section-caption">{t.workspace}</div><div className="workspace-pill"><span className="status-dot" />{t.ready}</div></div>
      <div className="sidebar-section"><DashboardLibrary key={`${userId}-${profile?.id}`} records={savedDashboards} userId={userId} locale={locale} controller={library} activeId={dashboardDocument?.kind === 'saved' ? dashboardDocument.record.id : undefined} onOpen={flow.openSaved} /></div>
      <div className="sidebar-section"><div className="section-caption">{t.library}</div><TemplateBrowser templates={templates} locale={locale} activeId={dashboardDocument?.kind === 'template' ? dashboardDocument.templateId : undefined} onOpen={id => profile && flow.openTemplate(id, profile, locale)} /></div>
      <div className="sidebar-foot"><span className="status-dot" /> {locale === 'ar' ? 'بيانات تجريبية اصطناعية' : 'Synthetic demo data'}</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">{t.workspace} <span>/</span> {isCreating ? t.newDashboard : <>{breadcrumb} <span>/</span> {activeTitle}</>}</div>
        <div className="top-actions"><label className="tenant-control demo-identity">{locale === 'ar' ? 'هوية تجريبية' : 'Demo identity'}<select aria-label="Demo identity" value={userId} onChange={event => flow.switchIdentity(event.target.value)}>{demoUsers.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>
          <label className="tenant-control">{t.market}<select aria-label={t.market} value={profile?.id ?? 'demo-iq'} onChange={event => { const next = profiles.find(item => item.id === event.target.value); if (next) flow.selectTenant(next); }}>{profiles.map(item => <option key={item.id} value={item.id}>{item.labels[locale]}</option>)}</select></label>
          <div className="language-toggle" role="group" aria-label="Language"><button className={locale === 'en' ? 'selected' : ''} onClick={() => workspace.selectLocale('en' as Locale)}>EN</button><button className={locale === 'ar' ? 'selected' : ''} onClick={() => workspace.selectLocale('ar' as Locale)}>عربي</button></div></div></header>
      <div className="page-content">
        <DashboardCreationPanel panel={flow.panel} locale={locale} profile={profile} templates={templates} prompt={planner.prompt} onPrompt={planner.setPrompt}
          loading={loading} canGenerate={permissions.includes('ai:generate')} onChooseAi={() => flow.enterCreation('create-ai')}
          onBlank={flow.blank} onChooseTemplate={() => flow.enterCreation('choose-template')} onTemplate={id => profile && flow.openTemplate(id, profile, locale)}
          onGenerate={() => void flow.createAi()} onClose={flow.close} />
        {!isCreating && <details className="catalog-panel"><summary>{t.metricCatalog} · {metricRegistry.filter(item => item.availability === 'available').length} {t.available} · {metricRegistry.filter(item => item.availability === 'planned').length} {t.planned}</summary><div className="catalog-list">{metricRegistry.map(item => <div key={item.id} className="catalog-metric"><span>{item.labels[locale]}</span><span className={item.availability === 'available' ? 'metric-available' : 'metric-planned'}>{item.availability === 'available' ? t.available : t.planned}</span></div>)}</div></details>}
        {error && <div className="global-error" role="alert"><span>!</span>{error}<button onClick={() => setError(null)} aria-label="Dismiss">×</button></div>}
        {!isCreating && <DashboardSection header={<div className="dashboard-title-row"><div><div className="eyebrow eyebrow-light">{breadcrumb}</div><h2>{activeTitle}</h2>{flow.status && <span className={`save-status ${flow.status === 'modified' || flow.status === 'unsaved' ? 'dirty' : ''}`}>{statusText}</span>}</div>
          <DashboardActions locale={locale} status={flow.status} actions={flow.actions} editing={!!builderHistory} loading={loading}
            canCreate={permissions.includes('dashboard:create')} canEdit={permissions.includes('dashboard:edit')}
            onNew={flow.launchNew} onUseTemplate={flow.useTemplate} onEdit={flow.editManual} onEditAi={flow.editAi} onView={flow.view}
            onRename={activeDashboard ? flow.rename : undefined} onSave={() => void flow.save()} onSaveAs={() => void flow.save(true)} onDiscard={flow.discard} /></div>}
          aiEditor={showAiEditor(flow.panel) && dashboard && profile && <DashboardAiEditor locale={locale} profile={profile} instruction={planner.instruction} onInstruction={planner.setInstruction} loading={loading} onApply={() => void flow.applyAiEdit()} onClose={flow.close} />}
          metadata={<>
          {activeDashboard && profile && <div className="meta-strip"><div><span>{t.period}</span><strong>{activeDashboard.filters.dateRange ? `${formatDate(activeDashboard.filters.dateRange.from, locale, profile)} — ${formatDate(activeDashboard.filters.dateRange.to, locale, profile)}` : '—'}</strong></div><div><span>{t.source}</span><strong>{metadata?.sourceId ?? '—'}</strong></div><div><span>{t.dataThrough}</span><strong>{metadata?.dataThrough ? formatDate(metadata.dataThrough, locale, profile) : '—'}</strong></div>{metadata?.sourceAsOf && <div><span>{t.sourceUpdated}</span><strong>{formatTimestamp(metadata.sourceAsOf, locale, profile)}</strong></div>}</div>}
          {execution?.metadata.failedSeries ? <div className="partial-note">{t.partial}: {execution.metadata.failedSeries}</div> : null}
          </>} canvas={<>
          {loading && <div className="loading-state" role="status"><span className="spinner" />{t.loading}</div>}
          {!loading && builderHistory && profile && <Suspense fallback={<div className="loading-state">{t.loading}</div>}><BuilderWorkspace history={builderHistory} execution={execution} catalog={catalog} registry={metricRegistry} profile={profile} locale={locale} filterOptions={filterOptions} busy={builder.busy} onCommand={builder.command} onUndo={builder.undo} onRedo={builder.redo} /></Suspense>}
          {!loading && !builderHistory && execution && profile && <DashboardRenderer execution={execution} dashboardOverride={dashboard ?? undefined} catalog={catalog} locale={locale} profile={profile} />}
          {!loading && !builderHistory && !execution && !error && <div className="empty-workspace">{t.noDashboard}</div>}
        </>} />}

        {flow.nameDialog && <DashboardNameDialog key={`${flow.nameDialog.operation}-${locale}`} spec={flow.nameDialog.spec} locale={locale} busy={loading} onConfirm={spec => void flow.confirmName(spec)} onClose={() => flow.setNameDialog(null)} />}
        <footer className="footer">© {new Date().getFullYear()} El-Dabbous · {locale === 'ar' ? 'منصة تحليلات تجريبية' : 'Analytics prototype'}</footer>
      </div>
    </main>
  </div>;
}
