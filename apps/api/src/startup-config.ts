/** Explicit startup allowlist: never serialize process.env or provider requests. */
export function startupSummary(config: { analyticsProvider: string; dashboardPath: string; plannerMode: string;
  modelId?: string | undefined; baseUrl?: string | undefined; diagnostics: boolean; port: number; executionConcurrency?: number; llmTimeoutMs?: number; llmRepairAttempts?: number }, apiKey?: string): string {
  const safe = (value: string) => {
    let result = value.replace(/[\r\n\t]/gu, ' ');
    if (apiKey) result = result.split(apiKey).join('[redacted]');
    return result.slice(0, 240);
  };
  const endpoint = (value?: string) => {
    if (!value) return undefined;
    try { const url = new URL(value); return safe(`${url.protocol}//${url.host}${url.pathname}`); }
    catch { return '[invalid endpoint]'; }
  };
  return `API configuration ${JSON.stringify({ analyticsProvider: safe(config.analyticsProvider),
    dashboardDatabase: safe(config.dashboardPath), plannerMode: safe(config.plannerMode),
    ...(config.plannerMode === 'structured' ? { modelId: safe(config.modelId ?? ''), endpoint: endpoint(config.baseUrl), llmTimeoutMs: config.llmTimeoutMs ?? 120000, llmRepairAttempts: config.llmRepairAttempts ?? 1 } : {}),
    structuredDiagnostics: config.diagnostics, port: config.port, ...(config.executionConcurrency === undefined ? {} : { executionConcurrency: config.executionConcurrency }) })}`;
}

export interface RuntimeConfig {
  analyticsProvider: 'sqlite' | 'mock'; plannerMode: 'mock' | 'structured' | 'disabled';
  analyticsPath: string; dashboardPath: string; port: number; executionConcurrency: number;
  llm: { baseUrl?: string; modelId?: string; apiKey?: string; timeoutMs: number; repairAttempts: number; diagnostics: boolean };
}
export class ConfigurationError extends Error {
  constructor(field: string) { super(`Invalid API configuration: ${field}. Check the documented settings.`); }
}
/** Only the API composition root supplies environment values; never loads env files itself. */
export function parseRuntimeConfig(env: Readonly<Record<string, string | undefined>>, defaults: { analyticsPath: string; dashboardPath: string }): RuntimeConfig {
  const choice = <T extends string>(field: string, fallback: T, allowed: readonly T[]): T => {
    const value = env[field] ?? fallback;
    if (!allowed.includes(value as T)) throw new ConfigurationError(field);
    return value as T;
  };
  const integer = (field: string, fallback: number, min: number, max: number): number => {
    const raw = env[field]; const value = raw === undefined ? fallback : Number(raw);
    if (raw !== undefined && !/^\d+$/u.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) throw new ConfigurationError(field);
    return value;
  };
  const path = (field: string, fallback: string): string => {
    const value = env[field] ?? fallback;
    if (!value.trim() || value.includes('\0')) throw new ConfigurationError(field);
    return value;
  };
  const diagnosticsValue = env.LLM_DEBUG_STRUCTURED_OUTPUT ?? 'false';
  if (!['true', 'false'].includes(diagnosticsValue)) throw new ConfigurationError('LLM_DEBUG_STRUCTURED_OUTPUT');
  const plannerMode = choice('DASHBOARD_PLANNER', 'mock', ['mock', 'structured', 'disabled']);
  const baseUrl = env.LLM_BASE_URL?.trim(); const modelId = env.LLM_MODEL_ID?.trim();
  if (plannerMode === 'structured' && !baseUrl) throw new ConfigurationError('LLM_BASE_URL');
  if (plannerMode === 'structured' && !modelId) throw new ConfigurationError('LLM_MODEL_ID');
  if (baseUrl) {
    let url: URL; try { url = new URL(baseUrl); } catch { throw new ConfigurationError('LLM_BASE_URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new ConfigurationError('LLM_BASE_URL');
  }
  return { analyticsProvider: choice('ANALYTICS_PROVIDER', 'sqlite', ['sqlite', 'mock']), plannerMode,
    analyticsPath: path('SQLITE_DB_PATH', defaults.analyticsPath), dashboardPath: path('DASHBOARD_DB_PATH', defaults.dashboardPath),
    port: integer('PORT', 3001, 1, 65535), executionConcurrency: integer('ANALYTICS_EXECUTION_CONCURRENCY', 8, 1, 64),
    llm: { ...(baseUrl ? { baseUrl } : {}), ...(modelId ? { modelId } : {}), ...(env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY } : {}),
      timeoutMs: integer('LLM_TIMEOUT_MS', 120000, 1, 600000), repairAttempts: integer('LLM_REPAIR_ATTEMPTS', 1, 0, 2), diagnostics: diagnosticsValue === 'true' } };
}
