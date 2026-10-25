import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { SourceCompatibilityResult, TenantSourceSettings } from '@el-dabboos/domain';
import { validateTenantSourceSettings } from '@el-dabboos/domain';
import { sourceSchemaIssues, sourceSchemaRequirements } from './settings-schema.ts';
import type { SourceSchemaColumn, SourceSchemaRelation } from './settings-schema.ts';

async function inspectSchema(client: PoolClient, settings: TenantSourceSettings): Promise<SourceCompatibilityResult> {
  const tables = [...new Set(sourceSchemaRequirements(settings).map(required => required.table))];
  const columns = (await client.query<SourceSchemaColumn>('SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=ANY($1::text[])', [tables])).rows;
  const relations = (await client.query<SourceSchemaRelation>(`SELECT source.relname table_name,source_field.attname column_name,target.relname target_table,target_field.attname target_column
    FROM pg_constraint relation JOIN pg_class source ON source.oid=relation.conrelid JOIN pg_namespace namespace ON namespace.oid=source.relnamespace
    JOIN pg_class target ON target.oid=relation.confrelid JOIN pg_namespace target_namespace ON target_namespace.oid=target.relnamespace
    JOIN pg_attribute source_field ON source_field.attrelid=source.oid AND source_field.attnum=relation.conkey[1]
    JOIN pg_attribute target_field ON target_field.attrelid=target.oid AND target_field.attnum=relation.confkey[1]
    WHERE relation.contype='f' AND namespace.nspname='public' AND target_namespace.nspname='public'
    AND array_length(relation.conkey,1)=1 AND source.relname=ANY($1::text[])`, [tables])).rows;
  const version = (await client.query("SELECT latest_version FROM public.ir_module_module WHERE name='base' AND state='installed'")).rows[0]?.latest_version;
  const observedMajor = Number(/^([0-9]+)\./.exec(String(version))?.[1]);
  const companies = (await client.query('SELECT id::text id FROM public.res_company WHERE id=ANY($1::int[])', [settings.companyIds])).rows;
  const identity = (await client.query("SELECT value FROM public.ir_config_parameter WHERE key='database.uuid'")).rows[0]?.value;
  const issues = sourceSchemaIssues(settings, columns, relations);
  if (observedMajor !== settings.expectedMajor) issues.push({ code: 'odoo_version' });
  if (companies.length !== settings.companyIds.length) issues.push({ code: 'company_scope' });
  return { compatible: issues.length === 0, issues, ...(Number.isSafeInteger(observedMajor) ? { observedMajor } : {}),
    ...(typeof identity === 'string' && identity ? { instanceFingerprint: createHash('sha256').update(identity).digest('hex') } : {}) };
}
/** No customer records, dynamic SQL, source writes, ingestion, or publication. */
export async function inspectOdooSourceSettings(pool: Pool, settings: TenantSourceSettings): Promise<SourceCompatibilityResult> {
  validateTenantSourceSettings(settings);
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SELECT set_config('statement_timeout',$1,true),set_config('lock_timeout','1000',true),set_config('search_path','pg_catalog',true)", [String(Math.min(settings.parameters.statementTimeoutMs, 2000))]);
    const result = await inspectSchema(client, settings);
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { broken = true; }
    throw error;
  } finally { client.release(broken); }
}
