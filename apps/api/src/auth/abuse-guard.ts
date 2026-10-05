import { createHash } from 'node:crypto';
/** Process-local bounded storage; replace this boundary with shared infrastructure before scaling. */
export class LoginAbuseGuard {
    private readonly records = new Map<string,{ count: number; until: number }>();
    private running = 0;
    constructor(private readonly now: () => number = Date.now) {}
    enter(address: string, login: string): (() => void) | null {
        const timestamp = this.now();
        for (const [key,record] of this.records) if (record.until<=timestamp) this.records.delete(key);
        const fingerprint = (value: string) => createHash('sha256').update(value).digest('hex');
        const keys = [[`ip:${fingerprint(address)}`,30],[`account:${fingerprint(login.trim().toLowerCase())}`,8],['global',200]] as const;
        if (this.running>=4 || this.records.size+keys.filter(([key]) => !this.records.has(key)).length>2000 || keys.some(([key,limit]) => (this.records.get(key)?.count ?? 0)>=limit)) return null;
        for (const [key] of keys) {
            const old = this.records.get(key);
            this.records.set(key,{ count: (old?.count ?? 0)+1,until: old?.until ?? timestamp+60_000 });
        }
        this.running++; let released = false;
        return () => { if (!released) { released = true; this.running--; } };
    }
}
