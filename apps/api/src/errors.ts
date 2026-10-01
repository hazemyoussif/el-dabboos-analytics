import type { FastifyInstance } from 'fastify';
import { ProviderTransportError } from './providers/openai-compatible.ts';
import { AuthorizationError, DashboardPersistenceError, StructuredPlanningError, UnsupportedDemoIntentError } from '@el-dabbous/application';

export class ApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) { super(message); }
}
export const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    const rawStatus = object(error) ? error.statusCode : undefined;
    const parserStatus = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500 ? rawStatus : undefined;
    const status = error instanceof ApiError ? error.statusCode
      : error instanceof AuthorizationError ? 403
        : error instanceof DashboardPersistenceError ? error.code === 'DASHBOARD_NOT_FOUND' ? 404 : 409
          : error instanceof StructuredPlanningError || error instanceof UnsupportedDemoIntentError ? 422
            : error instanceof ProviderTransportError ? error.code === 'LLM_TIMEOUT' ? 504 : 502
              : parserStatus ?? (error instanceof Error && /Invalid|Unknown|Unsupported|requires|Duplicate|Incompatible/i.test(error.message) ? 400 : 500);
    const code = error instanceof ApiError || error instanceof AuthorizationError || error instanceof DashboardPersistenceError
      ? error.code : error instanceof StructuredPlanningError || error instanceof UnsupportedDemoIntentError || error instanceof ProviderTransportError
        ? error.code : status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    reply.status(status).send({ error: { code, message: status === 500 ? 'Internal server error' : error instanceof Error ? error.message : String(error) } });
  });
}
