import type { Locale } from '@el-dabboos/domain';
import type { DemoUser } from '../api/client.ts';
import type { AuthUser } from './client.ts';
import { authCopy } from './LoginForm.tsx';
export function AccountControls({ user,locale,onLogout,userId,demoUsers,onIdentity }: { user?: AuthUser; locale: Locale; onLogout?(all?: boolean): void; userId: string; demoUsers: DemoUser[]; onIdentity(id: string): void }) {
    if (user) return <div className="auth-account"><span>{user.displayName}</span><button onClick={() => onLogout?.()}>{authCopy[locale].logout}</button><button onClick={() => onLogout?.(true)}>{authCopy[locale].revoke}</button></div>;
    return <label className="topbar-control demo-identity"><span>{locale==='ar' ? 'هوية تجريبية' : 'Demo identity'}</span><select aria-label={locale==='ar' ? 'هوية تجريبية' : 'Demo identity'} value={userId} onChange={event => onIdentity(event.target.value)}>{demoUsers.map(demo => <option key={demo.id} value={demo.id}>{demo.displayName}</option>)}</select></label>;
}
export function AuthenticationNotice({ message }: { message?: string }) { return message ? <p role="alert">{message}</p> : null; }
