import type { WorkspaceAiSettingsRecord, WorkspaceAiSettingsRepository } from '@el-dabboos/domain';
import { validateWorkspaceAiSettings } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
export function workspaceAiSettingsRepository(connection: MetadataConnection): WorkspaceAiSettingsRepository {
  const get = async (tenantId: string): Promise<WorkspaceAiSettingsRecord | null> => {
    const row = await connection.one('SELECT * FROM workspace_ai_settings WHERE tenant_id=?', tenantId);
    if (!row) return null;
    const settings: unknown = JSON.parse(String(row.settings_json));
    validateWorkspaceAiSettings(settings);
    return { tenantId, settings, encryptedApiKey: row.encrypted_api_key == null ? null : String(row.encrypted_api_key), version: Number(row.version), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  };
  return { get, save: async (record, expectedVersion) => {
    validateWorkspaceAiSettings(record.settings);
    if (expectedVersion === null) {
      const result = await connection.run('INSERT INTO workspace_ai_settings(tenant_id,settings_json,encrypted_api_key,version,created_at,updated_at) VALUES (?,?,?,1,?,?) ON CONFLICT(tenant_id) DO NOTHING', record.tenantId, JSON.stringify(record.settings), record.encryptedApiKey ?? null, record.createdAt, record.updatedAt);
      const current = await get(record.tenantId);
      return result.changes && current ? { outcome: 'saved', value: current } : { outcome: 'conflict' };
    }
    return connection.update('workspace_ai_settings', { id: record.tenantId, column: 'tenant_id' }, { settings_json: JSON.stringify(record.settings), encrypted_api_key: record.encryptedApiKey ?? null, updated_at: record.updatedAt }, expectedVersion, () => get(record.tenantId));
  } };
}
