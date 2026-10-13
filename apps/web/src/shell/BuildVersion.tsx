import type { Locale } from '@el-dabboos/domain';
export function BuildVersion({ locale }: { locale: Locale }) {
  const number = import.meta.env.VITE_BUILD_NUMBER || 'development';
  return <span> · {locale === 'ar' ? 'البناء' : 'Build'} <bdi>{number}</bdi></span>;
}
