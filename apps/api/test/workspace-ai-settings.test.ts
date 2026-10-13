import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { AccessControlError } from '@el-dabboos/domain';
import type { StructuredOutputRequest, WorkspaceAiSettings } from '@el-dabboos/domain';
import { MockAnalyticsRepository, generateSeedFacts, migrateMetadata, seedDemoAdministration, SqliteAdministrationStore } from '@el-dabboos/data';
import { createAdministration } from '@el-dabboos/application';
import { buildApi } from '../src/app.ts';
import { WorkspaceAiKeyCipher } from '../src/workspace-ai/key-cipher.ts';
import { createWorkspaceAiResolver, workspaceAiProvider, validateWorkspaceAiEndpoint } from '../src/workspace-ai/provider.ts';
import { createWorkspaceAiAdministration } from '../src/workspace-ai/models.ts';
const settings: WorkspaceAiSettings = { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', modelId: 'synthetic/model', temperature: 0, maxTokens: 4096, reasoningEffort: 'high' };
const actor = { identityId: 'synthetic:demo-iq-admin', tenantId: 'demo-iq', locale: 'en' as const };
const headers = (user = 'demo-iq-admin', tenant = 'demo-iq') => ({ 'x-demo-user-id': user, 'x-tenant-id': tenant, 'x-locale': 'en' });
const model = { id: 'synthetic/model', name: 'Synthetic model', supportedParameters: ['structured_outputs', 'temperature', 'max_tokens', 'seed', 'reasoning'], maxTokens: 8192 };
async function fixture() {
 const db = new DatabaseSync(':memory:'); migrateMetadata(db, { reconcile: seedDemoAdministration });
 const store = new SqliteAdministrationStore(db), cipher = new WorkspaceAiKeyCipher('synthetic_application_secret_'.repeat(2));
 const repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'), ...generateSeedFacts('demo-eg')]);
 const config = { localBaseUrl: 'http://127.0.0.1:9999/v1', timeoutMs: 1000, repairAttempts: 0, synthesis: false };
 let modelCalls = 0;
 const app = await buildApi({ analystRepository: store.analyst, analyticsRepository: repository, dimensionValues: repository, workspaceAiAdministration: { config, cipher, models: async () => { modelCalls++; return [model]; } }, workspaceAi: createWorkspaceAiResolver({ read: store.read.bind(store), config, cipher, dimensionValues: repository }), administration: { unitOfWork: store, directory: store.directory, profiles: store.profiles, dataReady: async () => true, authenticate: async input => { const identity = await store.read(transaction => transaction.users.findIdentity('synthetic', String(input['x-demo-user-id']))); if (!identity) throw new AccessControlError('IDENTITY_REQUIRED'); return identity.id; } } });
 return { app, db, store, cipher, config, modelCalls: () => modelCalls, async close() { await app.close(); db.close(); } };
}
const path = '/api/tenants/demo-iq/admin/ai-settings';
test('only workspace administrators can read, save and discover models; no provider call for denied identities', async () => {
 const current = await fixture();
 try {
  for (const user of ['demo-iq-analyst', 'demo-agent-manager', 'demo-platform-admin']) {
   assert.equal((await current.app.inject({ url: path, headers: headers(user) })).statusCode, 403);
   assert.equal((await current.app.inject({ method: 'PUT', url: path, headers: headers(user), payload: { settings, expectedVersion: null, apiKey: 'synthetic-key' } })).statusCode, 403);
   assert.equal((await current.app.inject({ method: 'POST', url: path + '/models', headers: headers(user), payload: settings })).statusCode, 403);
  }
  assert.equal((await current.app.inject({ url: '/api/tenants/demo-eg/admin/ai-settings', headers: headers() })).statusCode, 403);
  assert.equal(current.modelCalls(), 0);
  const defaults = (await current.app.inject({ url: path, headers: headers() })).json();
  assert.equal(defaults.defaults.temperature, 0); assert.equal(defaults.record, null);
 } finally { await current.close(); }
});
test('settings and encrypted key persist, blank retains key, replacement and clear are explicit, and stale writes conflict', async () => {
 const current = await fixture();
 try {
  const save = (body: object) => current.app.inject({ method: 'PUT', url: path, headers: headers(), payload: body });
  const created = await save({ settings, expectedVersion: null, apiKey: 'synthetic-first-key' });
  assert.equal(created.statusCode, 200, created.body); assert.equal(created.json().record.hasApiKey, true);
  assert.ok(!created.body.includes('synthetic-first-key')); assert.ok(!created.body.includes('encryptedApiKey'));
  const stored = await current.store.read(transaction => transaction.aiSettings!.get('demo-iq'));
  assert.ok(stored?.encryptedApiKey); assert.ok(!stored.encryptedApiKey.includes('synthetic-first-key'));
  assert.equal(current.cipher.decrypt('demo-iq', stored.encryptedApiKey), 'synthetic-first-key');
  assert.equal((await save({ settings: { ...settings, maxTokens: 5000 }, expectedVersion: 1, apiKey: '' })).statusCode, 200);
  const retained = await current.store.read(transaction => transaction.aiSettings!.get('demo-iq'));
  assert.equal(retained?.encryptedApiKey, stored.encryptedApiKey);
  assert.equal((await save({ settings, expectedVersion: 1 })).statusCode, 409);
  assert.equal((await save({ settings, expectedVersion: 2, apiKey: 'synthetic-second-key' })).statusCode, 200);
  assert.equal((await save({ settings, expectedVersion: 3, clearApiKey: true })).statusCode, 200);
  assert.equal((await current.app.inject({ url: path, headers: headers() })).json().record.hasApiKey, false);
  assert.equal(current.db.prepare("SELECT count(*) count FROM admin_audit_events WHERE action='ai.settings_changed'").get()?.count, 4);
  assert.equal(await current.store.read(transaction => transaction.aiSettings!.get('demo-eg')), null);
  const reopened = new SqliteAdministrationStore(current.db);
  assert.equal((await reopened.read(transaction => transaction.aiSettings!.get('demo-iq')))?.version, 4);
 } finally { await current.close(); }
});
test('audit failure rolls back settings and key; endpoint changes clear existing credentials', async () => {
 const current = await fixture(); const service = createAdministration(current.store);
 try {
  const secret = current.cipher.encrypt('demo-iq', 'synthetic-key');
  await service.saveWorkspaceAiSettings(actor, { settings, expectedVersion: null, encryptedApiKey: secret });
  current.db.exec("CREATE TRIGGER reject_ai_audit BEFORE INSERT ON admin_audit_events WHEN NEW.action='ai.settings_changed' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
  await assert.rejects(service.saveWorkspaceAiSettings(actor, { settings: { ...settings, maxTokens: 6000 }, expectedVersion: 1, encryptedApiKey: current.cipher.encrypt('demo-iq', 'replacement') }));
  assert.equal((await current.store.read(transaction => transaction.aiSettings!.get('demo-iq')))?.encryptedApiKey, secret);
  current.db.exec('DROP TRIGGER reject_ai_audit');
  const changed = await service.saveWorkspaceAiSettings(actor, { settings: { provider: 'local', baseUrl: current.config.localBaseUrl, modelId: 'generic-local', temperature: 0, maxTokens: 2048 }, expectedVersion: 1 });
  assert.equal(changed.encryptedApiKey, null);
 } finally { await current.close(); }
});
test('key encryption is randomized, tenant bound, tamper resistant and unavailable without a protected secret', () => {
 const cipher = new WorkspaceAiKeyCipher('synthetic'.repeat(8));
 const encrypted = cipher.encrypt('tenant-a', 'test-key');
 assert.notEqual(cipher.encrypt('tenant-a', 'test-key'), encrypted);
 assert.throws(() => cipher.decrypt('tenant-b', encrypted));
 assert.throws(() => cipher.decrypt('tenant-a', encrypted.slice(0, -2) + 'AA'));
 assert.throws(() => new WorkspaceAiKeyCipher().encrypt('tenant-a', 'test-key'));
});
test('saved settings apply on the next workspace request, preserve zero temperature and route provider-specific reasoning generically', async () => {
 const current = await fixture(); const originalFetch = globalThis.fetch; const requests: Record<string, unknown>[] = [];
 globalThis.fetch = async (_input, init) => { requests.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] })); };
 const input: StructuredOutputRequest = { locale: 'en', messages: [{ role: 'user', content: 'Synthetic request' }], responseFormat: { name: 'test', strict: true, jsonSchema: { type: 'object' } } };
 try {
  const service = createAdministration(current.store);
  await service.saveWorkspaceAiSettings(actor, { settings, expectedVersion: null, encryptedApiKey: current.cipher.encrypt('demo-iq', 'synthetic-key') });
  const resolver = createWorkspaceAiResolver({ read: current.store.read.bind(current.store), config: { ...current.config, synthesis: true }, cipher: current.cipher, dimensionValues: new MockAnalyticsRepository([]) });
  assert.equal(await resolver('demo-eg'), null);
  await (await resolver('demo-iq'))!.analystSynthesis!.generateStructured(input);
  assert.equal(requests[0]?.temperature, 0); assert.equal(requests[0]?.max_tokens, 4096); assert.deepEqual(requests[0]?.reasoning, { effort: 'high' });
  assert.ok(!Object.hasOwn(requests[0]!, 'thinking_budget_tokens'));
  await service.saveWorkspaceAiSettings(actor, { settings: { provider: 'local', baseUrl: current.config.localBaseUrl, modelId: 'another-local-model', temperature: 0, maxTokens: 3000, reasoningBudgetTokens: 256, seed: 7 }, expectedVersion: 1 });
  await (await resolver('demo-iq'))!.analystSynthesis!.generateStructured(input);
  assert.equal(requests[1]?.model, 'another-local-model'); assert.equal(requests[1]?.max_tokens, 3000); assert.equal(requests[1]?.thinking_budget_tokens, 256); assert.equal(requests[1]?.seed, 7); assert.ok(!Object.hasOwn(requests[1]!, 'reasoning'));
  assert.throws(() => validateWorkspaceAiEndpoint({ ...settings, baseUrl: 'https://unexpected.test/v1' }, current.config));
  assert.throws(() => workspaceAiProvider({ tenantId: 'demo-iq', settings, version: 1, createdAt: '', updatedAt: '' }, current.config, current.cipher));
 } finally { globalThis.fetch = originalFetch; await current.close(); }
});
test('model discovery uses only the approved endpoint, strips upstream fields and excludes unsupported structured controls', async () => {
 const originalFetch = globalThis.fetch; let calls = 0;
 globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ data: [{ id: 'compatible', name: 'Compatible', supported_parameters: model.supportedParameters, upstreamSecret: 'not-exposed', top_provider: { max_completion_tokens: 8192 } }, { id: 'unsupported', supported_parameters: ['max_tokens'] }] })); };
 try {
  const runtime = createWorkspaceAiAdministration({ timeoutMs: 1000, repairAttempts: 0, synthesis: false }, new WorkspaceAiKeyCipher());
  const result = await runtime.models(settings, null);
  assert.deepEqual(result, [{ id: 'compatible', name: 'Compatible', supportedParameters: model.supportedParameters, maxTokens: 8192 }]);
  await assert.rejects(runtime.models({ ...settings, baseUrl: 'http://127.0.0.1/v1' }, null)); assert.equal(calls, 1);
 } finally { globalThis.fetch = originalFetch; }
});

test('generation, editing and Ask Business all use the current workspace model without a restart', async () => {
 const current = await fixture(), originalFetch = globalThis.fetch;
 const calls: Record<string, unknown>[] = [];
 globalThis.fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>; calls.push(body);
  const format = body.response_format as { json_schema: { name: string } };
  const output = format.json_schema.name === 'dashboard_generation_plan' ? { titleEn: 'Synthetic dashboard', titleAr: 'لوحة اختبار', dateFrom: '2026-01-01', dateTo: '2026-01-31', widgets: [{ series: [{ metric: 'revenue' }] }] } : format.json_schema.name === 'dashboard_edit_plan' ? { operations: [{ op: 'set_title', titleEn: 'Updated', titleAr: 'محدّث' }] } : { status: 'UNSUPPORTED_CAPABILITY' };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }));
 };
 try {
  await createAdministration(current.store).saveWorkspaceAiSettings(actor, { settings, expectedVersion: null, encryptedApiKey: current.cipher.encrypt('demo-iq', 'synthetic-key') });
  const generated = await current.app.inject({ method: 'POST', url: '/api/dashboards/generate', headers: headers(), payload: { prompt: 'Show revenue' } });
  assert.equal(generated.statusCode, 200, generated.body);
  const edited = await current.app.inject({ method: 'POST', url: '/api/dashboards/edit', headers: headers(), payload: { dashboard: generated.json().dashboard, instruction: 'Rename the dashboard' } });
  assert.equal(edited.statusCode, 200, edited.body);
  const conversation = await current.app.inject({ method: 'POST', url: '/api/ai-analyst/conversations', headers: headers() });
  assert.equal(conversation.statusCode, 200, conversation.body);
  const message = await current.app.inject({ method: 'POST', url: `/api/ai-analyst/conversations/${conversation.json().id}/messages`, headers: headers(), payload: { expectedVersion: conversation.json().version, question: 'A synthetic business question' } });
  assert.equal(message.statusCode, 200, message.body);
  assert.deepEqual(calls.map(call => (call.response_format as { json_schema: { name: string } }).json_schema.name), ['dashboard_generation_plan', 'dashboard_edit_plan', 'analytics_intent']);
  assert.ok(calls.every(call => call.model === 'synthetic/model' && call.temperature === 0 && call.max_tokens === 4096));
 } finally { globalThis.fetch = originalFetch; await current.close(); }
});

test('malformed numeric controls and unexpected secret fields return safe 400 responses without writes', async () => {
 const current = await fixture();
 try {
  for (const payload of [{ settings: { ...settings, temperature: -1 }, expectedVersion: null }, { settings: { ...settings, apiKey: 'plain-secret' }, expectedVersion: null }, { settings, expectedVersion: null, encryptedApiKey: 'forged' }, { settings, expectedVersion: null, apiKey: 'plain-secret', clearApiKey: true }]) {
   const response = await current.app.inject({ method: 'PUT', url: path, headers: headers(), payload });
   assert.equal(response.statusCode, 400, response.body); assert.ok(!response.body.includes('plain-secret'));
  }
  assert.equal(await current.store.read(transaction => transaction.aiSettings!.get('demo-iq')), null);
 } finally { await current.close(); }
});

test('free model options follow live zero pricing and strict capabilities rather than model-name presets', async () => {
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async () => new Response(JSON.stringify({ data: [
  { id: 'current/free-model', name: 'Current free model', pricing: { prompt: '0', completion: '0.000' }, supported_parameters: model.supportedParameters, reasoning: { supported_efforts: ['low', 'medium'] } },
  { id: 'formerly/free-model', pricing: { prompt: '0.0001', completion: '0' }, supported_parameters: model.supportedParameters },
  { id: 'unknown/pricing', pricing: { prompt: null, completion: '0' }, supported_parameters: model.supportedParameters },
  { id: 'free/unsupported', pricing: { prompt: '0', completion: '0' }, supported_parameters: ['max_tokens'] },
 ] }));
 try {
  const runtime = createWorkspaceAiAdministration({ timeoutMs: 1000, repairAttempts: 0, synthesis: false }, new WorkspaceAiKeyCipher());
  const result = await runtime.models(settings, null);
  assert.deepEqual(result.filter(candidate => candidate.free).map(candidate => candidate.id), ['current/free-model']);
  assert.deepEqual(result.find(candidate => candidate.id === 'current/free-model')?.reasoningEfforts, ['low', 'medium']);
  assert.ok(!result.some(candidate => candidate.id === 'free/unsupported'));
 } finally { globalThis.fetch = originalFetch; }
});
