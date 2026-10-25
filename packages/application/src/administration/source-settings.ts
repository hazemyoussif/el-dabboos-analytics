import type { ResolvedTenantAccess, TenantSourceSettings } from '@el-dabboos/domain';
import { validateTenantSourceSettings } from '@el-dabboos/domain';
import { authorizeTenantAdministration } from '../access-control.ts';
import type { AdministrationActor } from './commands.ts';
import { AdministrationRuntime, fail, saved } from './runtime.ts';

function authorizeSourceSettings(actor: ResolvedTenantAccess, tenantId: string) {
  authorizeTenantAdministration(actor, tenantId, 'tenant:manage');
  if (actor.context.authorization.enforcedFilters.length) fail('ADMIN_FORBIDDEN');
}
export async function getTenantSourceSettings(runtime: AdministrationRuntime, input: AdministrationActor) {
  return runtime.uow.write(async transaction => {
    authorizeSourceSettings(await runtime.tenantActor(transaction, input), input.tenantId);
    if (!transaction.sourceSettings) fail('SOURCE_SETTINGS_UNAVAILABLE');
    return transaction.sourceSettings.get(input.tenantId);
  });
}
export async function saveTenantSourceSettings(runtime: AdministrationRuntime, input: AdministrationActor, command: { settings: TenantSourceSettings; expectedVersion: number | null }) {
  return runtime.tenantWrite({ actor: input, action: 'source.settings_drafted', targetId: input.tenantId }, async (transaction, actor) => {
    authorizeSourceSettings(actor, input.tenantId);
    validateTenantSourceSettings(command.settings);
    if (!transaction.sourceSettings) fail('SOURCE_SETTINGS_UNAVAILABLE');
    if (command.expectedVersion !== null && (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1)) fail('INVALID_ADMIN_INPUT');
    const current = await transaction.sourceSettings.get(input.tenantId), now = runtime.clock().toISOString();
    const record = saved(await transaction.sourceSettings.save({ tenantId: input.tenantId, settings: structuredClone(command.settings), version: (current?.version ?? 0) + 1, createdAt: current?.createdAt ?? now, updatedAt: now }, command.expectedVersion));
    await runtime.audit(transaction, actor, 'source.settings_drafted', input.tenantId);
    return record;
  });
}
