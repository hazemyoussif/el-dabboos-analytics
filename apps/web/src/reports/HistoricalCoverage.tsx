import type { Locale, PublishedAnalyticsCapabilities, TenantProfile } from '@el-dabboos/domain';
import { formatDate } from '../i18n.ts';

export function historicalCoverage(published: PublishedAnalyticsCapabilities | undefined) {
  if (published?.mode !== 'certified') return null;
  const periods = published.releases.flatMap(release => release.period ? [release.period] : []);
  const widest = periods.sort((left, right) => (Date.parse(right.to) - Date.parse(right.from)) - (Date.parse(left.to) - Date.parse(left.from)))[0];
  return widest && Date.parse(widest.to) - Date.parse(widest.from) >= 31 * 86400000 ? widest : null;
}
export function HistoricalCoverage({ published, profile, locale }: { published: PublishedAnalyticsCapabilities | undefined; profile: TenantProfile; locale: Locale }) {
  const coverage = historicalCoverage(published);
  if (!coverage) return null;
  return <p className="historical-coverage">{locale === 'ar' ? 'البيانات التاريخية متاحة من ' : 'Historical data available from '}
    <bdi>{formatDate(coverage.from, locale, profile)}</bdi>{locale === 'ar' ? ' إلى ' : ' through '}<bdi>{formatDate(coverage.to, locale, profile)}</bdi>.
    {' '}{locale === 'ar' ? 'اختر فترة ضمن هذا النطاق للحصول على بيانات كاملة.' : 'Select a period within this range for complete coverage.'}</p>;
}
