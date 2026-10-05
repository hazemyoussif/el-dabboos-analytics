/** Control authoring metadata. Published mart releases remain independent serving authority. */
export interface SourceDefinition {
    sourceId: string;
    tenantId: string;
    type: 'odoo-postgres';
    connectionRef: string;
    enabled: boolean;
    companyIds: readonly string[];
}
export interface SourceDefinitionRepository {
    create(source: SourceDefinition): Promise<void>;
    get(tenantId: string, sourceId: string): Promise<SourceDefinition | null>;
    list(tenantId: string): Promise<SourceDefinition[]>;
}
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(value);
export function validateSourceDefinition(value: SourceDefinition): void {
    if (!value || Object.keys(value).sort().join(',') !== 'companyIds,connectionRef,enabled,sourceId,tenantId,type' ||
        !identifier(value.sourceId) || !identifier(value.tenantId) || !identifier(value.connectionRef) ||
        value.type !== 'odoo-postgres' || typeof value.enabled !== 'boolean') throw new Error('Invalid source definition');
    if (!Array.isArray(value.companyIds) || !value.companyIds.length || value.companyIds.length > 64 ||
        value.companyIds.some(company => typeof company !== 'string' || !/^[1-9]\d{0,18}$/.test(company)) || new Set(value.companyIds).size !== value.companyIds.length) throw new Error('Invalid source company scope');
}
export const governedOdooMeasures = ['order_revenue','order_count','cancelled_orders','net_invoiced_revenue','invoiced_revenue','refund_value','invoice_count','refund_count'] as const;
export const governedOdooDimensions = ['customer','salesperson','business_line','city','state'] as const;
export interface ControlMappingDefinition {
    mappingId: string;
    sourceId: string;
    tenantId: string;
    datasetId: string;
    version: number;
    recipe: 'odoo-comparison-v1';
    businessBasis: string;
    reportingCurrency: 'IQD' | 'EGP';
    businessOwner: string;
    measures: readonly typeof governedOdooMeasures[number][];
    dimensions: readonly typeof governedOdooDimensions[number][];
}
export type ControlMappingStatus = 'draft' | 'candidate' | 'reconciled' | 'approved' | 'published';
export interface ControlMappingRecord extends ControlMappingDefinition {
    status: ControlMappingStatus;
    evidenceRef?: string;
}
/** Select a versioned adapter recipe; never store SQL, JavaScript or expression text. */
export function validateControlMapping(value: ControlMappingDefinition): void {
    if (!value || Object.keys(value).sort().join(',') !== 'businessBasis,businessOwner,datasetId,dimensions,mappingId,measures,recipe,reportingCurrency,sourceId,tenantId,version' ||
        ![value.mappingId,value.sourceId,value.tenantId,value.datasetId,value.businessOwner].every(identifier) ||
        !Number.isSafeInteger(value.version) || value.version < 1 || value.recipe !== 'odoo-comparison-v1' ||
        !['IQD','EGP'].includes(value.reportingCurrency) || typeof value.businessBasis !== 'string' || !value.businessBasis.trim() || value.businessBasis.length > 1000) throw new Error('Invalid control mapping');
    validateMappingSelections(value);
}
function validateMappingSelections(value: ControlMappingDefinition): void {
    if (!Array.isArray(value.measures) || !value.measures.length || value.measures.some(measure => !governedOdooMeasures.includes(measure)) || new Set(value.measures).size !== value.measures.length) throw new Error('Invalid governed measures');
    if (!Array.isArray(value.dimensions) || value.dimensions.some(dimension => !governedOdooDimensions.includes(dimension)) || new Set(value.dimensions).size !== value.dimensions.length) throw new Error('Invalid governed dimensions');
}
