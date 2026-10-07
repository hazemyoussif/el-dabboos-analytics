import { parseLocalAuthConfig } from './auth/config.ts';
import { openLocalAuthentication } from './auth/runtime.ts';
import { openControlStorage } from './control-storage.ts';
import type { StructuredPlannerDiagnostic } from '@el-dabboos/application';
import { StructuredDashboardPlanner } from '@el-dabboos/application';
import { MockAnalyticsRepository, PostgresOperationalStatus, PostgresAnalyticsRepository, SqliteAnalyticsRepository, createMartPool, createSqliteSchema, generateSeedFacts, assertMartRuntimeReady } from '@el-dabboos/data';
import type { AnalyticsRepository, DashboardPlanner, DimensionValueRepository } from '@el-dabboos/domain';
import { existsSync, realpathSync } from 'node:fs';
import { resolve, } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { buildApi } from './app.ts';
import { ApiError } from './errors.ts';
import { OpenAICompatibleLLMProvider } from './providers/openai-compatible.ts';
import { parseRuntimeConfig, startupSummary } from './startup-config.ts';
import { formatStructuredDiagnostic } from './structured-diagnostics.ts';
const config = parseRuntimeConfig(process.env, { analyticsPath: fileURLToPath(new URL('../../../demo.db', import.meta.url)), dashboardPath: fileURLToPath(new URL('../../../dashboards.db', import.meta.url)) });
// Metadata is independent of analytics: explicit migration command is required before startup.
const canonicalPath = (path: string) => existsSync(path) ? realpathSync(path) : resolve(path);
if (config.controlProvider === 'sqlite' && canonicalPath(config.analyticsPath) === canonicalPath(config.dashboardPath))
    throw new Error('Analytics and metadata database paths must be separate. Copy approved dashboard/library tables explicitly to a dedicated metadata file before migration.');
const controlStorage = await openControlStorage(config);
const administration = controlStorage.store;
const authConfig = parseLocalAuthConfig(process.env);
const localAuth = authConfig && config.control ? await openLocalAuthentication(config.control.databaseUrl,authConfig) : undefined;
const syntheticIdentity = config.deployment.identityMode === 'synthetic';
const provider = config.analyticsProvider;
let dataReady: (tenantId: string) => Promise<boolean> = async (id) => id === 'demo-iq' || id === 'demo-eg';
let analyticsReady: () => Promise<boolean>;
let operationalStatus: import('@el-dabboos/domain').OperationalStatusProvider | undefined;
let repository: AnalyticsRepository & DimensionValueRepository;
let close: () => void | Promise<void> = () => { };
if (provider === 'sqlite') {
    const db = new DatabaseSync(config.analyticsPath);
    createSqliteSchema(db);
    repository = new SqliteAnalyticsRepository(db);
    close = () => db.close();
    analyticsReady = async () => { db.prepare('SELECT 1 FROM analytics_facts LIMIT 0').all(); return true; };
}
else if (provider === 'mock') {
    repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'), ...generateSeedFacts('demo-eg')]);
    analyticsReady = async () => true;
}
else {
    if (!config.postgres)
        throw new Error('Missing PostgreSQL runtime configuration');
    const pool = createMartPool(config.postgres.runtimeUrl, config.postgres.poolMax);
    operationalStatus=new PostgresOperationalStatus(pool);
    pool.on('error', () => { process.stderr.write('PostgreSQL pool connection failed\n'); });
    repository = new PostgresAnalyticsRepository(pool, { reportingCurrencies: {}, reportingCurrency: async (id) => (await administration.profiles.get(id, 'en'))?.reportingCurrency ?? null, statementTimeoutMs: config.postgres.statementTimeoutMs, maxGroups: config.postgres.maxGroups, maxDateSpanDays: config.postgres.maxDateSpanDays });
    const postgresRepository = repository as PostgresAnalyticsRepository;
    dataReady = id => postgresRepository.isDataReady(id);
    close = () => pool.end();
    try {
        await assertMartRuntimeReady(pool);
    }
    catch {
        await pool.end();
        throw new Error('PostgreSQL runtime identity/provisioning check failed');
    }
    analyticsReady = async () => { await assertMartRuntimeReady(pool); return true; };
}
const plannerMode = config.plannerMode;
let planner: DashboardPlanner | null | undefined;
if (plannerMode === 'structured') {
    const baseUrl = config.llm.baseUrl;
    const modelId = config.llm.modelId;
    if (!baseUrl || !modelId)
        throw new Error('LLM_BASE_URL and LLM_MODEL_ID are required for structured planning.');
    const timeoutMs = config.llm.timeoutMs;
    const maxRepairAttempts = config.llm.repairAttempts;
    const apiKey = config.llm.apiKey;
    const diagnostics = config.llm.diagnostics
        ? (event: StructuredPlannerDiagnostic) => {
            process.stderr.write(`${formatStructuredDiagnostic(event, apiKey)}\n`);
        } : undefined;
    planner = new StructuredDashboardPlanner(new OpenAICompatibleLLMProvider({ baseUrl, modelId,
        ...(apiKey ? { apiKey } : {}), temperature: config.llm.temperature, maxTokens: config.llm.maxTokens, ...(config.llm.reasoningBudgetTokens !== undefined ? { reasoningBudgetTokens: config.llm.reasoningBudgetTokens } : {}), ...(config.llm.seed !== undefined ? { seed: config.llm.seed } : {}), timeoutMs, ...(config.llm.diagnostics ? { diagnostics: event => process.stderr.write(`${JSON.stringify(event)}\n`) } : {}) }), { maxRepairAttempts, ...(diagnostics ? { diagnostics } : {}) });
}
else if (plannerMode === 'disabled')
    planner = null;
else if (plannerMode !== 'mock')
    throw new Error('DASHBOARD_PLANNER must be mock, structured, or disabled.');
const app = await buildApi({ ...(operationalStatus?{operationalStatus}:{}), ...(provider==='postgres' ? { publishedCapabilities: repository as PostgresAnalyticsRepository } : {}),analyticsRepository: repository, dimensionValues: repository, executionConcurrency: config.executionConcurrency,
    readiness: { persistence: async () => { await localAuth?.ready(); return controlStorage.ready(); }, analytics: analyticsReady },
    administration: { unitOfWork: administration, directory: administration.directory, profiles: administration.profiles, dataReady,
        authenticate: async (headers) => {
            if (localAuth) return (await localAuth.principal(headers)).binding.id;
            if (!syntheticIdentity)
                throw new ApiError(401, 'IDENTITY_REQUIRED', 'Trusted authentication is not configured.');
            const id = headers['x-demo-user-id'];
            if (typeof id !== 'string' || !id)
                throw new ApiError(401, 'IDENTITY_REQUIRED', 'Select a synthetic identity.');
            const binding = await administration.read(transaction => transaction.users.findIdentity('synthetic', id));
            if (!binding)
                throw new ApiError(401, 'IDENTITY_REQUIRED', 'Unknown synthetic identity.');
            return binding.id;
        },
        ...(syntheticIdentity ? { principals: () => administration.read(async (transaction) => {
                const users = await transaction.users.listUsers({ limit: 100 });
                const result = [];
                for (const user of users.items)
                    if (await transaction.users.findIdentity('synthetic', user.id))
                        result.push({ id: user.id, displayName: user.displayName });
                return result;
            }) } : {}),
    }, libraryRepository: administration.library, ...(planner !== undefined ? { planner } : {}) }, { corsOrigins: config.deployment.corsOrigins,identityMode: config.deployment.identityMode,...(localAuth ? { localAuth } : {}),...(config.deployment.operationalLogging ? { operationalLog: (line: string) => process.stdout.write(`${line}\n`) } : {}) });
const port = config.port;
try {
    const address = await app.listen({ port, host: config.deployment.host });
    process.stdout.write(`${startupSummary({ analyticsProvider: provider, dashboardPath: config.controlProvider === 'postgres' ? 'postgres-control' : config.dashboardPath, plannerMode, modelId: config.llm.modelId, baseUrl: config.llm.baseUrl, diagnostics: config.llm.diagnostics, llmTemperature: config.llm.temperature, llmMaxTokens: config.llm.maxTokens, ...(config.llm.reasoningBudgetTokens !== undefined ? { llmReasoningBudgetTokens: config.llm.reasoningBudgetTokens } : {}), ...(config.llm.seed !== undefined ? { llmSeed: config.llm.seed } : {}), llmTimeoutMs: config.llm.timeoutMs, llmRepairAttempts: config.llm.repairAttempts, port, executionConcurrency: config.executionConcurrency }, config.llm.apiKey)}\n`);
    process.stdout.write(`El Dabboos API listening at ${address}\n`);
}
catch (error) {
    await close();
    await localAuth?.close(); await controlStorage.close();
    throw error;
}
process.on('SIGTERM', () => { void app.close().then(async () => { await close(); await localAuth?.close(); await controlStorage.close(); }); });
process.on('SIGINT', () => { void app.close().then(async () => { await close(); await localAuth?.close(); await controlStorage.close(); }); });
