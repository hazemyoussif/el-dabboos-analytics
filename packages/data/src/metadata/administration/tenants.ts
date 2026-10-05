import { mapMetadataRows } from './connection.ts';
import type { ProductUser, TenantAccessRole, TenantAdministrationRepository } from '@el-dabboos/domain';
import { AccessControlError, validateAccessRole } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function tenantsRepository(connection: MetadataConnection, rows: MetadataRows): TenantAdministrationRepository {
    const { one, all, run, insert, update, page } = connection;
    const { convert, getRole, roleValues, membership, membershipValues, getMembership, referenced } = rows;
    return { listAssignmentCandidates: async (tenantId) => (await all("SELECT productUser.* FROM users productUser JOIN tenant_assignment_candidates candidate ON candidate.user_id=productUser.id WHERE candidate.tenant_id=? ORDER BY productUser.id LIMIT 100", tenantId)).map((convert<ProductUser>)), listMemberships: async (tenantId, pageRequest) => (await page('memberships', pageRequest, tenantId, membership, 'tenant_id')), getMembership: async (tenantId, id) => (await getMembership(tenantId, id)), createMembership: async (membership) => {
            if ((await one('SELECT 1 FROM memberships WHERE tenant_id=? AND user_id=?', membership.tenantId, membership.userId)))
                fail('VERSION_CONFLICT');
            const rest = { id: membership.id, tenantId: membership.tenantId, userId: membership.userId, status: membership.status, version: membership.version, createdAt: membership.createdAt, updatedAt: membership.updatedAt };
            (await insert('memberships', { ...rest, version: 1 }));
            (await membershipValues(membership));
            return (await getMembership(membership.tenantId, membership.id))!;
        },
        updateMembership: async (membership, expectedVersion) => {
            const old = (await getMembership(membership.tenantId, membership.id));
            if (!old)
                return { outcome: 'not_found' };
            if (old.userId !== membership.userId)
                fail('IMMUTABLE_MEMBERSHIP_IDENTITY');
            const writeResult = (await update('memberships', membership.id, { status: membership.status, updatedAt: membership.updatedAt }, expectedVersion, async () => (await getMembership(membership.tenantId, membership.id))));
            if (writeResult.outcome === 'saved') {
                (await membershipValues(membership));
                return { outcome: 'saved', value: (await getMembership(membership.tenantId, membership.id))! };
            }
            return writeResult;
        },
        listRoles: async (tenantId) => await mapMetadataRows((await all("SELECT * FROM roles WHERE scope='tenant' AND (protected=1 OR tenant_id=?) ORDER BY id", tenantId)), async (record) => (await getRole(record)) as TenantAccessRole),
        createCustomRole: async (role) => { validateAccessRole(role); const rest = { id: role.id, name: role.name, description: role.description, scope: role.scope, tenantId: role.tenantId, version: role.version, createdAt: role.createdAt, updatedAt: role.updatedAt }; (await insert('roles', { ...rest, protected: 0, version: 1 })); (await roleValues(role)); return (await getRole((await one('SELECT * FROM roles WHERE id=?', role.id))!)) as TenantAccessRole; },
        updateCustomRole: async (role, expectedVersion) => {
            validateAccessRole(role);
            const old = (await one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)", role.id, role.tenantId));
            if (!old)
                return { outcome: 'not_found' };
            if (old.protected === 1)
                fail('PROTECTED_ROLE');
            const writeResult = (await update('roles', role.id, { name: role.name, description: role.description, updatedAt: role.updatedAt }, expectedVersion, async () => (await getRole((await one('SELECT * FROM roles WHERE id=?', role.id))!)) as TenantAccessRole));
            if (writeResult.outcome === 'saved') {
                (await roleValues(role));
                return { outcome: 'saved', value: (await getRole((await one('SELECT * FROM roles WHERE id=?', role.id))!)) as TenantAccessRole };
            }
            return writeResult;
        },
        roleIsReferenced: async (tenantId, id) => (await referenced(tenantId, id)), deleteUnassignedCustomRole: async (tenantId, id, expectedVersion) => {
            const record = (await one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)", id, tenantId));
            if (!record)
                return 'not_found';
            if (record.protected === 1)
                return 'protected';
            if (record.version !== expectedVersion)
                return 'conflict';
            if ((await referenced(tenantId, id)))
                return 'in_use';
            (await run('DELETE FROM role_permissions WHERE role_id=?', id));
            (await run('DELETE FROM role_metric_domains WHERE role_id=?', id));
            (await run('DELETE FROM roles WHERE id=? AND tenant_id=? AND version=?', id, tenantId, expectedVersion));
            return 'deleted';
        },
        activeAdministratorUserIds: async (tenantId) => (await all("SELECT DISTINCT productUser.id FROM users productUser JOIN memberships membership ON membership.user_id=productUser.id JOIN membership_roles membershipRole ON membershipRole.membership_id=membership.id AND membershipRole.tenant_id=membership.tenant_id JOIN roles role ON role.id=membershipRole.role_id WHERE membership.tenant_id=? AND productUser.status='active' AND membership.status='active' AND role.scope='tenant' AND role.system_key='tenant_admin' AND role.protected=1 AND EXISTS(SELECT 1 FROM identities identity WHERE identity.user_id=productUser.id AND identity.status='active') AND NOT EXISTS(SELECT 1 FROM membership_scopes dataScope WHERE dataScope.membership_id=membership.id AND dataScope.tenant_id=membership.tenant_id)", tenantId)).map(record => String(record.id)), };
}
