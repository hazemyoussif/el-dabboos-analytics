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
  const branches = profile.exampleBranchIds;
  const branchExample = locale === 'ar'
    ? `اعرض ${profile.branchLabels[branches[0]]?.ar} و${profile.branchLabels[branches[1]]?.ar} فقط`
    : `Show only ${profile.branchLabels[branches[0]]?.en} and ${profile.branchLabels[branches[1]]?.en}`;
  return <section className="edit-panel" aria-label={t.editWithAi}>
    <div><div className="eyebrow eyebrow-light"><Sparkles aria-hidden="true" /> {t.studio}</div><h3>{t.editWithAi}</h3><div className="example-chips">{t.examples.map((example, index) =>
      <button key={example} type="button" disabled={editing} onClick={() => onInstruction(index === 1 ? branchExample : example)}>{index === 1 ? branchExample : example}</button>)}</div></div>
    <div className="edit-form"><input aria-label={t.editTitle} value={instruction} disabled={editing} onChange={event => onInstruction(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !loading && !editing && instruction.trim()) onApply(); }} placeholder={t.editPlaceholder} />
      <button type="button" className="primary-button" disabled={editing || loading || !instruction.trim()} onClick={onApply}>{editing ? plannerCopy[locale].editing : t.apply}{editing ? <LoaderCircle className="ai-loading-icon" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</button>
      <button type="button" onClick={onClose} disabled={editing}>{t.cancel}</button></div>
    <AiProgress locale={locale} {...activity} />
  </section>;
}
