import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { LocalAuthenticationRuntime } from './runtime.ts';
import { LoginAbuseGuard } from './abuse-guard.ts';
import { ApiError } from '../errors.ts';
export function registerLocalAuthentication(app: FastifyInstance, runtime: LocalAuthenticationRuntime): void {
    const abuse = new LoginAbuseGuard();
    app.addHook('onRequest',async request => {
        if (!['GET','HEAD','OPTIONS'].includes(request.method) && !runtime.config.origins.includes(String(request.headers.origin ?? ''))) throw new ApiError(403,'ORIGIN_REQUIRED','Approved origin required.');
    });
    app.get('/api/auth/me',async (request,reply) => {
        reply.header('cache-control','no-store');
        const { user } = await runtime.principal(request.headers);
        return { user: { id: user.id,displayName: user.displayName,preferredLocale: user.preferredLocale } };
    });
    app.post('/api/auth/login',{ bodyLimit: 8192 },async (request,reply) => {
        const body = loginBody(request.body);
        const release = abuse.enter(request.ip,body.email);
        if (!release) throw new ApiError(429,'LOGIN_LIMITED','Try again later.');
        try {
            const response = await frameworkRequest(runtime,request,'sign-in/email',body);
            if (!response.ok) { await runtime.directory.record('login_failed'); throw new ApiError(401,'LOGIN_FAILED','Unable to sign in.'); }
            const result = await response.json() as { user: { id: string } };
            const principal = await runtime.directory.resolve({ provider: 'local',subject: result.user.id });
            if (principal?.user.status!=='active' || principal.binding.status!=='active') { await runtime.directory.revoke(result.user.id); throw new ApiError(401,'LOGIN_FAILED','Unable to sign in.'); }
            try { await runtime.directory.record('login_succeeded',principal.user.id); }
            catch { await runtime.directory.revoke(result.user.id); throw new ApiError(503,'AUTH_UNAVAILABLE','Sign in unavailable.'); }
            forwardCookies(response,reply); reply.header('cache-control','no-store');
            return { user: { id: principal.user.id,displayName: principal.user.displayName,preferredLocale: principal.user.preferredLocale } };
        } finally { release(); }
    });
    app.post('/api/auth/logout',async (request,reply) => {
        const principal = await runtime.principal(request.headers).catch(() => null);
        const response = await frameworkRequest(runtime,request,'sign-out',{});
        if (!response.ok) throw new ApiError(503,'AUTH_UNAVAILABLE','Sign out unavailable.');
        await runtime.directory.record('logout',principal?.user.id); forwardCookies(response,reply); return { success: true };
    });
    app.post('/api/auth/revoke-sessions',async request => {
        const principal = await runtime.principal(request.headers);
        await runtime.directory.revoke(principal.binding.providerSubject);
        await runtime.directory.record('sessions_revoked',principal.user.id); return { success: true };
    });
}
function loginBody(value: unknown): { email: string; password: string } {
    if (!value || typeof value!=='object' || Object.keys(value).sort().join(',')!=='email,password') throw new ApiError(401,'LOGIN_FAILED','Unable to sign in.');
    const body = value as Record<string,unknown>;
    if (typeof body.email!=='string' || body.email.length>254 || typeof body.password!=='string' || body.password.length>1024) throw new ApiError(401,'LOGIN_FAILED','Unable to sign in.');
    return { email: body.email.trim().toLowerCase(),password: body.password };
}
function frameworkRequest(runtime: LocalAuthenticationRuntime, request: FastifyRequest, path: string, body: unknown): Promise<Response> {
    const headers = new Headers({ 'content-type': 'application/json',origin: String(request.headers.origin) });
    if (typeof request.headers.cookie==='string') headers.set('cookie',request.headers.cookie);
    return runtime.auth.handler(new Request(`${runtime.config.baseUrl}/api/auth/${path}`,{ method: 'POST',headers,body: JSON.stringify(body) }));
}
function forwardCookies(response: Response, reply: FastifyReply): void { reply.header('set-cookie',response.headers.getSetCookie()); }
