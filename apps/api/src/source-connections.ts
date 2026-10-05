import type { SourceDefinition } from '@el-dabboos/domain';
import { validateSourceDefinition } from '@el-dabboos/domain';
import type { OdooSourceConfig } from '@el-dabboos/data';
import { odooSourceConfig } from '@el-dabboos/data';
/** Deployment composition supplies typed connections. Unknown references never fall back to a default. */
export class SourceConnectionResolver {
    constructor(private readonly connections: ReadonlyMap<string, OdooSourceConfig['connection']>) {}
    resolve(source: SourceDefinition): OdooSourceConfig['connection'] {
        validateSourceDefinition(source);
        if (!source.enabled) throw new Error('Source disabled');
        const connection = this.connections.get(source.connectionRef);
        if (!connection) throw new Error('Unknown source connection reference');
        return { ...connection };
    }
}
/** Local shell/.env belongs to API composition. The source adapter receives only a typed config. */
export function localSourceResolver(environment: Readonly<Record<string,string|undefined>>, source: SourceDefinition): SourceConnectionResolver {
    validateSourceDefinition(source);
    if (source.connectionRef !== 'odoo-staging-main') throw new Error('Unknown local source connection reference');
    const config = odooSourceConfig({ ...environment, ODOO_SOURCE_COMPANY_IDS: source.companyIds.join(',') },source);
    return new SourceConnectionResolver(new Map([[source.connectionRef,config.connection]]));
}
/** Opt-in PostgreSQL authoring authority for offline extraction. No dashboard-serving dependency. */
export async function resolveOdooSourceConfig(environment: Readonly<Record<string,string|undefined>>, scope: { tenantId: string; sourceId: string }): Promise<OdooSourceConfig> {
    const provider = environment.CONTROL_PROVIDER ?? 'sqlite';
    if (!['sqlite','postgres'].includes(provider)) throw new Error('Invalid control provider');
    if (provider === 'sqlite') return odooSourceConfig(environment,scope);
    const { createControlPool, assertControlReady, verifyControlAppRole, PostgresSourceDefinitions } = await import('@el-dabboos/data');
    if (!environment.CONTROL_DATABASE_URL) throw new Error('Control database configuration required');
    const pool = createControlPool(environment.CONTROL_DATABASE_URL,1);
    try {
        await assertControlReady(pool);
        await verifyControlAppRole(pool);
        const source = await new PostgresSourceDefinitions(pool).get(scope.tenantId,scope.sourceId);
        if (!source) throw new Error('Source definition required');
        const config = odooSourceConfig({ ...environment,ODOO_SOURCE_COMPANY_IDS: source.companyIds.join(',') },scope);
        return { ...config,connection: localSourceResolver(environment,source).resolve(source) };
    } finally { await pool.end(); }
}
