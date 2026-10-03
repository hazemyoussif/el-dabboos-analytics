import { useDashboardViewFilters } from './hooks/useDashboardViewFilters.ts';
import { DashboardViewFilters } from './DashboardViewFilters.tsx';
import { periodCopy, periodLabels } from './DatePeriodControl.tsx';
import { plannerDisplayError } from './planner-copy.ts';
import { AlertCircle, X } from 'lucide-react';
import { WorkspaceNavigation, NavigationTrigger } from './shell/WorkspaceNavigation.tsx';
import { DashboardSkeleton, EmptyState } from './presentation/Feedback.tsx';
import { DashboardLibrary } from './library/DashboardLibrary.tsx';
import { DashboardNameDialog } from './library/DashboardNameDialog.tsx';
import { useDashboardLibrary } from './hooks/useDashboardLibrary.ts';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@el-dabboos/domain';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const library = useDashboardLibrary(workspace);
  const builder = useDashboardBuilder(workspace);
  const planner = useDashboardPlanner(workspace, builder.reset);
  const viewFilters = useDashboardViewFilters(workspace);
  const flow = useDashboardProductFlow(workspace, builder, planner, viewFilters.clearForEdit);
  const { locale, userId, demoUsers, permissions, profiles, profile, catalog, metricRegistry, templates,
    dashboard, document: dashboardDocument, savedDashboards, execution, loading, error, filterOptions, setError } = workspace;
  const t = copy[locale];
  const displayError = plannerDisplayError(error, planner.errorCode, locale);
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
  const period = execution?.metadata.effectiveFilters?.dateRange;
  const periodSelection = builder.history || showAiEditor(flow.panel) ? activeDashboard?.filters : viewFilters.selection;
  return <div className="app-shell">
    <WorkspaceNavigation locale={locale} onNew={flow.launchNew} onTemplates={() => flow.enterCreation('choose-template')} drawerOpen={drawerOpen} onDrawerClose={() => setDrawerOpen(false)}>
      <DashboardLibrary key={`${userId}-${profile?.id}`} records={savedDashboards} userId={userId} locale={locale} controller={library} loading={loading} activeId={dashboardDocument?.kind === 'saved' ? dashboardDocument.record.id : undefined} onOpen={id => { flow.openSaved(id); setDrawerOpen(false); }} />
    </WorkspaceNavigation>
    <main className="main-content">
      <header className="topbar"><NavigationTrigger locale={locale} onClick={() => setDrawerOpen(true)} /><div className="breadcrumb">{t.workspace} <span>/</span> {isCreating ? t.newDashboard : <>{breadcrumb} <span>/</span> {activeTitle}</>}</div>
        <div className="top-actions"><label className="topbar-control demo-identity"><span>{locale === 'ar' ? 'هوية تجريبية' : 'Demo identity'}</span><select aria-label="Demo identity" value={userId} onChange={event => flow.switchIdentity(event.target.value)}>{demoUsers.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>
          <label className="topbar-control"><span>{t.market}</span><select aria-label={t.market} value={profile?.id ?? 'demo-iq'} onChange={event => { const next = profiles.find(item => item.id === event.target.value); if (next) flow.selectTenant(next); }}>{profiles.map(item => <option key={item.id} value={item.id}>{item.labels[locale]}</option>)}</select></label>
          <div className="topbar-control"><span>{t.language}</span><div className="language-toggle" role="group" aria-label={t.language}><button className={locale === 'en' ? 'selected' : ''} onClick={() => workspace.selectLocale('en' as Locale)}>EN</button><button className={locale === 'ar' ? 'selected' : ''} onClick={() => workspace.selectLocale('ar' as Locale)}>عربي</button></div></div></div></header>
      <div className="page-content">
        <DashboardCreationPanel panel={flow.panel} locale={locale} profile={profile} templates={templates} prompt={planner.prompt} onPrompt={planner.setPrompt}
          activity={planner} loading={loading} canGenerate={permissions.includes('ai:generate')} onChooseAi={() => flow.enterCreation('create-ai')}
          onBlank={flow.blank} onChooseTemplate={() => flow.enterCreation('choose-template')} onTemplate={id => profile && flow.openTemplate(id, profile, locale)}
          onGenerate={() => void flow.createAi()} onClose={flow.close} />
        {!isCreating && <details className="catalog-panel"><summary>{t.metricCatalog} · {metricRegistry.filter(item => item.availability === 'available').length} {t.available} · {metricRegistry.filter(item => item.availability === 'planned').length} {t.planned}</summary><div className="catalog-list">{metricRegistry.map(item => <div key={item.id} className="catalog-metric"><span>{item.labels[locale]}</span><span className={item.availability === 'available' ? 'metric-available' : 'metric-planned'}>{item.availability === 'available' ? t.available : t.planned}</span></div>)}</div></details>}
        {displayError && <div className="global-error" role="alert"><AlertCircle aria-hidden="true" />{displayError}<button onClick={() => setError(null)} aria-label={locale === 'ar' ? 'إغلاق' : 'Dismiss'}><X aria-hidden="true" /></button></div>}
        {!isCreating && <DashboardSection header={<div className="dashboard-title-row"><div><div className="eyebrow eyebrow-light">{breadcrumb}</div><h2>{activeTitle}</h2>{flow.status && <span className={`save-status ${flow.status === 'modified' || flow.status === 'unsaved' ? 'dirty' : ''}`}>{statusText}</span>}</div>
          <DashboardActions locale={locale} status={flow.status} actions={flow.actions} editing={!!builderHistory} loading={loading || builder.busy || viewFilters.busy}
            canCreate={permissions.includes('dashboard:create')} canEdit={permissions.includes('dashboard:edit')}
            onNew={flow.launchNew} onUseTemplate={flow.useTemplate} onEdit={flow.editManual} onEditAi={flow.editAi} onView={flow.view}
            onRename={activeDashboard ? flow.rename : undefined} onSave={() => void flow.save()} onSaveAs={() => void flow.save(true)} onDiscard={flow.discard} /></div>}
          aiEditor={showAiEditor(flow.panel) && dashboard && profile && <DashboardAiEditor locale={locale} profile={profile} activity={planner} instruction={planner.instruction} onInstruction={planner.setInstruction} loading={loading} onApply={() => void flow.applyAiEdit()} onClose={flow.close} />}
          metadata={<>
          {activeDashboard && profile && <div className="meta-strip"><div><span>{t.period}</span><strong>{(loading || builder.busy || viewFilters.busy) ? t.loading : !execution ? '—' : <>{periodSelection?.datePreset ? `${periodLabels[locale][periodSelection.datePreset]} · ` : ''}{period ? `${formatDate(period.from, locale, profile)} — ${formatDate(period.to, locale, profile)}` : periodCopy[locale].all}</>}</strong></div><div><span>{t.source}</span><strong>{metadata?.sourceId ?? '—'}</strong></div><div><span>{t.dataThrough}</span><strong>{metadata?.dataThrough ? formatDate(metadata.dataThrough, locale, profile) : '—'}</strong></div>{metadata?.sourceAsOf && <div><span>{t.sourceUpdated}</span><strong>{formatTimestamp(metadata.sourceAsOf, locale, profile)}</strong></div>}</div>}
          {!builderHistory && !showAiEditor(flow.panel) && activeDashboard && profile && !loading && <DashboardViewFilters dashboard={activeDashboard} selection={viewFilters.selection} effectiveRange={period} catalog={catalog} profile={profile} locale={locale} options={filterOptions} active={viewFilters.active} busy={viewFilters.busy} onChange={viewFilters.change} onReset={viewFilters.reset} />}
          {execution?.metadata.failedSeries ? <div className="partial-note">{t.partial}: {execution.metadata.failedSeries}</div> : null}
          </>} canvas={<>
          {(loading || viewFilters.busy && !builderHistory) && <DashboardSkeleton label={t.loading} />}
          {!loading && builderHistory && profile && <Suspense fallback={<DashboardSkeleton label={t.loading} />}><BuilderWorkspace history={builderHistory} execution={execution} catalog={catalog} registry={metricRegistry} profile={profile} locale={locale} filterOptions={filterOptions} busy={builder.busy || viewFilters.busy} onCommand={builder.command} onUndo={builder.undo} onRedo={builder.redo} /></Suspense>}
          {!loading && !viewFilters.busy && !builderHistory && execution && profile && <DashboardRenderer execution={execution} dashboardOverride={dashboard ?? undefined} catalog={catalog} locale={locale} profile={profile} />}
          {!loading && !builderHistory && !execution && !error && <EmptyState action={<button onClick={flow.launchNew}>{t.newDashboard}</button>}>{t.noDashboard}</EmptyState>}
        </>} />}

        {flow.nameDialog && <DashboardNameDialog key={`${flow.nameDialog.operation}-${locale}`} spec={flow.nameDialog.spec} locale={locale} busy={loading} onConfirm={spec => void flow.confirmName(spec)} onClose={() => flow.setNameDialog(null)} />}
        <footer className="footer">© {new Date().getFullYear()} El Dabboos · {locale === 'ar' ? 'منصة تحليلات تجريبية' : 'Analytics prototype'}</footer>
      </div>
    </main>
  </div>;
}
