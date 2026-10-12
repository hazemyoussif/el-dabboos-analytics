import type { AccessControlledDashboardRecord, AccessRole, AdminAuditEvent, CustomerAccount, DashboardAccessState, IdentityBinding, ManagedMembership, ManagedTenant, PlatformAssignment, ProductUser, TenantAccessRole } from './access-control.ts';
import type { Locale, TenantProfile } from './contracts.ts';
import type { DashboardUpdate } from './dashboard-repository.ts';
export type MetadataWriteResult<T> = {
    outcome: 'saved';
    value: T;
} | {
    outcome: 'not_found' | 'conflict';
};
export interface PageRequest {
    limit: number;
    cursor?: string;
}
export interface MetadataPage<T> {
    items: readonly T[];
    nextCursor?: string;
}
/** Loaded in one consistent read; role IDs and selected membership are revalidated by application code. */
export interface TenantAccessSnapshot {
    customer: CustomerAccount;
    tenant: ManagedTenant;
    user: ProductUser;
    identity: IdentityBinding;
    membership: ManagedMembership;
    roles: readonly AccessRole[];
}
export interface PlatformAccessSnapshot {
    user: ProductUser;
    identity: IdentityBinding;
    assignment: PlatformAssignment;
    roles: readonly AccessRole[];
}
export interface AccessDirectory {
    /** Identity binding ID is supplied by a trusted authentication adapter, never a selected user header in production. */
    tenantAccess(identityId: string, tenantId: string): Promise<TenantAccessSnapshot | null>;
    platformAccess(identityId: string): Promise<PlatformAccessSnapshot | null>;
    listActiveMemberships(identityId: string): Promise<readonly ManagedMembership[]>;
}
export interface TenantProfileProvider {
    /** Loads approved configuration plus source-owned presentation labels; no readiness inferred from existence. */
    get(tenantId: string, locale: Locale): Promise<TenantProfile | null>;
}
export interface CustomerTenantRepository {
    listCustomers(page: PageRequest): Promise<MetadataPage<CustomerAccount>>;
    getCustomer(id: string): Promise<CustomerAccount | null>;
    createCustomer(record: CustomerAccount): Promise<CustomerAccount>;
    updateCustomer(record: CustomerAccount, expectedVersion: number): Promise<MetadataWriteResult<CustomerAccount>>;
    listTenants(customerId: string, page: PageRequest): Promise<MetadataPage<ManagedTenant>>;
    getTenant(id: string): Promise<ManagedTenant | null>;
    createTenant(record: ManagedTenant): Promise<ManagedTenant>;
    updateTenant(record: ManagedTenant, expectedVersion: number): Promise<MetadataWriteResult<ManagedTenant>>;
}
export interface UserIdentityRepository {
    listUsers(page: PageRequest): Promise<MetadataPage<ProductUser>>;
    getUser(id: string): Promise<ProductUser | null>;
    createUser(record: ProductUser): Promise<ProductUser>;
    updateUser(record: ProductUser, expectedVersion: number): Promise<MetadataWriteResult<ProductUser>>;
    getIdentity(id: string): Promise<IdentityBinding | null>;
    listIdentities(userId: string): Promise<readonly IdentityBinding[]>;
    findIdentity(provider: string, providerSubject: string): Promise<IdentityBinding | null>;
    /** Only trusted bootstrap/IdP integration may bind; no tenant-admin rebind endpoint. */
    bindIdentity(record: IdentityBinding): Promise<IdentityBinding>;
    disableIdentity(id: string): Promise<boolean>;
    /** Global suspension/recovery needs all affected tenant IDs, including suspended tenants. */
    membershipTenantIds(userId: string): Promise<readonly string[]>;
    getPlatformAssignment(userId: string): Promise<PlatformAssignment | null>;
    /** Operational bootstrap/recovery only; application endpoints do not expose this authority. */
    provisionPlatformAssignment(record: PlatformAssignment, expectedVersion: number | null): Promise<MetadataWriteResult<PlatformAssignment>>;
    activePlatformAdministratorUserIds(): Promise<readonly string[]>;
}
export interface TenantAdministrationRepository {
    listAssignmentCandidates(tenantId: string): Promise<readonly ProductUser[]>;
    listMemberships(tenantId: string, page: PageRequest): Promise<MetadataPage<ManagedMembership>>;
    getMembership(tenantId: string, id: string): Promise<ManagedMembership | null>;
    createMembership(record: ManagedMembership): Promise<ManagedMembership>;
    updateMembership(record: ManagedMembership, expectedVersion: number): Promise<MetadataWriteResult<ManagedMembership>>;
    listRoles(tenantId: string): Promise<readonly TenantAccessRole[]>;
    createCustomRole(record: TenantAccessRole & {
        protected: false;
    }): Promise<TenantAccessRole>;
    updateCustomRole(record: TenantAccessRole & {
        protected: false;
    }, expectedVersion: number): Promise<MetadataWriteResult<TenantAccessRole>>;
    /** Includes suspended memberships and pending invitations: no dangling future authority. */
    roleIsReferenced(tenantId: string, roleId: string): Promise<boolean>;
    deleteUnassignedCustomRole(tenantId: string, roleId: string, expectedVersion: number): Promise<'deleted' | 'not_found' | 'conflict' | 'in_use' | 'protected'>;
    /** Effective active users + memberships + identities holding protected tenant_admin; evaluated under write lock. */
    activeAdministratorUserIds(tenantId: string): Promise<readonly string[]>;
}
/** Application evaluates every candidate using current spec + resource policy before returning ANY list data. */
export interface GovernedDashboardRepository {
    listTenantCandidates(tenantId: string, page: PageRequest): Promise<MetadataPage<AccessControlledDashboardRecord>>;
    getTenantRecord(tenantId: string, id: string): Promise<AccessControlledDashboardRecord | null>;
    getAccess(tenantId: string, dashboardId: string): Promise<DashboardAccessState | null>;
    create(record: AccessControlledDashboardRecord): Promise<AccessControlledDashboardRecord>;
    updateOwned(input: DashboardUpdate): Promise<MetadataWriteResult<AccessControlledDashboardRecord>>;
    /** Atomic audience replacement + record-version increment; validate subjects within tenant in the transaction. */
    replaceAccess(state: DashboardAccessState, expectedVersion: number, updatedBy: string): Promise<MetadataWriteResult<DashboardAccessState>>;
}
export interface AdministrationTransaction {
    /** Operational persistence only; authorization and orchestration belong to application operations. */
    provisioning: {
        bootstrapCompleted(): Promise<boolean>;
        initializeProtectedRoles(timestamp: string): Promise<void>;
        completeBootstrap(reference: string, timestamp: string): Promise<void>;
        createAssignmentCandidate(tenantId: string, userId: string): Promise<void>;
    };
    /** Present when the control adapter supports local password credentials; participates in this transaction. */
    localCredentials?: { create(input: { userId:string; subject:string; displayName:string; email:string; passwordHash:string }): Promise<void> };
    directory: AccessDirectory;
    customers: CustomerTenantRepository;
    users: UserIdentityRepository;
    tenants: TenantAdministrationRepository;
    dashboards: GovernedDashboardRepository;
    /** Durable outbox/audit write in the same transaction; failure rolls back the mutation. */
    appendAudit(event: AdminAuditEvent): Promise<void>;
}
export interface AdministrationUnitOfWork {
    /** Serialize metadata writers. Reload actor/target and check versions, delegation and last-admin INSIDE callback.
     * User/identity suspension checks every affected tenant plus platform recovery before commit.
     * SQLite uses BEGIN IMMEDIATE; production adapter must provide equivalent serializable protection. */
    write<T>(operation: (transaction: AdministrationTransaction) => Promise<T>): Promise<T>;
}
