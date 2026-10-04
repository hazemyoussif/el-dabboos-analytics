import { AuthorizationError } from '@el-dabboos/application';
import { AccessControlError } from '@el-dabboos/domain';
import { ApiError, object } from './http-error.ts';
export interface HttpError {
    status: number;
    code: string;
    message: string;
}
function accessControlHttpError(error: AccessControlError): HttpError {
    const code = error.code;
    if (code === 'IDENTITY_REQUIRED')
        return { status: 401, code, message: 'Trusted identity required.' };
    if (['VERSION_CONFLICT', 'PROTECTED_ROLE', 'ROLE_IN_USE', 'LAST_ADMIN', 'STALE_DATA_SCOPE'].includes(code))
        return { status: 409, code, message: code.replaceAll('_', ' ').toLowerCase() };
    if (code === 'NOT_FOUND' || code === 'DASHBOARD_NOT_FOUND')
        return { status: 404, code: 'NOT_FOUND', message: 'not found' };
    if (code === 'ADMIN_UNAVAILABLE')
        return { status: 503, code, message: 'admin unavailable' };
    if (/^(INVALID_|DUPLICATE_|IMMUTABLE_)/.test(code))
        return { status: 400, code: 'INVALID_ADMIN_INPUT', message: 'invalid admin input' };
    return { status: 403, code: 'ACCESS_DENIED', message: 'access denied' };
}
export function administrationHttpError(error: unknown, url: string): HttpError | null {
    if (error instanceof AccessControlError)
        return accessControlHttpError(error);
    if (!url.startsWith('/api/platform/') && !url.includes('/admin/'))
        return null;
    if (object(error) && 'validation' in error)
        return { status: 400, code: 'INVALID_ADMIN_INPUT', message: 'Invalid administration input.' };
    if (error instanceof ApiError || error instanceof AuthorizationError)
        return null;
    if (object(error) && typeof error.statusCode === 'number' && error.statusCode < 500)
        return null;
    return { status: 503, code: 'ADMIN_UNAVAILABLE', message: 'Administration unavailable. No change was saved.' };
}
