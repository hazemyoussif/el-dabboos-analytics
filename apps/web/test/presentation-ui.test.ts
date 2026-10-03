import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { semanticCatalog, tenantProfiles, widgetTypes } from '@el-dabboos/domain';
import type { AnalyticsRepository, DashboardSpec, DashboardWidget } from '@el-dabboos/domain';
import { DashboardExecutor } from '@el-dabboos/application';
import { blankDashboardDraft } from '../src/builder/model.ts';
import { chartTheme, seriesColor } from '../src/rendering/chart-theme.ts';
import { formatValue, paletteLabels } from '../src/i18n.ts';
import { savedDocument, documentIsDirty } from '../src/dashboard-lifecycle.ts';
const widgets: DashboardWidget[] = widgetTypes.map((type,index)=>({ id:`w${index}`,type,series:[{ id:`s${index}`,metric:'revenue' },...(type==='combo'?[{ id:'profit',metric:'gross_profit' as const }]:[])],...(type==='kpi'?{}:{ dimension: ['line','area','combo'].includes(type)?'month' as const:'branch' as const }) }));
const spec:DashboardSpec={...blankDashboardDraft(tenantProfiles['demo-iq'],'en').base,layout:{columns:12},widgets};
test('every renderer uses centralized presentation in both themes/locales without execution, spec edits or dirtying saved content',async()=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
  try {
    let calls=0;const repository:AnalyticsRepository={execute:async query=>{calls++;return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:query.groupBy?'2026-01':null,value:100,comparisonValue:80,absoluteChange:20,percentageChange:25,rank:1}],metadata:{sourceId:'test',executedAt:'2026-01-01',metricType:'currency',semantics:'additive'}};}};
    const execution=await new DashboardExecutor(repository).execute(spec,{tenantId:'demo-iq',locale:'en'}, {timeZone:'Asia/Baghdad'});const expectedCalls=calls;const original=JSON.stringify(spec);
    const document=savedDocument({id:'record',tenantId:'demo-iq',ownerUserId:'alice',scope:'private',version:1,spec,createdBy:'alice',updatedBy:'alice',createdAt:'2026-01-01',updatedAt:'2026-01-01'});
    const {DashboardRenderer,WidgetCard}=await server.ssrLoadModule('/src/Renderer.tsx'); const {ThemeContext}=await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    const {DashboardNameDialog}=await server.ssrLoadModule('/src/library/DashboardNameDialog.tsx');
    const {EnterpriseTooltip,ChartLegend,legendItems}=await server.ssrLoadModule('/src/rendering/ChartChrome.tsx');
    for(const locale of ['en','ar'] as const) for(const mode of ['light','dark'] as const) {
      const theme=chartTheme(mode);const provider={preference:mode,theme,setPreference(){}};
      const html=renderToStaticMarkup(createElement(ThemeContext.Provider,{value:provider},createElement(DashboardRenderer,{execution,catalog:semanticCatalog,profile:tenantProfiles['demo-iq'],locale})));
      assert.equal((html.match(/<article/g)??[]).length,8);assert.ok(html.includes('chart-legend'));assert.ok(html.includes('table-wrap'));assert.ok(html.includes('View chart values')||html.includes('عرض قيم الرسم'));
      assert.ok(html.includes(theme.categorical[0]!));assert.ok(!documentIsDirty(document));assert.equal(document.record.version,1);assert.equal(JSON.stringify(spec),original);assert.equal(calls,expectedCalls);
      const dialog=renderToStaticMarkup(createElement(ThemeContext.Provider,{value:provider},createElement(DashboardNameDialog,{spec,locale,busy:false,onConfirm(){},onClose(){}}))); assert.ok(dialog.includes(spec.title[locale]));assert.ok(dialog.includes('maxLength="120"'));
      const w=widgets[1]!;const entry=execution.widgetResults[w.id]!;const props={widget:w,theme,catalog:semanticCatalog,profile:tenantProfiles['demo-iq'],locale,labels:[semanticCatalog.revenue.labels[locale]],formatSeries:(id:string,value:number|null)=>{assert.ok(id);return value==null?'—':`${value} IQD`;}};
      const tooltip=renderToStaticMarkup(createElement(EnterpriseTooltip,{active:true,label:'January',payload:[{dataKey:'v_s1',value:100,payload:{_row:0}}],props,entry}));assert.ok(tooltip.includes(`dir="${locale==='ar'?'rtl':'ltr'}"`));assert.ok(tooltip.includes('80 IQD'));assert.ok(tooltip.includes('20 IQD'));assert.ok(tooltip.includes(formatValue(25,'percentage',locale,tenantProfiles['demo-iq'])));assert.ok(tooltip.includes(locale==='ar'?'الترتيب':'Rank'));
      const items=legendItems(props,entry);assert.equal(items[0].color,seriesColor(theme,0));assert.equal(items[1].reference,true);assert.ok(renderToStaticMarkup(createElement(ChartLegend,{items,locale})).includes('reference'));
      const categoryTooltip=renderToStaticMarkup(createElement(EnterpriseTooltip,{active:true,payload:[{value:100,payload:{name:'Category',sourceIndex:4}}],props,entry,composition:true,categoryIndices:[2,4]}));assert.ok(categoryTooltip.includes(seriesColor(theme,1)));
      const empty=renderToStaticMarkup(createElement(WidgetCard,{widget:w,entry:{...entry,alignedRows:[{key:'2026-01',series:{s1:{value:null}}}]},catalog:semanticCatalog,locale,profile:tenantProfiles['demo-iq']}));assert.ok(empty.includes('empty-state'));assert.ok(!empty.includes('100 IQD'));
      const error=renderToStaticMarkup(createElement(WidgetCard,{widget:w,entry:{status:'error',alignedRows:[],seriesResults:{s1:{status:'error',error:{code:'FAILED',message:'Unavailable'}}}},catalog:semanticCatalog,locale,profile:tenantProfiles['demo-iq']}));assert.ok(error.includes('role="alert"'));assert.ok(error.includes('Unavailable'));
      const partial=renderToStaticMarkup(createElement(WidgetCard,{widget:w,entry:{...entry,status:'partial'},catalog:semanticCatalog,locale,profile:tenantProfiles['demo-iq']}));assert.ok(partial.includes('notice-warning'));assert.ok(partial.includes('role="status"'));
    }
  } finally {await server.close();}
});
test('navigation shell retains labelled dashboard actions in collapsed state and a modal mobile drawer',async()=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
  try {
    const {WorkspaceNavigation,NavigationTrigger}=await server.ssrLoadModule('/src/shell/WorkspaceNavigation.tsx');
    for(const locale of ['en','ar'] as const) {
      const html=renderToStaticMarkup(createElement(WorkspaceNavigation,{locale,drawerOpen:false,onDrawerClose(){},onNew(){},onTemplates(){}},createElement('button',{onClick(){},title:'Saved dashboard'},'Saved dashboard')));
      assert.ok(html.includes('<dialog'));assert.ok(html.includes('navigation-drawer'));assert.ok(html.includes('Saved dashboard'));assert.ok(html.includes(locale==='en'?'Browse templates':'تصفح القوالب'));assert.ok(html.includes(locale==='en'?'Theme':'المظهر'));
      assert.ok(renderToStaticMarkup(createElement(NavigationTrigger,{locale,onClick(){}})).includes(locale==='en'?'Open navigation':'فتح التنقل'));
    }
  } finally {await server.close();}
});

test('official shell branding is accessible in expanded, collapsed and mobile navigation across themes/locales', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { WorkspaceBrand } = await server.ssrLoadModule('/src/shell/WorkspaceBrand.tsx');
    const { WorkspaceNavigation } = await server.ssrLoadModule('/src/shell/WorkspaceNavigation.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    for (const locale of ['en', 'ar'] as const) for (const mode of ['light', 'dark'] as const) {
      for (const collapsed of [false, true]) {
        const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme: chartTheme(mode), setPreference() {} } }, createElement(WorkspaceBrand, { locale, collapsed })));
        assert.ok(html.includes('src="/brand/el-dabboos-mark.png"')); assert.ok(html.includes('width="692" height="518"'));
        assert.ok(html.includes(`alt="${collapsed ? 'El Dabboos' : ''}"`));
        assert.equal(html.includes('<strong'), !collapsed); assert.ok(!html.includes('corporate-logo'));
        if (!collapsed) { assert.ok(html.includes('<strong dir="ltr">El Dabboos</strong>')); assert.ok(html.includes(locale === 'en' ? 'Analytics Studio' : 'استوديو التحليلات')); }
      }
      const shell = renderToStaticMarkup(createElement(WorkspaceNavigation, { locale, drawerOpen: false, onDrawerClose() {}, onNew() {}, onTemplates() {} }));
      const mobile = shell.slice(shell.indexOf('<dialog'));
      assert.ok(mobile.includes('alt=""')); assert.ok(mobile.includes('<strong dir="ltr">El Dabboos</strong>'));
      assert.ok(!shell.includes('lucide-chart-no-axes-combined'));
    }
  } finally { await server.close(); }
});

test('identity, market and localized language controls share label/control rows in both locales and themes', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    for (const locale of ['en', 'ar'] as const) for (const mode of ['light', 'dark'] as const) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: (key: string) => key.endsWith('.ui-locale') ? locale : null }, location: { pathname: '/' }, matchMedia: () => ({ matches: false }) } });
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme: chartTheme(mode), setPreference() {} } }, createElement(App)));
      assert.equal((html.match(/class="topbar-control/g) ?? []).length, 3);
      assert.match(html, /class="topbar-control demo-identity"><span>[^<]+<\/span><select/);
      assert.match(html, /class="topbar-control"><span>(Market|السوق)<\/span><select/);
      const language = locale === 'en' ? 'Language' : 'اللغة';
      assert.ok(html.includes(`<div class="topbar-control"><span>${language}</span><div class="language-toggle" role="group" aria-label="${language}">`));
      assert.ok(html.includes(`${locale === 'en' ? 'class="selected"' : 'class=""'}>EN</button>`));
      assert.ok(html.includes(`${locale === 'ar' ? 'class="selected"' : 'class=""'}>عربي</button>`));
      assert.ok(html.includes('src="/brand/el-dabboos-mark.png"'));
    }
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
    await server.close();
  }
});

test('governed blue palette reaches the shared renderer in Light/Dark and EN/Arabic without changing queries or saved content', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { WidgetCard } = await server.ssrLoadModule('/src/Renderer.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    const { withGovernedPalette } = await server.ssrLoadModule('/src/rendering/chart-theme.ts');
    const widget: DashboardWidget = { id: 'blue', type: 'line', dimension: 'branch', presentation: { palette: 'blue' }, series: [{ id: 'revenue', metric: 'revenue' }, { id: 'profit', metric: 'gross_profit' }] };
    const original = JSON.stringify(widget);
    const entry = { status: 'success', seriesResults: {}, alignedRows: [{ key: 'baghdad', series: { revenue: { value: 100, comparisonValue: 80, rank: 1 }, profit: { value: null } } }] };
    for (const mode of ['light', 'dark'] as const) for (const locale of ['en', 'ar'] as const) {
      const base = chartTheme(mode); const palette = withGovernedPalette(base, 'blue');
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme: base, setPreference() {} } }, createElement(WidgetCard, { widget, entry, locale, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'] })));
      assert.ok(html.includes(palette.categorical[0])); assert.ok(html.includes(palette.categorical[1]));
      assert.ok(html.includes('reference')); assert.ok(html.includes('chart-summary')); assert.ok(html.includes('—'));
      assert.ok(html.includes(locale === 'ar' ? 'عرض قيم الرسم' : 'View chart values')); assert.equal(JSON.stringify(widget), original);
    }
  } finally { await server.close(); }
});

test('builder palette select exposes the domain vocabulary with localized native labels in both themes', async () => {
  const { governedPalettes } = await import('@el-dabboos/domain');
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { PaletteSelect } = await server.ssrLoadModule('/src/builder/BuilderWorkspace.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    for (const locale of ['en', 'ar'] as const) for (const mode of ['light', 'dark'] as const) {
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme: chartTheme(mode), setPreference() {} } }, createElement(PaletteSelect, { locale, value: 'blue', onChange() {} })));
      assert.ok(html.startsWith(`<label>${locale === 'ar' ? 'لوحة الألوان' : 'Palette'}<select>`));
      assert.equal((html.match(/<option/g) ?? []).length, governedPalettes.length + 1);
      for (const palette of governedPalettes) assert.ok(html.includes(`value="${palette}"${palette === 'blue' ? ' selected=""' : ''}>${paletteLabels[locale][palette]}</option>`));
      assert.ok(html.includes('value="blue" selected=""')); assert.ok(!html.includes('#'));
      assert.ok(html.includes(locale === 'ar' ? 'أردواز' : 'Slate'));
    }
  } finally { await server.close(); }
});

test('Pie and Treemap retain eight named category colors including distinct first and fifth categories', async () => {
  const { governedPalettes } = await import('@el-dabboos/domain');
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { WidgetCard } = await server.ssrLoadModule('/src/Renderer.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    for (const mode of ['light', 'dark'] as const) for (const locale of ['en', 'ar'] as const) for (const palette of governedPalettes) for (const type of ['pie', 'treemap'] as const) {
      const widget: DashboardWidget = { id: type, type, dimension: 'customer', presentation: { palette }, series: [{ id: 'revenue', metric: 'revenue' }] };
      const entry = { status: 'success', seriesResults: {}, alignedRows: Array.from({ length: 8 }, (_, index) => ({ key: `customer_${index + 1}`, series: { revenue: { value: (index + 1) * 100 } } })) };
      const theme = chartTheme(mode);
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme, setPreference() {} } }, createElement(WidgetCard, { widget, entry, locale, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'] })));
      const marks = [...html.matchAll(/class="legend-mark " style="color:([^;]+);/gu)].map(match => match[1]);
      assert.equal(marks.length, 8); assert.equal(new Set(marks).size, 8); assert.notEqual(marks[0], marks[4]);
    }
  } finally { await server.close(); }
});

test('dashboard Appearance uses theme-resolved swatches and native radio semantics in EN/AR', async () => {
  const { governedPalettes } = await import('@el-dabboos/domain');
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { DashboardAppearance } = await server.ssrLoadModule('/src/builder/DashboardAppearance.tsx');
    const { PaletteSelect } = await server.ssrLoadModule('/src/builder/BuilderWorkspace.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    const { withGovernedPalette } = await server.ssrLoadModule('/src/rendering/chart-theme.ts');
    for (const mode of ['light','dark'] as const) for (const locale of ['en','ar'] as const) {
      const theme = chartTheme(mode);
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme, setPreference() {} } }, createElement(DashboardAppearance, { locale, palette: 'blue', onChange() {} })));
      assert.equal((html.match(/type="radio"/gu) ?? []).length, 7);
      assert.equal((html.match(/checked=""/gu) ?? []).length, 1);
      assert.match(html, /<input[^>]*(?:checked=""[^>]*value="blue"|value="blue"[^>]*checked="")/u);
      assert.ok(html.includes(locale === 'ar' ? 'مظهر لوحة المعلومات' : 'Dashboard appearance'));
      for (const palette of governedPalettes) for (const color of withGovernedPalette(theme, palette).categorical) assert.ok(html.includes(`background-color:${color}`));
      assert.equal((html.match(/aria-hidden="true"/gu) ?? []).length, 8);
      const inherit = renderToStaticMarkup(createElement(PaletteSelect, { locale, value: 'inherit', dashboardPalette: 'blue', onChange() {} }));
      assert.ok(inherit.includes(`value="inherit" selected=""`)); assert.ok(inherit.includes(`(${paletteLabels[locale].blue})`));
      assert.ok(inherit.includes(`value="default">${paletteLabels[locale].default}</option>`));
    }
  } finally { await server.close(); }
});

test('appearance disclosure starts closed with localized selected palette and eight theme-resolved summary swatches', async () => {
  const { governedPalettes } = await import('@el-dabboos/domain');
  const { appearanceCopy } = await import('../src/i18n.ts');
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { DashboardAppearance } = await server.ssrLoadModule('/src/builder/DashboardAppearance.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    const { withGovernedPalette } = await server.ssrLoadModule('/src/rendering/chart-theme.ts');
    for (const mode of ['light','dark'] as const) for (const locale of ['en','ar'] as const) for (const palette of governedPalettes) {
      const theme = chartTheme(mode);
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { preference: mode, theme, setPreference() {} } }, createElement(DashboardAppearance, { locale, palette, onChange() {} })));
      const details = html.match(/^<details\b([^>]*)>/u);
      assert.ok(details); assert.ok(!/\bopen(?:\s|=|$)/u.test(details[1]!));
      const summary = html.match(/<summary>(.*?)<\/summary>/u)?.[1];
      assert.ok(summary); assert.ok(summary.includes(appearanceCopy[locale].heading)); assert.ok(summary.includes(paletteLabels[locale][palette]));
      assert.ok(summary.includes('aria-hidden="true"')); assert.ok(!summary.includes('<input'));
      const colors = [...summary.matchAll(/background-color:([^";]+)/gu)].map(match => match[1]);
      assert.equal(colors.length, 8); assert.deepEqual(colors, withGovernedPalette(theme, palette).categorical);
      assert.equal((html.match(/type="radio"/gu) ?? []).length, 7);
      assert.match(html, new RegExp(`<input[^>]*(?:checked=""[^>]*value="${palette}"|value="${palette}"[^>]*checked="")`, 'u'));
    }
  } finally { await server.close(); }
});

test('viewer and live builder previews inherit current dashboard palette while overrides stay fixed', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { DashboardRenderer } = await server.ssrLoadModule('/src/Renderer.tsx');
    const { BuilderWorkspace } = await server.ssrLoadModule('/src/builder/BuilderWorkspace.tsx');
    const { ThemeContext } = await server.ssrLoadModule('/src/presentation/ThemeProvider.tsx');
    const { startBuilder } = await import('../src/builder/model.ts');
    const { productMetricCatalog } = await import('@el-dabboos/domain');
    const { withGovernedPalette } = await import('../src/rendering/chart-theme.ts');
    const chart: DashboardWidget = { id: 'inherited', type: 'line', dimension: 'month', presentation: { legend: 'show' }, series: [{ id: 'r', metric: 'revenue' }] };
    const dashboard: DashboardSpec = { ...spec, layout: { columns: 12 }, presentation: { palette: 'blue' }, widgets: [chart, { ...chart, id: 'rose', presentation: { palette: 'red', legend: 'show' } }, { ...chart, id: 'enterprise', presentation: { palette: 'default', legend: 'show' } }] };
    let calls = 0;
    const repository: AnalyticsRepository = { execute: async query => { calls++; return { metric: query.metric, groupBy: 'month', rows: [{ key: '2026-01', value: 100 }], metadata: { sourceId: 'test', executedAt: '2026-01-01' } }; } };
    const execution = await new DashboardExecutor(repository).execute(dashboard, { tenantId: 'demo-iq', locale: 'en' }, { timeZone: 'Asia/Baghdad' });
    const expectedCalls = calls;
    for (const mode of ['light','dark'] as const) for (const locale of ['en','ar'] as const) for (const palette of ['blue','green'] as const) {
      const current = { ...dashboard, presentation: { palette } }; const theme = chartTheme(mode);
      const provider = { preference: mode, theme, setPreference() {} };
      const viewer = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: provider }, createElement(DashboardRenderer, { execution, dashboardOverride: current, locale, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'] })));
      const builder = renderToStaticMarkup(createElement(ThemeContext.Provider, { value: provider }, createElement(BuilderWorkspace, { history: startBuilder({ kind: 'dashboard', spec: current }), execution, locale, catalog: semanticCatalog, registry: productMetricCatalog, profile: tenantProfiles['demo-iq'], filterOptions: {}, busy: false, onCommand() {}, onUndo() {}, onRedo() {} })));
      for (const html of [viewer, builder]) {
        const colors = [...html.matchAll(/class="legend-mark " style="color:([^;]+);/gu)].map(match => match[1]);
        assert.deepEqual(colors, [withGovernedPalette(theme, palette).categorical[0], withGovernedPalette(theme, 'red').categorical[0], theme.categorical[0]]);
      }
      assert.ok(!viewer.includes('dashboard-appearance')); assert.ok(builder.includes('dashboard-appearance'));
      const { appearanceCopy, paletteLabels } = await import('../src/i18n.ts');
      assert.ok(builder.includes(`${appearanceCopy[locale].inherit} (${paletteLabels[locale][palette]})`));
      assert.equal(calls, expectedCalls); assert.equal(execution.dashboard.presentation?.palette, 'blue');
    }
  } finally { await server.close(); }
});


test('builder inspector groups dashboard disclosures above selected widget controls in EN/AR and preserves empty guidance', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { BuilderWorkspace } = await server.ssrLoadModule('/src/builder/BuilderWorkspace.tsx');
    const { startBuilder } = await import('../src/builder/model.ts');
    const { productMetricCatalog } = await import('@el-dabboos/domain');
    for (const locale of ['en','ar'] as const) {
      const props = { execution: null, locale, catalog: semanticCatalog, registry: productMetricCatalog, profile: tenantProfiles['demo-iq'], filterOptions: {}, busy: false, onCommand() {}, onUndo() {}, onRedo() {} };
      const html = renderToStaticMarkup(createElement(BuilderWorkspace, { ...props, history: startBuilder({ kind: 'dashboard', spec }) }));
      const dashboardStart = html.indexOf('<section class="dashboard-settings">');
      const widgetStart = html.indexOf('<section class="widget-settings">');
      assert.ok(dashboardStart >= 0); assert.ok(widgetStart > dashboardStart);
      const dashboard = html.slice(dashboardStart, widgetStart);
      const widget = html.slice(widgetStart, html.indexOf('</aside>', widgetStart));
      assert.ok(dashboard.includes(`<h3>${locale === 'en' ? 'Dashboard settings' : 'إعدادات لوحة المعلومات'}</h3>`));
      assert.match(dashboard, /<details class="dashboard-appearance">/u);
      assert.match(dashboard, /<details class="dashboard-filters"><summary>/u);
      assert.ok(dashboard.includes(locale === 'en' ? 'Dashboard filters' : 'مرشحات لوحة المعلومات'));
      assert.ok(!dashboard.includes('builder-editor')); assert.ok(!dashboard.includes('layout-inspector'));
      assert.ok(widget.includes(`<h3>${locale === 'en' ? 'Selected widget' : 'البطاقة المحددة'}</h3>`));
      assert.ok(widget.indexOf('layout-inspector') < widget.indexOf('builder-editor'));
      assert.ok(widget.includes(`<h4>${locale === 'en' ? 'Widget properties' : 'خصائص البطاقة'}</h4>`));
      assert.ok(widget.includes('value="inherit" selected=""')); assert.ok(!widget.includes('dashboard-filters'));
      const empty = renderToStaticMarkup(createElement(BuilderWorkspace, { ...props, history: startBuilder(blankDashboardDraft(tenantProfiles['demo-iq'], locale)) }));
      assert.ok(empty.includes('class="dashboard-settings"')); assert.ok(empty.includes('class="dashboard-filters"'));
      assert.ok(!empty.includes('class="dashboard-appearance"')); assert.ok(!empty.includes('class="widget-settings"'));
      assert.ok(empty.includes(locale === 'en' ? 'Select a widget or add one' : 'اختر بطاقة أو أضف واحدة'));
    }
  } finally { await server.close(); }
});

test('Save waits for viewer defaults to finish restoring before starting persistence', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false } });
  try {
    const { useDashboardProductFlow } = await server.ssrLoadModule('/src/hooks/useDashboardProductFlow.ts');
    let restore!: () => void;
    const restoring = new Promise<void>(resolve => { restore = resolve; });
    const events: string[] = [];
    let flow!: { save: () => Promise<void> };
    const document = savedDocument({ id: 'record', tenantId: 'demo-iq', ownerUserId: 'alice', scope: 'private', version: 1, spec, createdBy: 'alice', updatedBy: 'alice', createdAt: '2026-01-01', updatedAt: '2026-01-01' });
    function Harness() {
      flow = useDashboardProductFlow({ document, dashboard: spec, permissions: [], save: async () => { events.push('save'); return true; } },
        { history: null, exit: () => events.push('exit') }, {}, () => restoring);
      return null;
    }
    renderToStaticMarkup(createElement(Harness));
    const saving = flow.save();
    assert.deepEqual(events, []);
    restore(); await saving;
    assert.deepEqual(events, ['save', 'exit']);
  } finally { await server.close(); }
});

test('date and viewer controls render all governed presets, truthful multi-value defaults, and localized native controls', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false } });
  try {
    const { DatePeriodControl } = await server.ssrLoadModule('/src/DatePeriodControl.tsx');
    const { DashboardViewFilters } = await server.ssrLoadModule('/src/DashboardViewFilters.tsx');
    for (const locale of ['en', 'ar'] as const) {
      const relative = renderToStaticMarkup(createElement(DatePeriodControl, { filters: { datePreset: 'previous_month' }, timeZone: 'Asia/Baghdad', locale, onChange() {} }));
      assert.equal((relative.match(/<option /g) ?? []).length, 14); assert.ok(relative.includes('value="previous_month" selected=""'));
      assert.ok(relative.includes(locale === 'en' ? 'Fixed dates' : 'تواريخ ثابتة'));
      const fixed = renderToStaticMarkup(createElement(DatePeriodControl, { filters: { dateRange: { from: '2026-09-01', to: '2026-09-30' } }, timeZone: 'Asia/Baghdad', locale, onChange() {} }));
      assert.ok(fixed.includes('value="2026-09-01"')); assert.ok(fixed.includes('value="absolute" selected=""'));
      const html = renderToStaticMarkup(createElement(DashboardViewFilters, { dashboard: spec, selection: { datePreset: 'previous_month', dimensions: [{ dimension: 'branch', values: ['baghdad', 'basra'] }] }, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'], locale, options: { branch: [{ id: 'baghdad', label: 'Baghdad' }, { id: 'basra', label: 'Basra' }] }, active: true, busy: false, onChange() {}, onReset() {} }));
      assert.ok(html.includes('<details class="view-filters">')); assert.ok(!html.includes('open=""'));
      assert.ok(html.includes('Baghdad، Basra')); assert.ok(html.includes(locale === 'en' ? 'Temporary filters' : 'مرشحات مؤقتة'));
      assert.ok(!html.includes('Warehouse')); // Revenue-only series cannot be filtered by warehouse.
    }
  } finally { await server.close(); }
});
