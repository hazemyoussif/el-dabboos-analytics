import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
export function correlationId(value: unknown): string {
    return typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value) ? value : randomUUID();
}
export function registerOperationalLogging(app: FastifyInstance, write?: (line: string) => void): void {
    app.addHook('onRequest', async (request,reply) => { reply.header('x-request-id',request.id); });
    if (write) app.addHook('onResponse', async (request,reply) => {
        write(JSON.stringify({ component: 'api',event: 'request_completed',requestId: request.id,route: request.routeOptions.url ?? 'unmatched',method: request.method,status: reply.statusCode,durationMs: Math.round(reply.elapsedTime) }));
    });
}
