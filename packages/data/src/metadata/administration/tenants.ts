import type { ProductUser, TenantAccessRole, TenantAdministrationRepository } from '@el-dabboos/domain';
import { AccessControlError, validateAccessRole } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function tenantsRepository(connection: MetadataConnection, rows: MetadataRows): TenantAdministrationRepository {
    const { one, all, run, insert, update, page } = connection;
    const { convert, getRole, roleValues, membership, membershipValues, getMembership, referenced } = rows;
    return { listAssignmentCandidates: async (tenantId) => all('SELECT u.* FROM users u JOIN tenant_assignment_candidates c ON c.user_id=u.id WHERE c.tenant_id=? ORDER BY u.id LIMIT 100', tenantId).map(convert<ProductUser>), listMemberships: async (tenantId, pageRequest) => page('memberships', pageRequest, tenantId, membership, 'tenant_id'), getMembership: async (tenantId, id) => getMembership(tenantId, id), createMembership: async (membership) => {
            if (one('SELECT 1 FROM memberships WHERE tenant_id=? AND user_id=?', membership.tenantId, membership.userId))
                fail('VERSION_CONFLICT');
            const rest = { id: membership.id, tenantId: membership.tenantId, userId: membership.userId, status: membership.status, version: membership.version, createdAt: membership.createdAt, updatedAt: membership.updatedAt };
            insert('memberships', { ...rest, version: 1 });
            membershipValues(membership);
            return getMembership(membership.tenantId, membership.id)!;
        },
        updateMembership: async (membership, value) => {
            const old = getMembership(membership.tenantId, membership.id);
            if (!old)
                return { outcome: 'not_found' };
            if (old.userId !== membership.userId)
                fail('IMMUTABLE_MEMBERSHIP_IDENTITY');
            const writeResult = update('memberships', membership.id, { status: membership.status, updatedAt: membership.updatedAt }, value, () => getMembership(membership.tenantId, membership.id));
            if (writeResult.outcome === 'saved') {
                membershipValues(membership);
                return { outcome: 'saved', value: getMembership(membership.tenantId, membership.id)! };
            }
            return writeResult;
        },
        listRoles: async (tenantId) => all("SELECT * FROM roles WHERE scope='tenant' AND (protected=1 OR tenant_id=?) ORDER BY id", tenantId).map(record => getRole(record) as TenantAccessRole),
        createCustomRole: async (role) => { validateAccessRole(role); const rest = { id: role.id, name: role.name, description: role.description, scope: role.scope, tenantId: role.tenantId, version: role.version, createdAt: role.createdAt, updatedAt: role.updatedAt }; insert('roles', { ...rest, protected: 0, version: 1 }); roleValues(role); return getRole(one('SELECT * FROM roles WHERE id=?', role.id)!) as TenantAccessRole; },
        updateCustomRole: async (role, value) => {
            validateAccessRole(role);
            const old = one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)", role.id, role.tenantId);
            if (!old)
                return { outcome: 'not_found' };
            if (old.protected === 1)
                fail('PROTECTED_ROLE');
            const writeResult = update('roles', role.id, { name: role.name, description: role.description, updatedAt: role.updatedAt }, value, () => getRole(one('SELECT * FROM roles WHERE id=?', role.id)!) as TenantAccessRole);
            if (writeResult.outcome === 'saved') {
                roleValues(role);
                return { outcome: 'saved', value: getRole(one('SELECT * FROM roles WHERE id=?', role.id)!) as TenantAccessRole };
            }
            return writeResult;
        },
        roleIsReferenced: async (tenantId, id) => referenced(tenantId, id), deleteUnassignedCustomRole: async (tenantId, id, value) => {
            const record = one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)", id, tenantId);
            if (!record)
                return 'not_found';
            if (record.protected === 1)
                return 'protected';
            if (record.version !== value)
                return 'conflict';
            if (referenced(tenantId, id))
                return 'in_use';
            run('DELETE FROM role_permissions WHERE role_id=?', id);
            run('DELETE FROM role_metric_domains WHERE role_id=?', id);
            run('DELETE FROM roles WHERE id=? AND tenant_id=? AND version=?', id, tenantId, value);
            return 'deleted';
        },
        activeAdministratorUserIds: async (tenantId) => all(`SELECT DISTINCT u.id FROM users u JOIN memberships m ON m.user_id=u.id JOIN membership_roles mr ON mr.membership_id=m.id AND mr.tenant_id=m.tenant_id JOIN roles r ON r.id=mr.role_id WHERE m.tenant_id=? AND u.status='active' AND m.status='active' AND r.scope='tenant' AND r.system_key='tenant_admin' AND r.protected=1 AND EXISTS(SELECT 1 FROM identities i WHERE i.user_id=u.id AND i.status='active') AND NOT EXISTS(SELECT 1 FROM membership_scopes s WHERE s.membership_id=m.id AND s.tenant_id=m.tenant_id)`, tenantId).map(record => String(record.id)),
    };
}
