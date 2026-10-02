import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { StructuredDashboardPlanner } from '@el-dabboos/application';
import type { LLMProvider } from '@el-dabboos/domain';
import { buildApi } from '../src/app.ts';
import { formatStructuredDiagnostic, structuredDiagnosticsEnabled } from '../src/structured-diagnostics.ts';

const credentials = 'test-provider-credential';
class InvalidProvider implements LLMProvider {
  async generateStructured() {
    const invalid = { titleEn: `private prompt ${credentials}`, titleAr: '', widgets: [] };
    return { output: invalid, providerId: `provider:${credentials}`, latencyMs: 1, attempts: 1 };
  }
}
test('development diagnostics switch is opt-in and terminal record redacts credentials', () => {
  assert.equal(structuredDiagnosticsEnabled(undefined), false);
  assert.equal(structuredDiagnosticsEnabled('false'), false);
  assert.equal(structuredDiagnosticsEnabled('true'), true);
  const line = formatStructuredDiagnostic({ operation: 'generation', attempt: 1, schemaName: 'dashboard_spec_v2',
    providerId: `provider:${credentials}`, stage: 'schema', details: [{ instancePath: '/id', keyword: 'pattern', message: 'must match pattern' }],
    outputPreview: JSON.stringify({ id: credentials }) }, credentials);
  assert.ok(!line.includes(credentials));
  assert.ok(line.includes('[REDACTED_CREDENTIAL]'));
  const escapedCredential = 'key"with\\slash';
  const escapedLine = formatStructuredDiagnostic({ operation: 'edit', attempt: 1, schemaName: 'dashboard_patch_v2',
    providerId: escapedCredential, stage: 'schema', details: [], outputPreview: '{}' }, escapedCredential);
  assert.ok(!escapedLine.includes(JSON.stringify(escapedCredential).slice(1, -1)));
});
test('API response stays generic while configured diagnostics remain bounded and terminal-only', async () => {
  const repository = new MockAnalyticsRepository([]);
  const records: string[] = [];
  const provider = new InvalidProvider();
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0,
    diagnostics: event => records.push(formatStructuredDiagnostic(event, credentials)) });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/generate', payload: { prompt: 'private prompt' },
      headers: { 'x-demo-user-id': 'demo-iq-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' } });
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, 'INVALID_STRUCTURED_OUTPUT');
    assert.ok(!response.body.includes(credentials));
    assert.ok(!response.body.includes('instancePath'));
    assert.ok(!response.body.includes('outputPreview'));
    assert.equal(records.length, 1);
    assert.ok(records[0]!.includes('"instancePath":"/titleAr"'));
    assert.ok(!records[0]!.includes(credentials));
    assert.ok(!records[0]!.includes('private prompt'));
    assert.ok(records[0]!.length <= 6000);
  } finally { await app.close(); }
});

test('specific generation semantic repair diagnostics remain terminal-only with unchanged safe API errors', async () => {
  const repository = new MockAnalyticsRepository([]); const records: string[] = [];
  const planner = new StructuredDashboardPlanner({ async generateStructured() {
    return { output: { titleEn: 'Private output title', titleAr: 'عنوان', widgets: [{ dimension: 'branch', series: [{ metric: 'revenue', topNDirection: 'top', topNLimit: 5 }], requestedPresentation: { type: 'combo', curve: 'smooth', palette: 'blue' } }] }, providerId: 'fake', latencyMs: 1, attempts: 1 };
  } }, { maxRepairAttempts: 0, diagnostics: event => records.push(formatStructuredDiagnostic(event)) });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/generate', payload: { prompt: 'private prompt' }, headers: { 'x-demo-user-id': 'demo-iq-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' } });
    assert.equal(response.statusCode, 422); assert.equal(response.json().error.code, 'INVALID_STRUCTURED_OUTPUT');
    assert.ok(response.json().error.message.includes('Invalid dashboard widget or incompatible series'));
    assert.ok(!response.body.includes('Combo requires')); assert.ok(!response.body.includes('Private output title'));
    assert.ok(!response.body.includes('private prompt')); assert.ok(!response.body.includes('details'));
    assert.match(records[0]!, /Combo requires two to four series/); assert.ok(!records[0]!.includes('Private output title'));
  } finally { await app.close(); }
});

test('edit intent diagnostics identify plan schema/semantic stages without exposing details or output to browser', async () => {
  const repository = new MockAnalyticsRepository([]); const records: string[] = [];
  const current = { schemaVersion: 2 as const, id: 'dashboard', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en' as const, filters: {}, layout: { columns: 1 as const }, widgets: [{ id: 'chart', type: 'bar' as const, dimension: 'branch' as const, series: [{ id: 'sales', metric: 'revenue' as const }] }] };
  let attempt = 0;
  const planner = new StructuredDashboardPlanner({ async generateStructured() {
    return { output: { operations: [{ op: 'update_widget', widgetId: 'chart', changes: ++attempt === 1 ? { presentation: { palette: '#123456' } } : { dimension: null } }] }, providerId: 'fake', latencyMs: 1, attempts: 1 };
  } }, { maxRepairAttempts: 1, diagnostics: event => records.push(formatStructuredDiagnostic(event)) });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/edit', payload: { dashboard: current, instruction: 'private edit prompt' }, headers: { 'x-demo-user-id': 'demo-iq-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' } });
    assert.equal(response.statusCode, 422); assert.equal(response.json().error.code, 'INVALID_STRUCTURED_OUTPUT');
    assert.equal(records.length, 2); assert.match(records[0]!, /"stage":"schema"/); assert.match(records[1]!, /"stage":"semantic"/);
    assert.ok(records.every(record => record.includes('dashboard_edit_plan') && record.length <= 6000 && !record.includes('private edit prompt')));
    for (const token of ['instancePath', 'outputPreview', 'details', '#123456', 'private edit prompt']) assert.ok(!response.body.includes(token));
  } finally { await app.close(); }
});
