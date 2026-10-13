/** Workspace-owned provider preferences; credentials remain server-side. */
export const reasoningEfforts = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export interface WorkspaceAiSettings {
  provider: 'openrouter' | 'local';
  baseUrl: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: typeof reasoningEfforts[number];
  reasoningBudgetTokens?: number;
  seed?: number;
}
export interface WorkspaceAiSettingsRecord {
  tenantId: string;
  settings: WorkspaceAiSettings;
  encryptedApiKey?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface WorkspaceAiSettingsRepository {
  get(tenantId: string): Promise<WorkspaceAiSettingsRecord | null>;
  save(record: WorkspaceAiSettingsRecord, expectedVersion: number | null): Promise<import('./administration-repository.ts').MetadataWriteResult<WorkspaceAiSettingsRecord>>;
}
export interface WorkspaceAiModel { id: string; name: string; supportedParameters: string[]; maxTokens?: number; free?: boolean; reasoningEfforts?: typeof reasoningEfforts[number][] }
const integerWithin = (value: unknown, minimum: number, maximum: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
function validateAiProvider(settings: Record<string, unknown>) {
  if (!['openrouter', 'local'].includes(String(settings.provider)) || typeof settings.baseUrl !== 'string' || settings.baseUrl.length > 2048) throw new Error('Invalid AI provider');
  if (typeof settings.modelId !== 'string' || !settings.modelId.trim() || settings.modelId.length > 200 || /\s/.test(settings.modelId)) throw new Error('Invalid AI model');
  let url: URL;
  try { url = new URL(settings.baseUrl); } catch { throw new Error('Invalid AI URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.endsWith('/chat/completions')) throw new Error('Invalid AI URL');
}
function validateAiLimits(settings: Record<string, unknown>) {
  if (typeof settings.temperature !== 'number' || !Number.isFinite(settings.temperature) || settings.temperature < 0 || settings.temperature > 2 || !integerWithin(settings.maxTokens, 1, 65536)) throw new Error('Invalid AI limits');
  if (settings.seed !== undefined && !integerWithin(settings.seed, 0, 2147483647)) throw new Error('Invalid seed');
}
function validateAiReasoning(settings: Record<string, unknown>) {
  if (settings.reasoningEffort !== undefined && (!reasoningEfforts.includes(settings.reasoningEffort as typeof reasoningEfforts[number]) || settings.provider !== 'openrouter')) throw new Error('Invalid reasoning effort');
  if (settings.reasoningBudgetTokens !== undefined && (!integerWithin(settings.reasoningBudgetTokens, 0, 65536) || settings.provider !== 'local')) throw new Error('Invalid thinking budget');
}
export function validateWorkspaceAiSettings(value: unknown): asserts value is WorkspaceAiSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid AI settings');
  const settings = value as Record<string, unknown>;
  if (Object.keys(settings).some(key => !['provider', 'baseUrl', 'modelId', 'temperature', 'maxTokens', 'reasoningEffort', 'reasoningBudgetTokens', 'seed'].includes(key))) throw new Error('Invalid AI settings');
  validateAiProvider(settings); validateAiLimits(settings); validateAiReasoning(settings);
}
