import type { DashboardFolder, DashboardLibraryPreference, DashboardLibraryRepository, DashboardLibraryScope } from '@el-dabboos/domain';
import type { MetadataConnection, MetadataRow } from '../metadata/administration/connection.ts';
const folder = (row: MetadataRow): DashboardFolder => ({ id: String(row.id), tenantId: String(row.tenant_id), ownerUserId: String(row.user_id), name: String(row.name), createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
const preference = (row: MetadataRow): DashboardLibraryPreference => ({ tenantId: String(row.tenant_id), userId: String(row.user_id), dashboardId: String(row.dashboard_id), favorite: row.favorite === 1, ...(row.folder_id === null ? {} : { folderId: String(row.folder_id) }) });
/** Already transaction-bound; folder deletion and preference detachment commit together. */
export class PostgresDashboardLibraryRepository implements DashboardLibraryRepository {
    constructor(private readonly connection: MetadataConnection) {}
    async listFolders(scope: DashboardLibraryScope) { return (await this.connection.all('SELECT * FROM dashboard_folders WHERE tenant_id=? AND user_id=? ORDER BY name,id',scope.tenantId,scope.userId)).map(folder); }
    async createFolder(value: DashboardFolder) {
        await this.connection.run('INSERT INTO dashboard_folders VALUES (?,?,?,?,?,?)',value.id,value.tenantId,value.ownerUserId,value.name,value.createdAt,value.updatedAt);
        return structuredClone(value);
    }
    async renameFolder(scope: DashboardLibraryScope, id: string, name: string, updatedAt: string) {
        const row = await this.connection.one('UPDATE dashboard_folders SET name=?,updated_at=? WHERE tenant_id=? AND user_id=? AND id=? RETURNING *',name,updatedAt,scope.tenantId,scope.userId,id);
        return row ? folder(row) : null;
    }
    async deleteFolder(scope: DashboardLibraryScope, id: string) {
        const removed = await this.connection.run('DELETE FROM dashboard_folders WHERE tenant_id=? AND user_id=? AND id=?',scope.tenantId,scope.userId,id);
        if (removed.changes) await this.connection.run('UPDATE dashboard_library_preferences SET folder_id=NULL WHERE tenant_id=? AND user_id=? AND folder_id=?',scope.tenantId,scope.userId,id);
        return Boolean(removed.changes);
    }
    async listPreferences(scope: DashboardLibraryScope) { return (await this.connection.all('SELECT * FROM dashboard_library_preferences WHERE tenant_id=? AND user_id=?',scope.tenantId,scope.userId)).map(preference); }
    async getPreference(scope: DashboardLibraryScope, id: string) {
        const row = await this.connection.one('SELECT * FROM dashboard_library_preferences WHERE tenant_id=? AND user_id=? AND dashboard_id=?',scope.tenantId,scope.userId,id);
        return row ? preference(row) : null;
    }
    async setPreference(value: DashboardLibraryPreference) {
        if (value.folderId && !await this.connection.one('SELECT 1 FROM dashboard_folders WHERE tenant_id=? AND user_id=? AND id=?',value.tenantId,value.userId,value.folderId)) return null;
        await this.connection.run('INSERT INTO dashboard_library_preferences VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,user_id,dashboard_id) DO UPDATE SET folder_id=excluded.folder_id,favorite=excluded.favorite',value.tenantId,value.userId,value.dashboardId,value.folderId ?? null,value.favorite ? 1 : 0);
        return structuredClone(value);
    }
}
