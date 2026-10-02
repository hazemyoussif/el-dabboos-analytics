import type { Locale } from '@el-dabboos/domain';
import type { PlannerActivityState } from '../planner-activity.ts';
import { formatPlannerElapsed, plannerCopy } from '../planner-copy.ts';
export function AiProgress({ locale, operation, elapsedMs }: PlannerActivityState & { locale: Locale }) {
  if (operation === 'idle') return null;
  const t = plannerCopy[locale];
  return <div className="ai-progress" role="status" aria-live="polite" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div><strong>{operation === 'generating' ? t.generationTitle : t.editTitle}</strong><p>{t.waiting}</p></div>
    <span className="ai-elapsed" role="timer" aria-live="off"><bdi dir="ltr">{formatPlannerElapsed(elapsedMs)}</bdi> {t.elapsed}</span>
  </div>;
}
