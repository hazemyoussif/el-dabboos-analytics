import type { AccessDirectory, AdministrationTransaction, AdministrationUnitOfWork, DashboardLibraryRepository, TenantProfileProvider } from '@el-dabboos/domain';
import { getTenantProfile, validateTenantConfiguration } from '@el-dabboos/domain';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { SqliteDashboardLibraryRepository } from '../library-sqlite.ts';
import { metadataConnection } from './administration/connection.ts';
import { customersRepository } from './administration/customers.ts';
import { dashboardsRepository } from './administration/dashboards.ts';
import { directoryRepository } from './administration/directory.ts';
import { metadataRows } from './administration/mappers.ts';
import { tenantsRepository } from './administration/tenants.ts';
import { usersRepository } from './administration/users.ts';
import { seedProtectedAccessRoles } from './demo-seed.ts';
import { assertMetadataReady } from './migrations.ts';
const queues = new Map<string, Promise<unknown>>();
/** SQLite transaction implementation; only callbacks get write repositories. No HTTP exposes bootstrap ports. */
export class SqliteAdministrationStore implements AdministrationUnitOfWork {
    private readonly key: string;
    constructor(private readonly db: DatabaseSync) { db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000'); assertMetadataReady(db); const path = String(db.prepare('PRAGMA database_list').get()?.file ?? ''); this.key = path ? realpathSync(path) : randomUUID(); }
    private enqueue<T>(op: () => Promise<T>) { const result = (queues.get(this.key) ?? Promise.resolve()).then(op); queues.set(this.key, result.catch(() => { })); return result; }
    private transaction<T>(write: boolean, operation: (tenantId: AdministrationTransaction) => Promise<T>): Promise<T> {
        return this.enqueue(async () => {
            this.db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
            try {
                const result = await operation(this.repositories());
                this.db.exec('COMMIT');
                return result;
            }
            catch (error) {
                this.db.exec('ROLLBACK');
                throw error;
            }
        });
    }
    write<T>(op: (tenantId: AdministrationTransaction) => Promise<T>) { return this.transaction(true, op); }
    read<T>(op: (tenantId: AdministrationTransaction) => Promise<T>) { return this.transaction(false, op); }
    readonly directory: AccessDirectory = { tenantAccess: (id, tenantId) => this.read(transaction => transaction.directory.tenantAccess(id, tenantId)), platformAccess: id => this.read(transaction => transaction.directory.platformAccess(id)), listActiveMemberships: id => this.read(transaction => transaction.directory.listActiveMemberships(id)) };
    readonly library: DashboardLibraryRepository = {
        listFolders: snapshot => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).listFolders(snapshot)),
        createFolder: filter => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).createFolder(filter)),
        renameFolder: (snapshot, id, name, date) => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).renameFolder(snapshot, id, name, date)),
        deleteFolder: (snapshot, id) => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).deleteFolder(snapshot, id)),
        listPreferences: snapshot => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).listPreferences(snapshot)),
        getPreference: (snapshot, id) => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).getPreference(snapshot, id)),
        setPreference: page => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).setPreference(page)),
    };
    readonly profiles: TenantProfileProvider = { get: id => this.read(async (transaction) => {
            const tenant = await transaction.customers.getTenant(id);
            if (!tenant)
                return null;
            validateTenantConfiguration(tenant);
            return { ...(getTenantProfile(id) ?? { labels: { en: tenant.name, ar: tenant.name }, branchLabels: {}, exampleBranchIds: [] }), id, ...tenant.configuration };
        }) };
    private repositories(): AdministrationTransaction {
        const connection = metadataConnection(this.db), rows = metadataRows(connection);
        return {
            provisioning: {
                bootstrapCompleted: async () => Boolean(connection.one("SELECT 1 FROM bootstrap_state WHERE id='completed'")),
                initializeProtectedRoles: async (timestamp) => { seedProtectedAccessRoles(this.db, timestamp); },
                completeBootstrap: async (reference, timestamp) => { connection.run('INSERT INTO bootstrap_state(id,reference,completed_at) VALUES (?,?,?)', 'completed', reference, timestamp); },
                createAssignmentCandidate: async (tenantId, userId) => { connection.run('INSERT INTO tenant_assignment_candidates(tenant_id,user_id) VALUES (?,?)', tenantId, userId); },
            },
            directory: directoryRepository(connection, rows),
            customers: customersRepository(connection, rows),
            users: usersRepository(connection, rows),
            tenants: tenantsRepository(connection, rows),
            dashboards: dashboardsRepository(connection, rows),
            appendAudit: async (event) => { connection.insert('admin_audit_events', { event_id: randomUUID(), actor_user_id: event.actorUserId, tenant_id: event.tenantId, customer_id: event.customerId, target_id: event.targetId, action: event.action, result: event.result, occurred_at: event.timestamp }); },
        };
    }
}
