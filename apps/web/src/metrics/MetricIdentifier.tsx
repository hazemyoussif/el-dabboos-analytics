import { useState } from 'react';
import type { Locale, SemanticMetric } from '@el-dabboos/domain';

/** Canonical metadata shared by catalog and report definitions; identifiers never localize. */
export function MetricIdentifier({ metric, locale }: { metric: Pick<SemanticMetric, 'id'>; locale: Locale }) {
  const [feedback, setFeedback] = useState('');
  const text = locale === 'ar'
    ? { label: 'معرّف المؤشر', copy: 'نسخ', copied: 'تم نسخ معرّف المؤشر', failed: 'تعذر نسخ معرّف المؤشر' }
    : { label: 'Metric ID', copy: 'Copy', copied: 'Metric ID copied', failed: 'Could not copy Metric ID' };
  async function copyIdentifier() {
    try { await navigator.clipboard.writeText(metric.id); setFeedback(text.copied); }
    catch { setFeedback(text.failed); }
  }
  return <div className="metric-identifier"><span>{text.label}: <bdi dir="ltr" lang="en">{metric.id}</bdi></span>
    <button type="button" className="button-ghost" aria-label={`${text.copy}: ${metric.id}`} onClick={() => void copyIdentifier()}>{text.copy}</button>
    <span className="sr-only" role="status">{feedback}</span>
  </div>;
}
