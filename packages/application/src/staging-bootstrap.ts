import type { BootstrapPlaceholder, StagingBootstrapManifest, StagingBootstrapTransaction, StagingBootstrapUnitOfWork } from '@el-dabboos/domain';
import { validateStagingBootstrap } from '@el-dabboos/domain';
/** Offline deployment bootstrap reserves disabled subjects; it creates no authentication authority. */
export async function bootstrapStaging(unitOfWork: StagingBootstrapUnitOfWork, input: unknown) {
    validateStagingBootstrap(input);
    const canonical = canonicalManifest(input);
    return unitOfWork.write(async transaction => {
        const receipt = await transaction.receipt.get(input.bootstrapId);
        if (receipt!==null) {
            if (receipt!==canonical) throw new Error('Conflicting staging bootstrap');
            return { status: 'already_provisioned',bootstrapId: input.bootstrapId };
        }
        if (await transaction.administration.provisioning.bootstrapCompleted()) throw new Error('Control database already governed');
        await transaction.receipt.assertFresh();
        await initializeStaging(transaction,input);
        await transaction.receipt.create(input.bootstrapId,canonical);
        return { status: 'provisioned',bootstrapId: input.bootstrapId };
    });
}
function canonicalManifest(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonicalManifest).join(',')}]`;
    if (value && typeof value==='object') return `{${Object.entries(value).sort(([left],[right]) => left.localeCompare(right)).map(([key,item]) => `${JSON.stringify(key)}:${canonicalManifest(item)}`).join(',')}}`;
    return JSON.stringify(value);
}
async function reserveIdentity(transaction: StagingBootstrapTransaction, user: BootstrapPlaceholder, timestamp: string): Promise<void> {
    await transaction.administration.users.createUser({ id: user.userId,displayName: user.displayName,preferredLocale: user.preferredLocale,status: 'invited',version: 1,createdAt: timestamp,updatedAt: timestamp });
    await transaction.administration.users.bindIdentity({ id: user.identityId,userId: user.userId,provider: user.provider,providerSubject: user.providerSubject,status: 'disabled' });
}
async function initializeStaging(transaction: StagingBootstrapTransaction, manifest: StagingBootstrapManifest): Promise<void> {
    const timestamp = new Date().toISOString(), metadata = { version: 1,createdAt: timestamp,updatedAt: timestamp };
    const administration = transaction.administration;
    await administration.provisioning.initializeProtectedRoles(timestamp);
    await reserveIdentity(transaction,manifest.platformOperator,timestamp);
    const assignment = await administration.users.provisionPlatformAssignment({ ...metadata,userId: manifest.platformOperator.userId,status: 'suspended',roleIds: ['platform-admin'] },null);
    if (assignment.outcome!=='saved') throw new Error('Conflicting platform bootstrap');
    await administration.customers.createCustomer({ ...metadata,...manifest.customer,status: 'active' });
    await administration.customers.createTenant({ ...metadata,...manifest.tenant,customerId: manifest.customer.id,status: 'provisioning' });
    for (const user of manifest.tenantUsers) {
        await reserveIdentity(transaction,user,timestamp);
        await administration.tenants.createMembership({ ...metadata,id: crypto.randomUUID(),tenantId: manifest.tenant.id,userId: user.userId,status: 'suspended',roleIds: user.roleIds,dataScopes: [] });
    }
    for (const source of manifest.sources) await transaction.sources.create(source);
    await administration.provisioning.completeBootstrap(manifest.bootstrapId,timestamp);
    await administration.appendAudit({ actorUserId: manifest.platformOperator.userId,customerId: manifest.customer.id,tenantId: manifest.tenant.id,targetId: manifest.bootstrapId,action: 'platform.access_changed',timestamp,result: 'allowed' });
}
