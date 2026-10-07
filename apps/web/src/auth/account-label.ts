import type { Locale } from '@el-dabboos/domain';
import type { AuthUser } from './client.ts';

// Reserved bootstrap identities AND original labels identify system copy.
// Renamed profiles (including these accounts) are always displayed verbatim.
const placeholders = {
  'staging-tenant-admin': { en: 'Pending tenant administrator', ar: 'مسؤول مساحة العمل قيد الإعداد' },
  'staging-platform-operator': { en: 'Pending staging operator', ar: 'مشغّل البيئة التجريبية قيد الإعداد' },
  'staging-analyst': { en: 'Pending staging analyst', ar: 'محلّل البيئة التجريبية قيد الإعداد' },
  'staging-viewer': { en: 'Pending staging viewer', ar: 'مستخدم العرض التجريبي قيد الإعداد' },
};
export function accountLabel(user: AuthUser, locale: Locale): string {
  const placeholder = placeholders[user.id as keyof typeof placeholders];
  return placeholder && user.displayName === placeholder.en ? placeholder[locale] : user.displayName;
}
