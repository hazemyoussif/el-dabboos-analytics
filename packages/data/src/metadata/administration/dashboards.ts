import type { GovernedDashboardRepository } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function dashboardsRepository(connection: MetadataConnection, rows: MetadataRows): GovernedDashboardRepository {
    const { run, insert, update, page } = connection;
    const { dashboard, getAccess, getRecord } = rows;
    return { listTenantCandidates: async (tenantId, pageRequest) => (await page('dashboard_records', pageRequest, tenantId, dashboard, 'tenant_id')), getTenantRecord: async (tenantId, id) => (await getRecord(tenantId, id)), getAccess: async (tenantId, id) => (await getAccess(tenantId, id)),
        create: async (record) => { const { spec, ...rest } = record; (await insert('dashboard_records', { ...rest, spec_json: JSON.stringify(spec), version: 1 })); return (await getRecord(record.tenantId, record.id))!; }, updateOwned: async (record) => {
            const old = (await getRecord(record.tenantId, record.id));
            if (!old || old.ownerUserId !== record.ownerUserId)
                return { outcome: 'not_found' };
            return (await update('dashboard_records', record.id, { spec_json: JSON.stringify(record.spec), updatedBy: record.updatedBy, updatedAt: record.updatedAt }, record.expectedVersion, async () => (await getRecord(record.tenantId, record.id))));
        },
        replaceAccess: async (record, expectedVersion, actor) => {
            if (record.scope !== 'restricted' && record.grants.length)
                fail('INVALID_GRANTS');
            if (!(await getRecord(record.tenantId, record.dashboardId)))
                return { outcome: 'not_found' };
            const writeResult = (await update('dashboard_records', record.dashboardId, { scope: record.scope, updatedBy: actor, updatedAt: new Date().toISOString() }, expectedVersion, async () => (await getAccess(record.tenantId, record.dashboardId))));
            if (writeResult.outcome !== 'saved')
                return writeResult;
            (await run('DELETE FROM dashboard_grants WHERE tenant_id=? AND dashboard_id=?', record.tenantId, record.dashboardId));
            for (const grant of record.grants)
                (await insert('dashboard_grants', { tenant_id: record.tenantId, dashboard_id: record.dashboardId, subject_type: grant.subjectType, subject_id: grant.subjectId, access: grant.access, role_id: grant.subjectType === 'role' ? grant.subjectId : null, membership_id: grant.subjectType === 'membership' ? grant.subjectId : null }));
            return { outcome: 'saved', value: (await getAccess(record.tenantId, record.dashboardId))! };
        },
    };
}
