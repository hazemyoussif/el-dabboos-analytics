import type { MetadataWriteResult } from './administration-repository.ts';

export const sourceHeaderSlots = ['date', 'salesperson', 'untaxed', 'tax', 'total', 'updatedAt'] as const;
export type SourceHeaderMapping = Record<typeof sourceHeaderSlots[number], string>;
export interface TenantSourceSettings {
  sourceId: string;
  connectionRef: string;
  adapter: 'odoo-postgres';
  expectedMajor: 18;
  companyIds: string[];
  parameters: { batchSize: number; connectTimeoutMs: number; statementTimeoutMs: number; snapshotMaxDurationMs: number };
  mapping: {
    orders: SourceHeaderMapping;
    invoices: SourceHeaderMapping;
    businessLine: { table: string; id: string; label: string; updatedAt: string; orderField: string; invoiceField: string };
  };
}
/** Preparation only. No active flag, serving binding, credential or executable expression. */
export interface TenantSourceSettingsRecord {
  tenantId: string;
  settings: TenantSourceSettings;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface TenantSourceSettingsRepository {
  get(tenantId: string): Promise<TenantSourceSettingsRecord | null>;
  save(record: TenantSourceSettingsRecord, expectedVersion: number | null): Promise<MetadataWriteResult<TenantSourceSettingsRecord>>;
}
export interface TenantSourceConnectionOption { connectionRef: string; sourceId: string; companyIds: string[] }
export interface SourceCompatibilityIssue {
  code: 'missing_field' | 'field_type' | 'missing_relation' | 'odoo_version' | 'company_scope' | 'connection_unavailable';
  field?: string;
}
export interface SourceCompatibilityResult {
  compatible: boolean;
  issues: SourceCompatibilityIssue[];
  observedMajor?: number;
  instanceFingerprint?: string;
}
export function defaultTenantSourceSettings(): TenantSourceSettings {
  return {
    sourceId: '', connectionRef: '', adapter: 'odoo-postgres', expectedMajor: 18, companyIds: ['1'],
    parameters: { batchSize: 500, connectTimeoutMs: 5000, statementTimeoutMs: 15000, snapshotMaxDurationMs: 120000 },
    mapping: {
      orders: { date: 'date_order', salesperson: 'user_id', untaxed: 'amount_untaxed', tax: 'amount_tax', total: 'amount_total', updatedAt: 'write_date' },
      invoices: { date: 'invoice_date', salesperson: 'invoice_user_id', untaxed: 'amount_untaxed_signed', tax: 'amount_tax_signed', total: 'amount_total_signed', updatedAt: 'write_date' },
      businessLine: { table: 'business_line', id: 'id', label: 'name', updatedAt: 'write_date', orderField: 'business_line_id', invoiceField: 'business_line_id' },
    },
  };
}
function shape(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid source settings');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== keys.length || keys.some(key => !descriptors[key]?.enumerable || !Object.hasOwn(descriptors[key]!, 'value'))) throw new Error('Invalid source settings');
}
export const sourceSqlIdentifier = (value: unknown): value is string => typeof value === 'string' && /^(?!pg_)[a-z_][a-z0-9_]{0,62}$/.test(value);
function mappingFields(value: unknown, keys: readonly string[]) {
  shape(value, keys);
  if (Object.values(value).some(field => !sourceSqlIdentifier(field))) throw new Error('Invalid source mapping');
}
function validateParameters(value: unknown) {
  const bounds = { batchSize: [1, 1000], connectTimeoutMs: [100, 10000], statementTimeoutMs: [100, 15000], snapshotMaxDurationMs: [1000, 600000] } as const;
  shape(value, Object.keys(bounds));
  for (const [key, [minimum, maximum]] of Object.entries(bounds)) {
    const number = value[key];
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < minimum || number > maximum) throw new Error('Invalid source limits');
  }
}
export function validateTenantSourceSettings(value: unknown): asserts value is TenantSourceSettings {
  shape(value, ['sourceId', 'connectionRef', 'adapter', 'expectedMajor', 'companyIds', 'parameters', 'mapping']);
  const identifier = (input: unknown) => typeof input === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(input);
  if (!identifier(value.sourceId) || !identifier(value.connectionRef) || value.adapter !== 'odoo-postgres' || value.expectedMajor !== 18) throw new Error('Invalid source adapter');
  if (!Array.isArray(value.companyIds) || !value.companyIds.length || value.companyIds.length > 64 || value.companyIds.some(company => typeof company !== 'string' || !/^[1-9]\d{0,8}$/.test(company)) || new Set(value.companyIds).size !== value.companyIds.length) throw new Error('Invalid source company scope');
  validateParameters(value.parameters);
  shape(value.mapping, ['orders', 'invoices', 'businessLine']);
  mappingFields(value.mapping.orders, sourceHeaderSlots);
  mappingFields(value.mapping.invoices, sourceHeaderSlots);
  mappingFields(value.mapping.businessLine, ['table', 'id', 'label', 'updatedAt', 'orderField', 'invoiceField']);
}
