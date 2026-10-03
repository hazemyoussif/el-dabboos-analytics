import type { TenantProfile } from './contracts.ts';

export const tenantProfiles: Readonly<Record<string, TenantProfile> & Record<'demo-iq' | 'demo-eg', TenantProfile>> = {
  'demo-iq': {
    id: 'demo-iq', countryCode: 'IQ', defaultLocale: 'ar', arabicDialect: 'iq', reportingCurrency: 'IQD', timeZone: 'Asia/Baghdad',
    labels: { en: 'Iraq demo', ar: 'العراق التجريبي' }, exampleBranchIds: ['baghdad', 'basra'],
    branchLabels: {
      baghdad: { en: 'Baghdad', ar: 'بغداد' }, basra: { en: 'Basra', ar: 'البصرة' }, erbil: { en: 'Erbil', ar: 'أربيل' },
      najaf: { en: 'Najaf', ar: 'النجف' }, mosul: { en: 'Mosul', ar: 'الموصل' }, karbala: { en: 'Karbala', ar: 'كربلاء' },
    },
  },
  'demo-eg': {
    id: 'demo-eg', countryCode: 'EG', defaultLocale: 'ar', arabicDialect: 'eg', reportingCurrency: 'EGP', timeZone: 'Africa/Cairo',
    labels: { en: 'Egypt demo', ar: 'مصر التجريبية' }, exampleBranchIds: ['cairo', 'alexandria'],
    branchLabels: {
      cairo: { en: 'Cairo', ar: 'القاهرة' }, giza: { en: 'Giza', ar: 'الجيزة' }, alexandria: { en: 'Alexandria', ar: 'الإسكندرية' },
      mansoura: { en: 'Mansoura', ar: 'المنصورة' }, tanta: { en: 'Tanta', ar: 'طنطا' }, aswan: { en: 'Aswan', ar: 'أسوان' },
    },
  },
};
export function getTenantProfile(id: string): TenantProfile | undefined {
  return Object.hasOwn(tenantProfiles, id) ? tenantProfiles[id as TenantProfile['id']] : undefined;
}
