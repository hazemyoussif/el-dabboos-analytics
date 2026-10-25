import type { TenantSourceConnectionOption, TenantSourceSettings, SourceCompatibilityResult } from '@el-dabboos/domain';
import { createOdooSourcePool, inspectOdooSourceSettings } from '@el-dabboos/data';
import { ApiError } from '../errors.ts';
import { TenantSourceConnections } from './connections.ts';

export interface TenantSourceAdministration {
  connections(tenantId: string): TenantSourceConnectionOption[];
  inspect(tenantId: string, settings: TenantSourceSettings): Promise<SourceCompatibilityResult>;
}
export function createTenantSourceAdministration(environment: Readonly<Record<string, string | undefined>>): TenantSourceAdministration {
  const connections = new TenantSourceConnections(environment);
  let checking = false;
  return {
    connections: tenantId => connections.options(tenantId),
    inspect: async (tenantId, settings) => {
      if (checking) throw new ApiError(429, 'SOURCE_CHECK_BUSY', 'A source check is already running. Try again shortly.');
      checking = true;
      try {
        const pool = createOdooSourcePool(connections.resolve(tenantId, settings));
        try { return await inspectOdooSourceSettings(pool, settings); }
        finally { await pool.end(); }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return { compatible: false, issues: [{ code: 'connection_unavailable' }] };
      } finally { checking = false; }
    },
  };
}
