import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabboos/domain';
import type { DashboardRecord, DashboardSpec } from '@el-dabboos/domain';
import { dashboardTemplates, instantiateDashboardTemplate } from '@el-dabboos/application';
import { namedSpec, filterLibrary, filterTemplates } from '../src/library-model.ts';
import { blankDashboardDraft, commitBuilderCommand, startBuilder } from '../src/builder/model.ts';
import { discardSavedChanges, documentIsDirty, editDocument, generatedDocument, openTemplateDocument, persistDocument, savedDocument } from '../src/dashboard-lifecycle.ts';
const spec: DashboardSpec = { ...blankDashboardDraft(tenantProfiles['demo-iq'],'en').base, layout:{ columns:12 }, widgets:[{ id:'revenue',type:'kpi',series:[{ id:'revenue',metric:'revenue' }] }] };
const record: DashboardRecord = { id:'record',tenantId:'demo-iq',ownerUserId:'alice',scope:'private',spec,version:1,createdBy:'alice',updatedBy:'alice',createdAt:'2026-01-01',updatedAt:'2026-02-01' };
test('manual naming, optional translation, generated/template defaults and IDs use one canonical title', async () => {
  assert.equal(spec.title.en,'Untitled Dashboard'); assert.equal(spec.title.ar,'لوحة بدون اسم');
  const named = namedSpec(spec,'en','  Revenue review  ',''); assert.deepEqual(named.title,{ en:'Revenue review',ar:'Revenue review' }); assert.equal(named.id,spec.id);
  assert.deepEqual(namedSpec(spec,'ar','المبيعات','Sales').title,{ ar:'المبيعات',en:'Sales' }); assert.throws(()=>namedSpec(spec,'en',' ',''));
  assert.deepEqual(generatedDocument(named).spec?.title,named.title);
  const template = instantiateDashboardTemplate(dashboardTemplates[0]!,tenantProfiles['demo-iq'],new Date()); assert.deepEqual(openTemplateDocument(template.id,template).spec.title,template.title);
  let writes = 0; const draft = generatedDocument(spec);
  const saved = await persistDocument(editDocument(draft,named),false,{ create:async value=>{ writes++; return { ...record,spec:value }; },update:async()=>{ throw new Error('Unexpected update'); } });
  assert.equal(writes,1); assert.deepEqual(saved.spec?.title,named.title);
});
test('manual and AI Rename converge, remain draft-only, Save/Discard/Save As preserve identity and allow duplicates', async () => {
  const next = namedSpec(spec,'en','Renamed','معاد تسميتها'); const current = savedDocument(record); const edited = editDocument(current,next);
  assert.equal(documentIsDirty(edited),true); assert.deepEqual(record.spec.title,spec.title); assert.equal(edited.kind==='saved' && edited.record.id,record.id); assert.equal(edited.spec?.id,spec.id);
  assert.deepEqual(discardSavedChanges(edited)?.spec?.title,spec.title);
  const ai = commitBuilderCommand(startBuilder({ kind:'dashboard',spec }),{ type:'patch',patch:{ schemaVersion:2,operations:[{ op:'set_title',title:next.title }] } }); assert.equal(ai.execute,false); assert.deepEqual(ai.history.present.kind==='dashboard' && ai.history.present.spec.title,next.title);
  let creates=0; const actions = { create:async (value:DashboardSpec)=>({ ...record,id:`copy-${++creates}`,spec:value }),update:async (id:string,value:DashboardSpec,version:number)=>{ assert.equal(id,record.id); assert.equal(version,1); return { ...record,spec:value,version:2 }; } };
  const saved = await persistDocument(edited,false,actions); assert.equal(saved.kind==='saved' && saved.record.id,record.id); assert.equal(saved.kind==='saved' && saved.record.version,2);
  const copy = await persistDocument(edited,true,actions); const duplicate = await persistDocument(edited,true,actions); assert.notEqual(copy.kind==='saved' && copy.record.id,duplicate.kind==='saved' && duplicate.record.id); assert.deepEqual(copy.spec?.title,duplicate.spec?.title); assert.equal(copy.spec?.id,spec.id);
});
test('library views, bilingual search and deterministic timestamp/name sorting keep templates separate',()=>{
  const records = [record,{ ...record,id:'shared',ownerUserId:'bob',scope:'tenant' as const,spec:{ ...spec,title:{ en:'Beta',ar:'التحصيل' } },createdAt:'2026-03-01',updatedAt:'2026-04-01' }];
  const preferences = [{ tenantId:'demo-iq',userId:'alice',dashboardId:'shared',favorite:true,folderId:'folder' }];
  const ids=(view: Parameters<typeof filterLibrary>[3],search='',sort: Parameters<typeof filterLibrary>[5]='updated')=>filterLibrary(records,preferences,'alice',view,search,sort,'en').map(r=>r.id);
  assert.deepEqual(ids('all'),['shared','record']); assert.deepEqual(ids('favorites'),['shared']); assert.deepEqual(ids('mine'),['record']); assert.deepEqual(ids('shared'),['shared']); assert.deepEqual(ids('folder:folder'),['shared']); assert.deepEqual(ids('folder:empty'),[]);
  assert.deepEqual(ids('all','التحصيل'),['shared']); assert.deepEqual(ids('mine','Beta'),[]); assert.deepEqual(ids('all','','az'),['shared','record']); assert.deepEqual(ids('all','','za'),['record','shared']); assert.deepEqual(ids('all','','oldest'),['record','shared']); assert.deepEqual(ids('all','','newest'),['shared','record']);
  const templates = dashboardTemplates.map(t=>({ ...t,availability:'available' as const })); assert.ok(filterTemplates(templates,'maintenance','').every(t=>t.domain==='maintenance')); assert.equal(filterTemplates(templates,'all','اعتمادية').length,1); assert.ok(!records.some(r=>r.id===templates[0]?.id));
});
