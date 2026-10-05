import { createMartPool } from './session.ts';
import { migratePostgres } from './migrations.ts';
try {
  const url = process.env.MART_MIGRATOR_URL;
  if (!url) throw new Error('Migration configuration required');
  const pool = createMartPool(url,1);
  try { process.stdout.write(`Applied migrations: ${(await migratePostgres(pool)).join(', ') || 'already current'}\n`); }
  finally { await pool.end(); }
} catch {
  process.stderr.write('Mart migration failed. Check migrator configuration and immutable migration history; credentials are not printed.\n');
  process.exitCode = 1;
}
