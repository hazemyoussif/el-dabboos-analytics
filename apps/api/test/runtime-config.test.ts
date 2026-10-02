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
