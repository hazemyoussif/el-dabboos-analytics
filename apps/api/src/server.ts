import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { SqliteDashboardLibraryRepository, createDashboardLibrarySchema, MockAnalyticsRepository, SqliteAnalyticsRepository, SqliteDashboardRepository, createSqliteSchema, createDashboardPersistenceSchema, generateSeedFacts } from '@el-dabbous/data';
import type { AnalyticsRepository, DimensionValueRepository } from '@el-dabbous/domain';
import { StructuredDashboardPlanner } from '@el-dabbous/application';
import type { StructuredPlannerDiagnostic } from '@el-dabbous/application';
import type { DashboardPlanner } from '@el-dabbous/domain';
import { OpenAICompatibleLLMProvider } from './providers/openai-compatible.ts';
import { formatStructuredDiagnostic } from './structured-diagnostics.ts';
import { parseRuntimeConfig, startupSummary } from './startup-config.ts';
import { buildApi } from './app.ts';

const config = parseRuntimeConfig(process.env, { analyticsPath: fileURLToPath(new URL('../../../demo.db', import.meta.url)), dashboardPath: fileURLToPath(new URL('../../../dashboards.db', import.meta.url)) });
const provider = config.analyticsProvider;
let analyticsReady: () => Promise<boolean>;
let repository: AnalyticsRepository & DimensionValueRepository;
let close = () => {};
if (provider === 'sqlite') {
  const db = new DatabaseSync(config.analyticsPath);
  createSqliteSchema(db);
  repository = new SqliteAnalyticsRepository(db);
  close = () => db.close();
  analyticsReady = async () => { db.prepare('SELECT 1 FROM analytics_facts LIMIT 0').all(); return true; };
} else if (provider === 'mock') {
  repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'), ...generateSeedFacts('demo-eg')]);
  analyticsReady = async () => true;
} else {
  throw new Error(`ANALYTICS_PROVIDER=${provider} is reserved but not implemented. Use sqlite or mock.`);
}
const dashboardDb = new DatabaseSync(config.dashboardPath);
createDashboardPersistenceSchema(dashboardDb);
createDashboardLibrarySchema(dashboardDb);
const plannerMode = config.plannerMode;
let planner: DashboardPlanner | null | undefined;
if (plannerMode === 'structured') {
  const baseUrl = config.llm.baseUrl;
  const modelId = config.llm.modelId;
  if (!baseUrl || !modelId) throw new Error('LLM_BASE_URL and LLM_MODEL_ID are required for structured planning.');
  const timeoutMs = config.llm.timeoutMs;
  const maxRepairAttempts = config.llm.repairAttempts;
  const apiKey = config.llm.apiKey;
  const diagnostics = config.llm.diagnostics
    ? (event: StructuredPlannerDiagnostic) => {
      process.stderr.write(`${formatStructuredDiagnostic(event, apiKey)}\n`);
    } : undefined;
  planner = new StructuredDashboardPlanner(new OpenAICompatibleLLMProvider({ baseUrl, modelId,
    ...(apiKey ? { apiKey } : {}), timeoutMs }), { maxRepairAttempts, ...(diagnostics ? { diagnostics } : {}) });
} else if (plannerMode === 'disabled') planner = null;
else if (plannerMode !== 'mock') throw new Error('DASHBOARD_PLANNER must be mock, structured, or disabled.');
const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, executionConcurrency: config.executionConcurrency,
  readiness: { persistence: async () => { for (const table of ['dashboard_records', 'dashboard_folders', 'dashboard_library_preferences']) dashboardDb.prepare(`SELECT 1 FROM ${table} LIMIT 0`).all(); return true; }, analytics: analyticsReady },
  dashboardRepository: new SqliteDashboardRepository(dashboardDb), libraryRepository: new SqliteDashboardLibraryRepository(dashboardDb), ...(planner !== undefined ? { planner } : {}) });
const port = config.port;
try {
  const address = await app.listen({ port, host: '127.0.0.1' });
  process.stdout.write(`${startupSummary({ analyticsProvider: provider, dashboardPath: config.dashboardPath, plannerMode, modelId: config.llm.modelId, baseUrl: config.llm.baseUrl, diagnostics: config.llm.diagnostics, port, executionConcurrency: config.executionConcurrency }, config.llm.apiKey)}\n`);
  process.stdout.write(`El Dabboos API listening at ${address}\n`);
} catch (error) {
  close(); dashboardDb.close();
  throw error;
}
process.on('SIGTERM', () => { void app.close().then(() => { close(); dashboardDb.close(); }); });
process.on('SIGINT', () => { void app.close().then(() => { close(); dashboardDb.close(); }); });
