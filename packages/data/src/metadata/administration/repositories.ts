import { tenantSourceSettingsRepository } from './source-settings.ts';
import { workspaceAiSettingsRepository } from './ai-settings.ts';
import { randomUUID } from 'node:crypto';
import type { AdministrationTransaction } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import { customersRepository } from './customers.ts';
import { dashboardsRepository } from './dashboards.ts';
import { directoryRepository } from './directory.ts';
import { metadataRows } from './mappers.ts';
import { tenantsRepository } from './tenants.ts';
import { usersRepository } from './users.ts';
export function administrationRepositories(connection: MetadataConnection, provisioning: AdministrationTransaction['provisioning']): AdministrationTransaction {
    const rows = metadataRows(connection);
    return {
        provisioning,
        sourceSettings: tenantSourceSettingsRepository(connection),
        aiSettings: workspaceAiSettingsRepository(connection),
        directory: directoryRepository(connection, rows),
        customers: customersRepository(connection, rows),
        users: usersRepository(connection, rows),
        tenants: tenantsRepository(connection, rows),
        dashboards: dashboardsRepository(connection, rows),
        appendAudit: async event => {
            await connection.insert('admin_audit_events', { event_id: randomUUID(), actor_user_id: event.actorUserId, tenant_id: event.tenantId, customer_id: event.customerId, target_id: event.targetId, action: event.action, result: event.result, occurred_at: event.timestamp });
        },
    };
}
