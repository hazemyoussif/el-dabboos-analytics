import type { SourceDefinition, SourceDefinitionRepository, StagingBootstrapTransaction, StagingBootstrapUnitOfWork } from '@el-dabboos/domain';
import { validateSourceDefinition } from '@el-dabboos/domain';
import type { Pool } from 'pg';
import { administrationRepositories } from '../metadata/administration/repositories.ts';
import type { MetadataConnection } from '../metadata/administration/connection.ts';
import { controlConnection } from './session.ts';
import { assertControlReady } from './migrations.ts';
import { initializeProtectedRoles } from './administration.ts';
/** One owner/connection covers receipt, administration and sources; nothing can partially bootstrap. */
export class PostgresStagingBootstrap implements StagingBootstrapUnitOfWork {
    constructor(private readonly pool: Pool) {}
    async write<T>(operation: (transaction: StagingBootstrapTransaction) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('SELECT pg_advisory_xact_lock(738421,11)');
            await client.query('SET LOCAL search_path=control,pg_catalog');
            await assertControlReady(client);
            const connection = controlConnection(client);
            const result = await operation(bootstrapRepositories(connection));
            await client.query('COMMIT'); return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
    }
}
function bootstrapRepositories(connection: MetadataConnection): StagingBootstrapTransaction {
    return {
        administration: administrationRepositories(connection, {
            bootstrapCompleted: async () => Boolean(await connection.one("SELECT 1 FROM bootstrap_state WHERE id='completed'")),
            initializeProtectedRoles: timestamp => initializeProtectedRoles(connection,timestamp),
            completeBootstrap: async (reference,timestamp) => { await connection.run('INSERT INTO bootstrap_state VALUES (?,?,?)','completed',reference,timestamp); },
            createAssignmentCandidate: async (tenantId,userId) => { await connection.run('INSERT INTO tenant_assignment_candidates VALUES (?,?)',tenantId,userId); },
        }),
        sources: sourceRepositories(connection),
        receipt: {
            assertFresh: async () => {
                for (const table of ['customers','users','roles','admin_audit_events','bootstrap_state','deployment_bootstraps']) if (await connection.one(`SELECT 1 FROM ${table} LIMIT 1`)) throw new Error('Bootstrap requires empty control metadata');
            },
            get: async id => { const row = await connection.one('SELECT manifest_json FROM deployment_bootstraps WHERE bootstrap_id=?',id); return row ? String(row.manifest_json) : null; },
            create: async (id,manifest) => { await connection.run('INSERT INTO deployment_bootstraps(bootstrap_id,manifest_json) VALUES (?,?)',id,manifest); },
        },
    };
}
function sourceRepositories(connection: MetadataConnection): SourceDefinitionRepository {
    const list = async (tenantId: string) => {
        const result: SourceDefinition[] = [];
        for (const row of await connection.all('SELECT * FROM source_definitions WHERE tenant_id=? ORDER BY source_id',tenantId)) {
            const scope = await connection.all('SELECT company_id FROM source_company_scopes WHERE tenant_id=? AND source_id=? ORDER BY company_id',tenantId,String(row.source_id));
            const source: SourceDefinition = { tenantId,sourceId: String(row.source_id),type: 'odoo-postgres',connectionRef: String(row.connection_ref),enabled: row.enabled===true,companyIds: scope.map(company => String(company.company_id)) };
            validateSourceDefinition(source); result.push(source);
        }
        return result;
    };
    return { list,get: async (tenantId,sourceId) => (await list(tenantId)).find(source => source.sourceId===sourceId) ?? null,
        create: async source => {
            validateSourceDefinition(source);
            await connection.run('INSERT INTO source_definitions VALUES (?,?,?,?,?::int=1)',source.sourceId,source.tenantId,source.type,source.connectionRef,source.enabled ? 1 : 0);
            for (const company of source.companyIds) await connection.run('INSERT INTO source_company_scopes VALUES (?,?,?)',source.tenantId,source.sourceId,company);
        },
    };
}
