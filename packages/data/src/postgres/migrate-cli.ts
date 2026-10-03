import { createMartPool } from './session.ts';
import { migratePostgres } from './migrations.ts';
const url = process.env.MART_MIGRATOR_URL;
if (!url) throw new Error('MART_MIGRATOR_URL is required; runtime never migrates');
const pool = createMartPool(url, 1);
try { process.stdout.write(`Applied migrations: ${(await migratePostgres(pool)).join(', ') || 'already current'}\n`); }
finally { await pool.end(); }
