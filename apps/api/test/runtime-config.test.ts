import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRuntimeConfig } from '../src/startup-config.ts';
const defaults = { analyticsPath: '/tmp/facts.db', dashboardPath: '/tmp/dashboards.db' };
test('bounded startup defaults and explicit mock/disabled/structured configuration', () => {
  const config = parseRuntimeConfig({}, defaults); assert.equal(config.analyticsProvider, 'sqlite'); assert.equal(config.plannerMode, 'mock'); assert.equal(config.executionConcurrency, 8); assert.equal(config.llm.diagnostics, false);
  for (const mode of ['mock', 'disabled', 'structured']) {
    const value = parseRuntimeConfig({ DASHBOARD_PLANNER: mode, LLM_BASE_URL: 'https://company.example/v1', LLM_MODEL_ID: 'model', LLM_API_KEY: 'secret', LLM_DEBUG_STRUCTURED_OUTPUT: 'true', ANALYTICS_EXECUTION_CONCURRENCY: '3' }, defaults);
    assert.equal(value.plannerMode, mode); assert.equal(value.executionConcurrency, 3); assert.equal(value.llm.apiKey, 'secret'); assert.equal(value.llm.diagnostics, true);
  }
});
test('invalid startup settings fail safely without echoing secrets or supplied values', () => {
  for (const env of [{ ANALYTICS_PROVIDER: 'secret' }, { DASHBOARD_PLANNER: 'secret' }, { SQLITE_DB_PATH: '' }, { DASHBOARD_DB_PATH: ' ' }, { PORT: '0' }, { PORT: '65536' }, { PORT: '1.5' }, { LLM_TIMEOUT_MS: '' }, { LLM_TIMEOUT_MS: '600001' }, { LLM_REPAIR_ATTEMPTS: '3' }, { LLM_DEBUG_STRUCTURED_OUTPUT: 'TRUE' }, { ANALYTICS_EXECUTION_CONCURRENCY: '65' }, { DASHBOARD_PLANNER: 'structured' }, { DASHBOARD_PLANNER: 'structured', LLM_BASE_URL: 'http://example/v1' }, { LLM_BASE_URL: 'https://user:secret@example/v1' }, { LLM_BASE_URL: 'file:///secret' }, { LLM_BASE_URL: 'https://example/v1?key=secret' }]) {
    assert.throws(() => parseRuntimeConfig({ ...env, LLM_API_KEY: 'top-secret' }, defaults), error => { assert.ok(error instanceof Error); assert.match(error.message, /^Invalid API configuration:/); assert.ok(!error.message.includes('secret')); return true; });
  }
});
test('structured startup summary includes actual timeout and repair bounds without secrets', async () => {
  const { startupSummary } = await import('../src/startup-config.ts');
  const config = parseRuntimeConfig({ DASHBOARD_PLANNER: 'structured', LLM_BASE_URL: 'https://company.example/v1', LLM_MODEL_ID: 'configured-model', LLM_TIMEOUT_MS: '45000', LLM_REPAIR_ATTEMPTS: '2', LLM_API_KEY: 'secret' }, defaults);
  const summary = startupSummary({ analyticsProvider: config.analyticsProvider, dashboardPath: config.dashboardPath, plannerMode: config.plannerMode,
    modelId: config.llm.modelId, baseUrl: config.llm.baseUrl, diagnostics: config.llm.diagnostics, port: config.port,
    llmTimeoutMs: config.llm.timeoutMs, llmRepairAttempts: config.llm.repairAttempts }, config.llm.apiKey);
  assert.ok(summary.includes('"llmTimeoutMs":45000')); assert.ok(summary.includes('"llmRepairAttempts":2'));
  assert.ok(!summary.includes('secret')); assert.ok(!summary.includes('LLM_API_KEY'));
  const mock = startupSummary({ analyticsProvider: 'mock', dashboardPath: defaults.dashboardPath, plannerMode: 'mock', diagnostics: false, port: 3001 });
  assert.ok(!mock.includes('llmTimeoutMs'));
});

test('generic inference defaults and explicit optional settings are validated at the API root', () => {
  const base = parseRuntimeConfig({}, defaults).llm;
  assert.equal(base.temperature, 0); assert.equal(base.maxTokens, 2048);
  assert.ok(!Object.hasOwn(base, 'reasoningBudgetTokens')); assert.ok(!Object.hasOwn(base, 'seed'));
  const config = parseRuntimeConfig({ LLM_TEMPERATURE: '0.5', LLM_MAX_TOKENS: '4096', LLM_REASONING_BUDGET_TOKENS: '1024', LLM_SEED: '43' }, defaults).llm;
  assert.equal(config.temperature, 0.5); assert.equal(config.maxTokens, 4096); assert.equal(config.reasoningBudgetTokens, 1024); assert.equal(config.seed, 43);
  const zero = parseRuntimeConfig({ LLM_REASONING_BUDGET_TOKENS: '0', LLM_SEED: '0' }, defaults).llm;
  assert.equal(zero.reasoningBudgetTokens, 0); assert.equal(zero.seed, 0);
});
for (const [field, invalid] of [
  ['LLM_TEMPERATURE', ['', '-1', '2.1', 'NaN', 'Infinity', '1e0', 'secret']],
  ['LLM_MAX_TOKENS', ['', '0', '65537', '2.5', '-1', '2e3']],
  ['LLM_REASONING_BUDGET_TOKENS', ['', '-1', '65537', '0.5', '1e3']],
  ['LLM_SEED', ['', '-1', '2147483648', '42.5', '1e2']],
] as const) test(`invalid ${field} fails safely`, () => {
  for (const value of invalid) assert.throws(() => parseRuntimeConfig({ [field]: value, LLM_API_KEY: 'credential' }, defaults), { message: `Invalid API configuration: ${field}. Check the documented settings.` });
});
test('safe startup summary includes inference values and omits unset optional settings', async () => {
  const { startupSummary } = await import('../src/startup-config.ts');
  const base = { analyticsProvider: 'mock', dashboardPath: defaults.dashboardPath, plannerMode: 'structured', modelId: 'model', baseUrl: 'http://company.example/v1', diagnostics: false, port: 3001 };
  const summary = startupSummary(base);
  assert.match(summary, /"llmTemperature":0/); assert.match(summary, /"llmMaxTokens":2048/);
  assert.ok(!summary.includes('llmSeed')); assert.ok(!summary.includes('llmReasoningBudgetTokens'));
  const configured = startupSummary({ ...base, llmTemperature: 0.25, llmMaxTokens: 3000, llmReasoningBudgetTokens: 1024, llmSeed: 42 }, 'test-key');
  for (const text of ['"llmTemperature":0.25', '"llmMaxTokens":3000', '"llmReasoningBudgetTokens":1024', '"llmSeed":42']) assert.ok(configured.includes(text));
  assert.ok(!configured.includes('test-key'));
});

test('PostgreSQL runtime is explicit, bounded, fail-fast and credential-safe in summaries', async () => {
  assert.throws(() => parseRuntimeConfig({ ANALYTICS_PROVIDER: 'postgres' }, defaults), /MART_RUNTIME_URL/);
  for (const url of ['secret','file:///secret','postgres://localhost/']) assert.throws(() => parseRuntimeConfig({ ANALYTICS_PROVIDER: 'postgres',MART_RUNTIME_URL: url },defaults), /MART_RUNTIME_URL/);
  const config = parseRuntimeConfig({ ANALYTICS_PROVIDER: 'postgres',MART_RUNTIME_URL: 'postgres://runtime:private-password@localhost/mart',MART_POOL_MAX: '3',MART_STATEMENT_TIMEOUT_MS: '2000' },defaults);
  assert.equal(config.analyticsProvider,'postgres'); assert.equal(config.postgres?.poolMax,3); assert.equal(config.postgres?.statementTimeoutMs,2000);
  for (const env of [{ MART_POOL_MAX: '65' },{ MART_MAX_GROUPS: '0' },{ MART_STATEMENT_TIMEOUT_MS: '120001' }]) assert.throws(() => parseRuntimeConfig({ ANALYTICS_PROVIDER: 'postgres',MART_RUNTIME_URL: 'postgres://localhost/mart',...env },defaults));
  const { startupSummary } = await import('../src/startup-config.ts');
  assert.ok(!startupSummary({ analyticsProvider: config.analyticsProvider,dashboardPath: config.dashboardPath,plannerMode: config.plannerMode,diagnostics: false,port: config.port }).includes('private-password'));
});
