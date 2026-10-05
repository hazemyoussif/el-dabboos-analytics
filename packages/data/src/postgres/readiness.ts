import type { Pool } from 'pg';
import { loadPostgresMigrations } from './migrations.ts';
import { verifyMartRuntimeRole } from './session.ts';
export async function assertMartRuntimeReady(pool: Pool): Promise<void> {
    await verifyMartRuntimeRole(pool);
    const manifest = await loadPostgresMigrations();
    const rows = (await pool.query('SELECT version,name,sha256 FROM mart_admin.mart_schema_migrations ORDER BY version')).rows;
    if (rows.length!==manifest.length || rows.some((row,index) => row.version!==manifest[index]!.version || row.name!==manifest[index]!.name || row.sha256!==manifest[index]!.checksum)) throw new Error('Analytics schema not current');
    const policies = (await pool.query(`SELECT count(*)::int count FROM pg_policy JOIN pg_class ON pg_class.oid=polrelid JOIN pg_namespace ON pg_namespace.oid=relnamespace
      WHERE nspname='mart' AND polname='runtime_release' AND NOT polpermissive
      AND EXISTS(SELECT 1 FROM unnest(polroles) role_oid WHERE role_oid=(SELECT oid FROM pg_roles WHERE rolname=current_user) OR pg_has_role(current_user,role_oid,'USAGE'))`)).rows[0];
    if (policies.count!==6) throw new Error('Analytics runtime serving policy incomplete');
    await pool.query('SELECT 1 FROM mart.canonical_facts LIMIT 0');
}
