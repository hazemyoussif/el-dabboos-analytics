import { Pool } from 'pg';
import { database } from './support.ts';
import { provisionControlRoles } from '../../src/control/provision.ts';
import { migrateControl } from '../../src/control/migrations.ts';
export async function controlDatabase(migrate = true) {
    const mart = await database(false);
    // Roles are cluster-wide; transaction advisory locks on separate fixture DBs are not.
    const roleLock = new Pool({ connectionString: process.env.PG_TEST_ADMIN_URL,max:1 });
    const lock = await roleLock.connect();
    try {
        await lock.query('SELECT pg_advisory_lock(738421,12)');
        await provisionControlRoles(mart.admin,{ migrator: 'control_test_migrator_only',app: 'control_test_app_only' });
    } finally { await lock.query('SELECT pg_advisory_unlock(738421,12)'); lock.release(); await roleLock.end(); }
    const config = new URL(process.env.PG_TEST_ADMIN_URL!);
    const name = (await mart.admin.query('SELECT current_database() name')).rows[0].name;
    await mart.admin.query(`ALTER DATABASE ${name} OWNER TO control_migrator`);
    config.pathname=`/${name}`;
    config.username='control_migrator_login'; config.password='control_test_migrator_only';
    const migrator = new Pool({ connectionString: config.toString() });
    config.username='control_app_login'; config.password='control_test_app_only';
    const app = new Pool({ connectionString: config.toString() });
    if (migrate) await migrateControl(migrator);
    return { migrator,app,appUrl: config.toString(),admin: mart.admin,martRuntime: mart.runtime,martIngestor: mart.ingestor,async close() { await Promise.all([migrator.end(),app.end()]); await mart.close(); } };
}
