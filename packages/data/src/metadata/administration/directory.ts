import { mapMetadataRows } from './connection.ts';
import type { AccessDirectory } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function directoryRepository(connection: MetadataConnection, rows: MetadataRows): AccessDirectory {
    const { one, all } = connection;
    const { getRole, membership, getCustomer, getTenant, getUser, getMembership, getAssignment, identityFor } = rows;
    return {
        tenantAccess: async (id, tenantId) => {
            const identity = (await identityFor(id));
            if (!identity)
                return null;
            const user = (await getUser(identity.userId)), tenant = (await getTenant(tenantId)), membership = (await getMembership(tenantId, String((await one('SELECT id FROM memberships WHERE tenant_id=? AND user_id=?', tenantId, identity.userId))?.id ?? '')));
            if (!user || !tenant || !membership)
                return null;
            const customer = (await getCustomer(tenant.customerId));
            if (!customer)
                return null;
            return { identity, user, tenant, customer, membership: membership, roles: await mapMetadataRows(membership.roleIds, async (role) => (await getRole((await one('SELECT * FROM roles WHERE id=?', role)) ?? fail('INVALID_ASSIGNMENT')))) };
        },
        platformAccess: async (id) => {
            const identity = (await identityFor(id));
            if (!identity)
                return null;
            const user = (await getUser(identity.userId)), assignment = (await getAssignment(identity.userId));
            return user && assignment ? { identity, user, assignment, roles: await mapMetadataRows(assignment.roleIds, async (role) => (await getRole((await one('SELECT * FROM roles WHERE id=?', role)) ?? fail('INVALID_ASSIGNMENT')))) } : null;
        },
        listActiveMemberships: async (id) => {
            const identity = (await identityFor(id));
            if (!identity || identity.status !== 'active' || (await getUser(identity.userId))?.status !== 'active')
                return [];
            return await mapMetadataRows((await all("SELECT membership.* FROM memberships membership JOIN tenants tenant ON tenant.id=membership.tenant_id JOIN customers customer ON customer.id=tenant.customer_id WHERE membership.user_id=? AND membership.status='active' AND tenant.status='active' AND customer.status='active' ORDER BY membership.id", identity.userId)), membership);
        },
    };
}
