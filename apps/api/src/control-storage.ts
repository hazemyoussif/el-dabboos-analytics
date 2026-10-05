import { DatabaseSync } from 'node:sqlite';
import { assertMetadataReady, SqliteAdministrationStore, PostgresAdministrationStore, createControlPool, assertControlReady, verifyControlAppRole } from '@el-dabboos/data';
import type { RuntimeConfig } from './startup-config.ts';
/** One authoritative control store per runtime. PostgreSQL never opens the metadata SQLite file. */
export async function openControlStorage(config: RuntimeConfig) {
    if (config.controlProvider === 'sqlite') {
        const database = new DatabaseSync(config.dashboardPath);
        try {
            const store = new SqliteAdministrationStore(database);
            return { store, ready: async () => { assertMetadataReady(database); return true; }, close: async () => database.close() };
        } catch (error) { database.close(); throw error; }
    }
    if (!config.control) throw new Error('Missing control configuration');
    const pool = createControlPool(config.control.databaseUrl,config.control.poolMax);
    pool.on('error', () => { process.stderr.write('Control database connection failed\n'); });
    try {
        await assertControlReady(pool);
        await verifyControlAppRole(pool);
        return { store: new PostgresAdministrationStore(pool), ready: async () => { await assertControlReady(pool); return true; }, close: () => pool.end() };
    } catch { await pool.end(); throw new Error('Control database identity/schema check failed'); }
}
