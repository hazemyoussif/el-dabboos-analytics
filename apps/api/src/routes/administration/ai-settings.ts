import type { FastifyInstance } from 'fastify';
import type { WorkspaceAiSettings, WorkspaceAiSettingsRecord } from '@el-dabboos/domain';
import { validateWorkspaceAiSettings } from '@el-dabboos/domain';
import { ApiError, object } from '../../errors.ts';
import type { RouteContext } from '../../context.ts';
import { validateAiModelSettings } from '../../workspace-ai/models.ts';
import { normalizeAiBaseUrl, validateWorkspaceAiEndpoint } from '../../workspace-ai/provider.ts';
import { administration, tenantActor } from './support.ts';
function publicSettings(record: WorkspaceAiSettingsRecord | null) {
  return record ? { settings: record.settings, version: record.version, updatedAt: record.updatedAt, hasApiKey: Boolean(record.encryptedApiKey) } : null;
}
function keyInput(value: unknown): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 6000 || /\s/.test(value)) throw new ApiError(400, 'INVALID_AI_KEY', 'Enter a valid API key.');
  return value;
}
export function registerAiSettingsRoutes(app: FastifyInstance, services: RouteContext) {
  const path = '/api/tenants/:tenantId/admin/ai-settings';
  const runtime = () => services.deps.workspaceAiAdministration ?? (() => { throw new ApiError(503, 'AI_SETTINGS_UNAVAILABLE', 'AI settings are unavailable.'); })();
  app.get<{ Params: { tenantId: string } }>(path, async request => {
    const record = await administration(services).getWorkspaceAiSettings(await tenantActor(services, request.headers, request.params.tenantId));
    const configured = runtime();
    return { record: publicSettings(record), localBaseUrl: configured.config.localBaseUrl ?? '', keyStorageAvailable: configured.cipher.available, defaults: { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', modelId: '', temperature: 0, maxTokens: 2048 } };
  });
  app.post<{ Params: { tenantId: string } }>(path + '/models', async request => {
    const record = await administration(services).getWorkspaceAiSettings(await tenantActor(services, request.headers, request.params.tenantId));
    if (!object(request.body) || Object.keys(request.body).some(key => !['provider', 'baseUrl', 'apiKey'].includes(key)) || !['local', 'openrouter'].includes(String(request.body.provider)) || typeof request.body.baseUrl !== 'string') throw new ApiError(400, 'INVALID_AI_SETTINGS', 'Select a provider and base URL.');
    const input = request.body as unknown as Pick<WorkspaceAiSettings, 'provider' | 'baseUrl'>;
    return { models: await runtime().models(input, record, keyInput(request.body.apiKey)) };
  });
  app.put<{ Params: { tenantId: string } }>(path, async request => {
    const actor = await tenantActor(services, request.headers, request.params.tenantId);
    const record = await administration(services).getWorkspaceAiSettings(actor);
    if (!object(request.body) || Object.keys(request.body).some(key => !['settings', 'expectedVersion', 'apiKey', 'clearApiKey'].includes(key))) throw new ApiError(400, 'INVALID_AI_SETTINGS', 'Review the AI settings before saving.');
    try { validateWorkspaceAiSettings(request.body.settings); }
    catch { throw new ApiError(400, 'INVALID_AI_SETTINGS', 'Review the provider, model and numeric limits.'); }
    if (request.body.expectedVersion !== null && (!Number.isInteger(request.body.expectedVersion) || Number(request.body.expectedVersion) < 1) || request.body.clearApiKey !== undefined && typeof request.body.clearApiKey !== 'boolean') throw new ApiError(400, 'INVALID_AI_SETTINGS', 'Review the AI settings before saving.');
    const configured = runtime(), settings = { ...request.body.settings, baseUrl: normalizeAiBaseUrl(request.body.settings.baseUrl) };
    validateWorkspaceAiEndpoint(settings, configured.config);
    const apiKey = keyInput(request.body.apiKey);
    if (apiKey && request.body.clearApiKey) throw new ApiError(400, 'INVALID_AI_KEY', 'Choose either Replace or Clear API key.');
    validateAiModelSettings(settings, await configured.models(settings, request.body.clearApiKey ? null : record, apiKey));
    const encryptedApiKey = apiKey ? configured.cipher.encrypt(actor.tenantId, apiKey) : request.body.clearApiKey ? null : undefined;
    return { record: publicSettings(await administration(services).saveWorkspaceAiSettings(actor, { settings, expectedVersion: request.body.expectedVersion as number | null, ...(encryptedApiKey !== undefined ? { encryptedApiKey } : {}) })) };
  });
}
