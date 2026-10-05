import { useEffect,useState } from 'react';
import App from '../App.tsx';
import type { Locale } from '@el-dabboos/domain';
import { useTheme } from '../presentation/ThemeProvider.tsx';
import type { ThemePreference } from '../presentation/preferences.ts';
import { authenticationRequest } from './client.ts';
import type { AuthUser } from './client.ts';
import { LoginForm,authCopy } from './LoginForm.tsx';
import { configureIdentityMode } from '../api/client.ts';
import './authentication.css';
export function AuthenticationGate() {
    const [mode,setMode] = useState('loading'),[user,setUser] = useState<AuthUser|null>(null),[notice,setNotice] = useState('');
    const [locale,setLocale] = useState<Locale>('ar');
    const { preference,setPreference } = useTheme();
    const text = authCopy[locale];
    const check = async () => {
        try {
            const state = await authenticationRequest<{ mode: string }>('state'); configureIdentityMode(state.mode); setMode(state.mode);
            if (state.mode==='local') { const result = await authenticationRequest<{ user: AuthUser }>('me').catch(() => null); setUser(result?.user ?? null); }
        } catch { setMode('unavailable'); }
    };
    useEffect(() => { void check(); },[]);
    useEffect(() => {
        if (!user) { document.documentElement.lang=locale; document.documentElement.dir=locale==='ar' ? 'rtl' : 'ltr'; }
    },[locale,user]);
    useEffect(() => {
        if (mode!=='local' || !user) return;
        const expire = () => { setLocale(document.documentElement.lang==='en' ? 'en' : 'ar'); setUser(null); setNotice('expired'); };
        const checkSession = () => { void authenticationRequest('me').catch(cause => { if (cause instanceof Error && cause.message==='unauthenticated') expire(); }); };
        const timer = window.setInterval(checkSession,60_000);
        window.addEventListener('dabboos-session-expired',expire); window.addEventListener('focus',checkSession);
        return () => { clearInterval(timer); window.removeEventListener('dabboos-session-expired',expire); window.removeEventListener('focus',checkSession); };
    },[mode,user]);
    const logout = async (all = false) => {
        try { await authenticationRequest(all ? 'revoke-sessions' : 'logout',{}); setLocale(document.documentElement.lang==='en' ? 'en' : 'ar'); setUser(null); setNotice(''); }
        catch { setNotice('unavailable'); }
    };
    if (mode==='synthetic') return <App />;
    if (user) return <App authenticatedUser={user} onLogout={all => void logout(all)} authenticationError={notice==='unavailable' ? text.unavailable : undefined} />;
    return <main className="auth-shell" dir={locale==='ar' ? 'rtl' : 'ltr'}>
      <header className="auth-controls"><label>{text.language}<select value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="en">English</option><option value="ar">العربية</option></select></label>
        <label>{text.theme}<select value={preference} onChange={event => setPreference(event.target.value as ThemePreference)}><option value="system">{text.system}</option><option value="light">{text.light}</option><option value="dark">{text.dark}</option></select></label></header>
      {mode==='local' ? <LoginForm locale={locale} onAuthenticated={next => { setUser(next); setNotice(''); }} {...(notice==='expired' ? { notice: text.expired } : {})} /> : <section className="auth-panel"><p role="status">{mode==='loading' ? text.loading : mode==='disabled' ? text.disabled : text.unavailable}</p>{mode==='unavailable' && <button onClick={() => void check()}>{text.retry}</button>}</section>}
    </main>;
}
