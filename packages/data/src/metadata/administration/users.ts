import type { IdentityBinding, MetadataWriteResult, PlatformAssignment, ProductUser, UserIdentityRepository } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function usersRepository(connection: MetadataConnection, rows: MetadataRows): UserIdentityRepository {
    const { one, all, run, insert, update, page } = connection;
    const { convert, getUser, getAssignment, identityFor } = rows;
    return { listUsers: async (pageRequest) => (await page('users', pageRequest, '', convert<ProductUser>)), getUser: async (id) => (await getUser(id)), createUser: async (user) => { (await insert('users', { ...user, version: 1 })); return (await getUser(user.id))!; }, updateUser: async (user, expectedVersion) => {
            const old = (await getUser(user.id));
            if (old && old.status !== 'invited' && user.status === 'invited')
                fail('INVALID_LIFECYCLE_TRANSITION');
            return (await update('users', user.id, { displayName: user.displayName, preferredLocale: user.preferredLocale, status: user.status, updatedAt: user.updatedAt }, expectedVersion, async () => (await getUser(user.id))));
        },
        getIdentity: async (id) => (await identityFor(id)), listIdentities: async (id) => (await all('SELECT * FROM identities WHERE user_id=? ORDER BY id', id)).map((convert<IdentityBinding>)), findIdentity: async (provider, subject) => { const record = (await one('SELECT * FROM identities WHERE provider=? AND provider_subject=?', provider, subject)); return record ? convert<IdentityBinding>(record) : null; }, bindIdentity: async (record) => { (await insert('identities', record)); return structuredClone(record); }, disableIdentity: async (id) => Boolean((await run("UPDATE identities SET status='disabled' WHERE id=? AND status='active'", id)).changes), membershipTenantIds: async (id) => (await all('SELECT tenant_id FROM memberships WHERE user_id=? ORDER BY tenant_id', id)).map(storedRow => String(storedRow.tenant_id)), getPlatformAssignment: async (id) => (await getAssignment(id)),
        provisionPlatformAssignment: async (record, expectedVersion) => {
            const { roleIds, ...rest } = record;
            let result: MetadataWriteResult<PlatformAssignment>;
            if (expectedVersion === null) {
                if ((await getAssignment(record.userId)))
                    return { outcome: 'conflict' };
                (await insert('platform_assignments', { ...rest, version: 1 }));
                result = { outcome: 'saved', value: record };
            }
            else
                result = (await update('platform_assignments', { id: record.userId, column: 'user_id' }, { status: record.status, updatedAt: record.updatedAt }, expectedVersion, async () => (await getAssignment(record.userId))));
            if (result.outcome === 'saved') {
                (await run('DELETE FROM platform_assignment_roles WHERE user_id=?', record.userId));
                for (const role_id of roleIds)
                    (await insert('platform_assignment_roles', { user_id: record.userId, role_id }));
                return { outcome: 'saved', value: (await getAssignment(record.userId))! };
            }
            return result;
        },
        activePlatformAdministratorUserIds: async () => (await all("SELECT DISTINCT productUser.id FROM users productUser JOIN platform_assignments platformAssignment ON platformAssignment.user_id=productUser.id JOIN platform_assignment_roles assignmentRole ON assignmentRole.user_id=platformAssignment.user_id JOIN roles role ON role.id=assignmentRole.role_id WHERE productUser.status='active' AND platformAssignment.status='active' AND role.scope='platform' AND role.system_key='platform_admin' AND role.protected=1 AND EXISTS(SELECT 1 FROM identities identity WHERE identity.user_id=productUser.id AND identity.status='active')")).map(record => String(record.id)),
    };
}
