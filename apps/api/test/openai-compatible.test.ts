import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { StructuredDashboardPlanner } from '@el-dabboos/application';
import type { DashboardSpec, StructuredOutputRequest } from '@el-dabboos/domain';
import { buildApi } from '../src/app.ts';
import { OpenAICompatibleLLMProvider, ProviderTransportError } from '../src/providers/openai-compatible.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'generated-sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-01-31' } }, layout: { columns: 1 },
  widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
async function fakeServer(handler: (body: Record<string, unknown>, headers: Record<string, string | string[] | undefined>) => unknown) {
  const requests: Record<string, unknown>[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of request) chunks.push(chunk as Uint8Array);
    const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
    requests.push(body);
    const result = handler(body, request.headers);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: result } }] }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return { baseUrl: `http://127.0.0.1:${port}/v1`, requests, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}
const input: StructuredOutputRequest = { messages: [{ role: 'user', content: 'Show revenue' }], locale: 'en',
  responseFormat: { name: 'dashboard_spec_v2', jsonSchema: { type: 'object' }, strict: true } };
test('HTTP adapter sends OpenAI-compatible schema request and parses JSON content', async () => {
  let authorization: string | string[] | undefined;
  const fake = await fakeServer((_body, headers) => { authorization = headers.authorization; return JSON.stringify(spec); });
  try {
    const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', apiKey: 'test-key', timeoutMs: 1000 });
    const result = await provider.generateStructured(input);
    assert.deepEqual(result.output, spec);
    assert.equal(result.providerId, 'openai-compatible:bonsai-2');
    assert.equal(result.attempts, 1);
    assert.equal(authorization, 'Bearer test-key');
    assert.deepEqual(fake.requests[0]?.response_format, { type: 'json_schema', json_schema: { name: 'dashboard_spec_v2', strict: true, schema: { type: 'object' } } });
    assert.equal(fake.requests[0]?.model, 'bonsai-2');
    assert.deepEqual(fake.requests[0]?.messages, input.messages);
  } finally { await fake.close(); }
});
test('malformed model content remains unknown for bounded planner repair', async () => {
  const fake = await fakeServer(() => 'not JSON');
  try {
    const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', timeoutMs: 1000 });
    assert.equal((await provider.generateStructured(input)).output, 'not JSON');
    assert.equal(fake.requests.length, 1);
  } finally { await fake.close(); }
});
test('structured planner runs through API with fake HTTP provider and authorized metadata', async () => {
  const patch = { schemaVersion: 2, operations: [{ op: 'set_title', title: { en: 'Updated', ar: 'محدّث' } }] };
  const fake = await fakeServer(body => JSON.stringify((body.response_format as { json_schema: { name: string } }).json_schema.name === 'dashboard_patch_v2' ? patch : spec));
  const repository = new MockAnalyticsRepository([{ tenantId: 'demo-iq', measureId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'baghdad' } }]);
  const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', timeoutMs: 1000 });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository,
    planner: new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0, clock: () => new Date('2026-01-31T00:00:00Z') }) });
  const headers = { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
  try {
    const generated = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers, payload: { prompt: 'Show revenue' } });
    assert.equal(generated.statusCode, 200);
    assert.equal(generated.json().execution.widgetResults.revenue.seriesResults.revenue.result.rows[0].value, 100);
    const system = (fake.requests[0]?.messages as Array<{ content: string }>)[0]!.content;
    assert.ok(system.includes('"id":"revenue"'));
    assert.ok(!system.includes('outstanding_amount'));
    const edited = await app.inject({ method: 'POST', url: '/api/dashboards/edit', headers, payload: { dashboard: generated.json().dashboard, instruction: 'Rename' } });
    assert.equal(edited.statusCode, 200);
    assert.equal(edited.json().dashboard.title.en, 'Updated');
    assert.equal(fake.requests.length, 2);
  } finally { await app.close(); await fake.close(); }
});

test('HTTP adapter and planner repair malformed content with one bounded retry', async () => {
  let calls = 0;
  const fake = await fakeServer(() => ++calls === 1 ? 'not JSON' : JSON.stringify(spec));
  try {
    const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', timeoutMs: 1000 });
    const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 });
    const result = await planner.generate({ prompt: 'Show revenue', locale: 'en', context: { tenantId: 'demo-iq', locale: 'en' },
      tenantProfile: (await import('@el-dabboos/domain')).tenantProfiles['demo-iq'],
      capabilities: { metricIds: ['revenue'], templateIds: [], actions: ['ai:generate'] } });
    assert.deepEqual(result, spec);
    assert.equal(fake.requests.length, 2);
    assert.equal((fake.requests[1]?.messages as unknown[]).length, 3);
  } finally { await fake.close(); }
});
test('API rejects authorized-shape output containing an unauthorized metric', async () => {
  const forbidden = structuredClone(spec); forbidden.widgets[0]!.series[0]!.metric = 'outstanding_amount';
  const fake = await fakeServer(() => JSON.stringify(forbidden));
  const repository = new MockAnalyticsRepository([]);
  const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', timeoutMs: 1000 });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository,
    planner: new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0 }) });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/generate',
      headers: { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' }, payload: { prompt: 'Show revenue' } });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'METRIC_FORBIDDEN');
  } finally { await app.close(); await fake.close(); }
});

test('HTTP adapter reports status failures without returning provider body', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(429, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'sensitive upstream diagnostic' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const provider = new OpenAICompatibleLLMProvider({ baseUrl: `http://127.0.0.1:${port}/v1`, modelId: 'bonsai-2', timeoutMs: 1000 });
    await assert.rejects(provider.generateStructured(input), (error: unknown) =>
      error instanceof ProviderTransportError && error.code === 'LLM_HTTP_ERROR' && !error.message.includes('sensitive'));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('HTTP adapter enforces its timeout', async () => {
  const server = createServer((_request, response) => {
    setTimeout(() => response.end('{}'), 100);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const provider = new OpenAICompatibleLLMProvider({ baseUrl: `http://127.0.0.1:${port}/v1`, modelId: 'bonsai-2', timeoutMs: 10 });
    await assert.rejects(provider.generateStructured(input), (error: unknown) => error instanceof ProviderTransportError && error.code === 'LLM_TIMEOUT');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
