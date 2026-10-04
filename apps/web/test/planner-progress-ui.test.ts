import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { tenantProfiles } from '@el-dabboos/domain';
import { plannerCopy } from '../src/planner-copy.ts';
test('generation and edit panels retain instructions, localized progress, elapsed timer and polite status in EN/RTL', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { DashboardCreationPanel } = await server.ssrLoadModule('/src/product/DashboardCreationPanel.tsx');
    const { DashboardAiEditor } = await server.ssrLoadModule('/src/product/DashboardAiEditor.tsx');
    for (const locale of ['en', 'ar'] as const) {
      const common = { locale, profile: tenantProfiles['demo-iq'], loading: true, onClose() {} };
      const prompt = 'اريد ان ارى المبيعات و اداء الفروع مع الارباح';
      const generation = renderToStaticMarkup(createElement(DashboardCreationPanel, { ...common, panel: 'create-ai', templates: [], prompt, onPrompt() {}, canGenerate: true, onChooseAi() {}, onBlank() {}, onChooseTemplate() {}, onTemplate() {}, onGenerate() {}, activity: { operation: 'generating', elapsedMs: 12000 } }));
      const editing = renderToStaticMarkup(createElement(DashboardAiEditor, { ...common, instruction: 'Keep this instruction', onInstruction() {}, onApply() {}, activity: { operation: 'editing', elapsedMs: 12000 } }));
      assert.ok(generation.includes(prompt)); assert.ok(editing.includes('value="Keep this instruction"'));
      assert.ok(generation.includes(plannerCopy[locale].generationTitle)); assert.ok(generation.includes(plannerCopy[locale].generating));
      assert.ok(editing.includes(plannerCopy[locale].editTitle)); assert.ok(editing.includes(plannerCopy[locale].editing));
      for (const html of [generation, editing]) {
        assert.ok(html.includes('role="status" aria-live="polite"')); assert.ok(html.includes('role="timer" aria-live="off"')); assert.ok(html.includes('00:12')); assert.ok(html.includes(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`)); assert.ok(html.includes('ai-loading-icon')); assert.ok(html.includes('disabled=""')); assert.ok(html.includes(plannerCopy[locale].waiting));
      }
      const idle = renderToStaticMarkup(createElement(DashboardAiEditor, { ...common, loading: false, instruction: 'Rename', onInstruction() {}, onApply() {} }));
      assert.ok(!idle.includes('ai-progress')); assert.ok(!idle.includes('ai-loading-icon'));
    }
  } finally { await server.close(); }
});
test('loading animation uses existing Lucide and respects reduced-motion CSS', async () => {
  const css = await readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.ai-loading-icon\s*\{\s*animation: none/);
});
test('AI edit examples omit unavailable branches and handle one or many trusted examples in both locales', async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {DashboardAiEditor}=await server.ssrLoadModule('/src/product/DashboardAiEditor.tsx');
  for(const locale of ['en','ar'] as const)for(const ids of [[],['known-a'],['known-a','known-b','known-c']]){
   const profile={...tenantProfiles['demo-iq'],id:'dynamic',exampleBranchIds:ids,branchLabels:Object.fromEntries(ids.map(id=>[id,{en:id,ar:id}]))};
   const html=renderToStaticMarkup(createElement(DashboardAiEditor,{locale,profile,instruction:'',loading:false,onInstruction(){},onApply(){},onClose(){}}));
   assert.ok(!html.includes('undefined'));assert.ok(!html.includes('Baghdad'));assert.ok(!html.includes('Cairo'));assert.ok(!html.includes('بغداد'));assert.ok(!html.includes('القاهرة'));
   for(const id of ids)assert.ok(html.includes(id));
   if(!ids.length){assert.ok(!html.includes('Show only'));assert.ok(!html.includes('اعرض'));}
  }
 }finally{await server.close();}
});
