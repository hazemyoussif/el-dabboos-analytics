import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabbous/data';
import { buildApi } from '../src/app.ts';

const facts = [{ tenantId: 'demo', measureId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'cairo' } }] as const;
const app = await buildApi({ repository: new MockAnalyticsRepository([...facts]), clock: () => new Date('2026-09-30T12:00:00.000Z') });
test('health and catalog are available; analytics requires an allowlisted tenant', async () => {
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/api/semantic-catalog' })).statusCode, 200);
  const missing = await app.inject({ method: 'POST', url: '/api/analytics/query', payload: { metric: 'revenue' } });
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.json().error.code, 'TENANT_REQUIRED');
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { 'x-tenant-id': 'other' }, payload: { metric: 'revenue' } })).statusCode, 403);
});
test('query endpoint rejects arbitrary fields and executes canonical metrics', async () => {
  const headers = { 'x-tenant-id': 'demo' };
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers, payload: { metric: 'revenue', sql: 'SELECT *' } })).statusCode, 400);
  const response = await app.inject({ method: 'POST', url: '/api/analytics/query', headers, payload: { metric: 'revenue' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().rows[0].value, 100);
  const malformed = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { ...headers, 'content-type': 'application/json' }, payload: '{' });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json().error.code, 'VALIDATION_ERROR');
});
test('manual execute, bilingual generation, and edit endpoints complete the workflow', async () => {
  const headers = { 'x-tenant-id': 'demo', 'x-locale': 'ar' };
  const demos = await app.inject({ method: 'GET', url: '/api/dashboards/demos' });
  const dashboard = demos.json().dashboards[0];
  const manual = await app.inject({ method: 'POST', url: '/api/dashboards/execute', headers, payload: { dashboard } });
  assert.equal(manual.statusCode, 200);
  assert.equal(manual.json().widgetResults.revenue.status, 'success');
  const generated = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers, payload: { prompt: 'اعمل لي لوحة للمبيعات' } });
  assert.equal(generated.statusCode, 200);
  assert.equal(generated.json().dashboard.locale, 'ar');
  const edited = await app.inject({ method: 'POST', url: '/api/dashboards/edit', headers, payload: { dashboard: generated.json().dashboard, instruction: 'شيل المديونيات' } });
  assert.equal(edited.statusCode, 200);
  assert.ok(!edited.json().dashboard.widgets.some((w: { id: string }) => w.id === 'outstanding'));
  const unsupported = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers, payload: { prompt: 'show website traffic' } });
  assert.equal(unsupported.statusCode, 422);
  assert.equal(unsupported.json().error.code, 'UNSUPPORTED_DEMO_INTENT');
});
test.after(async () => { await app.close(); });
