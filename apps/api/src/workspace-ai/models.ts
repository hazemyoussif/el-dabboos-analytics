import type { WorkspaceAiModel, WorkspaceAiSettings, WorkspaceAiSettingsRecord } from '@el-dabboos/domain';
import { reasoningEfforts } from '@el-dabboos/domain';
import { ApiError, object } from '../errors.ts';
import { normalizeAiBaseUrl, validateWorkspaceAiEndpoint } from './provider.ts';
import type { WorkspaceAiRuntimeConfig } from './provider.ts';
import type { WorkspaceAiKeyCipher } from './key-cipher.ts';
export interface WorkspaceAiAdministration {
  cipher: WorkspaceAiKeyCipher;
  config: WorkspaceAiRuntimeConfig;
  models(input: Pick<WorkspaceAiSettings, 'provider' | 'baseUrl'>, record: WorkspaceAiSettingsRecord | null, apiKey?: string): Promise<WorkspaceAiModel[]>;
}
function freeModelPricing(pricing: Record<string, unknown>): boolean {
 return typeof pricing.prompt === 'string' && pricing.prompt.trim() !== '' && Number(pricing.prompt) === 0 && typeof pricing.completion === 'string' && pricing.completion.trim() !== '' && Number(pricing.completion) === 0;
}
function modelOption(value: unknown, provider: WorkspaceAiSettings['provider']): WorkspaceAiModel | null {
  if (!object(value) || typeof value.id !== 'string' || !value.id.trim()) return null;
  const parameters = Array.isArray(value.supported_parameters) ? value.supported_parameters.filter((item): item is string => typeof item === 'string') : [];
  if (provider === 'openrouter' && !['structured_outputs', 'temperature', 'max_tokens'].every(parameter => parameters.includes(parameter))) return null;
  const maximum = object(value.top_provider) ? value.top_provider.max_completion_tokens : undefined;
  const efforts = object(value.reasoning) && Array.isArray(value.reasoning.supported_efforts) ? reasoningEfforts.filter(effort => value.reasoning && object(value.reasoning) && Array.isArray(value.reasoning.supported_efforts) && value.reasoning.supported_efforts.includes(effort)) : undefined;
  return { id: value.id, name: typeof value.name === 'string' ? value.name : value.id, supportedParameters: parameters, ...(object(value.pricing) ? { free: freeModelPricing(value.pricing) } : {}), ...(typeof maximum === 'number' && maximum > 0 ? { maxTokens: maximum } : {}), ...(efforts?.length ? { reasoningEfforts: efforts } : {}) };
}
export function createWorkspaceAiAdministration(config: WorkspaceAiRuntimeConfig, cipher: WorkspaceAiKeyCipher): WorkspaceAiAdministration {
  return { config, cipher, models: async (input, record, suppliedKey) => {
    validateWorkspaceAiEndpoint(input, config);
    const sameEndpoint = record?.settings.provider === input.provider && normalizeAiBaseUrl(record.settings.baseUrl) === normalizeAiBaseUrl(input.baseUrl);
    const storedKey = sameEndpoint && record?.encryptedApiKey ? cipher.decrypt(record.tenantId, record.encryptedApiKey) : undefined;
    const apiKey = suppliedKey || storedKey || (input.provider === 'openrouter' ? config.openrouterApiKey : config.localApiKey);
    let response: Response;
    try { response = await fetch(`${normalizeAiBaseUrl(input.baseUrl)}/models`, { redirect: 'error', signal: AbortSignal.timeout(Math.min(config.timeoutMs, 15000)), headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {} }); }
    catch { throw new ApiError(502, 'AI_MODELS_UNAVAILABLE', 'The model list is unavailable. Check the provider settings and retry.'); }
    if (!response.ok) throw new ApiError(502, 'AI_MODELS_UNAVAILABLE', 'The model list is unavailable. Check the API key and retry.');
    const text = await response.text();
    if (text.length > 8_000_000) throw new ApiError(502, 'AI_MODELS_UNAVAILABLE', 'The model list exceeded its size limit.');
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { throw new ApiError(502, 'AI_MODELS_UNAVAILABLE', 'The provider returned an invalid model list.'); }
    if (!object(payload) || !Array.isArray(payload.data)) throw new ApiError(502, 'AI_MODELS_UNAVAILABLE', 'The provider returned an invalid model list.');
    return payload.data.map(model => modelOption(model, input.provider)).filter((model): model is WorkspaceAiModel => model !== null).sort((left, right) => left.name.localeCompare(right.name));
  } };
}
export function validateAiModelSettings(settings: WorkspaceAiSettings, models: WorkspaceAiModel[]) {
  const model = models.find(candidate => candidate.id === settings.modelId);
  if (!model) throw new ApiError(400, 'AI_MODEL_UNSUPPORTED', 'Select an available model supporting structured output and the required controls.');
  if (model.maxTokens && settings.maxTokens > model.maxTokens) throw new ApiError(400, 'AI_TOKEN_LIMIT', 'The output limit exceeds this model’s maximum.');
  if (settings.provider !== 'openrouter') return;
  if (settings.seed !== undefined && !model.supportedParameters.includes('seed')) throw new ApiError(400, 'AI_SEED_UNSUPPORTED', 'This model does not support a seed.');
  if (settings.reasoningEffort !== undefined && !model.supportedParameters.includes('reasoning')) throw new ApiError(400, 'AI_REASONING_UNSUPPORTED', 'This model does not support reasoning controls.');
  if (settings.reasoningEffort !== undefined && model.reasoningEfforts && !model.reasoningEfforts.includes(settings.reasoningEffort)) throw new ApiError(400, 'AI_REASONING_UNSUPPORTED', 'Select a supported reasoning level.');
}
