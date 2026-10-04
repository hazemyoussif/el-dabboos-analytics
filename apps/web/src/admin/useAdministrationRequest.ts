import { administrationError } from './copy.ts';
import { useEffect, useRef, useState } from 'react';
import type { ApiSession } from '../api/client.ts';
import { ApiClientError, request } from '../api/client.ts';
import { AdministrationRequestOwnership } from './request-lifecycle.ts';
export function useAdministrationRequest<Data>(session: ApiSession, read: (cursor?: string) => Promise<Data>, empty: Data, onReload: () => void, ownerKey = '') {
    const [data, setData] = useState(empty), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
    const ownership = useRef(new AdministrationRequestOwnership());
    const message = (error: unknown) => administrationError(error, session.locale);
    const load = async (cursor?: string) => {
        const revision = ownership.current.begin();
        setBusy(true);
        setError('');
        setData(empty);
        onReload();
        try {
            const result = await read(cursor);
            if (ownership.current.owns(revision))
                setData(result);
        }
        catch (error) {
            if (ownership.current.owns(revision))
                setError(message(error));
        }
        finally {
            if (ownership.current.owns(revision))
                setBusy(false);
        }
    };
    useEffect(() => { setNotice(''); void load(); return () => ownership.current.invalidate(); }, [session.userId, session.tenantId, session.locale, ownerKey]);
    const mutate = async (path: string, method: string, body: unknown) => {
        const revision = ownership.current.begin();
        setBusy(true);
        setError('');
        try {
            await request(session, path, method, body);
            if (!ownership.current.owns(revision))
                return;
            setNotice(session.locale === 'ar' ? 'تم الحفظ.' : 'Saved.');
            await load();
        }
        catch (error) {
            if (!ownership.current.owns(revision))
                return;
            if (error instanceof ApiClientError && (error.status === 403 || error.status === 404)) {
                setData(empty);
                onReload();
            }
            setError(message(error));
        }
        finally {
            if (ownership.current.owns(revision))
                setBusy(false);
        }
    };
    const invalidate = () => { ownership.current.invalidate(); setData(empty); setError(''); setNotice(''); onReload(); };
    return { data, error, notice, busy, load, mutate, invalidate };
}
