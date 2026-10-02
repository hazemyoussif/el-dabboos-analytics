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
import { formatValue } from '../src/i18n.ts';
import { savedDocument, documentIsDirty } from '../src/dashboard-lifecycle.ts';
const widgets: DashboardWidget[] = widgetTypes.map((type,index)=>({ id:`w${index}`,type,series:[{ id:`s${index}`,metric:'revenue' },...(type==='combo'?[{ id:'profit',metric:'gross_profit' as const }]:[])],...(type==='kpi'?{}:{ dimension: ['line','area','combo'].includes(type)?'month' as const:'branch' as const }) }));
const spec:DashboardSpec={...blankDashboardDraft(tenantProfiles['demo-iq'],'en').base,layout:{columns:12},widgets};
test('every renderer uses centralized presentation in both themes/locales without execution, spec edits or dirtying saved content',async()=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
  try {
    let calls=0;const repository:AnalyticsRepository={execute:async query=>{calls++;return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:query.groupBy?'2026-01':null,value:100,comparisonValue:80,absoluteChange:20,percentageChange:25,rank:1}],metadata:{sourceId:'test',executedAt:'2026-01-01',metricType:'currency',semantics:'additive'}};}};
    const execution=await new DashboardExecutor(repository).execute(spec,{tenantId:'demo-iq',locale:'en'});const expectedCalls=calls;const original=JSON.stringify(spec);
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
