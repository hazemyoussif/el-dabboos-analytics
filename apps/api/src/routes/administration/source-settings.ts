import type { FastifyInstance } from 'fastify';
import { defaultTenantSourceSettings, validateTenantSourceSettings } from '@el-dabboos/domain';
import type { RouteContext } from '../../context.ts';
import { ApiError, object } from '../../errors.ts';
import { administration, tenantActor } from './support.ts';

const validVersion = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
function settingsInput(body: unknown) {
  if (!object(body) || Object.keys(body).sort().join(',') !== 'expectedVersion,settings' || body.expectedVersion !== null && !validVersion(body.expectedVersion)) throw new ApiError(400, 'INVALID_SOURCE_SETTINGS', 'Review the source settings before saving.');
  try { validateTenantSourceSettings(body.settings); }
  catch { throw new ApiError(400, 'INVALID_SOURCE_SETTINGS', 'Review the connection reference, company scope, limits and field names.'); }
  return { settings: body.settings, expectedVersion: body.expectedVersion as number | null };
}
export function registerSourceSettingsRoutes(app: FastifyInstance, context: RouteContext) {
  const path = '/api/tenants/:tenantId/admin/source-settings';
  app.get<{ Params: { tenantId: string } }>(path, async request => {
    const record = await administration(context).getTenantSourceSettings(await tenantActor(context, request.headers, request.params.tenantId));
    return { record, defaults: defaultTenantSourceSettings(), connections: context.deps.tenantSourceAdministration?.connections(request.params.tenantId) ?? [], mode: 'draft' as const };
  });
  app.put<{ Params: { tenantId: string } }>(path, async request => {
    const actor = await tenantActor(context, request.headers, request.params.tenantId);
    await administration(context).getTenantSourceSettings(actor);
    return { record: await administration(context).saveTenantSourceSettings(actor, settingsInput(request.body)), mode: 'draft' as const };
  });
  app.post<{ Params: { tenantId: string } }>(path + '/check', async request => {
    const actor = await tenantActor(context, request.headers, request.params.tenantId);
    const record = await administration(context).getTenantSourceSettings(actor);
    if (!object(request.body) || Object.keys(request.body).join(',') !== 'expectedVersion' || !validVersion(request.body.expectedVersion)) throw new ApiError(400, 'INVALID_SOURCE_SETTINGS', 'Save a draft before checking it.');
    if (!record || record.version !== request.body.expectedVersion) throw new ApiError(409, 'VERSION_CONFLICT', 'The saved source draft changed. Reload before checking.');
    const runtime = context.deps.tenantSourceAdministration;
    if (!runtime) throw new ApiError(503, 'SOURCE_SETTINGS_UNAVAILABLE', 'Source checks are not configured.');
    const result = await runtime.inspect(actor.tenantId, record.settings);
    const current = await administration(context).getTenantSourceSettings(actor);
    if (current?.version !== record.version) throw new ApiError(409, 'VERSION_CONFLICT', 'The saved source draft changed during the check. Check the new version.');
    return { ...result, testedVersion: record.version, checkedAt: context.clock().toISOString(), activation: 'not_activated' as const };
  });
}
