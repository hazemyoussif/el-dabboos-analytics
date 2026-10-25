import { AnswerFilters } from './AnswerFilters.tsx';
import { dimensionLabels, semanticCatalog } from '@el-dabboos/domain';
import type { AnalystPanel, Locale, TenantProfile } from '@el-dabboos/domain';
import { analysisHelp } from '../metrics/analysis-help.ts';
import { formatDate, formatTimestamp } from '../i18n.ts';
import { analystCopy } from './copy.ts';
import {SourceObservation} from '../rendering/SourceObservation.tsx';
export function AnswerEvidence({panel,locale,profile,labels,demo}:{panel:AnalystPanel;locale:Locale;profile:TenantProfile;labels:Record<string,string>;demo:boolean}) {
 const text=analystCopy[locale],metadata=panel.result.metadata,metric=semanticCatalog[panel.query.metric],period=panel.query.dateRange;
 return <details className="analyst-evidence"><summary>{text.provenance} <span className="report-status">{demo?text.demo:metadata.release?text.trusted:text.unverified}</span></summary><dl>
  <div><dt>{metric.labels[locale]}</dt><dd>{metric.help.definition[locale]}</dd></div>
  <div><dt>{text.definition}</dt><dd>{metric.help.formula[locale]} · {metric.help.dateBasis[locale]} · {metric.help.aggregationBehavior[locale]}</dd></div>
  <div><dt>{text.period}</dt><dd>{period?`${formatDate(period.from,locale,profile)} — ${formatDate(period.to,locale,profile)}`:'—'}</dd></div>
  <div><dt>{text.group}</dt><dd>{panel.query.groupBy?dimensionLabels[locale][panel.query.groupBy]:text.none}</dd></div>
  <div><dt>{text.filters}</dt><dd><AnswerFilters panel={panel} locale={locale} labels={labels}/></dd></div>
  <div><dt>{text.transform}</dt><dd>{analysisHelp(panel.query.analysis,locale).map(([label,value])=>`${label}: ${value}`).join(' · ')||text.none}</dd></div>
  {metadata.snapshotAsOf&&<div><dt>{text.snapshot}</dt><dd>{formatDate(metadata.snapshotAsOf,locale,profile)}</dd></div>}
  <div><dt>{text.reconciliation}</dt><dd>{metadata.reconciliation?.status==='exact'?text.exact:text.unknown}</dd></div>
  <div><dt>{text.freshness}</dt><dd>{metadata.sourceAsOf?formatTimestamp(metadata.sourceAsOf,locale,profile):text.unknown}</dd></div>
  <div><dt>{text.coverage}</dt><dd>{metadata.coverage?`${formatDate(metadata.coverage.from,locale,profile)} — ${formatDate(metadata.coverage.through,locale,profile)}`:metadata.dataThrough?formatDate(metadata.dataThrough,locale,profile):text.unknown}</dd></div>
 </dl><SourceObservation metadata={metadata} locale={locale}/></details>;
}
