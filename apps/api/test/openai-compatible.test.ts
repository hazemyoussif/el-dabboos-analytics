import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { compileDashboardGenerationPlan, StructuredDashboardPlanner } from '@el-dabboos/application';
import type { DashboardSpec, StructuredOutputRequest } from '@el-dabboos/domain';
import { buildApi } from '../src/app.ts';
import { OpenAICompatibleLLMProvider, ProviderTransportError } from '../src/providers/openai-compatible.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'generated-sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-01-31' } }, layout: { columns: 1 },
  widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const plan = { titleEn: 'Sales', titleAr: 'المبيعات', dateFrom: '2026-01-01', dateTo: '2026-01-31', widgets: [{ series: [{ metric: 'revenue' as const }] }] };
async function fakeServer(handler: (body: Record<string, unknown>, headers: Record<string, string | string[] | undefined>) => unknown) {
  const requests: Record<string, unknown>[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of request) chunks.push(chunk as Uint8Array);
    const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
    requests.push(body);
    const result = handler(body, request.headers);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { reasoning_content: 'private reasoning is not the structured result', content: result } }] }));
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
    assert.equal(fake.requests[0]?.temperature, 0); assert.equal(fake.requests[0]?.max_tokens, 2048);
    assert.ok(!Object.hasOwn(fake.requests[0]!, 'seed')); assert.ok(!Object.hasOwn(fake.requests[0]!, 'thinking_budget_tokens'));
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
  const fake = await fakeServer(body => JSON.stringify((body.response_format as { json_schema: { name: string } }).json_schema.name === 'dashboard_patch_v2' ? patch : plan));
  const repository = new MockAnalyticsRepository([{ tenantId: 'demo-iq', measureId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'baghdad' } }]);
  const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', timeoutMs: 1000 });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository,
    planner: new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0, clock: () => new Date('2026-01-31T00:00:00Z') }) });
  const headers = { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
  try {
    const generated = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers, payload: { prompt: 'Show revenue' } });
    assert.equal(generated.statusCode, 200);
    const sentFormat = fake.requests[0]!.response_format as { json_schema: { name: string; schema: { properties: Record<string, unknown> } } };
    assert.equal(sentFormat.json_schema.name, 'dashboard_generation_plan');
    assert.ok(sentFormat.json_schema.schema.properties.widgets);
    for (const key of ['schemaVersion', 'id', 'layout']) assert.ok(!Object.hasOwn(sentFormat.json_schema.schema.properties, key));
    assert.equal(generated.json().execution.widgetResults['widget-1'].seriesResults['widget-1-series-1'].result.rows[0].value, 100);
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
  const fake = await fakeServer(() => ++calls === 1 ? 'not JSON' : JSON.stringify(plan));
  try {
    const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'bonsai-2', timeoutMs: 1000 });
    const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 });
    const result = await planner.generate({ prompt: 'Show revenue', locale: 'en', context: { tenantId: 'demo-iq', locale: 'en' },
      tenantProfile: (await import('@el-dabboos/domain')).tenantProfiles['demo-iq'],
      capabilities: { metricIds: ['revenue'], templateIds: [], actions: ['ai:generate'] } });
    assert.deepEqual(result, compileDashboardGenerationPlan(plan, (await import('@el-dabboos/domain')).tenantProfiles['demo-iq'], 'en', new Date()));
    assert.equal(fake.requests.length, 2);
    assert.equal((fake.requests[1]?.messages as unknown[]).length, 3);
  } finally { await fake.close(); }
});
test('API rejects authorized-shape output containing an unauthorized metric', async () => {
  const forbidden = structuredClone(plan) as import("@el-dabboos/application").DashboardGenerationPlan; forbidden.widgets[0]!.series[0]!.metric = 'outstanding_amount';
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
      error instanceof ProviderTransportError && error.code === 'LLM_RATE_LIMITED' && !error.message.includes('sensitive'));
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

test('HTTP errors bypass repair and keep sensitive upstream details out of API and diagnostics', async () => {
  let calls = 0;
  const secret = 'private-key-value'; const customer = 'customer-private-filter'; const prompt = 'private prompt contents';
  const server = createServer((_request, response) => {
    calls++; response.writeHead(400, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', type: 'invalid_request_error',
      message: `Invalid schema: ${secret} Authorization: Bearer ${secret} ${customer} ${prompt}`, body: { secret }, customer } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const records: import('../src/providers/transport-diagnostics.ts').ProviderHttpDiagnostic[] = [];
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  const repository = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner: new StructuredDashboardPlanner(
    new OpenAICompatibleLLMProvider({ baseUrl, modelId: 'fake-model', apiKey: secret, timeoutMs: 1000, diagnostics: event => records.push(event) }), { maxRepairAttempts: 2 }) });
  try {
    const result = await app.inject({ method: 'POST', url: '/api/dashboards/generate', payload: { prompt },
      headers: { 'x-demo-user-id': 'demo-iq-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' } });
    assert.equal(result.statusCode, 502); assert.equal(result.json().error.code, 'LLM_HTTP_ERROR'); assert.equal(calls, 1);
    assert.equal(records.length, 1); assert.equal(records[0]!.upstreamStatus, 'INVALID_ARGUMENT');
    assert.equal(records[0]!.operation, 'generation'); assert.equal(records[0]!.schemaName, 'dashboard_generation_plan');
    assert.equal(records[0]!.message, 'Provider rejected the structured-output schema.');
    for (const token of [secret, customer, prompt, 'Authorization', 'Bearer']) {
      assert.ok(!result.body.includes(token)); assert.ok(!JSON.stringify(records).includes(token));
    }
  } finally { await app.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('provider diagnostics default to disabled and ignore oversized/arbitrary upstream fields', async () => {
  const { providerHttpDiagnostic } = await import('../src/providers/transport-diagnostics.ts');
  const request = { ...input, responseFormat: { ...input.responseFormat, name: 'dashboard_generation_plan' } };
  const normal = await providerHttpDiagnostic(new Response(JSON.stringify({ error: { code: 'CUSTOMER_SECRET', status: 'secret', type: 'sensitive', message: 'private customer data' } }), { status: 400 }), request, 'model');
  assert.equal(normal.upstreamCode, undefined); assert.equal(normal.upstreamStatus, undefined); assert.equal(normal.upstreamType, undefined);
  assert.equal(normal.message, 'Provider error message withheld.');
  const huge = await providerHttpDiagnostic(new Response('sensitive'.repeat(10000), { status: 400 }), request, 'model-' + 'x'.repeat(10000));
  assert.ok(JSON.stringify(huge).length < 1000); assert.equal(huge.message, undefined);
  const broken = await providerHttpDiagnostic(new Response('not json', { status: 503 }), request, 'model');
  assert.equal(broken.httpStatus, 503); assert.equal(broken.message, undefined);
  // With no callback even an error body's reader is never inspected.
  const originalFetch = globalThis.fetch;
  let reads = 0;
  globalThis.fetch = async () => ({ ok: false, status: 400, get body() { reads++; throw new Error('must not read'); } }) as unknown as Response;
  try {
    await assert.rejects(new OpenAICompatibleLLMProvider({ baseUrl: 'http://example.invalid/v1', modelId: 'model', timeoutMs: 1000 }).generateStructured(request), { code: 'LLM_HTTP_ERROR' });
    assert.equal(reads, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('configured inference controls are sent generically without altering strict schema or parsing reasoning', async () => {
  const fake = await fakeServer(() => JSON.stringify(plan));
  try {
    for (const config of [{ temperature: 0, maxTokens: 2048, reasoningBudgetTokens: 1024, seed: 42 }, { temperature: 0.5, maxTokens: 4096, reasoningBudgetTokens: 0, seed: 0 }]) {
      const result = await new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'company-model', timeoutMs: 1000, ...config }).generateStructured(input);
      assert.deepEqual(result.output, plan);
      const sent = fake.requests.at(-1)!;
      assert.equal(sent.temperature, config.temperature); assert.equal(sent.max_tokens, config.maxTokens);
      assert.equal(sent.thinking_budget_tokens, config.reasoningBudgetTokens); assert.equal(sent.seed, config.seed);
      assert.deepEqual(sent.response_format, { type: 'json_schema', json_schema: { name: input.responseFormat.name, strict: true, schema: input.responseFormat.jsonSchema } });
    }
  } finally { await fake.close(); }
});
test('direct transport configuration also rejects invalid inference controls', () => {
  for (const config of [{ temperature: NaN }, { temperature: 2.1 }, { maxTokens: 0 }, { maxTokens: 65537 }, { reasoningBudgetTokens: -1 }, { reasoningBudgetTokens: 1.5 }, { seed: -1 }, { seed: 2147483648 }])
    assert.throws(() => new OpenAICompatibleLLMProvider({ baseUrl: 'http://company.example/v1', modelId: 'company-model', timeoutMs: 1000, ...config }), /Invalid OpenAI-compatible inference configuration/);
});
test('array and object provider error envelopes produce the same bounded sanitized diagnostics', async () => {
  const { providerHttpDiagnostic } = await import('../src/providers/transport-diagnostics.ts');
  const envelope = { error: { code: 400, status: 'INVALID_ARGUMENT', type: 'invalid_request_error', message: 'schema failed secret-key private prompt', headers: { authorization: 'Bearer secret-key' } } };
  const single = await providerHttpDiagnostic(new Response(JSON.stringify(envelope), { status: 400 }), input, 'model', 'secret-key');
  const array = await providerHttpDiagnostic(new Response(JSON.stringify([envelope]), { status: 400 }), input, 'model', 'secret-key');
  assert.deepEqual(single, array); assert.equal(array.message, 'Provider rejected the structured-output schema.');
  assert.ok(!JSON.stringify(array).includes('secret-key')); assert.ok(!JSON.stringify(array).includes('private prompt')); assert.ok(!JSON.stringify(array).includes('authorization'));
  const oversized = await providerHttpDiagnostic(new Response(JSON.stringify([{ error: { message: 'schema ' + 'secret-key'.repeat(3000) } }]), { status: 400 }), input, 'model');
  assert.equal(oversized.message, undefined); assert.ok(JSON.stringify(oversized).length < 1000);
});
test('rate limits bypass repair and return a safe distinct API code without changing the submitted dashboard', async () => {
  let calls = 0;
  const server = createServer((_request, response) => { calls++; response.writeHead(429); response.end(JSON.stringify([{ error: { code: 'RESOURCE_EXHAUSTED', message: 'schema quota private upstream' } }])); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const diagnostics: import('../src/providers/transport-diagnostics.ts').ProviderHttpDiagnostic[] = [];
  const provider = new OpenAICompatibleLLMProvider({ baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, modelId: 'model', timeoutMs: 1000, diagnostics: event => diagnostics.push(event) });
  const repository = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner: new StructuredDashboardPlanner(provider, { maxRepairAttempts: 2 }) });
  const original = structuredClone(spec);
  try {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/edit', headers: { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' }, payload: { dashboard: spec, instruction: 'Make this chart blue' } });
    assert.equal(response.statusCode, 429); assert.equal(response.json().error.code, 'LLM_RATE_LIMITED'); assert.equal(calls, 1);
    assert.deepEqual(spec, original); assert.ok(!response.body.includes('private')); assert.ok(!response.body.includes('schema')); assert.ok(!response.body.includes('RESOURCE_EXHAUSTED'));
    assert.equal(diagnostics[0]!.message, 'Provider reported a rate or quota limit.');
  } finally { await app.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('explicit Top-5 blue horizontal Bar survives strict fake HTTP generation and selects only the highest branches', async () => {
  const intent = { titleEn: 'Top branches', titleAr: 'أعلى الفروع', widgets: [{ dimension: 'branch', series: [{ metric: 'revenue', topNDirection: 'top', topNLimit: 5 }], requestedPresentation: { type: 'bar', orientation: 'horizontal', palette: 'blue' } }] };
  const fake = await fakeServer(body => {
    const format = body.response_format as { type: string; json_schema: { strict: boolean; schema: unknown } };
    assert.equal(format.type, 'json_schema'); assert.equal(format.json_schema.strict, true);
    assert.ok(!JSON.stringify(format.json_schema.schema).includes('"mark"'));
    return JSON.stringify(intent);
  });
  const repository = new MockAnalyticsRepository(Array.from({ length: 8 }, (_, index) => ({ tenantId: 'demo-iq', measureId: 'revenue' as const, date: '2026-01-15', value: (index + 1) * 100, dimensions: { branch: `branch-${index + 1}` } })));
  const provider = new OpenAICompatibleLLMProvider({ baseUrl: fake.baseUrl, modelId: 'fake-model', timeoutMs: 1000 });
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, planner: new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1, clock: () => new Date('2026-01-31T00:00:00Z') }) });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers: { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' }, payload: { prompt: 'Show the top 5 branches by revenue as horizontal blue bars' } });
    assert.equal(response.statusCode, 200); assert.equal(fake.requests.length, 1);
    const widget = response.json().dashboard.widgets[0];
    assert.equal(widget.type, 'bar'); assert.equal(widget.dimension, 'branch');
    assert.equal(widget.presentation.orientation, 'horizontal'); assert.equal(widget.presentation.palette, 'blue');
    assert.equal(widget.presentation.dataLabels, undefined); assert.equal(widget.presentation.curve, undefined);
    assert.equal(widget.series[0].presentation, undefined);
    assert.deepEqual(widget.series[0].analysis, { topN: { direction: 'top', limit: 5 } });
    const rows = response.json().execution.widgetResults['widget-1'].alignedRows;
    assert.deepEqual(rows.map((row: { key: string }) => row.key), ['branch-8', 'branch-7', 'branch-6', 'branch-5', 'branch-4']);
    assert.deepEqual(rows.map((row: { series: Record<string, { value: number }> }) => row.series['widget-1-series-1']!.value), [800, 700, 600, 500, 400]);
  } finally { await app.close(); await fake.close(); }
});
