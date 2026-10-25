import { useState } from 'react';
import type { TenantSourceConnectionOption, TenantSourceSettings, TenantSourceSettingsRecord } from '@el-dabboos/domain';
import type { ApiSession } from '../api/client.ts';
import { pageLabel } from './controls.tsx';
import { SourceMappingFields } from './SourceMappingFields.tsx';
import { SourceSettingsCheck } from './SourceSettingsCheck.tsx';
import { downloadSourceSettings } from './source-settings-model.ts';

export interface SourceSettingsPageData {
  record: TenantSourceSettingsRecord | null;
  defaults: TenantSourceSettings;
  connections: TenantSourceConnectionOption[];
  mode: 'draft';
}
const limits = {
  batchSize: { labels: ['Batch size', 'حجم الدفعة'], min: 1, max: 1000 },
  connectTimeoutMs: { labels: ['Connection timeout (ms)', 'مهلة الاتصال (مللي ثانية)'], min: 100, max: 10000 },
  statementTimeoutMs: { labels: ['Query timeout (ms)', 'مهلة الاستعلام (مللي ثانية)'], min: 100, max: 15000 },
  snapshotMaxDurationMs: { labels: ['Snapshot lease limit (ms)', 'حد مدة لقطة المصدر (مللي ثانية)'], min: 1000, max: 600000 },
} as const;
export function SourceSettingsForm({ data, session, busy, save }: { data: SourceSettingsPageData; session: ApiSession; busy: boolean; save: (body: unknown) => Promise<void> }) {
  const [settings, setSettings] = useState(() => structuredClone(data.record?.settings ?? data.defaults));
  const label = pageLabel(session.locale), dirty = JSON.stringify(settings) !== JSON.stringify(data.record?.settings);
  function selectConnection(connectionRef: string) {
    const connection = data.connections.find(option => option.connectionRef === connectionRef);
    setSettings({ ...settings, connectionRef, ...(connection ? { sourceId: connection.sourceId, companyIds: [...connection.companyIds] } : {}) });
  }
  return <form className="admin-form" onSubmit={event => { event.preventDefault(); void save({ settings, expectedVersion: data.record?.version ?? null }); }}>
    <p>{label('Prepare a source connection and mapping. Save creates a draft; it does not change live ingestion or published reports.', 'جهّز اتصال المصدر وتعيين الحقول. ينشئ الحفظ مسودة ولا يغيّر الاستيراد الحالي أو التقارير المنشورة.')}</p>
    {!data.connections.length && <p role="status">{label('No connections are registered for this workspace. You can prepare a draft; an operator must register its connection before checking it.', 'لا توجد اتصالات مسجلة لمساحة العمل. يمكنك تجهيز مسودة، ويجب أن يسجل مسؤول التشغيل اتصالها قبل فحصها.')}</p>}
    <fieldset disabled={busy}><legend>{label('Source connection', 'اتصال المصدر')}</legend>
      <label>{label('Connection reference', 'مرجع الاتصال')}<input dir="ltr" required maxLength={200} list="tenant-source-connections" value={settings.connectionRef} onChange={event => selectConnection(event.target.value)} />
        <datalist id="tenant-source-connections">{data.connections.map(connection => <option key={connection.connectionRef} value={connection.connectionRef}>{connection.sourceId}</option>)}</datalist></label>
      <label>{label('Source identity', 'معرّف المصدر')}<input dir="ltr" required maxLength={200} value={settings.sourceId} onChange={event => setSettings({ ...settings, sourceId: event.target.value })} /></label>
      <p>{label('Credentials stay in protected server configuration. No password is stored in this draft.', 'تبقى بيانات الاعتماد في إعدادات الخادم المحمية. لا تخزّن المسودة كلمة مرور.')}</p>
      <p>{label('Adapter', 'المحول')}: Odoo 18 · PostgreSQL</p>
      <label>{label('Company IDs (comma separated)', 'معرّفات الشركات (مفصولة بفواصل)')}<input dir="ltr" required value={settings.companyIds.join(',')} onChange={event => setSettings({ ...settings, companyIds: event.target.value.split(',').map(value => value.trim()) })} /></label>
      <details><summary>{label('Adapter limits', 'حدود المحول')}</summary>{(Object.keys(limits) as (keyof typeof limits)[]).map(key => <label key={key}>{label(limits[key].labels[0], limits[key].labels[1])}<input type="number" required min={limits[key].min} max={limits[key].max} step={1} value={settings.parameters[key]} onChange={event => setSettings({ ...settings, parameters: { ...settings.parameters, [key]: Number(event.target.value) } })} /></label>)}</details>
      <SourceMappingFields mapping={settings.mapping} locale={session.locale} onChange={mapping => setSettings({ ...settings, mapping })} />
      <button type="submit" disabled={!dirty}>{label('Save draft', 'حفظ المسودة')}</button>
      <SourceSettingsCheck session={session} version={data.record?.version} disabled={busy || dirty} />
      <button type="button" disabled={!data.record || dirty} onClick={() => data.record && downloadSourceSettings(data.record)}>{label('Export saved draft', 'تصدير المسودة المحفوظة')}</button>
    </fieldset>
    {dirty && <p role="status">{label('Unsaved changes. Save before checking or exporting.', 'تغييرات غير محفوظة. احفظ قبل الفحص أو التصدير.')}</p>}
    <p>{label('A compatibility check does not certify business meaning. Activation uses the governed source release process.', 'لا يعتمد فحص التوافق المعنى التجاري للحقول. يتم التفعيل عبر إجراءات إصدار المصدر المعتمدة.')}</p>
  </form>;
}
