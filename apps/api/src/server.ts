import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { MockAnalyticsRepository, SqliteAnalyticsRepository, createSqliteSchema, generateSeedFacts } from '@el-dabbous/data';
import type { AnalyticsRepository, DimensionValueRepository } from '@el-dabbous/domain';
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
const app = await buildApi({ repository });
const port = Number(process.env.PORT ?? 3001);
try {
  const address = await app.listen({ port, host: '127.0.0.1' });
  process.stdout.write(`El-Dabbous API listening at ${address} (${provider})\n`);
} catch (error) {
  close();
  throw error;
}
process.on('SIGTERM', () => { void app.close().then(close); });
process.on('SIGINT', () => { void app.close().then(close); });
