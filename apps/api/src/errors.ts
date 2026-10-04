import { AuthorizationError, DashboardLibraryError, DashboardPersistenceError, StructuredPlanningError, UnsupportedDemoIntentError } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import { ProviderTransportError } from './providers/openai-compatible.ts';
import { administrationHttpError } from './administration-errors.ts';
import { ApiError, object } from './http-error.ts';
export { ApiError, object } from './http-error.ts';
function providerStatus(error: ProviderTransportError): number {
  if (error.code === 'LLM_RATE_LIMITED') return 429;
  if (error.code === 'LLM_TIMEOUT') return 504;
  return 502;
}
function errorStatus(error: unknown): number {
  if (error instanceof ApiError) return error.statusCode;
  if (error instanceof DashboardLibraryError) return error.code === 'FOLDER_NOT_FOUND' ? 404 : 400;
  if (error instanceof AuthorizationError) return 403;
  if (error instanceof DashboardPersistenceError) return error.code === 'DASHBOARD_NOT_FOUND' ? 404 : 409;
  if (error instanceof StructuredPlanningError || error instanceof UnsupportedDemoIntentError) return 422;
  if (error instanceof ProviderTransportError) return providerStatus(error);
  const rawStatus = object(error) ? error.statusCode : undefined;
  if (typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500) return rawStatus;
  return messageStatus(error);
}
function errorCode(error: unknown, status: number): string {
  if (error instanceof DashboardLibraryError || error instanceof ApiError || error instanceof AuthorizationError || error instanceof DashboardPersistenceError || error instanceof StructuredPlanningError || error instanceof UnsupportedDemoIntentError || error instanceof ProviderTransportError) return error.code;
  return status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
}
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const administration = administrationHttpError(error, request.url);
    if (administration) return reply.status(administration.status).send({ error: { code: administration.code, message: administration.message } });
    const status = errorStatus(error), code = errorCode(error, status);
    reply.status(status).send({ error: { code, message: status === 500 ? 'Internal server error' : error instanceof Error ? error.message : String(error) } });
  });
}

/** Legacy validation-message compatibility belongs only to the HTTP error boundary. */
function messageStatus(error: unknown): number {
  return error instanceof Error && /Invalid|Unknown|Unsupported|requires|Duplicate|Incompatible/i.test(error.message) ? 400 : 500;
}
