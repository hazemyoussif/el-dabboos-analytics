import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { MockAnalyticsRepository, SqliteDashboardRepository, createDashboardPersistenceSchema, migrateMetadata, seedDemoAdministration, SqliteAdministrationStore } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';
test('liveness aliases stay available; required persistence and optional analytics probes determine readiness without business queries or LLM calls', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db); const repository = new MockAnalyticsRepository([]);
  let analyticsReady = true, queries = 0; const execute = repository.execute.bind(repository); repository.execute = async (...args) => { queries++; return execute(...args); };
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, dashboardRepository: new SqliteDashboardRepository(db), planner: null, readiness: { persistence: async () => { db.prepare('SELECT 1').get(); return true; }, analytics: async () => analyticsReady } });
  try {
    for (const path of ['/health', '/health/live']) { const response = await app.inject({ url: path }); assert.equal(response.statusCode, 200); assert.deepEqual(response.json(), { status: 'ok' }); }
    assert.equal((await app.inject({ url: '/health/ready' })).statusCode, 200);
    analyticsReady = false; assert.equal((await app.inject({ url: '/health/ready' })).statusCode, 503); analyticsReady = true;
    db.close(); const response = await app.inject({ url: '/health/ready' }); assert.equal(response.statusCode, 503); assert.deepEqual(response.json().checks, { persistence: 'unavailable', analytics: 'available' }); assert.ok(!response.body.includes('database')); assert.equal(queries, 0); assert.equal((await app.inject({ url: '/health/live' })).statusCode, 200);
  } finally { await app.close(); }
});
test('missing required probe is not ready; unavailable optional LLM is never probed', async () => {
  const repository = new MockAnalyticsRepository([]); const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner: null });
  try { const response = await app.inject({ url: '/health/ready' }); assert.equal(response.statusCode, 503); assert.equal(response.json().checks.analytics, 'not_checked'); } finally { await app.close(); }
});
test('hanging asynchronous probes are bounded and safe', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const repository = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, dashboardRepository: new SqliteDashboardRepository(db),
    readiness: { persistence: () => new Promise<boolean>(() => {}), analytics: async () => { throw new Error('private-source-details'); } } });
  try {
    const response = await app.inject({ url: '/health/ready' });
    assert.equal(response.statusCode, 503); assert.ok(!response.body.includes('private-source-details'));
    assert.deepEqual(response.json().checks, { persistence: 'unavailable', analytics: 'unavailable' });
  } finally { await app.close(); db.close(); }
});

test('governed persistence readiness invokes the configured probe without a legacy dashboard repository', async () => {
  const db = new DatabaseSync(':memory:');
  migrateMetadata(db, { reconcile: seedDemoAdministration });
  const store = new SqliteAdministrationStore(db);
  const repository = new MockAnalyticsRepository([]);
  let persistenceProbes = 0;
  const app = await buildApi({
    analyticsRepository: repository, dimensionValues: repository, planner: null,
    administration: { unitOfWork: store, directory: store.directory, profiles: store.profiles,
      authenticate: async () => 'unused', dataReady: async () => true },
    readiness: { persistence: async () => { persistenceProbes++; return true; }, analytics: async () => true },
  });
  try {
    const response = await app.inject({ url: '/health/ready' });
    assert.equal(persistenceProbes, 1);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ready', checks: { persistence: 'available', analytics: 'available' } });
  } finally { await app.close(); db.close(); }
});
