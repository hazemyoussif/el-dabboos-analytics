import type { Locale, ProductMetric, SemanticMetric } from '@el-dabboos/domain';
import { copy } from '../i18n.ts';
import { MetricInfo } from './MetricDefinition.tsx';

export function GlobalMetricCatalog({ registry, catalog, locale }: { registry: readonly ProductMetric[]; catalog: Record<string, SemanticMetric>; locale: Locale }) {
  const text = copy[locale];
  return <details className="catalog-panel"><summary>{text.metricCatalog} · {registry.filter(item => item.availability === 'available').length} {text.available} · {registry.filter(item => item.availability === 'planned').length} {text.planned}</summary>
    <div className="catalog-list">{registry.map(item => <div key={item.id} className="catalog-metric">
      <div className="catalog-metric-description"><span className="catalog-metric-label">{catalog[item.id]?.labels[locale] ?? item.labels[locale]}</span>
        {catalog[item.id] && <MetricInfo metric={catalog[item.id]!} locale={locale} />}</div>
      <span className={item.availability === 'available' ? 'metric-available' : 'metric-planned'}>{item.availability === 'available' ? text.available : text.planned}</span>
    </div>)}</div>
  </details>;
}
