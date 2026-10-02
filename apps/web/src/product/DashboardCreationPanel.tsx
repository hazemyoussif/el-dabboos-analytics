import { AiProgress } from './AiProgress.tsx';
import type { PlannerActivityState } from '../planner-activity.ts';
import { plannerCopy } from '../planner-copy.ts';
import { Sparkles, Plus, LayoutTemplate, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { TemplateBrowser } from '../library/TemplateBrowser.tsx';
import type { Locale, TenantProfile } from '@el-dabboos/domain';
import type { AccessibleTemplate } from '../api/client.ts';
import { showCreationPanel } from '../product-flow.ts';
import type { ProductPanel } from '../product-flow.ts';
import { conversationalCopy, copy } from '../i18n.ts';

interface Props {
  panel: ProductPanel; locale: Locale; profile: TenantProfile | null; templates: AccessibleTemplate[];
  prompt: string; onPrompt: (value: string) => void; loading: boolean; canGenerate: boolean;
  onChooseAi: () => void; onBlank: () => void; onChooseTemplate: () => void; onTemplate: (id: string) => void;
  onGenerate: () => void; onClose: () => void; activity?: PlannerActivityState;
}
export function DashboardCreationPanel(props: Props) {
  const { panel, locale, profile, templates, prompt, onPrompt, loading, canGenerate, onChooseAi, onBlank, onChooseTemplate, onTemplate, onGenerate, onClose } = props;
  if (!showCreationPanel(panel)) return null;
  const activity = props.activity ?? { operation: 'idle', elapsedMs: 0 };
  const generating = activity.operation === 'generating';
  const t = copy[locale];
  const conversation = profile ? conversationalCopy(locale, profile) : { placeholder: t.promptPlaceholder, examples: [] };
  return <section className="creation-panel" aria-label={t.newDashboard}>
    <div className="creation-heading"><div><span className="eyebrow eyebrow-light">{t.workspace}</span><h2>{t.newDashboard}</h2></div><button type="button" onClick={onClose} disabled={generating}>{t.cancel}</button></div>
    {panel === 'new' && <div className="creation-choices">
      <button type="button" onClick={onChooseAi} disabled={!canGenerate}><Sparkles aria-hidden="true" /><strong>{t.createWithAi}</strong><span>{t.createWithAiHint}</span></button>
      <button type="button" onClick={onBlank}><Plus aria-hidden="true" /><strong>{t.blankDashboard}</strong><span>{t.blankDashboardHint}</span></button>
      <button type="button" onClick={onChooseTemplate}><LayoutTemplate aria-hidden="true" /><strong>{t.startFromTemplate}</strong><span>{t.startFromTemplateHint}</span></button>
    </div>}
    {panel === 'choose-template' && <TemplateBrowser templates={templates} locale={locale} onOpen={onTemplate} />}
    {panel === 'create-ai' && <div className="creation-ai"><label htmlFor="dashboard-prompt">{t.promptTitle}</label>
      <textarea id="dashboard-prompt" value={prompt} disabled={generating} onChange={event => onPrompt(event.target.value)} placeholder={conversation.placeholder} rows={4} />
      <div className="prompt-examples">{conversation.examples.map(example => <button key={example} type="button" disabled={generating} onClick={() => onPrompt(example)}>{example}</button>)}</div>
      <AiProgress locale={locale} {...activity} />
      <button type="button" className="primary-button" disabled={generating || loading || !prompt.trim() || !canGenerate} onClick={onGenerate}>{generating ? plannerCopy[locale].generating : t.generate}{generating ? <LoaderCircle className="ai-loading-icon" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</button>
    </div>}
  </section>;
}
