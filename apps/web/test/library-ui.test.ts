import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import type { DashboardRecord, DashboardSpec } from '@el-dabbous/domain';
const spec: DashboardSpec = { schemaVersion:2,id:'portable',title:{ en:'Revenue review',ar:'مراجعة الإيرادات' },locale:'en',filters:{},layout:{ columns:1 },widgets:[{ id:'r',type:'kpi',series:[{ id:'r',metric:'revenue' }] }] };
const record: DashboardRecord = { id:'record',tenantId:'demo-iq',ownerUserId:'alice',scope:'private',spec,version:1,createdBy:'alice',updatedBy:'alice',createdAt:'2026-01-01',updatedAt:'2026-01-01' };
test('EN/AR naming dialog and library render localized accessible controls and scoped empty views', async()=>{
  const server = await createServer({ root:fileURLToPath(new URL('../',import.meta.url)),server:{ middlewareMode:true },appType:'custom' });
  try {
    const { DashboardNameDialog } = await server.ssrLoadModule('/src/library/DashboardNameDialog.tsx'); const { DashboardLibrary } = await server.ssrLoadModule('/src/library/DashboardLibrary.tsx');
    for (const locale of ['en','ar'] as const) {
      const dialog = renderToStaticMarkup(createElement(DashboardNameDialog,{ spec,locale,busy:false,onConfirm(){},onClose(){} }));
      assert.ok(dialog.includes(locale==='en'?'Dashboard name':'اسم اللوحة')); assert.ok(dialog.includes(spec.title[locale])); assert.ok(dialog.includes('maxLength="120"')); assert.ok(dialog.includes('<dialog'));
      const c = { folders:[],preferences:[],view:'all',search:'',sort:'updated',busy:false,setView(){},setSearch(){},setSort(){},favorite(){},move(){},createFolder(){},renameFolder(){},deleteFolder(){} };
      const html = renderToStaticMarkup(createElement(DashboardLibrary,{ records:[record],userId:'alice',locale,controller:c,onOpen(){} }));
      assert.ok(html.includes(spec.title[locale])); assert.ok(html.includes(locale==='en'?'Favorites':'المفضلة')); assert.ok(html.includes('aria-pressed="false"'));
      const empty = renderToStaticMarkup(createElement(DashboardLibrary,{ records:[record],userId:'alice',locale,controller:{ ...c,view:'folder:missing' },onOpen(){} }));
      assert.ok(empty.includes(locale==='en'?'No dashboards in this view':'لا توجد لوحات في هذا العرض')); assert.ok(!empty.includes(spec.title[locale]));
    }
  } finally { await server.close(); }
});
