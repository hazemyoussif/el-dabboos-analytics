import { ConfigurationError } from './configuration-error.ts';
export interface DeploymentConfig {
    environment: 'development' | 'staging' | 'production';
    host: '127.0.0.1' | '0.0.0.0';
    identityMode: 'synthetic' | 'disabled';
    corsOrigins: readonly string[];
    operationalLogging: boolean;
}
export function parseDeploymentConfig(environment: Readonly<Record<string,string|undefined>>): DeploymentConfig {
    const mode = environment.ENVIRONMENT ?? 'development';
    if (!['development','staging','production'].includes(mode)) throw new ConfigurationError('ENVIRONMENT');
    const host = environment.API_HOST ?? (mode==='development' ? '127.0.0.1' : '0.0.0.0');
    if (!['127.0.0.1','0.0.0.0'].includes(host)) throw new ConfigurationError('API_HOST');
    const identityMode = environment.ACCESS_IDENTITY_MODE ?? (mode==='development' && (environment.CONTROL_PROVIDER ?? 'sqlite')==='sqlite' ? 'synthetic' : 'disabled');
    if (!['synthetic','disabled'].includes(identityMode) || identityMode==='synthetic' && (mode!=='development' || host!=='127.0.0.1')) throw new ConfigurationError('ACCESS_IDENTITY_MODE');
    if (mode!=='development') validateSharedDatabases(environment,mode);
    const corsOrigins = parseCorsOrigins(environment.CORS_ORIGINS,mode==='development');
    return { environment: mode as DeploymentConfig['environment'],host: host as DeploymentConfig['host'],identityMode: identityMode as DeploymentConfig['identityMode'],corsOrigins,operationalLogging: mode!=='development' };
}
export function parseCorsOrigins(raw: string | undefined, development = false): string[] {
    if (raw===undefined && development) return ['http://localhost:5173','http://127.0.0.1:5173'];
    if (!raw) throw new ConfigurationError('CORS_ORIGINS');
    const origins = raw.split(',').map(origin => origin.trim());
    if (!origins.length || origins.length>8 || new Set(origins).size!==origins.length) throw new ConfigurationError('CORS_ORIGINS');
    for (const origin of origins) {
        try {
            const url = new URL(origin);
            const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
            if (url.origin!==origin || url.username || url.password || (url.protocol!=='https:' && !(loopback && url.protocol==='http:'))) throw new Error();
        } catch { throw new ConfigurationError('CORS_ORIGINS'); }
    }
    return origins;
}
function validateSharedDatabases(environment: Readonly<Record<string,string|undefined>>, mode: string): void {
    if (environment.CONTROL_PROVIDER!=='postgres') throw new ConfigurationError('CONTROL_PROVIDER');
    if (environment.ANALYTICS_PROVIDER!=='postgres') throw new ConfigurationError('ANALYTICS_PROVIDER');
    for (const [key,database,login] of [['CONTROL_DATABASE_URL','el_dabboos_control_staging','staging_control_app_login'],['MART_RUNTIME_URL','el_dabboos_analytics_staging','staging_mart_runtime_login']]) {
        try {
            const url = new URL(environment[key!] ?? '');
            if (mode==='staging' && (url.pathname!==`/${database}` || url.username!==login || !url.password)) throw new Error();
        } catch { throw new ConfigurationError(key!); }
    }
}
