import type { TenantSourceSettingsRecord, TenantSourceSettingsRepository } from '@el-dabboos/domain';
import { validateTenantSourceSettings } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';

export function tenantSourceSettingsRepository(connection: MetadataConnection): TenantSourceSettingsRepository {
  const get = async (tenantId: string): Promise<TenantSourceSettingsRecord | null> => {
    const row = await connection.one('SELECT * FROM tenant_source_settings WHERE tenant_id=?', tenantId);
    if (!row) return null;
    const settings: unknown = JSON.parse(String(row.settings_json));
    validateTenantSourceSettings(settings);
    return { tenantId, settings, version: Number(row.version), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  };
  return { get, save: async (record, expectedVersion) => {
    validateTenantSourceSettings(record.settings);
    if (expectedVersion === null) {
      const result = await connection.run('INSERT INTO tenant_source_settings(tenant_id,settings_json,version,created_at,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(tenant_id) DO NOTHING', record.tenantId, JSON.stringify(record.settings), record.createdAt, record.updatedAt);
      const current = await get(record.tenantId);
      return result.changes && current ? { outcome: 'saved', value: current } : { outcome: 'conflict' };
    }
    return connection.update('tenant_source_settings', { id: record.tenantId, column: 'tenant_id' }, { settings_json: JSON.stringify(record.settings), updated_at: record.updatedAt }, expectedVersion, () => get(record.tenantId));
  } };
}
