import { apiLocation,validateApiBase } from '../api/api-location.ts';
export interface AuthUser { id: string; displayName: string; preferredLocale: 'en'|'ar' }
const base = validateApiBase((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL);
export async function authenticationRequest<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(apiLocation(`/api/auth/${path}`,base),{ method: body===undefined ? 'GET' : 'POST',credentials: 'include',...(body===undefined ? {} : { headers: { 'content-type': 'application/json' },body: JSON.stringify(body) }) });
    if (!response.ok) throw new Error(response.status===429 ? 'limited' : response.status===401 ? 'unauthenticated' : 'unavailable');
    return response.json() as Promise<T>;
}
