import type { ControlMappingDefinition, ControlMappingRecord, SourceDefinition, SourceDefinitionRepository } from '@el-dabboos/domain';
import { validateControlMapping, validateSourceDefinition } from '@el-dabboos/domain';
import type { Pool, PoolClient } from 'pg';
/** Operational provisioning boundary; serving never discovers sources through this repository. */
export class PostgresSourceDefinitions implements SourceDefinitionRepository {
    constructor(private readonly pool: Pool) {}
    async create(source: SourceDefinition): Promise<void> {
        validateSourceDefinition(source);
        await controlSourceWrite(this.pool, async client => {
            await client.query('INSERT INTO control.source_definitions VALUES ($1,$2,$3,$4,$5)',[source.sourceId,source.tenantId,source.type,source.connectionRef,source.enabled]);
            for (const company of source.companyIds) await client.query('INSERT INTO control.source_company_scopes VALUES ($1,$2,$3)',[source.tenantId,source.sourceId,company]);
        });
    }
    async get(tenantId: string, sourceId: string): Promise<SourceDefinition | null> {
        const rows = await this.list(tenantId);
        return rows.find(source => source.sourceId === sourceId) ?? null;
    }
    async list(tenantId: string): Promise<SourceDefinition[]> {
        const rows = (await this.pool.query(`SELECT definition.*,array_agg(scope.company_id ORDER BY scope.company_id) company_ids
          FROM control.source_definitions definition LEFT JOIN control.source_company_scopes scope USING(tenant_id,source_id)
          WHERE definition.tenant_id=$1 GROUP BY definition.source_id ORDER BY definition.source_id`,[tenantId])).rows;
        return rows.map(row => {
            const value: SourceDefinition = { tenantId: row.tenant_id,sourceId: row.source_id,type: row.type,connectionRef: row.connection_ref,enabled: row.enabled,companyIds: row.company_ids };
            validateSourceDefinition(value);
            return value;
        });
    }
}
export class PostgresControlMappings {
    constructor(private readonly pool: Pool) {}
    async create(definition: ControlMappingDefinition): Promise<void> {
        validateControlMapping(definition);
        await controlSourceWrite(this.pool, async client => {
            await client.query(`INSERT INTO control.source_mappings(mapping_id,version,tenant_id,source_id,dataset_id,recipe,business_basis,reporting_currency,business_owner,lifecycle_status)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')`,[definition.mappingId,definition.version,definition.tenantId,definition.sourceId,definition.datasetId,definition.recipe,definition.businessBasis,definition.reportingCurrency,definition.businessOwner]);
            for (const measure of definition.measures) await client.query('INSERT INTO control.source_measure_mappings VALUES ($1,$2,$3)',[definition.mappingId,definition.version,measure]);
            for (const dimension of definition.dimensions) await client.query('INSERT INTO control.source_dimension_mappings VALUES ($1,$2,$3)',[definition.mappingId,definition.version,dimension]);
        });
    }
    async get(tenantId: string, mappingId: string, version: number): Promise<ControlMappingRecord | null> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
            const row = (await client.query('SELECT * FROM control.source_mappings WHERE tenant_id=$1 AND mapping_id=$2 AND version=$3',[tenantId,mappingId,version])).rows[0];
            if (!row) { await client.query('COMMIT'); return null; }
            const measures = (await client.query('SELECT canonical_measure FROM control.source_measure_mappings WHERE mapping_id=$1 AND version=$2 ORDER BY canonical_measure COLLATE "C"',[mappingId,version])).rows.map(stored => stored.canonical_measure);
            const dimensions = (await client.query('SELECT dimension FROM control.source_dimension_mappings WHERE mapping_id=$1 AND version=$2 ORDER BY dimension COLLATE "C"',[mappingId,version])).rows.map(stored => stored.dimension);
            const definition: ControlMappingDefinition = { mappingId,version,tenantId,sourceId: row.source_id,datasetId: row.dataset_id,recipe: row.recipe,businessBasis: row.business_basis,reportingCurrency: row.reporting_currency,businessOwner: row.business_owner,measures,dimensions };
            validateControlMapping(definition);
            await client.query('COMMIT');
            return { ...definition,status: row.lifecycle_status,...(row.evidence_ref ? { evidenceRef: row.evidence_ref } : {}) };
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
    }

}
async function controlSourceWrite(pool: Pool, operation: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(738421,11)');
        await operation(client);
        await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}
