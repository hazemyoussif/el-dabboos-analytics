import type { IdentityBinding, MetadataWriteResult, PlatformAssignment, ProductUser, UserIdentityRepository } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function usersRepository(connection: MetadataConnection, rows: MetadataRows): UserIdentityRepository {
    const { one, all, run, insert, update, page } = connection;
    const { convert, getUser, getAssignment, identityFor } = rows;
    return { listUsers: async (pageRequest) => page('users', pageRequest, '', convert<ProductUser>), getUser: async (id) => getUser(id), createUser: async (user) => { insert('users', { ...user, version: 1 }); return getUser(user.id)!; }, updateUser: async (user, value) => {
            const old = getUser(user.id);
            if (old && old.status !== 'invited' && user.status === 'invited')
                fail('INVALID_LIFECYCLE_TRANSITION');
            return update('users', user.id, { displayName: user.displayName, preferredLocale: user.preferredLocale, status: user.status, updatedAt: user.updatedAt }, value, () => getUser(user.id));
        },
        getIdentity: async (id) => identityFor(id), listIdentities: async (id) => all('SELECT * FROM identities WHERE user_id=? ORDER BY id', id).map(convert<IdentityBinding>), findIdentity: async (provider, subject) => { const record = one('SELECT * FROM identities WHERE provider=? AND provider_subject=?', provider, subject); return record ? convert<IdentityBinding>(record) : null; }, bindIdentity: async (record) => { insert('identities', record); return structuredClone(record); }, disableIdentity: async (id) => Boolean(run("UPDATE identities SET status='disabled' WHERE id=? AND status='active'", id).changes), membershipTenantIds: async (id) => all('SELECT tenant_id FROM memberships WHERE user_id=? ORDER BY tenant_id', id).map(value => String(value.tenant_id)), getPlatformAssignment: async (id) => getAssignment(id),
        provisionPlatformAssignment: async (record, value) => {
            const { roleIds, ...rest } = record;
            let result: MetadataWriteResult<PlatformAssignment>;
            if (value === null) {
                if (getAssignment(record.userId))
                    return { outcome: 'conflict' };
                insert('platform_assignments', { ...rest, version: 1 });
                result = { outcome: 'saved', value: record };
            }
            else
                result = update('platform_assignments', { id: record.userId, column: 'user_id' }, { status: record.status, updatedAt: record.updatedAt }, value, () => getAssignment(record.userId));
            if (result.outcome === 'saved') {
                run('DELETE FROM platform_assignment_roles WHERE user_id=?', record.userId);
                for (const role_id of roleIds)
                    insert('platform_assignment_roles', { user_id: record.userId, role_id });
                return { outcome: 'saved', value: getAssignment(record.userId)! };
            }
            return result;
        },
        activePlatformAdministratorUserIds: async () => all(`SELECT DISTINCT u.id FROM users u JOIN platform_assignments a ON a.user_id=u.id JOIN platform_assignment_roles ar ON ar.user_id=a.user_id JOIN roles r ON r.id=ar.role_id WHERE u.status='active' AND a.status='active' AND r.scope='platform' AND r.system_key='platform_admin' AND r.protected=1 AND EXISTS(SELECT 1 FROM identities i WHERE i.user_id=u.id AND i.status='active')`).map(record => String(record.id)),
    };
}
