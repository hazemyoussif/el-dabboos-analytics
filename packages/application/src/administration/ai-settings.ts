import type { ResolvedTenantAccess, WorkspaceAiSettings } from '@el-dabboos/domain';
import { validateWorkspaceAiSettings } from '@el-dabboos/domain';
import { authorizeTenantAdministration } from '../access-control.ts';
import type { AdministrationActor } from './commands.ts';
import { AdministrationRuntime, fail, saved } from './runtime.ts';
function authorizeAiSettings(actor: ResolvedTenantAccess, tenantId: string) {
  authorizeTenantAdministration(actor, tenantId, 'tenant:manage');
  if (actor.context.authorization.enforcedFilters.length) fail('ADMIN_FORBIDDEN');
}
export async function getWorkspaceAiSettings(runtime: AdministrationRuntime, input: AdministrationActor) {
  return runtime.uow.write(async transaction => {
    authorizeAiSettings(await runtime.tenantActor(transaction, input), input.tenantId);
    if (!transaction.aiSettings) fail('AI_SETTINGS_UNAVAILABLE');
    return transaction.aiSettings.get(input.tenantId);
  });
}
export async function saveWorkspaceAiSettings(runtime: AdministrationRuntime, input: AdministrationActor, command: { settings: WorkspaceAiSettings; expectedVersion: number | null; encryptedApiKey?: string | null }) {
  return runtime.tenantWrite({ actor: input, action: 'ai.settings_changed', targetId: input.tenantId }, async (transaction, actor) => {
    authorizeAiSettings(actor, input.tenantId);
    validateWorkspaceAiSettings(command.settings);
    if (!transaction.aiSettings) fail('AI_SETTINGS_UNAVAILABLE');
    if (command.expectedVersion !== null && (!Number.isInteger(command.expectedVersion) || command.expectedVersion < 1)) fail('INVALID_ADMIN_INPUT');
    const current = await transaction.aiSettings.get(input.tenantId);
    const endpointUnchanged = current?.settings.provider === command.settings.provider && current.settings.baseUrl === command.settings.baseUrl;
    const encryptedApiKey = command.encryptedApiKey !== undefined ? command.encryptedApiKey : endpointUnchanged ? current?.encryptedApiKey ?? null : null;
    const now = runtime.clock().toISOString();
    const record = saved(await transaction.aiSettings.save({ tenantId: input.tenantId, settings: command.settings, encryptedApiKey, version: (current?.version ?? 0) + 1, createdAt: current?.createdAt ?? now, updatedAt: now }, command.expectedVersion));
    await runtime.audit(transaction, actor, 'ai.settings_changed', input.tenantId);
    return record;
  });
}
