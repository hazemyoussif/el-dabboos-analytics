import type { AnalyticsResult, Locale } from '@el-dabboos/domain';

export function SourceObservation({ metadata, locale }: { metadata: AnalyticsResult['metadata']; locale: Locale }) {
  if (metadata.sourceConsistency !== 'api_observed') return null;
  return <p role="note">{locale === 'ar'
    ? 'استيراد عبر واجهة أودو، مع مطابقة الإجماليات. قد تتغير السجلات بين الطلبات؛ وقت التحديث هو وقت الاستيراد.'
    : 'Odoo API import with reconciled totals. Records may change between requests; the update time is the import time.'}</p>;
}
