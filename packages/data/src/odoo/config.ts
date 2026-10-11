import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import type { OdooCredentialPolicy } from './identity.ts';
export interface OdooSourceConfig {
  connection: PoolConfig;
  credentialPolicy?: OdooCredentialPolicy;
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
function stagingPolicy(environment: Readonly<Record<string,string|undefined>>,scope: { tenantId: string; sourceId: string },companyIds: readonly string[]): boolean {
  const staging = environment.ODOO_SOURCE_STAGING_PILOT ?? 'false';
  if (!['true','false'].includes(staging)) throw new Error('Invalid staging pilot declaration');
  if (staging==='true' && (scope.tenantId!=='el-dabboos-iq' || scope.sourceId!=='el-dabboos-odoo18-pg' || companyIds.join(',')!=='1' || environment.ODOO_SOURCE_DATABASE!=='accounting')) throw new Error('Unapproved staging pilot scope');
  return staging==='true';
}
function validateSourceHost(host: string,environment: Readonly<Record<string,string|undefined>>,staging: boolean): void {
  if (['127.0.0.1','localhost','::1'].includes(host)) return;
  if (staging && environment.ENVIRONMENT==='staging') return;
  throw new Error('Odoo source must use externally managed local tunnel');
}
/** Caller owns shell > .env.local > .env loading. Never used by tests or serving startup. */
export function odooSourceConfig(environment: Readonly<Record<string,string|undefined>>,scope: { tenantId: string; sourceId: string }): OdooSourceConfig {
  const host = required(environment,'ODOO_SOURCE_HOST');
  const companyIds = required(environment,'ODOO_SOURCE_COMPANY_IDS').split(',');
  if (!companyIds.length || companyIds.length>64 || companyIds.some(company => !/^[1-9]\d*$/.test(company)) || new Set(companyIds).size!==companyIds.length) throw new Error('Invalid Odoo source company scope');
  const staging = stagingPolicy(environment,scope,companyIds);
  validateSourceHost(host,environment,staging);
  return { ...scope,companyIds,credentialPolicy: staging ? 'staging_read_only' : 'least_privilege',batchSize: integer(environment,'ODOO_SOURCE_BATCH_SIZE',500,1000),statementTimeoutMs: integer(environment,'ODOO_SOURCE_STATEMENT_TIMEOUT_MS',15000,120000),snapshotMaxDurationMs: integer(environment,'ODOO_SOURCE_SNAPSHOT_MAX_DURATION_MS',120000,600000),
    connection: { options:'-c default_transaction_read_only=on',host,port: integer(environment,'ODOO_SOURCE_PORT',5432,65535),database: required(environment,'ODOO_SOURCE_DATABASE'),user: required(environment,'ODOO_SOURCE_USER'),password: required(environment,'ODOO_SOURCE_PASSWORD'),
      max: 1,connectionTimeoutMillis: integer(environment,'ODOO_SOURCE_CONNECT_TIMEOUT_MS',5000,30000),idleTimeoutMillis: 30000 } };
}
