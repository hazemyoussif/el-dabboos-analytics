import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
export interface OdooSourceConfig {
  connection: PoolConfig;
  tenantId: string; sourceId: string; companyIds: readonly string[];
  batchSize: number; statementTimeoutMs: number; snapshotMaxDurationMs: number;
}
export function createOdooSourcePool(config: OdooSourceConfig): Pool {
  return new Pool(config.connection);
}
const required = (environment: Readonly<Record<string,string|undefined>>,key: string): string => {
  const value = environment[key];
  if (!value || value.trim()!==value) throw new Error('Invalid Odoo source configuration');
  return value;
};
function integer(environment: Readonly<Record<string,string|undefined>>,key: string,fallback: number,max: number): number {
  const raw = environment[key] ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new Error('Invalid Odoo source bounds');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value<1 || value>max) throw new Error('Invalid Odoo source bounds');
  return value;
}
/** Caller owns shell > .env.local > .env loading. Never used by tests or serving startup. */
export function odooSourceConfig(environment: Readonly<Record<string,string|undefined>>,scope: { tenantId: string; sourceId: string }): OdooSourceConfig {
  const host = required(environment,'ODOO_SOURCE_HOST');
  if (!['127.0.0.1','localhost','::1'].includes(host)) throw new Error('Odoo source must use externally managed local tunnel');
  const companyIds = required(environment,'ODOO_SOURCE_COMPANY_IDS').split(',');
  if (!companyIds.length || companyIds.length>64 || companyIds.some(company => !/^[1-9]\d*$/.test(company)) || new Set(companyIds).size!==companyIds.length) throw new Error('Invalid Odoo source company scope');
  return { ...scope,companyIds,batchSize: integer(environment,'ODOO_SOURCE_BATCH_SIZE',500,1000),statementTimeoutMs: integer(environment,'ODOO_SOURCE_STATEMENT_TIMEOUT_MS',15000,120000),snapshotMaxDurationMs: integer(environment,'ODOO_SOURCE_SNAPSHOT_MAX_DURATION_MS',120000,600000),
    connection: { host,port: integer(environment,'ODOO_SOURCE_PORT',5432,65535),database: required(environment,'ODOO_SOURCE_DATABASE'),user: required(environment,'ODOO_SOURCE_USER'),password: required(environment,'ODOO_SOURCE_PASSWORD'),
      max: 1,connectionTimeoutMillis: integer(environment,'ODOO_SOURCE_CONNECT_TIMEOUT_MS',5000,30000),idleTimeoutMillis: 30000 } };
}
