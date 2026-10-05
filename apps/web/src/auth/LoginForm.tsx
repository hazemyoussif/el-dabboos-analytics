import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Locale } from '@el-dabboos/domain';
import { authenticationRequest } from './client.ts';
import type { AuthUser } from './client.ts';
export const authCopy = {
    en: { title: 'Sign in',email: 'Email',password: 'Password',submit: 'Sign in',busy: 'Signing in…',failed: 'Unable to sign in. Check your details and try again.',limited: 'Too many attempts. Please wait a minute and try again.',unavailable: 'Sign in is unavailable. Try again later.',expired: 'Your session ended. Sign in to continue.',logout: 'Sign out',revoke: 'Sign out all sessions',language: 'Language',theme: 'Theme',loading: 'Checking session…',disabled: 'Sign in is not configured.',retry: 'Try again',system: 'System',light: 'Light',dark: 'Dark' },
    ar: { title: 'تسجيل الدخول',email: 'البريد الإلكتروني',password: 'كلمة المرور',submit: 'تسجيل الدخول',busy: 'جارٍ تسجيل الدخول…',failed: 'تعذّر تسجيل الدخول. تحقق من بياناتك وحاول مجددًا.',limited: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.',unavailable: 'تسجيل الدخول غير متاح. حاول لاحقًا.',expired: 'انتهت جلستك. سجّل الدخول للمتابعة.',logout: 'تسجيل الخروج',revoke: 'تسجيل الخروج من كل الجلسات',language: 'اللغة',theme: 'المظهر',loading: 'جارٍ التحقق من الجلسة…',disabled: 'تسجيل الدخول غير مُعدّ.',retry: 'حاول مجددًا',system: 'النظام',light: 'فاتح',dark: 'داكن' },
};
export function LoginForm({ locale,onAuthenticated,notice }: { locale: Locale; onAuthenticated(user: AuthUser): void; notice?: string }) {
    const text = authCopy[locale];
    const [email,setEmail] = useState(''),[password,setPassword] = useState(''),[busy,setBusy] = useState(false),[error,setError] = useState('');
    const submit = async (event: FormEvent) => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setError('');
        try { const result = await authenticationRequest<{ user: AuthUser }>('login',{ email,password }); onAuthenticated(result.user); }
        catch (cause) { setError(cause instanceof Error && cause.message==='limited' ? text.limited : cause instanceof Error && cause.message==='unavailable' ? text.unavailable : text.failed); }
        finally { setPassword(''); setBusy(false); }
    };
    return <section className="auth-panel" aria-labelledby="auth-title"><h1 id="auth-title">{text.title}</h1>
      {notice && <p role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}
      <form onSubmit={event => void submit(event)}>
        <label htmlFor="auth-email">{text.email}</label><input id="auth-email" type="email" autoComplete="username" dir="ltr" value={email} maxLength={254} required onChange={event => setEmail(event.target.value)} disabled={busy} />
        <label htmlFor="auth-password">{text.password}</label><input id="auth-password" type="password" autoComplete="current-password" value={password} maxLength={1024} required onChange={event => setPassword(event.target.value)} disabled={busy} />
        <button type="submit" disabled={busy} aria-busy={busy}>{busy ? text.busy : text.submit}</button>
      </form></section>;
}
