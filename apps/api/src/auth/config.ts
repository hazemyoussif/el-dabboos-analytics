import { ConfigurationError } from '../configuration-error.ts';
import { parseCorsOrigins } from '../deployment-config.ts';
export interface LocalAuthConfig { baseUrl: string; secret: string; secure: boolean; origins: readonly string[] }
export function parseLocalAuthConfig(environment: Readonly<Record<string,string|undefined>>): LocalAuthConfig | null {
    if (environment.ACCESS_IDENTITY_MODE!=='local') return null;
    if (environment.CONTROL_PROVIDER!=='postgres') throw new ConfigurationError('CONTROL_PROVIDER');
    const baseUrl = environment.AUTH_BASE_URL;
    const origins = parseCorsOrigins(environment.CORS_ORIGINS);
    if (!baseUrl || !parseCorsOrigins(baseUrl).includes(baseUrl) || !origins.includes(baseUrl)) throw new ConfigurationError('AUTH_BASE_URL');
    const secure = new URL(baseUrl).protocol==='https:';
    if ((environment.ENVIRONMENT ?? 'development')!=='development' && !secure) throw new ConfigurationError('AUTH_BASE_URL');
    const secret = environment.AUTH_SECRET;
    if (!secret || secret.length<32 || secret.length>512 || /\s/.test(secret)) throw new ConfigurationError('AUTH_SECRET');
    return { baseUrl,secret,secure,origins };
}
