import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { MockAnalyticsRepository, SqliteDashboardRepository, SqliteDashboardLibraryRepository, createDashboardPersistenceSchema, createDashboardLibrarySchema } from '@el-dabbous/data';
import type { DashboardSpec } from '@el-dabbous/domain';
import { buildApi } from '../src/app.ts';
const spec: DashboardSpec = { schemaVersion: 2, id: 'portable', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en', filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const headers = (user = 'demo-iq-admin', tenant = 'demo-iq') => ({ 'x-demo-user-id': user, 'x-tenant-id': tenant, 'x-locale': 'en' });
test('library organization is personal and tenant scoped; shared content, versions and deep links stay unchanged', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db); createDashboardLibrarySchema(db); createDashboardLibrarySchema(db);
  const facts = new MockAnalyticsRepository([]);
  const repo = new SqliteDashboardRepository(db);
  const app = await buildApi({ analyticsRepository: facts, dimensionValues: facts, dashboardRepository: repo, libraryRepository: new SqliteDashboardLibraryRepository(db) });
  const call = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object, h = headers()) => app.inject({ method, url, headers: h, ...(payload ? { payload } : {}) });
  try {
    const shared = (await call('POST','/api/saved-dashboards',{ dashboard: spec, scope: 'tenant' })).json();
    const privateRecord = (await call('POST','/api/saved-dashboards',{ dashboard: spec })).json();
    const alice = (await call('POST','/api/dashboard-library/folders',{ name: 'Sales' })).json();
    const bobHeaders = headers('demo-iq-analyst');
    const bob = (await call('POST','/api/dashboard-library/folders',{ name: 'Personal' },bobHeaders)).json();
    const pref = `/api/dashboard-library/dashboards/${shared.id}`;
    assert.equal((await call('PUT',pref,{ favorite:true,folderId:alice.id })).statusCode,200);
    assert.equal((await call('PUT',pref,{ favorite:false,folderId:bob.id },bobHeaders)).statusCode,200);
    const a = (await call('GET','/api/dashboard-library')).json(); const b = (await call('GET','/api/dashboard-library',undefined,bobHeaders)).json();
    assert.deepEqual(a.folders.map((f: { id: string })=>f.id),[alice.id]); assert.deepEqual(b.folders.map((f: { id: string })=>f.id),[bob.id]);
    assert.equal(a.preferences[0].favorite,true); assert.equal(b.preferences[0].favorite,false); assert.notEqual(a.preferences[0].folderId,b.preferences[0].folderId);
    assert.equal((await call('PUT',pref,{ favorite:true,folderId:alice.id },bobHeaders)).statusCode,404);
    assert.equal((await call('PUT',`/api/dashboard-library/folders/${alice.id}`,{ name:'Hijack' },bobHeaders)).statusCode,404);
    assert.equal((await call('DELETE',`/api/dashboard-library/folders/${alice.id}`,undefined,bobHeaders)).statusCode,404);
    const eg = headers('demo-regional-analyst','demo-eg');
    assert.equal((await call('GET','/api/dashboard-library',undefined,eg)).json().folders.length,0);
    assert.equal((await call('DELETE',`/api/dashboard-library/folders/${alice.id}`,undefined,eg)).statusCode,404);
    assert.equal((await call('PUT',pref,{ favorite:true },eg)).statusCode,404);
    assert.equal((await call('PUT',`/api/dashboard-library/dashboards/${privateRecord.id}`,{ favorite:true },bobHeaders)).statusCode,404);
    assert.equal((await call('PUT',pref,{ favorite:'true' })).statusCode,400);
    assert.equal((await call('PUT',pref,{ favorite:true,userId:'other' })).statusCode,400);
    assert.equal((await call('POST','/api/dashboard-library/folders',{ name:' ' })).statusCode,400);
    const renamed = await call('PUT',`/api/dashboard-library/folders/${alice.id}`,{ name:'Revenue' }); assert.equal(renamed.json().name,'Revenue');
    assert.equal((await call('DELETE',`/api/dashboard-library/folders/${alice.id}`)).statusCode,200);
    const remaining = (await call('GET','/api/dashboard-library')).json(); assert.equal(remaining.preferences[0].folderId,undefined); assert.equal(remaining.preferences[0].favorite,true);
    assert.equal((await call('GET','/api/dashboard-library',undefined,bobHeaders)).json().preferences[0].folderId,bob.id);
    const stored = (await call('GET',`/api/saved-dashboards/${shared.id}`)).json(); assert.deepEqual(stored,shared);
    assert.deepEqual((await repo.getAccessible(privateRecord.id,'demo-iq','demo-iq-admin'))?.spec,spec);
    // Reopening an adapter against the same database restores personal metadata.
    assert.equal((await new SqliteDashboardLibraryRepository(db).getPreference({ tenantId:'demo-iq',userId:'demo-iq-admin' },shared.id))?.favorite,true);
  } finally { await app.close(); db.close(); }
});
