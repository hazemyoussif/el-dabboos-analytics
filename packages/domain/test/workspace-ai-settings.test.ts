import assert from 'node:assert/strict';
import test from 'node:test';
import { validateWorkspaceAiSettings } from '../src/workspace-ai-settings.ts';
const valid = { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', modelId: 'synthetic/model', temperature: 0, maxTokens: 2048 };
test('AI settings validate provider controls, zero temperature and strict fields without credentials or model-specific defaults', () => {
 assert.doesNotThrow(() => validateWorkspaceAiSettings(valid));
 assert.doesNotThrow(() => validateWorkspaceAiSettings({ ...valid, provider: 'local', reasoningBudgetTokens: 0, seed: 0 }));
 for (const invalid of [{ ...valid, apiKey: 'unprotected' }, { ...valid, maxTokens: 0 }, { ...valid, maxTokens: 65537 }, { ...valid, maxTokens: 1.5 }, { ...valid, temperature: -1 }, { ...valid, temperature: NaN }, { ...valid, seed: 1.5 }, { ...valid, reasoningBudgetTokens: 512 }, { ...valid, provider: 'local', reasoningEffort: 'high' }, { ...valid, baseUrl: 'https://user:secret@example.test/v1' }, { ...valid, baseUrl: 'https://example.test/v1?api_key=secret' }, { ...valid, baseUrl: 'https://example.test/v1/chat/completions' }, { ...valid, reasoningEffort: 'invented' }]) assert.throws(() => validateWorkspaceAiSettings(invalid));
});
