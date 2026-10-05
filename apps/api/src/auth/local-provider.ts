import { betterAuth } from 'better-auth';
import { createAuthenticationPool } from '@el-dabboos/data';
import type { AuthenticationDirectory, ExternalAuthenticationProvider } from '@el-dabboos/domain';
import type { LocalAuthConfig } from './config.ts';
/** Framework owns cryptography and sessions; this adapter exposes only provider + stable subject. */
export function createLocalAuth(pool: ReturnType<typeof createAuthenticationPool>, directory: AuthenticationDirectory, config: LocalAuthConfig) {
    return betterAuth({
        baseURL: config.baseUrl,basePath: '/api/auth',secret: config.secret,database: pool,
        trustedOrigins: [...config.origins],logger: { disabled: true },telemetry: { enabled: false },
        emailAndPassword: { enabled: true,disableSignUp: true,minPasswordLength: 8,maxPasswordLength: 1024,autoSignIn: false },
        account: { accountLinking: { enabled: false } },
        session: { expiresIn: 8*60*60,disableSessionRefresh: true,cookieCache: { enabled: false } },
        advanced: { useSecureCookies: config.secure,cookiePrefix: 'dabboos',defaultCookieAttributes: { httpOnly: true,sameSite: 'lax',path: '/' },ipAddress: { disableIpTracking: true } },
        rateLimit: { enabled: false }, // Bounded account/IP/global gate owns abuse checks before framework hashing.
        databaseHooks: { session: { create: { before: async session => {
            const principal = await directory.resolve({ provider: 'local',subject: session.userId });
            if (principal?.user.status!=='active' || principal.binding.status!=='active') return false;
            return { data: { ...session,ipAddress: null,userAgent: null } };
        } } } },
    });
}
export type LocalAuth = ReturnType<typeof createLocalAuth>;
export class BetterAuthLocalProvider implements ExternalAuthenticationProvider {
    constructor(private readonly auth: LocalAuth) {}
    async authenticate(cookie: string | undefined) {
        if (!cookie) return null;
        const session = await this.auth.api.getSession({ headers: new Headers({ cookie }),query: { disableCookieCache: true } });
        return session ? { provider: 'local',subject: session.user.id } : null;
    }
}
