import type { DatabaseSync } from 'node:sqlite';
import type { DashboardRecord, DashboardRepository, DashboardUpdate } from '@el-dabboos/domain';

interface RecordRow {
  id: string; tenant_id: string; owner_user_id: string; scope: DashboardRecord['scope']; spec_json: string;
  version: number; created_by: string; updated_by: string; created_at: string; updated_at: string;
}
const fromRow = (row: RecordRow): DashboardRecord => ({ id: row.id, tenantId: row.tenant_id, ownerUserId: row.owner_user_id,
  scope: row.scope, spec: JSON.parse(row.spec_json) as DashboardRecord['spec'], version: row.version,
  createdBy: row.created_by, updatedBy: row.updated_by, createdAt: row.created_at, updatedAt: row.updated_at });
export function createDashboardPersistenceSchema(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS dashboard_records (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, owner_user_id TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('private', 'tenant')), spec_json TEXT NOT NULL,
    version INTEGER NOT NULL CHECK(version >= 1), created_by TEXT NOT NULL, updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS dashboard_records_tenant_access ON dashboard_records(tenant_id, scope, owner_user_id, updated_at);`);
}
export class SqliteDashboardRepository implements DashboardRepository {
  constructor(private readonly db: DatabaseSync) {}
  async listAccessible(tenantId: string, userId: string): Promise<DashboardRecord[]> {
    const rows = this.db.prepare(`SELECT * FROM dashboard_records WHERE tenant_id = ? AND (scope = 'tenant' OR owner_user_id = ?)
      ORDER BY updated_at DESC, id`).all(tenantId, userId) as unknown as RecordRow[];
    return rows.map(fromRow);
  }
  async getAccessible(id: string, tenantId: string, userId: string): Promise<DashboardRecord | null> {
    const row = this.db.prepare(`SELECT * FROM dashboard_records WHERE id = ? AND tenant_id = ? AND (scope = 'tenant' OR owner_user_id = ?)`)
      .get(id, tenantId, userId) as RecordRow | undefined;
    return row ? fromRow(row) : null;
  }
  async create(record: DashboardRecord): Promise<DashboardRecord> {
    this.db.prepare(`INSERT INTO dashboard_records
      (id, tenant_id, owner_user_id, scope, spec_json, version, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(record.id, record.tenantId, record.ownerUserId, record.scope,
      JSON.stringify(record.spec), record.version, record.createdBy, record.updatedBy, record.createdAt, record.updatedAt);
    return structuredClone(record);
  }
  async updateOwned(input: DashboardUpdate): Promise<DashboardRecord | 'conflict' | null> {
    const result = this.db.prepare(`UPDATE dashboard_records SET spec_json = ?, version = version + 1, updated_by = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ? AND owner_user_id = ? AND version = ?`)
      .run(JSON.stringify(input.spec), input.updatedBy, input.updatedAt, input.id, input.tenantId, input.ownerUserId, input.expectedVersion);
    if (result.changes > 0) return this.getAccessible(input.id, input.tenantId, input.ownerUserId);
    const row = this.db.prepare('SELECT version FROM dashboard_records WHERE id = ? AND tenant_id = ? AND owner_user_id = ?')
      .get(input.id, input.tenantId, input.ownerUserId);
    return row ? 'conflict' : null;
  }
}
