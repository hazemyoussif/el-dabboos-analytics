import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { WorkspaceAiModel, WorkspaceAiSettings } from '@el-dabboos/domain';
import { reasoningEfforts } from '@el-dabboos/domain';
import { request } from '../api/client.ts';
import type { ApiSession } from '../api/client.ts';
import { pageLabel } from './controls.tsx';
export interface AiSettingsPageData {
  record: { settings: WorkspaceAiSettings; version: number; hasApiKey: boolean } | null;
  defaults: WorkspaceAiSettings;
  localBaseUrl: string;
  keyStorageAvailable: boolean;
}
export function AiSettingsForm({ data, session, busy, save }: { data: AiSettingsPageData; session: ApiSession; busy: boolean; save: (body: unknown) => Promise<void> }) {
  const label = pageLabel(session.locale);
  const [settings, setSettings] = useState(data.record?.settings ?? data.defaults);
  const [apiKey, setApiKey] = useState(''), [clearApiKey, setClearApiKey] = useState(false);
  const [models, setModels] = useState<WorkspaceAiModel[]>([]), [modelBusy, setModelBusy] = useState(false), [modelError, setModelError] = useState('');
  const revision = useRef(0);
  useEffect(() => { void loadModels(); return () => { revision.current++; }; }, [settings.provider]);
  const model = models.find(candidate => candidate.id === settings.modelId);
  const local = settings.provider === 'local';
  function changeProvider(provider: WorkspaceAiSettings['provider']) {
    revision.current++; setModels([]); setModelError(''); setModelBusy(false); setApiKey(''); setClearApiKey(false);
    setSettings({ provider, baseUrl: provider === 'local' ? data.localBaseUrl : 'https://openrouter.ai/api/v1', modelId: '', temperature: 0, maxTokens: 2048 });
  }
  async function loadModels() {
    const current = ++revision.current;
    setModelBusy(true); setModelError('');
    try {
      const result = await request<{ models: WorkspaceAiModel[] }>(session, `/api/tenants/${encodeURIComponent(session.tenantId)}/admin/ai-settings/models`, 'POST', { provider: settings.provider, baseUrl: settings.baseUrl, ...(apiKey ? { apiKey } : {}) });
      if (revision.current === current) { setModels(result.models); if (!result.models.length) setModelError(label('No compatible models are available.', 'لا توجد نماذج متوافقة متاحة.')); }
    } catch { if (revision.current === current) setModelError(label('Could not load models. Check the URL and API key, then retry.', 'تعذر تحميل النماذج. راجع الرابط ومفتاح API ثم حاول مجددًا.')); }
    finally { if (revision.current === current) setModelBusy(false); }
  }
  function selectModel(modelId: string) {
    if (local) { setSettings({ ...settings, modelId }); return; }
    const { reasoningEffort, seed, ...retained } = settings;
    void reasoningEffort; void seed;
    setSettings({ ...retained, modelId });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save({ settings, expectedVersion: data.record?.version ?? null, ...(apiKey ? { apiKey } : {}), clearApiKey });
  }
  const effortOptions = model?.reasoningEfforts ?? reasoningEfforts;
  return <form className="admin-form ai-settings-form" onSubmit={submit}><fieldset disabled={busy || modelBusy}>
    <label>{label('Provider', 'مزود الخدمة')}<select value={settings.provider} onChange={event => changeProvider(event.target.value as WorkspaceAiSettings['provider'])}><option value="openrouter">OpenRouter</option><option value="local" disabled={!data.localBaseUrl}>{label('Local OpenAI-compatible', 'محلي متوافق مع OpenAI')}</option></select></label>
    <label>{label('Base URL', 'الرابط الأساسي')}<input type="url" required value={settings.baseUrl} maxLength={2048} onChange={event => { revision.current++; setModelBusy(false); setModels([]); setSettings({ ...settings, baseUrl: event.target.value }); }} /></label>
    <AiApiKeyControls value={apiKey} clear={clearApiKey} hasSaved={savedKeyApplies(data, settings)} available={data.keyStorageAvailable} onKey={value => { revision.current++; setModelBusy(false); setApiKey(value); }} onClear={value => { setClearApiKey(value); setApiKey(''); }} label={label} />
    <button type="button" onClick={() => void loadModels()}>{label('Load models', 'تحميل النماذج')}</button>
    {!local && <FreeModelOptions models={models} selected={settings.modelId} onSelect={selectModel} label={label} />}
    <label>{label('Model — search or enter its ID', 'النموذج — ابحث أو أدخل معرّفه')}<input list="workspace-ai-models" required maxLength={200} value={settings.modelId} onChange={event => selectModel(event.target.value)} /><datalist id="workspace-ai-models">{models.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</datalist></label>
    <AiModelTerms model={model} provider={settings.provider} label={label} />
    <label>{label('Maximum output tokens', 'الحد الأقصى لرموز الإخراج')}<input type="number" required min={1} max={Math.min(model?.maxTokens ?? 65536, 65536)} step={1} value={settings.maxTokens} onChange={event => setSettings({ ...settings, maxTokens: Number(event.target.value) })} /></label>
    {!local && <label>{label('Reasoning effort', 'مستوى التفكير')}<select disabled={model !== undefined && !model.supportedParameters.includes('reasoning')} value={settings.reasoningEffort ?? ''} onChange={event => { const { reasoningEffort, ...retained } = settings; void reasoningEffort; setSettings(event.target.value ? { ...retained, reasoningEffort: event.target.value as WorkspaceAiSettings['reasoningEffort'] } : retained); }}><option value="">{label('Provider default', 'افتراضي المزود')}</option>{effortOptions.map(effort => <option key={effort} value={effort}>{session.locale === 'ar' ? effortArabic[effort] : effort}</option>)}</select></label>}
    {local && <label>{label('Thinking budget tokens (optional)', 'ميزانية رموز التفكير (اختياري)')}<input type="number" min={0} max={65536} step={1} value={settings.reasoningBudgetTokens ?? ''} onChange={event => { const { reasoningBudgetTokens, ...retained } = settings; void reasoningBudgetTokens; setSettings(event.target.value === '' ? retained : { ...retained, reasoningBudgetTokens: Number(event.target.value) }); }} /></label>}
    <AiAdvancedControls settings={settings} onChange={setSettings} seedSupported={local || model === undefined || model.supportedParameters.includes('seed')} label={label} />
    <p>{label('Save applies to the next AI request in this workspace. The API key is never displayed again.', 'يُطبّق الحفظ على طلب AI التالي في مساحة العمل هذه. لن يُعرض مفتاح API مرة أخرى.')}</p>
    <button type="submit">{label('Save', 'حفظ')}</button>
  </fieldset>{modelError && <p role="alert">{modelError}</p>}</form>;
}

function AiAdvancedControls({ settings, onChange, seedSupported, label }: { settings: WorkspaceAiSettings; onChange: (value: WorkspaceAiSettings) => void; seedSupported: boolean; label: ReturnType<typeof pageLabel> }) {
  return <details><summary>{label('Advanced controls', 'إعدادات متقدمة')}</summary>
      <label>{label('Temperature', 'درجة الحرارة')}<input type="number" required min={0} max={2} step={0.1} value={settings.temperature} onChange={event => onChange({ ...settings, temperature: Number(event.target.value) })} /></label>
      <label>{label('Seed (optional)', 'البذرة (اختياري)')}<input type="number" min={0} max={2147483647} step={1} disabled={!seedSupported} value={settings.seed ?? ''} onChange={event => { const { seed, ...retained } = settings; void seed; onChange(event.target.value === '' ? retained : { ...retained, seed: Number(event.target.value) }); }} /></label>
    </details>;
}

function AiApiKeyControls({ value, clear, hasSaved, available, onKey, onClear, label }: { value: string; clear: boolean; hasSaved: boolean; available: boolean; onKey: (value: string) => void; onClear: (value: boolean) => void; label: ReturnType<typeof pageLabel> }) {
 return <>    <label>{label('API key', 'مفتاح API')}<input type="password" autoComplete="new-password" maxLength={6000} disabled={!available || clear} value={value} placeholder={hasSaved ? label('Key saved — leave blank to keep it', 'المفتاح محفوظ — اتركه فارغًا للإبقاء عليه') : ''} onChange={event => onKey(event.target.value)} /></label>
    {hasSaved && <label><input type="checkbox" checked={clear} onChange={event => onClear(event.target.checked)} />{label('Clear saved API key', 'حذف مفتاح API المحفوظ')}</label>}
    {!available && <p role="status">{label('Server secret configuration is required to save API keys.', 'يلزم إعداد سر الخادم لحفظ مفاتيح API.')}</p>}
</>;
}

const effortArabic = { none: 'بدون', minimal: 'أدنى', low: 'منخفض', medium: 'متوسط', high: 'مرتفع', xhigh: 'مرتفع جدًا', max: 'أقصى' };

function savedKeyApplies(data: AiSettingsPageData, settings: WorkspaceAiSettings): boolean {
 return Boolean(data.record?.hasApiKey && data.record.settings.provider === settings.provider && data.record.settings.baseUrl.replace(/\/+$/, '') === settings.baseUrl.replace(/\/+$/, ''));
}

function FreeModelOptions({ models, selected, onSelect, label }: { models: WorkspaceAiModel[]; selected: string; onSelect: (id: string) => void; label: ReturnType<typeof pageLabel> }) {
 const free = models.filter(model => model.free);
 return <label>{label('Free compatible models', 'نماذج مجانية متوافقة')}<select disabled={!free.length} value={free.some(model => model.id === selected) ? selected : ''} onChange={event => { if (event.target.value) onSelect(event.target.value); }}><option value="">{label('Load models, then choose a free option', 'حمّل النماذج ثم اختر نموذجًا مجانيًا')}</option>{free.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>;
}

function AiModelTerms({model,provider,label}: {model: WorkspaceAiModel | undefined; provider: WorkspaceAiSettings['provider']; label: ReturnType<typeof pageLabel>}) {
 if (!model || provider !== 'openrouter') return null;
 return <a href={`https://openrouter.ai/${model.id.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noreferrer">{label('Model details and provider terms', 'تفاصيل النموذج وشروط المزود')}</a>;
}
