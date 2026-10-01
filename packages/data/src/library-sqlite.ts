import type { DatabaseSync } from 'node:sqlite';
import type { DashboardFolder, DashboardLibraryPreference, DashboardLibraryRepository, DashboardLibraryScope } from '@el-dabbous/domain';
export function createDashboardLibrarySchema(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS dashboard_folders (
    id TEXT NOT NULL, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (tenant_id,user_id,id));
    CREATE TABLE IF NOT EXISTS dashboard_library_preferences (
    tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, folder_id TEXT,
    favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0,1)), PRIMARY KEY(tenant_id,user_id,dashboard_id));
    CREATE INDEX IF NOT EXISTS dashboard_library_folder ON dashboard_library_preferences(tenant_id,user_id,folder_id);`);
}
type Row = Record<string, unknown>;
const folder = (r: Row): DashboardFolder => ({ id: String(r.id), tenantId: String(r.tenant_id), ownerUserId: String(r.user_id), name: String(r.name), createdAt: String(r.created_at), updatedAt: String(r.updated_at) });
const preference = (r: Row): DashboardLibraryPreference => ({ tenantId: String(r.tenant_id), userId: String(r.user_id), dashboardId: String(r.dashboard_id), favorite: r.favorite === 1, ...(r.folder_id === null ? {} : { folderId: String(r.folder_id) }) });
export class SqliteDashboardLibraryRepository implements DashboardLibraryRepository {
  constructor(private readonly db: DatabaseSync) {}
  async listFolders(s: DashboardLibraryScope) { return this.db.prepare('SELECT * FROM dashboard_folders WHERE tenant_id=? AND user_id=? ORDER BY name,id').all(s.tenantId, s.userId).map(folder); }
  async createFolder(f: DashboardFolder) { this.db.prepare('INSERT INTO dashboard_folders VALUES (?,?,?,?,?,?)').run(f.id,f.tenantId,f.ownerUserId,f.name,f.createdAt,f.updatedAt); return structuredClone(f); }
  async renameFolder(s: DashboardLibraryScope, id: string, name: string, updatedAt: string) {
    const row = this.db.prepare('UPDATE dashboard_folders SET name=?,updated_at=? WHERE tenant_id=? AND user_id=? AND id=? RETURNING *').get(name,updatedAt,s.tenantId,s.userId,id);
    return row ? folder(row) : null;
  }
  async deleteFolder(s: DashboardLibraryScope, id: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const removed = this.db.prepare('DELETE FROM dashboard_folders WHERE tenant_id=? AND user_id=? AND id=?').run(s.tenantId,s.userId,id).changes;
      if (removed) this.db.prepare('UPDATE dashboard_library_preferences SET folder_id=NULL WHERE tenant_id=? AND user_id=? AND folder_id=?').run(s.tenantId,s.userId,id);
      this.db.exec('COMMIT'); return Boolean(removed);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async listPreferences(s: DashboardLibraryScope) { return this.db.prepare('SELECT * FROM dashboard_library_preferences WHERE tenant_id=? AND user_id=?').all(s.tenantId,s.userId).map(preference); }
  async getPreference(s: DashboardLibraryScope, id: string) { const r = this.db.prepare('SELECT * FROM dashboard_library_preferences WHERE tenant_id=? AND user_id=? AND dashboard_id=?').get(s.tenantId,s.userId,id); return r ? preference(r) : null; }
  async setPreference(p: DashboardLibraryPreference) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (p.folderId && !this.db.prepare('SELECT 1 FROM dashboard_folders WHERE tenant_id=? AND user_id=? AND id=?').get(p.tenantId,p.userId,p.folderId)) { this.db.exec('ROLLBACK'); return null; }
      this.db.prepare(`INSERT INTO dashboard_library_preferences VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,user_id,dashboard_id) DO UPDATE SET folder_id=excluded.folder_id,favorite=excluded.favorite`).run(p.tenantId,p.userId,p.dashboardId,p.folderId ?? null,p.favorite ? 1 : 0);
      this.db.exec('COMMIT'); return structuredClone(p);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
