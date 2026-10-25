import { useEffect, useRef, useState } from 'react';
import type { SourceCompatibilityIssue, SourceCompatibilityResult } from '@el-dabboos/domain';
import type { ApiSession } from '../api/client.ts';
import { request } from '../api/client.ts';
import { pageLabel } from './controls.tsx';
import { administrationError } from './copy.ts';

export type SourceCheckResponse = SourceCompatibilityResult & { testedVersion: number; checkedAt: string; activation: 'not_activated' };
const issueLabels: Record<SourceCompatibilityIssue['code'], [string, string]> = {
  missing_field: ['Missing field', 'حقل غير موجود'], field_type: ['Incompatible field type', 'نوع الحقل غير متوافق'], missing_relation: ['Foreign key does not match', 'المفتاح الخارجي غير متوافق'],
  odoo_version: ['Odoo version does not match', 'إصدار أودو غير متوافق'], company_scope: ['Company scope does not match', 'نطاق الشركات غير متوافق'],
  connection_unavailable: ['Connection unavailable. Ask the operator to check the registered connection and read permissions.', 'الاتصال غير متاح. اطلب من مسؤول التشغيل فحص الاتصال المسجل وصلاحيات القراءة.'],
};
export function SourceCheckResult({ result, session }: { result: SourceCheckResponse; session: ApiSession }) {
  const label = pageLabel(session.locale);
  return <div role="status"><p>{result.compatible ? label('Structure matches. Business approval and activation are still required.', 'البنية متوافقة. لا يزال الاعتماد والتفعيل مطلوبين.') : label('Compatibility check failed.', 'فشل فحص التوافق.')}</p>
    <p>{label('Saved version', 'الإصدار المحفوظ')}: {result.testedVersion} · <time dateTime={result.checkedAt}>{new Date(result.checkedAt).toLocaleString(session.locale)}</time></p>
    {result.issues.length > 0 && <ul>{result.issues.map((issue, index) => <li key={index}>{label(...issueLabels[issue.code])}{issue.field && <>: <bdi>{issue.field}</bdi></>}</li>)}</ul>}
  </div>;
}
export function SourceSettingsCheck({ session, version, disabled }: { session: ApiSession; version?: number; disabled: boolean }) {
  const label = pageLabel(session.locale), ownership = useRef(0);
  const [checking, setChecking] = useState(false), [result, setResult] = useState<SourceCheckResponse | null>(null), [error, setError] = useState('');
  useEffect(() => { ownership.current++; setResult(null); setError(''); setChecking(false); return () => { ownership.current++; }; }, [disabled, version, session.userId, session.tenantId, session.locale]);
  async function check() {
    const revision = ++ownership.current;
    setChecking(true); setResult(null); setError('');
    try {
      const response = await request<SourceCheckResponse>(session, `/api/tenants/${encodeURIComponent(session.tenantId)}/admin/source-settings/check`, 'POST', { expectedVersion: version });
      if (revision === ownership.current) setResult(response);
    } catch (error) { if (revision === ownership.current) setError(administrationError(error, session.locale)); }
    finally { if (revision === ownership.current) setChecking(false); }
  }
  return <><button type="button" disabled={disabled || !version || checking} onClick={() => void check()}>{checking ? label('Checking…', 'جارٍ الفحص…') : label('Check saved draft', 'فحص المسودة المحفوظة')}</button>
    {error && <p role="alert">{error}</p>}{result && !disabled && <SourceCheckResult result={result} session={session} />}
  </>;
}
