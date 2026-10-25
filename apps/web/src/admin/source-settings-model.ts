import type { TenantSourceSettingsRecord } from '@el-dabboos/domain';

/** A portable handoff of the saved draft; never a serving release or credentials export. */
export function sourceSettingsHandoff(record: TenantSourceSettingsRecord) {
  return { schemaVersion: 1, mode: 'draft', tenantId: record.tenantId, version: record.version, updatedAt: record.updatedAt, settings: structuredClone(record.settings) };
}
export function downloadSourceSettings(record: TenantSourceSettingsRecord) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(sourceSettingsHandoff(record), null, 2) + '\n'], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'source-settings-draft.json'; anchor.click();
  URL.revokeObjectURL(url);
}
