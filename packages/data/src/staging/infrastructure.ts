import type { Pool } from 'pg';
import { stagingIdentities, provisionStagingLogin } from './roles.ts';
import type { StagingIdentity } from './roles.ts';
/** Explicit admin-only infrastructure operation. Only named staging DBs are eligible. */
export async function provisionStagingDatabases(pool: Pool, passwords: Record<StagingIdentity,string>): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('SELECT pg_advisory_lock(738421,20)');
        await client.query('BEGIN');
        for (const identity of Object.keys(stagingIdentities) as StagingIdentity[]) await provisionStagingLogin(client,identity,passwords[identity]);
        await client.query('COMMIT');
        for (const identity of ['controlMigrator','martMigrator'] as const) {
            const { login,database } = stagingIdentities[identity];
            const existing = (await client.query('SELECT pg_get_userbyid(datdba) owner FROM pg_database WHERE datname=$1',[database])).rows[0];
            if (existing && existing.owner!==login) throw new Error('Conflicting staging database owner');
            if (!existing) await client.query(`CREATE DATABASE ${database} OWNER ${login}`);
            await client.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
            for (const role of Object.values(stagingIdentities).filter(role => role.database===database)) await client.query(`GRANT CONNECT ON DATABASE ${database} TO ${role.login}`);
            if (database===stagingIdentities.martIngestor.database) await client.query(`GRANT TEMPORARY ON DATABASE ${database} TO ${stagingIdentities.martIngestor.login}`);
        }
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { try { await client.query('SELECT pg_advisory_unlock(738421,20)'); } finally { client.release(); } }
}
