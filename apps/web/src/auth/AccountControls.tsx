import {LogOut} from 'lucide-react';
import type { Locale } from '@el-dabboos/domain';
import type { DemoUser } from '../api/client.ts';
import type { AuthUser } from './client.ts';
import { accountLabel } from './account-label.ts';
import { authCopy } from './LoginForm.tsx';
export function AccountControls({ user,locale,onLogout,userId,demoUsers,onIdentity }: { user?: AuthUser; locale: Locale; onLogout?(all?: boolean): void; userId: string; demoUsers: DemoUser[]; onIdentity(id: string): void }) {
    const name = user ? accountLabel(user,locale) : undefined;
    if (user) return <div className="auth-account topbar-control"><span className="account-name" title={name}>{name}</span><div className="account-actions"><button type="button" className="button-ghost account-logout" aria-label={authCopy[locale].logout} onClick={() => onLogout?.()}><LogOut aria-hidden="true"/><span>{authCopy[locale].logout}</span></button><button type="button" className="button-icon button-ghost" title={authCopy[locale].revoke} aria-label={authCopy[locale].revoke} onClick={() => onLogout?.(true)}><LogOut aria-hidden="true"/><span className="sr-only">{authCopy[locale].revoke}</span></button></div></div>;
    return <label className="topbar-control demo-identity"><span>{locale==='ar' ? 'هوية تجريبية' : 'Demo identity'}</span><select aria-label={locale==='ar' ? 'هوية تجريبية' : 'Demo identity'} value={userId} onChange={event => onIdentity(event.target.value)}>{demoUsers.map(demo => <option key={demo.id} value={demo.id}>{demo.displayName}</option>)}</select></label>;
}
export function AuthenticationNotice({ message }: { message?: string }) { return message ? <p role="alert">{message}</p> : null; }
