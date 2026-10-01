import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabbous/data';
import { StructuredDashboardPlanner } from '@el-dabbous/application';
import type { DashboardSpec, LLMProvider } from '@el-dabbous/domain';
import { buildApi } from '../src/app.ts';
import { formatStructuredDiagnostic, structuredDiagnosticsEnabled } from '../src/structured-diagnostics.ts';

const valid: DashboardSpec = { schemaVersion: 2, id: 'sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en', filters: {},
  layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const credentials = 'test-provider-credential';
class InvalidProvider implements LLMProvider {
  async generateStructured() {
    const invalid = structuredClone(valid);
    invalid.id = 'Invalid ID';
    invalid.title.en = `private prompt ${credentials}`;
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
    assert.ok(records[0]!.includes('"instancePath":"/id"'));
    assert.ok(!records[0]!.includes(credentials));
    assert.ok(!records[0]!.includes('private prompt'));
    assert.ok(records[0]!.length <= 6000);
  } finally { await app.close(); }
});
