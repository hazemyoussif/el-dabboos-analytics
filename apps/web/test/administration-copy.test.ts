import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClientError } from '../src/api/client.ts';
import { administrationError, administrationLabel } from '../src/admin/copy.ts';

test('administration errors explain conflict recovery in both languages without exposing server details', () => {
    const conflict = new ApiClientError(409, 'VERSION_CONFLICT', 'version conflict');
    assert.match(administrationError(conflict, 'en'), /Reload and review/);
    assert.match(administrationError(conflict, 'ar'), /أعد التحميل/);
    for (const locale of ['en', 'ar'] as const) {
        const unavailable = administrationError(new Error('internal SQL detail'), locale);
        assert.ok(!unavailable.includes('SQL'));
        assert.ok(administrationError(new ApiClientError(503, 'DATA_NOT_READY', 'raw error'), locale) !== 'raw error');
        for(const code of ['USER_PROVISIONING_FAILED','USER_PROVISIONING_LIMITED'])assert.ok(administrationError(new ApiClientError(409,code,'private credential detail'),locale)!=='private credential detail');
    }
});

test('administration labels translate lifecycle and setting vocabulary while retaining technical values', () => {
    assert.equal(administrationLabel('suspended', 'ar'), 'معلق');
    assert.equal(administrationLabel('restricted', 'ar'), 'مقيدة');
    assert.equal(administrationLabel('timeZone', 'en'), 'Time zone');
    assert.equal(administrationLabel('timeZone', 'ar'), 'المنطقة الزمنية');
    for (const value of ['IQD', 'Asia/Baghdad', 'dashboard:view']) {
        assert.equal(administrationLabel(value, 'ar'), value);
    }
});
