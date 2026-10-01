import type { FastifyInstance } from 'fastify';
import type { ApiDependencies } from '../context.ts';
async function available(check: () => Promise<boolean>): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([Promise.resolve().then(check), new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 2000); })]); }
  catch { return false; }
  finally { clearTimeout(timeout); }
}
export function registerHealthRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  // /health remains a compatibility liveness alias.
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async (_request, reply) => {
    const [persistence, analytics] = await Promise.all([
      deps.dashboardRepository && deps.readiness ? available(deps.readiness.persistence) : Promise.resolve(false),
      deps.readiness?.analytics ? available(deps.readiness.analytics) : Promise.resolve(undefined),
    ]);
    const ready = persistence && analytics !== false;
    return reply.status(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', checks: {
      persistence: persistence ? 'available' : 'unavailable', analytics: analytics === undefined ? 'not_checked' : analytics ? 'available' : 'unavailable',
    } });
  });
}
