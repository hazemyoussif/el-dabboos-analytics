import { AiProgress } from './AiProgress.tsx';
import type { PlannerActivityState } from '../planner-activity.ts';
import { plannerCopy } from '../planner-copy.ts';
import { Sparkles, ArrowUpRight, LoaderCircle } from 'lucide-react';
import type { Locale, TenantProfile } from '@el-dabboos/domain';
import { copy } from '../i18n.ts';
interface Props { locale: Locale; profile: TenantProfile; instruction: string; onInstruction: (value: string) => void;
  loading: boolean; onApply: () => void; onClose: () => void; activity?: PlannerActivityState }
export function DashboardAiEditor({ locale, profile, instruction, onInstruction, loading, onApply, onClose, activity = { operation: 'idle', elapsedMs: 0 } }: Props) {
  const editing = activity.operation === 'editing';
  const t = copy[locale];
  const branchLabels = profile.exampleBranchIds.map(id => profile.branchLabels[id]?.[locale]).filter((label): label is string => !!label);
  const branchExample = branchLabels.length ? (locale === 'ar'
    ? `اعرض ${new Intl.ListFormat('ar').format(branchLabels)} فقط`
    : `Show only ${new Intl.ListFormat('en').format(branchLabels)}`) : null;
  const examples = t.examples.flatMap((example, index) => index === 1 ? branchExample ? [branchExample] : [] : [example]);
  return <section className="edit-panel" aria-label={t.editWithAi}>
    <div><div className="eyebrow eyebrow-light"><Sparkles aria-hidden="true" /> {t.studio}</div><h3>{t.editWithAi}</h3><div className="example-chips">{examples.map(example =>
      <button key={example} type="button" disabled={editing} onClick={() => onInstruction(example)}>{example}</button>)}</div></div>
    <div className="edit-form"><input aria-label={t.editTitle} value={instruction} disabled={editing} onChange={event => onInstruction(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !loading && !editing && instruction.trim()) onApply(); }} placeholder={t.editPlaceholder} />
      <button type="button" className="primary-button" disabled={editing || loading || !instruction.trim()} onClick={onApply}>{editing ? plannerCopy[locale].editing : t.apply}{editing ? <LoaderCircle className="ai-loading-icon" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</button>
      <button type="button" onClick={onClose} disabled={editing}>{t.cancel}</button></div>
    <AiProgress locale={locale} {...activity} />
  </section>;
}
