import { parseDeploymentConfig } from './deployment-config.ts';
import type { DeploymentConfig } from './deployment-config.ts';
import { ConfigurationError } from './configuration-error.ts';
export { ConfigurationError } from './configuration-error.ts';
/** Explicit startup allowlist: never serialize process.env or provider requests. */
export function startupSummary(config: { analyticsProvider: string; dashboardPath: string; plannerMode: string;
  modelId?: string | undefined; baseUrl?: string | undefined; diagnostics: boolean; port: number; executionConcurrency?: number; llmTimeoutMs?: number; llmRepairAttempts?: number; llmTemperature?: number; llmMaxTokens?: number; llmReasoningBudgetTokens?: number; llmSeed?: number }, apiKey?: string): string {
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
    ...(config.plannerMode === 'structured' ? { modelId: safe(config.modelId ?? ''), endpoint: endpoint(config.baseUrl), llmTimeoutMs: config.llmTimeoutMs ?? 120000, llmRepairAttempts: config.llmRepairAttempts ?? 1, llmTemperature: config.llmTemperature ?? 0, llmMaxTokens: config.llmMaxTokens ?? 2048, ...(config.llmReasoningBudgetTokens !== undefined ? { llmReasoningBudgetTokens: config.llmReasoningBudgetTokens } : {}), ...(config.llmSeed !== undefined ? { llmSeed: config.llmSeed } : {}) } : {}),
    structuredDiagnostics: config.diagnostics, port: config.port, ...(config.executionConcurrency === undefined ? {} : { executionConcurrency: config.executionConcurrency }) })}`;
}

export interface RuntimeConfig {
  deployment: DeploymentConfig;
  controlProvider: 'sqlite' | 'postgres';
  control?: { databaseUrl: string; poolMax: number };
  analyticsProvider: 'sqlite' | 'mock' | 'postgres';
  postgres?: { runtimeUrl: string; poolMax: number; statementTimeoutMs: number; maxGroups: number; maxDateSpanDays: number }; plannerMode: 'mock' | 'structured' | 'disabled';
  analyticsPath: string; dashboardPath: string; port: number; executionConcurrency: number;
  llm: { baseUrl?: string; modelId?: string; apiKey?: string; timeoutMs: number; repairAttempts: number; diagnostics: boolean; temperature: number; maxTokens: number; reasoningBudgetTokens?: number; seed?: number };
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
  const temperature = env.LLM_TEMPERATURE === undefined ? 0 : Number(env.LLM_TEMPERATURE);
  if (env.LLM_TEMPERATURE !== undefined && !/^\d+(?:\.\d+)?$/u.test(env.LLM_TEMPERATURE) || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) throw new ConfigurationError('LLM_TEMPERATURE');
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
  const controlSettings = parseControlSettings(env);
  const analyticsProvider = choice('ANALYTICS_PROVIDER', 'sqlite', ['sqlite', 'mock', 'postgres']);
  let postgres: RuntimeConfig['postgres'];
  if (analyticsProvider === 'postgres') {
    const runtimeUrl = env.MART_RUNTIME_URL;
    if (!runtimeUrl) throw new ConfigurationError('MART_RUNTIME_URL');
    try { const url = new URL(runtimeUrl); if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) throw new Error(); }
    catch { throw new ConfigurationError('MART_RUNTIME_URL'); }
    postgres = { runtimeUrl, poolMax: integer('MART_POOL_MAX', 8, 1, 64), statementTimeoutMs: integer('MART_STATEMENT_TIMEOUT_MS', 15000, 1, 120000), maxGroups: integer('MART_MAX_GROUPS', 1000, 1, 5000), maxDateSpanDays: integer('MART_MAX_DATE_SPAN_DAYS', 3660, 1, 36600) };
  }
  return { deployment: parseDeploymentConfig(env), ...controlSettings, analyticsProvider, plannerMode, ...(postgres ? { postgres } : {}),
    analyticsPath: path('SQLITE_DB_PATH', defaults.analyticsPath), dashboardPath: path('DASHBOARD_DB_PATH', defaults.dashboardPath),
    port: integer('PORT', 3001, 1, 65535), executionConcurrency: integer('ANALYTICS_EXECUTION_CONCURRENCY', 8, 1, 64),
    llm: { ...(baseUrl ? { baseUrl } : {}), ...(modelId ? { modelId } : {}), ...(env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY } : {}),
      temperature, maxTokens: integer('LLM_MAX_TOKENS', 2048, 1, 65536),
      ...(env.LLM_REASONING_BUDGET_TOKENS !== undefined ? { reasoningBudgetTokens: integer('LLM_REASONING_BUDGET_TOKENS', 0, 0, 65536) } : {}),
      ...(env.LLM_SEED !== undefined ? { seed: integer('LLM_SEED', 0, 0, 2147483647) } : {}),
      timeoutMs: integer('LLM_TIMEOUT_MS', 120000, 1, 600000), repairAttempts: integer('LLM_REPAIR_ATTEMPTS', 1, 0, 2), diagnostics: diagnosticsValue === 'true' } };
}

function parseControlSettings(env: Readonly<Record<string,string|undefined>>): Pick<RuntimeConfig,'controlProvider' | 'control'> {
  const controlProvider = env.CONTROL_PROVIDER ?? 'sqlite';
  if (controlProvider === 'sqlite') return { controlProvider };
  if (controlProvider !== 'postgres') throw new ConfigurationError('CONTROL_PROVIDER');
  const databaseUrl = env.CONTROL_DATABASE_URL;
  validateControlDatabaseUrl(databaseUrl,env);
  if (!['disabled','local'].includes(env.ACCESS_IDENTITY_MODE ?? 'disabled')) throw new ConfigurationError('ACCESS_IDENTITY_MODE');
  const raw = env.CONTROL_POOL_MAX ?? '8', poolMax = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(poolMax) || poolMax < 1 || poolMax > 64) throw new ConfigurationError('CONTROL_POOL_MAX');
  return { controlProvider,control: { databaseUrl: databaseUrl!,poolMax } };
}

function validateControlDatabaseUrl(databaseUrl: string | undefined, env: Readonly<Record<string,string|undefined>>): void {
  try {
    const url = new URL(databaseUrl ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2 ||
      [env.CONTROL_MIGRATOR_URL,env.MART_RUNTIME_URL,env.MART_INGESTOR_URL,env.MART_MIGRATOR_URL].includes(databaseUrl)) throw new Error();
  } catch { throw new ConfigurationError('CONTROL_DATABASE_URL'); }
}
