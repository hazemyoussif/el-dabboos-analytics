/** Build-time, reviewed API target. Empty uses the same-origin reverse proxy. */
export function validateApiBase(value: string | undefined): string {
    const base = value ?? '';
    if (base==='') return '';
    if (/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(base) && !base.endsWith('/')) return base;
    try {
        const url = new URL(base);
        const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
        if (url.origin===base && (url.protocol==='https:' || loopback && url.protocol==='http:')) return base;
    } catch { /* Build/startup errors never include the supplied value. */ }
    throw new Error('Invalid VITE_API_BASE_URL');
}
export function apiLocation(path: string, base = ''): string {
    if (!path.startsWith('/api/') || path.startsWith('//')) throw new Error('Invalid API path');
    return `${validateApiBase(base)}${path}`;
}
