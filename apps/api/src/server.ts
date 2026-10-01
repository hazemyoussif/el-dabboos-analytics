import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { MockAnalyticsRepository, SqliteAnalyticsRepository, SqliteDashboardRepository, createSqliteSchema, createDashboardPersistenceSchema, generateSeedFacts } from '@el-dabbous/data';
import type { AnalyticsRepository, DimensionValueRepository } from '@el-dabbous/domain';
import { StructuredDashboardPlanner } from '@el-dabbous/application';
import type { StructuredPlannerDiagnostic } from '@el-dabbous/application';
import type { DashboardPlanner } from '@el-dabbous/domain';
import { OpenAICompatibleLLMProvider } from './providers/openai-compatible.ts';
import { formatStructuredDiagnostic, structuredDiagnosticsEnabled } from './structured-diagnostics.ts';
import { startupSummary } from './startup-config.ts';
import { buildApi } from './app.ts';

const provider = process.env.ANALYTICS_PROVIDER ?? 'sqlite';
let repository: AnalyticsRepository & DimensionValueRepository;
let close = () => {};
if (provider === 'sqlite') {
  const defaultDatabasePath = fileURLToPath(new URL('../../../demo.db', import.meta.url));
  const db = new DatabaseSync(process.env.SQLITE_DB_PATH ?? defaultDatabasePath);
  createSqliteSchema(db);
  repository = new SqliteAnalyticsRepository(db);
  close = () => db.close();
} else if (provider === 'mock') {
  repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'), ...generateSeedFacts('demo-eg')]);
} else {
  throw new Error(`ANALYTICS_PROVIDER=${provider} is reserved but not implemented. Use sqlite or mock.`);
}
const defaultDashboardPath = fileURLToPath(new URL('../../../dashboards.db', import.meta.url));
const dashboardDb = new DatabaseSync(process.env.DASHBOARD_DB_PATH ?? defaultDashboardPath);
createDashboardPersistenceSchema(dashboardDb);
const plannerMode = process.env.DASHBOARD_PLANNER ?? 'mock';
let planner: DashboardPlanner | null | undefined;
if (plannerMode === 'structured') {
  const baseUrl = process.env.LLM_BASE_URL;
  const modelId = process.env.LLM_MODEL_ID;
  if (!baseUrl || !modelId) throw new Error('LLM_BASE_URL and LLM_MODEL_ID are required for structured planning.');
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 120000);
  const maxRepairAttempts = Number(process.env.LLM_REPAIR_ATTEMPTS ?? 1);
  const apiKey = process.env.LLM_API_KEY;
  const diagnostics = structuredDiagnosticsEnabled(process.env.LLM_DEBUG_STRUCTURED_OUTPUT)
    ? (event: StructuredPlannerDiagnostic) => {
      process.stderr.write(`${formatStructuredDiagnostic(event, apiKey)}\n`);
    } : undefined;
  planner = new StructuredDashboardPlanner(new OpenAICompatibleLLMProvider({ baseUrl, modelId,
    ...(apiKey ? { apiKey } : {}), timeoutMs }), { maxRepairAttempts, ...(diagnostics ? { diagnostics } : {}) });
} else if (plannerMode === 'disabled') planner = null;
else if (plannerMode !== 'mock') throw new Error('DASHBOARD_PLANNER must be mock, structured, or disabled.');
const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository,
  dashboardRepository: new SqliteDashboardRepository(dashboardDb), ...(planner !== undefined ? { planner } : {}) });
const port = Number(process.env.PORT ?? 3001);
try {
  const address = await app.listen({ port, host: '127.0.0.1' });
  process.stdout.write(`${startupSummary({ analyticsProvider: provider, dashboardPath: process.env.DASHBOARD_DB_PATH ?? defaultDashboardPath, plannerMode, modelId: process.env.LLM_MODEL_ID, baseUrl: process.env.LLM_BASE_URL, diagnostics: structuredDiagnosticsEnabled(process.env.LLM_DEBUG_STRUCTURED_OUTPUT), port }, process.env.LLM_API_KEY)}\n`);
  process.stdout.write(`El-Dabbous API listening at ${address}\n`);
} catch (error) {
  close(); dashboardDb.close();
  throw error;
}
process.on('SIGTERM', () => { void app.close().then(() => { close(); dashboardDb.close(); }); });
process.on('SIGINT', () => { void app.close().then(() => { close(); dashboardDb.close(); }); });
