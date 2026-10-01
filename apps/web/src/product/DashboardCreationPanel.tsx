import type { Locale, TenantProfile } from '@el-dabbous/domain';
import type { AccessibleTemplate } from '../api/client.ts';
import { showCreationPanel } from '../product-flow.ts';
import type { ProductPanel } from '../product-flow.ts';
import { conversationalCopy, copy } from '../i18n.ts';

interface Props {
  panel: ProductPanel; locale: Locale; profile: TenantProfile | null; templates: AccessibleTemplate[];
  prompt: string; onPrompt: (value: string) => void; loading: boolean; canGenerate: boolean;
  onChooseAi: () => void; onBlank: () => void; onChooseTemplate: () => void; onTemplate: (id: string) => void;
  onGenerate: () => void; onClose: () => void;
}
export function DashboardCreationPanel(props: Props) {
  const { panel, locale, profile, templates, prompt, onPrompt, loading, canGenerate, onChooseAi, onBlank, onChooseTemplate, onTemplate, onGenerate, onClose } = props;
  if (!showCreationPanel(panel)) return null;
  const t = copy[locale];
  const conversation = profile ? conversationalCopy(locale, profile) : { placeholder: t.promptPlaceholder, examples: [] };
  return <section className="creation-panel" aria-label={t.newDashboard}>
    <div className="creation-heading"><div><span className="eyebrow eyebrow-light">{t.workspace}</span><h2>{t.newDashboard}</h2></div><button type="button" onClick={onClose}>{t.cancel}</button></div>
    {panel === 'new' && <div className="creation-choices">
      <button type="button" onClick={onChooseAi} disabled={!canGenerate}><strong>✦ {t.createWithAi}</strong><span>{t.createWithAiHint}</span></button>
      <button type="button" onClick={onBlank}><strong>＋ {t.blankDashboard}</strong><span>{t.blankDashboardHint}</span></button>
      <button type="button" onClick={onChooseTemplate}><strong>▥ {t.startFromTemplate}</strong><span>{t.startFromTemplateHint}</span></button>
    </div>}
    {panel === 'choose-template' && <div className="creation-templates">{templates.filter(item => item.availability === 'available').map(item =>
      <button type="button" key={item.id} onClick={() => onTemplate(item.id)}>▥ {item.name[locale]}</button>)}</div>}
    {panel === 'create-ai' && <div className="creation-ai"><label htmlFor="dashboard-prompt">{t.promptTitle}</label>
      <textarea id="dashboard-prompt" value={prompt} onChange={event => onPrompt(event.target.value)} placeholder={conversation.placeholder} rows={4} />
      <div className="prompt-examples">{conversation.examples.map(example => <button key={example} type="button" onClick={() => onPrompt(example)}>{example}</button>)}</div>
      <button type="button" className="primary-button" disabled={loading || !prompt.trim() || !canGenerate} onClick={onGenerate}>{t.generate} ↗</button>
    </div>}
  </section>;
}
