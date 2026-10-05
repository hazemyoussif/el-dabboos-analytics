import type { AccessDirectory, AdministrationTransaction, AdministrationUnitOfWork, DashboardLibraryRepository, TenantProfileProvider } from '@el-dabboos/domain';
import { getTenantProfile, validateTenantConfiguration } from '@el-dabboos/domain';
import type { Pool } from 'pg';
import type { MetadataConnection } from '../metadata/administration/connection.ts';
import { administrationRepositories } from '../metadata/administration/repositories.ts';
import { protectedAccessRoles } from '../metadata/demo-seed.ts';
import { PostgresDashboardLibraryRepository } from './library.ts';
import { controlConnection } from './session.ts';
export class PostgresAdministrationStore implements AdministrationUnitOfWork {
    constructor(private readonly pool: Pool) {}
    /** Serialize administration writes to retain recovery/CAS decisions over fresh actors and targets. */
    private async transaction<T>(write: boolean, operation: (connection: MetadataConnection) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query(write ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
            await client.query('SET LOCAL search_path=control,pg_catalog');
            await client.query("SET LOCAL statement_timeout='15000ms'");
            if (write) await client.query('SELECT pg_advisory_xact_lock(738421,11)');
            const result = await operation(controlConnection(client));
            await client.query('COMMIT');
            return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
    }
    write<T>(operation: (transaction: AdministrationTransaction) => Promise<T>) { return this.transaction(true, connection => operation(this.repositories(connection))); }
    read<T>(operation: (transaction: AdministrationTransaction) => Promise<T>) { return this.transaction(false, connection => operation(this.repositories(connection))); }
    readonly directory: AccessDirectory = {
        tenantAccess: (id,tenantId) => this.read(transaction => transaction.directory.tenantAccess(id,tenantId)),
        platformAccess: id => this.read(transaction => transaction.directory.platformAccess(id)),
        listActiveMemberships: id => this.read(transaction => transaction.directory.listActiveMemberships(id)),
    };
    readonly profiles: TenantProfileProvider = { get: id => this.read(async transaction => {
        const tenant = await transaction.customers.getTenant(id);
        if (!tenant) return null;
        validateTenantConfiguration(tenant);
        return { ...(getTenantProfile(id) ?? { labels: { en: tenant.name, ar: tenant.name }, branchLabels: {}, exampleBranchIds: [] }), id, ...tenant.configuration };
    }) };
    readonly library: DashboardLibraryRepository = {
        listFolders: scope => this.transaction(false, connection => new PostgresDashboardLibraryRepository(connection).listFolders(scope)),
        createFolder: value => this.transaction(true, connection => new PostgresDashboardLibraryRepository(connection).createFolder(value)),
        renameFolder: (scope,id,name,date) => this.transaction(true, connection => new PostgresDashboardLibraryRepository(connection).renameFolder(scope,id,name,date)),
        deleteFolder: (scope,id) => this.transaction(true, connection => new PostgresDashboardLibraryRepository(connection).deleteFolder(scope,id)),
        listPreferences: scope => this.transaction(false, connection => new PostgresDashboardLibraryRepository(connection).listPreferences(scope)),
        getPreference: (scope,id) => this.transaction(false, connection => new PostgresDashboardLibraryRepository(connection).getPreference(scope,id)),
        setPreference: value => this.transaction(true, connection => new PostgresDashboardLibraryRepository(connection).setPreference(value)),
    };
    private repositories(connection: MetadataConnection): AdministrationTransaction {
        return administrationRepositories(connection, {
            bootstrapCompleted: async () => Boolean(await connection.one("SELECT 1 FROM bootstrap_state WHERE id='completed'")),
            initializeProtectedRoles: timestamp => initializeProtectedRoles(connection,timestamp),
            completeBootstrap: async (reference,timestamp) => { await connection.run('INSERT INTO bootstrap_state VALUES (?,?,?)','completed',reference,timestamp); },
            createAssignmentCandidate: async (tenantId,userId) => { await connection.run('INSERT INTO tenant_assignment_candidates VALUES (?,?)',tenantId,userId); },
        });
    }
}
async function initializeProtectedRoles(connection: MetadataConnection, timestamp: string): Promise<void> {
    for (const [id,name,scope,systemKey,permissions,domains] of protectedAccessRoles()) {
        await connection.insert('roles',{ id,name,description: 'Protected template',scope,protected: 1,systemKey,version: 1,createdAt: timestamp,updatedAt: timestamp });
        for (const permission of permissions) await connection.insert('role_permissions',{ role_id: id,permission });
        for (const domain of domains) await connection.insert('role_metric_domains',{ role_id: id,domain });
    }
}
