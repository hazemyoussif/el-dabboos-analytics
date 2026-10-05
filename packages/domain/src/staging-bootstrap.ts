import type { AdministrationTransaction } from './administration-repository.ts';
import type { ManagedTenant } from './access-control.ts';
import type { SourceDefinition, SourceDefinitionRepository } from './source-control.ts';
import { validateSourceDefinition } from './source-control.ts';
import { validateTenantConfiguration } from './access-control.ts';
export interface StagingBootstrapManifest {
    bootstrapId: string;
    customer: { id: string; name: string };
    tenant: { id: string; name: string; configuration: ManagedTenant['configuration'] };
    platformOperator: BootstrapPlaceholder;
    tenantUsers: readonly (BootstrapPlaceholder & { roleIds: readonly ('admin' | 'analyst' | 'viewer')[] })[];
    sources: readonly SourceDefinition[];
}
export interface BootstrapPlaceholder { userId: string; identityId: string; displayName: string; preferredLocale: 'en' | 'ar'; provider: 'pending-idp'; providerSubject: string }
export interface StagingBootstrapTransaction {
    administration: AdministrationTransaction;
    sources: SourceDefinitionRepository;
    receipt: { assertFresh(): Promise<void>; get(id: string): Promise<string | null>; create(id: string, manifest: string): Promise<void> };
}
export interface StagingBootstrapUnitOfWork { write<T>(operation: (transaction: StagingBootstrapTransaction) => Promise<T>): Promise<T> }
function object(value: unknown, fields: string[]): asserts value is Record<string,unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== fields.sort().join(',')) throw new Error('Invalid staging bootstrap shape');
}
function identifier(value: unknown): asserts value is string {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(value)) throw new Error('Invalid bootstrap identifier');
}
function label(value: unknown): void {
    if (typeof value !== 'string' || !value.trim() || value.length>200 || (/[\r\n]/u.test(value) || value.includes(String.fromCharCode(0)))) throw new Error('Invalid bootstrap label');
}
function placeholder(value: unknown, tenantUser = false): asserts value is BootstrapPlaceholder {
    object(value,['userId','identityId','displayName','preferredLocale','provider','providerSubject',...(tenantUser ? ['roleIds'] : [])]);
    for (const key of ['userId','identityId','providerSubject']) identifier(value[key]);
    label(value.displayName);
    if (value.provider!=='pending-idp' || !['en','ar'].includes(String(value.preferredLocale))) throw new Error('Bootstrap requires an inactive IdP placeholder');
}
export function validateStagingBootstrap(value: unknown): asserts value is StagingBootstrapManifest {
    object(value,['bootstrapId','customer','tenant','platformOperator','tenantUsers','sources']);
    identifier(value.bootstrapId);
    object(value.customer,['id','name']); identifier(value.customer.id); label(value.customer.name);
    object(value.tenant,['id','name','configuration']); identifier(value.tenant.id); label(value.tenant.name);
    object(value.tenant.configuration,['countryCode','reportingCurrency','timeZone','arabicDialect','defaultLocale']);
    validateTenantConfiguration({ id: value.tenant.id,name: String(value.tenant.name),customerId: value.customer.id,status: 'provisioning',configuration: value.tenant.configuration as ManagedTenant['configuration'],version: 1,createdAt: '',updatedAt: '' });
    placeholder(value.platformOperator);
    validateBootstrapAssignments(value);
}
function validateBootstrapAssignments(value: Record<string,unknown>): void {
    if (!Array.isArray(value.tenantUsers) || !value.tenantUsers.length || value.tenantUsers.length>20 || !Array.isArray(value.sources) || !value.sources.length || value.sources.length>20) throw new Error('Invalid bootstrap assignments');
    validateUsers(value.tenantUsers);
    const users = [value.platformOperator as BootstrapPlaceholder,...value.tenantUsers];
    for (const field of ['userId','identityId','providerSubject'] as const) if (new Set(users.map(user => user[field])).size!==users.length) throw new Error('Duplicate bootstrap identity');
    if (!value.tenantUsers.some(user => user.roleIds.includes('admin'))) throw new Error('Initial tenant admin required');
    const tenant = value.tenant as { id: string };
    for (const source of value.sources) { validateSourceDefinition(source); if (source.tenantId!==tenant.id) throw new Error('Invalid bootstrap source ownership'); }
    if (new Set(value.sources.map(source => source.sourceId)).size!==value.sources.length) throw new Error('Duplicate bootstrap source');
}
function validateUsers(users: unknown[]): void {
    for (const user of users) {
        placeholder(user,true);
        const roles = (user as BootstrapPlaceholder & { roleIds: unknown }).roleIds;
        if (!Array.isArray(roles) || !roles.length || new Set(roles).size!==roles.length || roles.some(role => !['admin','analyst','viewer'].includes(role))) throw new Error('Invalid bootstrap roles');
    }
}
