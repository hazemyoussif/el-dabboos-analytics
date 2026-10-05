import { stagingIdentities } from '../../../packages/data/src/staging/roles.ts';
import type { StagingIdentity } from '../../../packages/data/src/staging/roles.ts';
export function stagingConnectionUrls(environment: Readonly<Record<string,string|undefined>>): Record<StagingIdentity,string> {
    const keys: Record<StagingIdentity,string> = { controlMigrator: 'CONTROL_MIGRATOR_URL',controlApp: 'CONTROL_DATABASE_URL',martMigrator: 'MART_MIGRATOR_URL',martIngestor: 'MART_INGESTOR_URL',martRuntime: 'MART_RUNTIME_URL' };
    const result = {} as Record<StagingIdentity,string>;
    for (const identity of Object.keys(stagingIdentities) as StagingIdentity[]) {
        const raw = environment[keys[identity]], expected = stagingIdentities[identity];
        try {
            const url = new URL(raw ?? '');
            if (!['postgres:','postgresql:'].includes(url.protocol) || url.pathname!==`/${expected.database}` || url.username!==expected.login || !url.password || url.hash) throw new Error();
            result[identity]=url.toString();
        } catch { throw new Error('Invalid staging database connection configuration'); }
    }
    if (new Set(Object.values(result).map(raw => decodeURIComponent(new URL(raw).password))).size!==5) throw new Error('Distinct staging credentials required');
    if (new Set(Object.values(result).map(raw => new URL(raw).host)).size!==1) throw new Error('Staging databases must share the approved endpoint');
    return result;
}

export function stagingAdminUrl(raw: string | undefined, endpoint: string): string {
    const url = new URL(raw ?? '');
    if (!['postgres:','postgresql:'].includes(url.protocol) || url.host!==new URL(endpoint).host || url.pathname!=='/postgres' || !url.password || url.hash) throw new Error('Invalid staging administrator endpoint');
    return url.toString();
}
