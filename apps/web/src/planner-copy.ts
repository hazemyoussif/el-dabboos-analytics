import type { Locale } from '@el-dabboos/domain';
export const plannerCopy = {
  en: { generating: 'Generating…', editing: 'Applying…', generationTitle: 'Creating dashboard with AI', editTitle: 'Editing dashboard with AI', waiting: 'Waiting for AI provider…', elapsed: 'elapsed',
    errors: {
      LLM_TIMEOUT: 'The AI provider did not respond in time. Your dashboard was not changed.',
      LLM_HTTP_ERROR: 'The AI provider rejected the structured request. Your dashboard was not changed.',
      LLM_UNAVAILABLE: 'The AI provider is unavailable. Your dashboard was not changed.',
      INVALID_STRUCTURED_OUTPUT: 'The AI provider could not produce a valid dashboard. Your dashboard was not changed.',
      REQUEST_FAILED: 'The AI request could not be completed. Your dashboard was not changed.',
    } },
  ar: { generating: 'جارٍ الإنشاء…', editing: 'جارٍ التطبيق…', generationTitle: 'جارٍ إنشاء لوحة المعلومات بالذكاء الاصطناعي', editTitle: 'جارٍ تعديل لوحة المعلومات بالذكاء الاصطناعي', waiting: 'في انتظار استجابة نموذج الذكاء الاصطناعي…', elapsed: 'الوقت المنقضي',
    errors: {
      LLM_TIMEOUT: 'لم يستجب نموذج الذكاء الاصطناعي في الوقت المحدد. لم تتغير لوحة المعلومات.',
      LLM_HTTP_ERROR: 'رفض نموذج الذكاء الاصطناعي الطلب المنظم. لم تتغير لوحة المعلومات.',
      LLM_UNAVAILABLE: 'نموذج الذكاء الاصطناعي غير متاح حاليًا. لم تتغير لوحة المعلومات.',
      INVALID_STRUCTURED_OUTPUT: 'تعذر على نموذج الذكاء الاصطناعي إنشاء لوحة معلومات صالحة. لم تتغير لوحة المعلومات.',
      REQUEST_FAILED: 'تعذر إكمال طلب الذكاء الاصطناعي. لم تتغير لوحة المعلومات.',
    } },
} as const;
export function plannerErrorMessage(code: string, locale: Locale): string {
  const errors = plannerCopy[locale].errors;
  return errors[code as keyof typeof errors] ?? errors.REQUEST_FAILED;
}
export function formatPlannerElapsed(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Relocalize only errors owned by this planner; preserve other workspace errors. */
export function plannerDisplayError(error: string | null, code: string | null, locale: Locale): string | null {
  return code && (error === plannerErrorMessage(code, 'en') || error === plannerErrorMessage(code, 'ar'))
    ? plannerErrorMessage(code, locale) : error;
}

export function plannerFailureMessage(code: string, apiMessage: string, locale: Locale): string {
  return code.startsWith('LLM_') || code === 'INVALID_STRUCTURED_OUTPUT' || code === 'REQUEST_FAILED'
    ? plannerErrorMessage(code, locale) : apiMessage;
}
