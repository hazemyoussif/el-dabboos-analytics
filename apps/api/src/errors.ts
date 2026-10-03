import { AccessControlError } from '@el-dabboos/domain';
import { DashboardLibraryError } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import { ProviderTransportError } from './providers/openai-compatible.ts';
import { AuthorizationError, DashboardPersistenceError, StructuredPlanningError, UnsupportedDemoIntentError } from '@el-dabboos/application';

export class ApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) { super(message); }
}
export const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AccessControlError) {
      const code = error.code;
      if (code === 'IDENTITY_REQUIRED') return reply.status(401).send({error:{code,message:'Trusted identity required.'}});
      const conflict = ['VERSION_CONFLICT','PROTECTED_ROLE','ROLE_IN_USE','LAST_ADMIN','STALE_DATA_SCOPE'];
      const invalid = /^(INVALID_|DUPLICATE_|IMMUTABLE_)/.test(code);
      const mapped = conflict.includes(code) ? code : code === 'NOT_FOUND' || code === 'DASHBOARD_NOT_FOUND' ? 'NOT_FOUND' : code === 'ADMIN_UNAVAILABLE' ? code : invalid ? 'INVALID_ADMIN_INPUT' : 'ACCESS_DENIED';
      return reply.status(conflict.includes(code) ? 409 : mapped === 'NOT_FOUND' ? 404 : mapped === 'ADMIN_UNAVAILABLE' ? 503 : invalid ? 400 : 403).send({error:{code:mapped,message:mapped.replaceAll('_',' ').toLowerCase()}});
    }
    if (object(error) && 'validation' in error && (request.url.startsWith('/api/platform/') || request.url.includes('/admin/'))) return reply.status(400).send({error:{code:'INVALID_ADMIN_INPUT',message:'Invalid administration input.'}});
    if ((request.url.startsWith('/api/platform/') || request.url.includes('/admin/')) && !(error instanceof ApiError) && !(error instanceof AuthorizationError) && !(object(error) && typeof error.statusCode === 'number' && error.statusCode < 500)) return reply.status(503).send({error:{code:'ADMIN_UNAVAILABLE',message:'Administration unavailable. No change was saved.'}});
    const rawStatus = object(error) ? error.statusCode : undefined;
    const parserStatus = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500 ? rawStatus : undefined;
    const status = error instanceof ApiError ? error.statusCode
      : error instanceof DashboardLibraryError ? error.code === 'FOLDER_NOT_FOUND' ? 404 : 400
      : error instanceof AuthorizationError ? 403
        : error instanceof DashboardPersistenceError ? error.code === 'DASHBOARD_NOT_FOUND' ? 404 : 409
          : error instanceof StructuredPlanningError || error instanceof UnsupportedDemoIntentError ? 422
            : error instanceof ProviderTransportError ? error.code === 'LLM_RATE_LIMITED' ? 429 : error.code === 'LLM_TIMEOUT' ? 504 : 502
              : parserStatus ?? (error instanceof Error && /Invalid|Unknown|Unsupported|requires|Duplicate|Incompatible/i.test(error.message) ? 400 : 500);
    const code = error instanceof DashboardLibraryError || error instanceof ApiError || error instanceof AuthorizationError || error instanceof DashboardPersistenceError
      ? error.code : error instanceof StructuredPlanningError || error instanceof UnsupportedDemoIntentError || error instanceof ProviderTransportError
        ? error.code : status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    reply.status(status).send({ error: { code, message: status === 500 ? 'Internal server error' : error instanceof Error ? error.message : String(error) } });
  });
}
