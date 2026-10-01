import { Sparkles, ArrowUpRight } from 'lucide-react';
import type { Locale, TenantProfile } from '@el-dabbous/domain';
import { copy } from '../i18n.ts';
interface Props { locale: Locale; profile: TenantProfile; instruction: string; onInstruction: (value: string) => void;
  loading: boolean; onApply: () => void; onClose: () => void }
export function DashboardAiEditor({ locale, profile, instruction, onInstruction, loading, onApply, onClose }: Props) {
  const t = copy[locale];
  const branches = profile.exampleBranchIds;
  const branchExample = locale === 'ar'
    ? `اعرض ${profile.branchLabels[branches[0]]?.ar} و${profile.branchLabels[branches[1]]?.ar} فقط`
    : `Show only ${profile.branchLabels[branches[0]]?.en} and ${profile.branchLabels[branches[1]]?.en}`;
  return <section className="edit-panel" aria-label={t.editWithAi}>
    <div><div className="eyebrow eyebrow-light"><Sparkles aria-hidden="true" /> {t.studio}</div><h3>{t.editWithAi}</h3><div className="example-chips">{t.examples.map((example, index) =>
      <button key={example} type="button" onClick={() => onInstruction(index === 1 ? branchExample : example)}>{index === 1 ? branchExample : example}</button>)}</div></div>
    <div className="edit-form"><input aria-label={t.editTitle} value={instruction} onChange={event => onInstruction(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter') onApply(); }} placeholder={t.editPlaceholder} />
      <button type="button" className="primary-button" disabled={loading || !instruction.trim()} onClick={onApply}>{t.apply}<ArrowUpRight aria-hidden="true" /></button>
      <button type="button" onClick={onClose}>{t.cancel}</button></div>
  </section>;
}
