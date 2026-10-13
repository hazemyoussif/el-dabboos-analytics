import { StructuredAnalyticsPlanner, StructuredDashboardPlanner } from '@el-dabboos/application';
import type { AdministrationTransaction, DimensionValueRepository, WorkspaceAiSettings, WorkspaceAiSettingsRecord } from '@el-dabboos/domain';
import { validateWorkspaceAiSettings } from '@el-dabboos/domain';
import { OpenAICompatibleLLMProvider } from '../providers/openai-compatible.ts';
import { ApiError } from '../errors.ts';
import type { WorkspaceAiKeyCipher } from './key-cipher.ts';
export interface WorkspaceAiRuntimeConfig { localBaseUrl?: string | undefined; localApiKey?: string | undefined; openrouterApiKey?: string | undefined; timeoutMs: number; repairAttempts: number; synthesis: boolean }
export function normalizeAiBaseUrl(value: string) {
  try { return new URL(value).toString().replace(/\/+$/, ''); }
  catch { throw new ApiError(400, 'INVALID_AI_SETTINGS', 'Enter a valid provider base URL.'); }
}
export function validateWorkspaceAiEndpoint(settings: Pick<WorkspaceAiSettings, 'provider' | 'baseUrl'>, config: WorkspaceAiRuntimeConfig) {
  const expected = settings.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : config.localBaseUrl;
  if (!expected || normalizeAiBaseUrl(settings.baseUrl) !== normalizeAiBaseUrl(expected)) throw new ApiError(400, 'AI_ENDPOINT_NOT_ALLOWED', 'Use the OpenRouter base URL or the local endpoint configured for this server.');
}
export function workspaceAiProvider(record: WorkspaceAiSettingsRecord, config: WorkspaceAiRuntimeConfig, cipher: WorkspaceAiKeyCipher) {
  const settings = record.settings;
  validateWorkspaceAiSettings(settings); validateWorkspaceAiEndpoint(settings, config);
  const apiKey = record.encryptedApiKey ? cipher.decrypt(record.tenantId, record.encryptedApiKey) : settings.provider === 'openrouter' ? config.openrouterApiKey : config.localApiKey;
  if (settings.provider === 'openrouter' && !apiKey) throw new ApiError(503, 'AI_KEY_REQUIRED', 'Ask a workspace administrator to save an OpenRouter API key.');
  return new OpenAICompatibleLLMProvider({ ...settings, ...(apiKey ? { apiKey } : {}), timeoutMs: config.timeoutMs, requireParameters: settings.provider === 'openrouter' });
}
export function createWorkspaceAiResolver(input: { read: <Output>(operation: (transaction: AdministrationTransaction) => Promise<Output>) => Promise<Output>; config: WorkspaceAiRuntimeConfig; cipher: WorkspaceAiKeyCipher; dimensionValues: DimensionValueRepository }) {
  return async (tenantId: string) => {
    const record = await input.read(transaction => transaction.aiSettings?.get(tenantId) ?? Promise.resolve(null));
    if (!record) return null;
    const provider = workspaceAiProvider(record, input.config, input.cipher);
    return { planner: new StructuredDashboardPlanner(provider, { maxRepairAttempts: input.config.repairAttempts }), analystPlanner: new StructuredAnalyticsPlanner(provider, { dimensionValues: input.dimensionValues }), ...(input.config.synthesis ? { analystSynthesis: provider } : {}) };
  };
}
